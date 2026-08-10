import {useFocusEffect} from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import {GestureDetector} from "react-native-gesture-handler";
import Svg, {
  Circle,
  Line,
  Path,
  Text as SvgText,
} from "react-native-svg";
import {
  CumquatEngine,
  type FrameOrientation,
  type POIInput,
  type ProjectedPOI,
} from "react-native-cumquat";
import {
  cloneGestureConfig,
  useARGestureController,
  type GestureState,
  type GestureUpdate,
  type LimitType,
} from "react-native-cumquat-gestures";

import {AR_CONSTANTS} from "@/cumquat/constants";
import {
  formatRadarDistance,
  frameForwardBearing,
  isInsideFOV,
  projectRadarPoint,
} from "@/cumquat/radarMath";
import {
  getCompassCalibrationPercent,
  sensorHub,
} from "@/cumquat/sensors";
import type {BinaryPOI} from "@/data/binaryDataLoader";
import {loadPOIsFromAsset} from "@/data/binaryDataLoader";
import poiBinaryAsset from "@/data/pois.json.bin";
import {RubberBandVisualFeedback} from "@/ui/RubberBandVisualFeedback";
import {Tlog} from "@/utils/tlog";

const DATASET_RADIUS_METERS = AR_CONSTANTS.DISTANCE.MAX;
const DEFAULT_STATE: GestureState = {
  minDistance: AR_CONSTANTS.DISTANCE.DEFAULT_MIN,
  maxDistance: AR_CONSTANTS.DISTANCE.DEFAULT_MAX,
  zoom: 0,
  fov: AR_CONSTANTS.FOV.DEFAULT,
};

type RadarStatus = "loading" | "calibrating" | "ready" | "error";

type RadarBlip = {
  source: BinaryPOI;
  projected: ProjectedPOI;
  x: number;
  y: number;
  relativeBearing: number;
  insideFOV: boolean;
};

function toNativeViewState(state: GestureState) {
  const minDistanceMeters = Math.max(0, state.minDistance);
  return {
    horizontalFovDegrees: state.fov,
    minDistanceMeters,
    maxDistanceMeters: Math.max(minDistanceMeters + 0.001, state.maxDistance),
  };
}

function feedbackIntensity(limit: LimitType | null, excess: number): number {
  if (!limit || excess <= 0) return 0;
  if (limit === "fov") return Math.min(1, excess / 20);
  if (limit === "zoom") return Math.min(1, excess / 0.2);
  return Math.min(1, excess / 500);
}

function polarPoint(center: number, radius: number, degrees: number) {
  const radians = (degrees * Math.PI) / 180;
  return {
    x: center + Math.sin(radians) * radius,
    y: center - Math.cos(radians) * radius,
  };
}

function viewingConePath(center: number, radius: number, fov: number): string {
  const halfFOV = Math.max(1, Math.min(179, fov)) / 2;
  const left = polarPoint(center, radius, -halfFOV);
  const right = polarPoint(center, radius, halfFOV);
  return [
    `M ${center} ${center}`,
    `L ${left.x} ${left.y}`,
    `A ${radius} ${radius} 0 0 1 ${right.x} ${right.y}`,
    "Z",
  ].join(" ");
}

function compassPoints(forwardBearing: number, center: number, radius: number) {
  return [
    {label: "N", bearing: 0},
    {label: "E", bearing: 90},
    {label: "S", bearing: 180},
    {label: "W", bearing: 270},
  ].map((point) => {
    const relative = point.bearing - forwardBearing;
    return {...point, ...polarPoint(center, radius, relative)};
  });
}

