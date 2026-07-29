import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Dimensions,
  type LayoutChangeEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import type { CameraType } from "expo-camera";

import { AR_CONSTANTS } from "@/cumquat/constants";
import {
  calculateBearing,
  geoToENU,
  projectToScreenWithClipping,
  rotateVector,
  sensorHub,
} from "@/cumquat/sensors";
import type { ScreenPosition, SensorSnapshot } from "@/cumquat/types";
import { useARGestureController } from "@/cumquat/gestures/useARGestureController";
import type {
  GestureState,
  GestureUpdate,
  LimitType,
} from "@/cumquat/gestures/types";
import type { BinaryPOI } from "@/data/binaryDataLoader";
import { loadPOIsFromAsset } from "@/data/binaryDataLoader";
import poiBinaryAsset from "@/data/pois.json.bin";
import { useCameraZoom } from "@/hooks/useCameraZoom";
import type {
  EngineConfig,
  FrameSnapshot,
  POIInput,
  ProjectedPOI as NativeProjectedPOI,
  SensorState,
  ViewState as NativeViewState,
} from "react-native-cumquat";
import { RubberBandVisualFeedback } from "@/ui/RubberBandVisualFeedback";

const DATASET_RADIUS_METERS = AR_CONSTANTS.DISTANCE.MAX;
const POSITION_COMMIT_THRESHOLD_PX = 1.5;
const DISTANCE_COMMIT_THRESHOLD_METERS = 2;
const LABEL_WIDTH = 170;
const EDGE_MARGIN = 28;

type Viewport = {
  width: number;
  height: number;
};

type SourcePOI = {
  id: number;
  name: string;
  lat: number;
  lon: number;
  alt: number;
};

type RenderPOI = SourcePOI & {
  distance: number;
  bearing: number;
  screenPos: ScreenPosition;
  isDistanceClipped: boolean;
  isOffscreen: boolean;
  isVisible: boolean;
};

type NativeEngine = {
  initialize(pois: readonly POIInput[]): void;
  setViewState(viewState: NativeViewState): void;
  update(sensorState: SensorState): number;
  getFrame(): FrameSnapshot;
  dispose(): void;
};

type NativeEngineFactory = {
  create(config?: EngineConfig): NativeEngine;
};

type EngineMode = "starting" | "native" | "js-fallback";
type IndicatorKind = "offscreen" | "too-far" | "too-close";

type IndicatorPlacement = {
  x: number;
  y: number;
  angle: number;
  color: string;
};

const DEFAULT_GESTURE_STATE: GestureState = {
  minDistance: AR_CONSTANTS.DISTANCE.DEFAULT_MIN,
  maxDistance: AR_CONSTANTS.DISTANCE.DEFAULT_MAX,
  zoom: 0,
  fov: AR_CONSTANTS.FOV.DEFAULT,
};

function asLandscapeViewport(width: number, height: number): Viewport {
  return {
    width: Math.max(1, Math.max(width, height)),
    height: Math.max(1, Math.min(width, height)),
  };
}

const initialWindow = Dimensions.get("window");
const INITIAL_VIEWPORT = asLandscapeViewport(
  initialWindow.width,
  initialWindow.height,
);

let cachedNativeFactory: NativeEngineFactory | null | undefined;

function getNativeFactory(): NativeEngineFactory | null {
  if (cachedNativeFactory !== undefined) return cachedNativeFactory;

  try {
    const nativePackage = require("react-native-cumquat") as {
      CumquatEngine: NativeEngineFactory;
    };
    cachedNativeFactory = nativePackage.CumquatEngine;
  } catch {
    cachedNativeFactory = null;
  }

  return cachedNativeFactory;
}

const normalizeAngle = (degrees: number): number =>
  ((degrees % 360) + 360) % 360;

function toNativeViewState(state: GestureState): NativeViewState {
  const minDistanceMeters = Math.max(0, state.minDistance);

  return {
    horizontalFovDegrees: state.fov,
    minDistanceMeters,
    maxDistanceMeters: Math.max(minDistanceMeters + 0.001, state.maxDistance),
  };
}

