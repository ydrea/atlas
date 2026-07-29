// components/FOVVisualFeedback.tsx
import React, { useEffect } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  cancelAnimation,
} from "react-native-reanimated";
import Svg, { Rect, Circle, Path, Text as SvgText } from "react-native-svg";

const { width, height } = Dimensions.get("window");

interface FOVVisualFeedbackProps {
  isActive: boolean;
  fov: number;
  isRubberBanding: boolean;
  intensity: number;
}

export function FOVVisualFeedback({
  isActive,
  fov,
  isRubberBanding,
  intensity,
}: FOVVisualFeedbackProps) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(1);
  const rotate = useSharedValue(0);

  useEffect(() => {
    if (!isActive) {
      opacity.value = withSpring(0, { damping: 15 });
      scale.value = withSpring(1);
      cancelAnimation(rotate);
      rotate.value = withSpring(0);
      return;
    }

    // Show FOV indicator
    opacity.value = withSpring(0.8, { damping: 12 });

    if (isRubberBanding) {
      // Pulse effect when hitting FOV limits
      scale.value = withSequence(
        withTiming(1.2, { duration: 100 }),
        withTiming(0.9, { duration: 100 }),
        withTiming(1.1, { duration: 100 }),
        withSpring(1, { damping: 10 }),
      );

      rotate.value = withSequence(
        withTiming(5, { duration: 50 }),
        withTiming(-5, { duration: 50 }),
        withTiming(3, { duration: 50 }),
        withTiming(0, { duration: 100 }),
      );
    } else {
      scale.value = withSpring(1 + intensity * 0.1);
    }
  }, [isActive, isRubberBanding, intensity]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }, { rotate: `${rotate.value}deg` }],
  }));

  // Calculate FOV angle visualization
  const minFOV = 30;
  const maxFOV = 120;
  const normalizedFOV = (fov - minFOV) / (maxFOV - minFOV);
  const angle = 30 + normalizedFOV * 60; // 30° to 90° visualization

  const centerX = width / 2;
  const centerY = height / 2;
  const radius = 150;

  // Calculate arc points for FOV visualization
  const radAngle = (angle * Math.PI) / 180;
  const leftX = centerX - radius * Math.sin(radAngle);
  const leftY = centerY - radius * Math.cos(radAngle);
  const rightX = centerX + radius * Math.sin(radAngle);
  const rightY = centerY - radius * Math.cos(radAngle);

  return (
    <Animated.View
      style={[styles.container, containerStyle]}
      pointerEvents="none"
    >
      <Svg style={StyleSheet.absoluteFill}>
        {/* FOV Arc */}
        <Path
          d={`M ${centerX} ${centerY} L ${leftX} ${leftY} A ${radius} ${radius} 0 0 1 ${rightX} ${rightY} Z`}
          fill="rgba(0, 255, 255, 0.15)"
          stroke="#00ffff"
          strokeWidth={2}
        />

        {/* FOV boundary lines */}
        <Path
          d={`M ${centerX} ${centerY} L ${leftX} ${leftY}`}
          stroke="#00ffff"
          strokeWidth={2}
          strokeDasharray={[5, 5]}
        />
        <Path
          d={`M ${centerX} ${centerY} L ${rightX} ${rightY}`}
          stroke="#00ffff"
          strokeWidth={2}
          strokeDasharray={[5, 5]}
        />

        {/* FOV arc label */}
        <Circle
          cx={centerX}
          cy={centerY - radius - 20}
          r={20}
          fill="rgba(0,0,0,0.7)"
        />
        <SvgText
          x={centerX}
          y={centerY - radius - 20}
          fill="#00ffff"
          fontSize={14}
          fontWeight="bold"
          textAnchor="middle"
          alignmentBaseline="middle"
        >
          {Math.round(fov)}°
        </SvgText>

        {/* Horizontal pinch indicators */}
        <Path
          d={`M ${width * 0.2} ${height - 100} L ${width * 0.35} ${height - 100}`}
          stroke={isRubberBanding ? "#ff4444" : "#00ffff"}
          strokeWidth={3}
          strokeLinecap="round"
        />
        <Path
          d={`M ${width * 0.65} ${height - 100} L ${width * 0.8} ${height - 100}`}
          stroke={isRubberBanding ? "#ff4444" : "#00ffff"}
          strokeWidth={3}
          strokeLinecap="round"
        />

        {/* Pinch arrows */}
        <Path
          d={`M ${width * 0.18} ${height - 100} L ${width * 0.22} ${height - 100}`}
          stroke="#ffffff"
          strokeWidth={2}
          strokeLinecap="round"
        />
        <Path
          d={`M ${width * 0.78} ${height - 100} L ${width * 0.82} ${height - 100}`}
          stroke="#ffffff"
          strokeWidth={2}
          strokeLinecap="round"
        />

        {/* Instruction text */}
        <SvgText
          x={centerX}
          y={height - 70}
          fill={isRubberBanding ? "#ff4444" : "#00ffff"}
          fontSize={12}
          textAnchor="middle"
        >
          {isRubberBanding
            ? "FOV LIMIT REACHED"
            : "← Horizontal pinch → Adjust FOV"}
        </SvgText>
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    opacity: 0.5,
  },
});