export default function RadarView() {
  const {width, height} = useWindowDimensions();
  const diameter = Math.max(220, Math.min(height - 72, width * 0.58, 560));
  const center = diameter / 2;
  const radarRadius = center - 18;

  const [pois, setPOIs] = useState<readonly BinaryPOI[]>([]);
  const [projectedPOIs, setProjectedPOIs] = useState<readonly ProjectedPOI[]>(
    [],
  );
  const [orientation, setOrientation] = useState<FrameOrientation | null>(null);
  const [forwardBearing, setForwardBearing] = useState<number | null>(null);
  const [gestureState, setGestureState] = useState(DEFAULT_STATE);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [status, setStatus] = useState<RadarStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [sequence, setSequence] = useState(0);
  const [compassCalibration, setCompassCalibration] = useState(0);
  const [rubberBanding, setRubberBanding] = useState(false);
  const [activeLimit, setActiveLimit] = useState<LimitType | null>(null);
  const [rubberBandIntensity, setRubberBandIntensity] = useState(0);

  const engineRef = useRef<ReturnType<typeof CumquatEngine.create> | null>(null);
  const gestureStateRef = useRef(DEFAULT_STATE);
  const focusedRef = useRef(false);
  const nativeFrameLoggedRef = useRef(false);

  const gestureConfig = useMemo(() => {
    const config = cloneGestureConfig();
    config.distance.min = AR_CONSTANTS.DISTANCE.MIN;
    config.distance.max = DATASET_RADIUS_METERS;
    config.distance.minGap = AR_CONSTANTS.GESTURE.MIN_DISTANCE_GAP;
    config.fov.min = AR_CONSTANTS.FOV.MIN;
    config.fov.max = AR_CONSTANTS.FOV.MAX;
    // Radar has no camera zoom. Vertical motion controls range only.
    config.gesture.verticalPixelToZoom = 0;
    config.gesture.zoomCouplingFactor = 0;
    return config;
  }, []);

  const commitViewState = useCallback((state: GestureState) => {
    const next = {...state, zoom: 0};
    gestureStateRef.current = next;
    setGestureState(next);

    try {
      engineRef.current?.setViewState(toNativeViewState(next));
    } catch (nativeError: unknown) {
      setStatus("error");
      setError(
        nativeError instanceof Error
          ? nativeError.message
          : "Unable to update Cumquat radar view state.",
      );
    }
  }, []);

  const handleGestureUpdate = useCallback(
    (update: GestureUpdate) => {
      commitViewState(update.state);
      setRubberBanding(update.rubberBanding);
      setActiveLimit(update.activeLimit);
      setRubberBandIntensity(
        feedbackIntensity(update.activeLimit, update.excess),
      );
    },
    [commitViewState],
  );

  const handleGestureEnd = useCallback(
    (state: GestureState) => {
      commitViewState(state);
      setRubberBanding(false);
      setActiveLimit(null);
      setRubberBandIntensity(0);
    },
    [commitViewState],
  );

  const gestureCallbacks = useMemo(
    () => ({onUpdate: handleGestureUpdate, onEnd: handleGestureEnd}),
    [handleGestureEnd, handleGestureUpdate],
  );

  const {gesture, setState: setControllerState} = useARGestureController({
    initialState: DEFAULT_STATE,
    callbacks: gestureCallbacks,
    config: gestureConfig,
  });

  useEffect(() => {
    let cancelled = false;

    loadPOIsFromAsset(poiBinaryAsset)
      .then((loaded) => {
        if (cancelled) return;
        const production = loaded.filter(
          (poi) => poi.id !== 999 && poi.name.trim().toUpperCase() !== "TEST",
        );
        if (production.length === 0) {
          throw new Error("POI binary contains no production records.");
        }
        setPOIs(production);
      })
      .catch((loadError: unknown) => {
        if (cancelled) return;
        setStatus("error");
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load radar POIs.",
        );
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (pois.length === 0) return;

    const nativePOIs: POIInput[] = pois.map((poi) => ({
      id: String(poi.id),
      name: poi.name,
      latitude: poi.lat,
      longitude: poi.lon,
      altitude: poi.alt,
    }));

    try {
      const engine = CumquatEngine.create({
        datasetRadiusMeters: DATASET_RADIUS_METERS,
        maxVisiblePOIs: nativePOIs.length,
      });
      engine.initialize(nativePOIs);
      engine.setViewState(toNativeViewState(gestureStateRef.current));
      engineRef.current = engine;
      nativeFrameLoggedRef.current = false;
      setStatus("calibrating");
      setError(null);
    } catch (nativeError: unknown) {
      setStatus("error");
      setError(
        nativeError instanceof Error
          ? nativeError.message
          : "Unable to initialize Cumquat radar.",
      );
    }

    return () => {
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, [pois]);

  useFocusEffect(
    useCallback(() => {
      focusedRef.current = true;
      let cancelled = false;

      sensorHub.start().catch((sensorError: unknown) => {
        if (cancelled) return;
        setStatus("error");
        setError(
          sensorError instanceof Error
            ? sensorError.message
            : "Unable to start radar sensors.",
        );
      });

      return () => {
        cancelled = true;
        focusedRef.current = false;
        sensorHub.stop();
      };
    }, []),
  );

  useEffect(() => {
    if (pois.length === 0) return;

    const interval = setInterval(() => {
      if (!focusedRef.current || !engineRef.current) return;
      const snapshot = sensorHub.getSnapshot();
      setCompassCalibration(
        getCompassCalibrationPercent(snapshot.headingAccuracy),
      );
      if (snapshot.lat === 0 && snapshot.lon === 0) return;

      try {
        engineRef.current.update({
          timestampNs: snapshot.timestamp * 1_000_000,
          location: {
            latitude: snapshot.lat,
            longitude: snapshot.lon,
            altitude: snapshot.elevation,
          },
          orientationQuaternion: snapshot.orientation,
          // Paired once by Cumquat; later heading changes cannot steer radar.
          initialHeadingDegrees:
            snapshot.headingAccuracy >= 2 ? snapshot.heading : undefined,
          headingDegrees: snapshot.heading,
          pitchDegrees: 0,
          rollDegrees: 0,
          viewportWidth: Math.max(1, diameter),
          viewportHeight: Math.max(1, diameter),
        });

        const frame = engineRef.current.getFrame();
        const nextOrientation = frame.orientation ?? null;
        const nextForwardBearing = frameForwardBearing(nextOrientation);

        if (nextOrientation && !nativeFrameLoggedRef.current) {
          nativeFrameLoggedRef.current = true;
          Tlog("[RADAR NATIVE FRAME]", {
            convention: nextOrientation.convention,
            quaternion: nextOrientation.quaternion,
            forwardBearing: nextForwardBearing,
          });
        }

        setSequence(frame.sequence);
        setOrientation(nextOrientation);

        if (nextForwardBearing === null) {
          setStatus("calibrating");
          setProjectedPOIs([]);
          return;
        }

        setForwardBearing(nextForwardBearing);
        setProjectedPOIs(frame.projectedPOIs);
        setStatus("ready");
        setError(null);
      } catch (nativeError: unknown) {
        setStatus("error");
        setError(
          nativeError instanceof Error
            ? nativeError.message
            : "Cumquat radar update failed.",
        );
      }
    }, 100);

    return () => clearInterval(interval);
  }, [diameter, pois.length]);

  const blips = useMemo<RadarBlip[]>(() => {
    if (forwardBearing === null) return [];

    return projectedPOIs
      .filter(
        (projected) =>
          projected.distance >= gestureState.minDistance &&
          projected.distance <= gestureState.maxDistance,
      )
      .flatMap((projected) => {
        const source = pois[projected.poiIndex];
        if (!source) return [];
        const point = projectRadarPoint(
          projected.bearing,
          forwardBearing,
          projected.distance,
          gestureState.maxDistance,
          radarRadius,
        );
        return [
          {
            source,
            projected,
            x: center + point.x,
            y: center + point.y,
            relativeBearing: point.relativeBearing,
            insideFOV: isInsideFOV(point.relativeBearing, gestureState.fov),
          },
        ];
      })
      .sort((left, right) => left.projected.distance - right.projected.distance);
  }, [
    center,
    forwardBearing,
    gestureState.fov,
    gestureState.maxDistance,
    gestureState.minDistance,
    pois,
    projectedPOIs,
    radarRadius,
  ]);

  useEffect(() => {
    if (selectedIndex === null) return;
    if (!blips.some(({projected}) => projected.poiIndex === selectedIndex)) {
      setSelectedIndex(null);
    }
  }, [blips, selectedIndex]);

  const selected =
    selectedIndex === null
      ? null
      : blips.find(({projected}) => projected.poiIndex === selectedIndex) ??
        null;
  const sweep = polarPoint(center, radarRadius, (sequence * 12) % 360);
  const compass =
    forwardBearing === null
      ? []
      : compassPoints(forwardBearing, center, radarRadius - 10);

  const handleReset = useCallback(() => {
    const reset = setControllerState(DEFAULT_STATE);
    commitViewState(reset);
    setSelectedIndex(null);
    setRubberBanding(false);
    setActiveLimit(null);
    setRubberBandIntensity(0);
  }, [commitViewState, setControllerState]);

  return (
    <GestureDetector gesture={gesture}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>CUMQUAT 0.1.6</Text>
            <Text style={styles.title}>RADAR</Text>
          </View>
          <View style={styles.metrics}>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>RANGE</Text>
              <Text style={styles.metricValue}>
                {formatRadarDistance(gestureState.maxDistance)}
              </Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>BEARING</Text>
              <Text style={styles.metricValue}>
                {forwardBearing === null ? "—" : `${Math.round(forwardBearing)}°`}
              </Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>FOV</Text>
              <Text style={styles.metricValue}>{Math.round(gestureState.fov)}°</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>POIs</Text>
              <Text style={styles.metricValue}>{blips.length}</Text>
            </View>
          </View>
          <Pressable style={styles.resetButton} onPress={handleReset}>
            <Text style={styles.resetText}>RESET</Text>
          </Pressable>
        </View>

        <View style={styles.content}>
          <View style={[styles.radarShell, {width: diameter, height: diameter}]}>
            <Svg width={diameter} height={diameter}>
              <Circle
                cx={center}
                cy={center}
                r={radarRadius}
                fill="#061710"
                stroke="#36df83"
                strokeWidth={2}
              />
              {[0.25, 0.5, 0.75].map((ratio) => (
                <Circle
                  key={ratio}
                  cx={center}
                  cy={center}
                  r={radarRadius * ratio}
                  fill="none"
                  stroke="rgba(54,223,131,0.23)"
                  strokeWidth={1}
                />
              ))}
              <Line
                x1={center}
                y1={center - radarRadius}
                x2={center}
                y2={center + radarRadius}
                stroke="rgba(54,223,131,0.18)"
              />
              <Line
                x1={center - radarRadius}
                y1={center}
                x2={center + radarRadius}
                y2={center}
                stroke="rgba(54,223,131,0.18)"
              />
              <Path
                d={viewingConePath(center, radarRadius, gestureState.fov)}
                fill="rgba(83,176,255,0.10)"
                stroke="rgba(83,176,255,0.55)"
                strokeWidth={1}
              />
              <Line
                x1={center}
                y1={center}
                x2={sweep.x}
                y2={sweep.y}
                stroke="rgba(112,255,169,0.72)"
                strokeWidth={2}
              />

              {compass.map((point) => (
                <SvgText
                  key={point.label}
                  x={point.x}
                  y={point.y}
                  fill="#8fffc0"
                  fontSize={12}
                  fontWeight="700"
                  textAnchor="middle"
                >
                  {point.label}
                </SvgText>
              ))}

              {blips.map((blip, index) => {
                const selectedBlip = selectedIndex === blip.projected.poiIndex;
                return (
                  <Circle
                    key={blip.source.id}
                    testID={`radar-blip-${blip.source.id}`}
                    accessibilityLabel={blip.source.name}
                    cx={blip.x}
                    cy={blip.y}
                    r={selectedBlip ? 7 : index < 12 ? 5 : 3.5}
                    fill={
                      selectedBlip
                        ? "#ffb341"
                        : blip.insideFOV
                          ? "#64a9ff"
                          : "#42ef91"
                    }
                    stroke={selectedBlip ? "white" : "rgba(0,0,0,0.45)"}
                    strokeWidth={selectedBlip ? 2 : 1}
                    onPress={() => setSelectedIndex(blip.projected.poiIndex)}
                  />
                );
              })}

              <Circle cx={center} cy={center} r={6} fill="#ffffff" />
              <Path
                d={`M ${center} ${center - 13} L ${center - 7} ${center + 3} L ${center + 7} ${center + 3} Z`}
                fill="#ffffff"
              />
            </Svg>

            {status !== "ready" ? (
              <View style={styles.radarMessage}>
                {status === "loading" || status === "calibrating" ? (
                  <ActivityIndicator color="#55ef98" />
                ) : null}
                <Text style={styles.radarMessageTitle}>
                  {status === "error" ? "RADAR ERROR" : "CALIBRATING"}
                </Text>
                <Text style={styles.radarMessageText}>
                  {error ??
                    `Compass calibration ${compassCalibration}%. Move the phone in a figure eight, then hold it steady while Cumquat freezes the geographic reference.`}
                </Text>
                {status === "error" ? (
                  <Pressable
                    style={styles.settingsButton}
                    onPress={() => void Linking.openSettings()}
                  >
                    <Text style={styles.settingsText}>OPEN SETTINGS</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </View>

          <View
            style={[
              styles.details,
              {
                width: Math.min(260, width * 0.28),
                minHeight: Math.min(270, height - 82),
              },
            ]}
          >
            <Text style={styles.detailsLabel}>SELECTED TARGET</Text>
            {selected ? (
              <>
                <Text style={styles.targetName}>{selected.source.name}</Text>
                <Text style={styles.targetDistance}>
                  {formatRadarDistance(selected.projected.distance)}
                </Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailKey}>Bearing</Text>
                  <Text style={styles.detailValue}>
                    {selected.projected.bearing.toFixed(1)}°
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailKey}>Relative</Text>
                  <Text style={styles.detailValue}>
                    {selected.relativeBearing.toFixed(1)}°
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailKey}>Elevation</Text>
                  <Text style={styles.detailValue}>
                    {Math.round(selected.source.alt)}m
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailKey}>Camera cone</Text>
                  <Text style={styles.detailValue}>
                    {selected.insideFOV ? "inside" : "outside"}
                  </Text>
                </View>
              </>
            ) : (
              <Text style={styles.emptyDetails}>Tap a radar blip to inspect it.</Text>
            )}

            <View style={styles.instructions}>
              <Text style={styles.instructionsTitle}>TWO-FINGER CONTROL</Text>
              <Text style={styles.instructionsText}>↕ adjust range</Text>
              <Text style={styles.instructionsText}>↔ adjust FOV cone</Text>
            </View>
            <Text style={styles.orientationContract}>
              {orientation?.convention ?? "orientation pending"}
            </Text>
          </View>
        </View>

        <RubberBandVisualFeedback
          isActive={rubberBanding}
          limitType={activeLimit}
          intensity={rubberBandIntensity}
        />
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: "#020806", padding: 10},
  header: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    paddingHorizontal: 10,
  },
  eyebrow: {color: "#438b64", fontSize: 8, letterSpacing: 1.7},
  title: {color: "#e7fff1", fontSize: 24, fontWeight: "300", letterSpacing: 4},
  metrics: {flex: 1, flexDirection: "row", justifyContent: "center", gap: 30},
  metric: {alignItems: "center", minWidth: 62},
  metricLabel: {color: "#4c8062", fontSize: 8, letterSpacing: 1},
  metricValue: {color: "#dffff0", fontSize: 13, fontWeight: "700", marginTop: 2},
  resetButton: {
    borderWidth: 1,
    borderColor: "#2a744c",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  resetText: {color: "#8fffc0", fontSize: 10, fontWeight: "700"},
  content: {flex: 1, flexDirection: "row", justifyContent: "center", gap: 22},
  radarShell: {
    alignSelf: "center",
    justifyContent: "center",
    alignItems: "center",
  },
  radarMessage: {
    position: "absolute",
    width: "58%",
    alignItems: "center",
    gap: 8,
    padding: 16,
    borderRadius: 12,
    backgroundColor: "rgba(1,8,5,0.88)",
  },
  radarMessageTitle: {color: "#9bffc4", fontWeight: "800", letterSpacing: 1.5},
  radarMessageText: {color: "#7bad90", fontSize: 11, textAlign: "center", lineHeight: 16},
  settingsButton: {borderWidth: 1, borderColor: "#337d53", borderRadius: 7, padding: 8},
  settingsText: {color: "#9bffc4", fontSize: 9, fontWeight: "700"},
  details: {
    alignSelf: "center",
    padding: 17,
    borderWidth: 1,
    borderColor: "#153b29",
    borderRadius: 14,
    backgroundColor: "#07130e",
  },
  detailsLabel: {color: "#4d8d68", fontSize: 9, letterSpacing: 1.4},
  targetName: {color: "#f2fff7", fontSize: 20, fontWeight: "700", marginTop: 10},
  targetDistance: {color: "#50ed94", fontSize: 24, fontWeight: "300", marginBottom: 10},
  detailRow: {flexDirection: "row", justifyContent: "space-between", paddingVertical: 3},
  detailKey: {color: "#5e8a70", fontSize: 11},
  detailValue: {color: "#d8f8e5", fontSize: 11, fontVariant: ["tabular-nums"]},
  emptyDetails: {color: "#70917d", fontSize: 13, lineHeight: 19, marginTop: 16},
  instructions: {marginTop: "auto", paddingTop: 18},
  instructionsTitle: {color: "#4d8d68", fontSize: 8, letterSpacing: 1.1, marginBottom: 5},
  instructionsText: {color: "#a0c9b0", fontSize: 11, lineHeight: 17},
  orientationContract: {color: "#315e44", fontSize: 8, marginTop: 10},
});