function getRubberBandIntensity(
  limit: LimitType | null,
  excess: number,
): number {
  if (!limit || excess <= 0) return 0;
  if (limit === "fov") return Math.min(1, excess / 20);
  if (limit === "zoom") return Math.min(1, excess / 0.2);
  return Math.min(1, excess / 500);
}

function mapNativePOI(
  nativePOI: NativeProjectedPOI,
  pois: readonly SourcePOI[],
): RenderPOI {
  const source = pois[nativePOI.poiIndex];

  if (!source) {
    throw new Error(
      `NativeCumquat returned invalid POI index ${nativePOI.poiIndex}`,
    );
  }

  const screenPos: ScreenPosition = {
    x: nativePOI.x,
    y: nativePOI.y,
    visible: nativePOI.visible,
    clipped: nativePOI.clipped,
    clippedByDistance: nativePOI.clippedByDistance,
    depth: nativePOI.depth,
    radialDistance: nativePOI.distance,
  };

  return {
    ...source,
    distance: nativePOI.distance,
    bearing: nativePOI.bearing,
    screenPos,
    isDistanceClipped: nativePOI.clippedByDistance !== null,
    isOffscreen: nativePOI.clipped && nativePOI.clippedByDistance === null,
    isVisible: nativePOI.visible && nativePOI.clippedByDistance === null,
  };
}

function shouldCommitNativeFrame(
  previous: readonly NativeProjectedPOI[],
  next: readonly NativeProjectedPOI[],
): boolean {
  if (previous.length !== next.length) return true;

  for (let index = 0; index < next.length; index += 1) {
    const before = previous[index];
    const after = next[index];

    if (
      before.poiIndex !== after.poiIndex ||
      before.visible !== after.visible ||
      before.clipped !== after.clipped ||
      before.clippedByDistance !== after.clippedByDistance
    ) {
      return true;
    }

    if (
      Math.abs(before.x - after.x) >= POSITION_COMMIT_THRESHOLD_PX ||
      Math.abs(before.y - after.y) >= POSITION_COMMIT_THRESHOLD_PX ||
      Math.abs(before.distance - after.distance) >=
        DISTANCE_COMMIT_THRESHOLD_METERS
    ) {
      return true;
    }
  }

  return false;
}

function projectWithJavaScript(
  snapshot: SensorSnapshot,
  state: GestureState,
  viewport: Viewport,
  pois: readonly SourcePOI[],
): RenderPOI[] {
  return pois.flatMap((poi) => {
    const enuPosition = geoToENU(
      snapshot.lat,
      snapshot.lon,
      snapshot.elevation,
      poi.lat,
      poi.lon,
      poi.alt,
    );
    const cameraPosition = rotateVector(enuPosition, snapshot.orientation);
    const distance = Math.hypot(
      cameraPosition.x,
      cameraPosition.y,
      cameraPosition.z,
    );

    if (distance > DATASET_RADIUS_METERS) return [];

    const bearing = calculateBearing(
      snapshot.lat,
      snapshot.lon,
      poi.lat,
      poi.lon,
    );
    const screenPos = projectToScreenWithClipping(
      cameraPosition,
      distance,
      viewport.width,
      viewport.height,
      state.fov,
      state.minDistance,
      state.maxDistance,
    );

    return [
      {
        ...poi,
        distance,
        bearing,
        screenPos,
        isDistanceClipped: screenPos.clippedByDistance != null,
        isOffscreen: screenPos.clipped && screenPos.clippedByDistance == null,
        isVisible: screenPos.visible && screenPos.clippedByDistance == null,
      },
    ];
  });
}

function formatDistance(distance: number): string {
  return distance < 1000
    ? `${Math.round(distance)}m`
    : `${(distance / 1000).toFixed(1)}km`;
}

function classifyIndicator(poi: RenderPOI): IndicatorKind | null {
  if (poi.screenPos.clippedByDistance === "max") return "too-far";
  if (poi.screenPos.clippedByDistance === "min") return "too-close";
  if (poi.isOffscreen) return "offscreen";
  return null;
}

