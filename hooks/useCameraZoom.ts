// hooks/useCameraZoom.ts
import React, {useCallback, useRef} from "react";
import {CameraView} from "expo-camera";
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedProps,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

const ReanimatedCamera = Animated.createAnimatedComponent(CameraView);
type ReanimatedCameraProps = React.ComponentProps<typeof ReanimatedCamera>;

// The AR screen only needs a live preview. Force picture mode even if an older
// caller still passes mode="video", avoiding unnecessary video/audio setup.
const AnimatedCamera = React.forwardRef<CameraView, ReanimatedCameraProps>(
  (props, ref) =>
    React.createElement(ReanimatedCamera as React.ComponentType<any>, {
      ...props,
      ref,
      mode: "picture",
    }),
);
AnimatedCamera.displayName = "ARPreviewCamera";

type ZoomAnimation = "spring" | "timing";

type SpringConfig = {
  damping?: number;
  mass?: number;
  stiffness?: number;
};

type UseCameraZoomOptions = {
  initialZoom?: number;
  springConfig?: SpringConfig;
  onZoomChange?: (zoom: number) => void;
};

function clampZoom(value: number): number {
  "worklet";
  return Math.min(1, Math.max(0, value));
}

export function useCameraZoom({
  initialZoom = 0,
  springConfig,
  onZoomChange,
}: UseCameraZoomOptions = {}) {
  const cameraRef = useRef<CameraView | null>(null);
  const animatedZoom = useSharedValue(clampZoom(initialZoom));
  const isAnimating = useSharedValue(false);

  const damping = springConfig?.damping ?? 24;
  const mass = springConfig?.mass ?? 1;
  const stiffness = springConfig?.stiffness ?? 240;

  const animatedProps = useAnimatedProps(() => ({
    zoom: animatedZoom.value,
  }));

  const animateZoom = useCallback(
    (
      targetZoom: number,
      animation: ZoomAnimation = "spring",
      duration = 300,
    ) => {
      "worklet";

      const target = clampZoom(targetZoom);
      cancelAnimation(animatedZoom);
      isAnimating.value = true;

      const finished = (didFinish?: boolean) => {
        "worklet";

        if (!didFinish) return;
        isAnimating.value = false;

        if (onZoomChange) {
          runOnJS(onZoomChange)(target);
        }
      };

      if (animation === "timing") {
        animatedZoom.value = withTiming(
          target,
          {
            duration,
            easing: Easing.inOut(Easing.cubic),
          },
          finished,
        );
        return;
      }

      animatedZoom.value = withSpring(
        target,
        {
          damping,
          mass,
          stiffness,
        },
        finished,
      );
    },
    [animatedZoom, damping, isAnimating, mass, onZoomChange, stiffness],
  );

  const setZoom = useCallback(
    (zoom: number) => {
      "worklet";

      cancelAnimation(animatedZoom);
      isAnimating.value = false;
      animatedZoom.value = clampZoom(zoom);
    },
    [animatedZoom, isAnimating],
  );

  const resetZoom = useCallback(() => {
    animateZoom(0, "spring");
  }, [animateZoom]);

  return {
    cameraRef,
    animatedZoom,
    animatedProps,
    AnimatedCamera,
    animateZoom,
    setZoom,
    resetZoom,
    isAnimating,
  };
}