function getIndicatorPlacement(
  poi: RenderPOI,
  viewport: Viewport,
  kind: IndicatorKind,
): IndicatorPlacement {
  const centerX = viewport.width / 2;
  const centerY = viewport.height / 2;
  const sourceX = Number.isFinite(poi.screenPos.x) ? poi.screenPos.x : centerX;
  const sourceY = Number.isFinite(poi.screenPos.y) ? poi.screenPos.y : centerY;

  let dx = sourceX - centerX;
  let dy = sourceY - centerY;

  if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) {
    dx = 0;
    dy = -1;
  }

  const angle = Math.atan2(dy, dx);
  const horizontalPosition = Math.max(
    EDGE_MARGIN,
    Math.min(
      viewport.width - EDGE_MARGIN,
      centerX + Math.cos(angle) * (viewport.width / 2 - EDGE_MARGIN),
    ),
  );

  if (kind === "too-far") {
    return {
      x: horizontalPosition,
      y: EDGE_MARGIN,
      angle: -Math.PI / 2,
      color: "rgba(255, 190, 80, 0.95)",
    };
  }

  if (kind === "too-close") {
    return {
      x: horizontalPosition,
      y: viewport.height - EDGE_MARGIN,
      angle: Math.PI / 2,
      color: "rgba(80, 190, 255, 0.95)",
    };
  }

  const availableX = viewport.width / 2 - EDGE_MARGIN;
  const availableY = viewport.height / 2 - EDGE_MARGIN;
  const scaleX =
    Math.abs(dx) > 0.001 ? availableX / Math.abs(dx) : Number.POSITIVE_INFINITY;
  const scaleY =
    Math.abs(dy) > 0.001 ? availableY / Math.abs(dy) : Number.POSITIVE_INFINITY;
  const scale = Math.min(scaleX, scaleY);

  return {
    x: centerX + dx * scale,
    y: centerY + dy * scale,
    angle,
    color: "rgba(255, 255, 255, 0.92)",
  };
}

const VisiblePOIMarker = memo(function VisiblePOIMarker({
  poi,
}: {
  poi: RenderPOI;
}) {
  const { x, y } = poi.screenPos;
  const distanceRatio = Math.min(1, poi.distance / 2000);
  const opacity = Math.max(0.6, 1 - distanceRatio * 0.5);
  const fontSize = Math.max(10, 16 - distanceRatio * 6);

  return (
    <>
      <Text
        pointerEvents="none"
        numberOfLines={1}
        style={[
          styles.poiName,
          {
            left: x - LABEL_WIDTH / 2,
            top: y - 30,
            fontSize,
            opacity,
          },
        ]}
      >
        {poi.name}
      </Text>

      <View
        pointerEvents="none"
        style={[styles.poiDot, { left: x - 7, top: y - 7, opacity }]}
      />

      <Text
        pointerEvents="none"
        style={[
          styles.poiDistance,
          { left: x - LABEL_WIDTH / 2, top: y + 10, opacity },
        ]}
      >
        {formatDistance(poi.distance)}
      </Text>
    </>
  );
});

const EdgeTriangle = memo(function EdgeTriangle({
  placement,
}: {
  placement: IndicatorPlacement;
}) {
  return (
    <View
      pointerEvents="none"
      style={[
        styles.edgeTriangle,
        {
          left: placement.x - 8,
          top: placement.y - 8,
          borderLeftColor: placement.color,
          transform: [{ rotate: `${placement.angle}rad` }],
        },
      ]}
    />
  );
});

export default function ARBetaNativeOverlayView() {
  const [pois, setPOIs] = useState<readonly BinaryPOI[]>([]);
  const [poiLoadError, setPOILoadError] = useState<Error | null>(null);
  const [cameraFacing] = useState<CameraType>("back");
  const [viewport, setViewport] = useState<Viewport>(INITIAL_VIEWPORT);
  const [projectedPOIs, setProjectedPOIs] = useState<RenderPOI[]>([]);
  const [engineMode, setEngineMode] = useState<EngineMode>("starting");
  const [minDistance, setMinDistance] = useState(
    DEFAULT_GESTURE_STATE.minDistance,
  );
  const [maxDistance, setMaxDistance] = useState(
    DEFAULT_GESTURE_STATE.maxDistance,
  );
  const [fov, setFOV] = useState(DEFAULT_GESTURE_STATE.fov);
  const [isRubberBanding, setIsRubberBanding] = useState(false);
  const [activeLimit, setActiveLimit] = useState<LimitType | null>(null);
  const [rubberBandIntensity, setRubberBandIntensity] = useState(0);
  const [isReady, setIsReady] = useState(false);

  const nativeEngineRef = useRef<NativeEngine | null>(null);
  const nativeDisabledRef = useRef(false);
  const gestureStateRef = useRef<GestureState>(DEFAULT_GESTURE_STATE);
  const viewportRef = useRef<Viewport>(INITIAL_VIEWPORT);
  const lastCommittedNativeFrameRef = useRef<readonly NativeProjectedPOI[]>([]);

  const nativePOIs = useMemo<readonly POIInput[]>(
    () =>
      pois.map((poi) => ({
        id: String(poi.id),
        name: poi.name,
        latitude: poi.lat,
        longitude: poi.lon,
        altitude: poi.alt,
      })),
    [pois],
  );

  const { cameraRef, animatedZoom, animatedProps, AnimatedCamera } =
    useCameraZoom({
      initialZoom: DEFAULT_GESTURE_STATE.zoom,
      springConfig: {
        stiffness: AR_CONSTANTS.GESTURE.SPRING_STIFFNESS,
        damping: AR_CONSTANTS.GESTURE.SPRING_DAMPING,
        mass: AR_CONSTANTS.GESTURE.SPRING_MASS,
      },
    });

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const layout = event.nativeEvent.layout;
    const next = asLandscapeViewport(layout.width, layout.height);
    const current = viewportRef.current;

    if (
      Math.abs(next.width - current.width) < 0.5 &&
      Math.abs(next.height - current.height) < 0.5
    ) {
      return;
    }

    viewportRef.current = next;
    setViewport(next);
  }, []);

  const disposeNativeEngine = useCallback(() => {
    lastCommittedNativeFrameRef.current = [];
    nativeEngineRef.current?.dispose();
    nativeEngineRef.current = null;
  }, []);

  const disableNative = useCallback(() => {
    nativeDisabledRef.current = true;
    disposeNativeEngine();
    setEngineMode("js-fallback");
  }, [disposeNativeEngine]);

  const ensureNativeEngine = useCallback((): NativeEngine | null => {
    if (nativeDisabledRef.current) return null;
    if (nativeEngineRef.current) return nativeEngineRef.current;
    if (nativePOIs.length === 0) return null;

    const factory = getNativeFactory();
    if (!factory) return null;

    const engine = factory.create({
      datasetRadiusMeters: DATASET_RADIUS_METERS,
      maxVisiblePOIs: nativePOIs.length,
    });
    engine.initialize(nativePOIs);
    engine.setViewState(toNativeViewState(gestureStateRef.current));

    nativeEngineRef.current = engine;
    return engine;
  }, [nativePOIs]);

  const commitNativeViewState = useCallback(
    (state: GestureState) => {
      gestureStateRef.current = state;
      lastCommittedNativeFrameRef.current = [];

      const engine = nativeEngineRef.current;
      if (!engine || nativeDisabledRef.current) return;

      try {
        engine.setViewState(toNativeViewState(state));
      } catch {
        disableNative();
      }
    },
    [disableNative],
  );

  const renderSnapshot = useCallback(
    (snapshot: SensorSnapshot) => {
      if (pois.length === 0) return;

      const currentViewport = viewportRef.current;

      if (!nativeDisabledRef.current) {
        try {
          const engine = ensureNativeEngine();
          if (!engine) {
            throw new Error("Native Cumquat engine unavailable");
          }

          engine.update({
            timestampNs: snapshot.timestamp * 1_000_000,
            location: {
              latitude: snapshot.lat,
              longitude: snapshot.lon,
              altitude: snapshot.elevation,
            },
            orientationQuaternion: snapshot.orientation,
            headingDegrees: snapshot.heading,
            pitchDegrees: 0,
            rollDegrees: 0,
            viewportWidth: currentViewport.width,
            viewportHeight: currentViewport.height,
          });

          const nativeFrame = engine.getFrame().projectedPOIs;

          if (
            shouldCommitNativeFrame(
              lastCommittedNativeFrameRef.current,
              nativeFrame,
            )
          ) {
            lastCommittedNativeFrameRef.current = nativeFrame;

            const nextPOIs = nativeFrame.map((nativePOI) =>
              mapNativePOI(nativePOI, pois),
            );
            setProjectedPOIs(nextPOIs);
          }

          setEngineMode("native");
          return;
        } catch {
          disableNative();
        }
      }

      setProjectedPOIs(
        projectWithJavaScript(
          snapshot,
          gestureStateRef.current,
          currentViewport,
          pois,
        ),
      );
      setEngineMode("js-fallback");
    },
    [disableNative, ensureNativeEngine, pois],
  );

  const applyGestureState = useCallback(
    (state: GestureState) => {
      setMinDistance(state.minDistance);
      setMaxDistance(state.maxDistance);
      setFOV(state.fov);
      commitNativeViewState(state);
    },
    [commitNativeViewState],
  );

  const handleGestureUpdate = useCallback(
    (update: GestureUpdate) => {
      applyGestureState(update.state);
      setIsRubberBanding(update.rubberBanding);
      setActiveLimit(update.activeLimit);
      setRubberBandIntensity(
        getRubberBandIntensity(update.activeLimit, update.excess),
      );
    },
    [applyGestureState],
  );

  const handleGestureEnd = useCallback(
    (state: GestureState) => {
      applyGestureState(state);
      setIsRubberBanding(false);
      setActiveLimit(null);
      setRubberBandIntensity(0);
    },
    [applyGestureState],
  );

  const gestureCallbacks = useMemo(
    () => ({ onUpdate: handleGestureUpdate, onEnd: handleGestureEnd }),
    [handleGestureEnd, handleGestureUpdate],
  );

  const { gesture: pinchGesture, setState: setGestureState } =
    useARGestureController({
      initialState: DEFAULT_GESTURE_STATE,
      callbacks: gestureCallbacks,
      cameraZoom: animatedZoom,
    });

  useEffect(() => {
    let cancelled = false;

    loadPOIsFromAsset(poiBinaryAsset)
      .then((loadedPOIs) => {
        if (cancelled) return;

        if (loadedPOIs.length === 0) {
          throw new Error("POI binary contains no records");
        }

        setPOIs(loadedPOIs);
        setPOILoadError(null);
      })
      .catch((error: unknown) => {
        if (cancelled) return;

        const resolvedError =
          error instanceof Error
            ? error
            : new Error("Unable to load POI binary");

        setPOILoadError(resolvedError);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    sensorHub
      .start()
      .then(() => {
        if (!cancelled) setIsReady(true);
      })
      .catch(() => {
        if (!cancelled) setIsReady(false);
      });

    return () => {
      cancelled = true;
      sensorHub.stop();
      disposeNativeEngine();
    };
  }, [disposeNativeEngine]);

  useEffect(() => {
    if (!isReady || pois.length === 0) return;

    const interval = setInterval(() => {
      const snapshot = sensorHub.getSnapshot();
      if (snapshot.lat === 0 && snapshot.lon === 0) return;

      renderSnapshot(snapshot);
    }, 100);

    return () => clearInterval(interval);
  }, [isReady, pois.length, renderSnapshot]);

  const visiblePOIs = useMemo(
    () => projectedPOIs.filter((poi) => poi.isVisible),
    [projectedPOIs],
  );

  const averageBearing = useMemo(() => {
    if (visiblePOIs.length === 0) return 0;

    return normalizeAngle(
      visiblePOIs.reduce((sum, poi) => sum + poi.bearing, 0) /
        visiblePOIs.length,
    );
  }, [visiblePOIs]);

  return (
    <GestureDetector gesture={pinchGesture}>
      <View style={styles.container} onLayout={handleLayout}>
        <AnimatedCamera
          ref={cameraRef as never}
          animatedProps={animatedProps}
          facing={cameraFacing}
          mode="video"
          style={StyleSheet.absoluteFill}
        />

        <View
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
          renderToHardwareTextureAndroid
          collapsable={false}
        >
          <Text style={styles.poiCounter}>
            POIs: {visiblePOIs.length} visible / {projectedPOIs.length} active ·{" "}
            {poiLoadError
              ? "data error"
              : pois.length === 0
                ? "loading data"
                : engineMode === "native"
                  ? "C++"
                  : engineMode}
          </Text>

          {poiLoadError ? (
            <Text style={styles.poiLoadError}>
              Failed to load POIs: {poiLoadError.message}
            </Text>
          ) : null}

          {projectedPOIs.map((poi) => {
            if (poi.isVisible) {
              return <VisiblePOIMarker key={poi.id} poi={poi} />;
            }
            const kind = classifyIndicator(poi);
            if (!kind) return null;

            return (
              <EdgeTriangle
                key={poi.id}
                placement={getIndicatorPlacement(poi, viewport, kind)}
              />
            );
          })}

          <View style={styles.reticle}>
            <View style={styles.reticleDot} />
          </View>

          <RubberBandVisualFeedback
            isActive={isRubberBanding && activeLimit !== "fov"}
            limitType={activeLimit === "fov" ? null : activeLimit}
            intensity={rubberBandIntensity}
          />

          <View style={styles.topHUD}>
            <View style={styles.hudCell}>
              <Text style={styles.hudLabel}>MIN</Text>
              <Text style={[styles.hudValue, { color: "#4CAF50" }]}>
                {(minDistance / 1000).toFixed(1)}km
              </Text>
            </View>

            <View style={styles.hudCell}>
              <Text style={styles.hudLabel}>BEARING</Text>
              <Text style={[styles.hudValue, { color: "#00BCD4" }]}>
                {Math.round(averageBearing)}°
              </Text>
            </View>

            <View style={styles.hudCell}>
              <Text style={styles.hudLabel}>MAX</Text>
              <Text style={[styles.hudValue, { color: "#2196F3" }]}>
                {(maxDistance / 1000).toFixed(1)}km
              </Text>
            </View>

            <View style={styles.hudCell}>
              <Text style={styles.hudLabel}>FOV</Text>
              <Text style={[styles.hudValue, { color: "#FFC107" }]}>
                {Math.round(fov)}°
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.controls}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => {
              const resetState = setGestureState(DEFAULT_GESTURE_STATE);
              nativeDisabledRef.current = false;
              disposeNativeEngine();
              setEngineMode("starting");
              applyGestureState(resetState);
              setIsRubberBanding(false);
              setActiveLimit(null);
              setRubberBandIntensity(0);
            }}
          >
            <Text style={styles.controlButtonText}>↺</Text>
          </TouchableOpacity>
        </View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  poiCounter: {
    position: "absolute",
    left: 10,
    top: 10,
    color: "rgba(255,255,255,0.9)",
    fontSize: 14,
    fontWeight: "700",
    textShadowColor: "rgba(0,0,0,0.9)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  poiLoadError: {
    position: "absolute",
    left: 10,
    right: 10,
    top: 34,
    color: "#ffb4ab",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.95)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  poiName: {
    position: "absolute",
    width: LABEL_WIDTH,
    color: "white",
    fontWeight: "700",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.95)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  poiDot: {
    position: "absolute",
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "rgba(255,0,0,0.85)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.65)",
  },
  poiDistance: {
    position: "absolute",
    width: LABEL_WIDTH,
    color: "rgba(210,215,255,0.9)",
    textAlign: "center",
    fontSize: 10,
    fontWeight: "600",
    textShadowColor: "rgba(0,0,0,0.9)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  edgeTriangle: {
    position: "absolute",
    width: 0,
    height: 0,
    borderTopWidth: 8,
    borderBottomWidth: 8,
    borderLeftWidth: 16,
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
  },
  reticle: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: -4,
    marginLeft: -4,
    width: 8,
    height: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  reticleDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(0, 255, 255, 0.8)",
  },
  topHUD: {
    opacity: 0.75,
    position: "absolute",
    bottom: 55,
    left: 12,
    right: 12,
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.1)",
  },
  hudCell: {
    alignItems: "center",
    flex: 1,
  },
  hudLabel: {
    fontSize: 8,
    color: "rgba(255,255,255,0.5)",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  hudValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "white",
    marginTop: 1,
  },
  controls: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    paddingHorizontal: 50,
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  controlButtonText: {
    fontSize: 24,
    color: "white",
    display: "none",
  },
});
