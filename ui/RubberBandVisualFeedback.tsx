import React from "react";
import {StyleSheet, Text, View, type ViewStyle} from "react-native";

import type {LimitType} from "@/cumquat/gestures/types";

type RubberBandVisualFeedbackProps = {
  isActive: boolean;
  limitType: LimitType | null;
  intensity: number;
};

const LABELS: Record<LimitType, string> = {
  min: "MIN LIMIT REACHED",
  max: "MAX LIMIT REACHED",
  zoom: "ZOOM LIMIT REACHED",
  fov: "FOV LIMIT REACHED",
};

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function getEdgeStyles(limitType: LimitType): ViewStyle[] {
  switch (limitType) {
    case "min":
      return [styles.horizontalEdge, styles.topEdge];
    case "max":
      return [styles.horizontalEdge, styles.bottomEdge];
    case "zoom":
      return [styles.verticalEdge, styles.leftEdge];
    case "fov":
      return [styles.verticalEdge, styles.rightEdge];
  }
}

export function RubberBandVisualFeedback({
  isActive,
  limitType,
  intensity,
}: RubberBandVisualFeedbackProps) {
  if (!isActive || limitType === null) return null;

  const strength = clamp01(intensity);
  const edgeStyles = getEdgeStyles(limitType);

  return (
    <View pointerEvents="none" style={styles.container}>
      <View
        style={[
          styles.edge,
          ...edgeStyles,
          {opacity: 0.25 + strength * 0.65},
        ]}
      />

      {strength >= 0.5 ? (
        <View style={styles.labelContainer}>
          <Text style={styles.label}>{LABELS[limitType]}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    overflow: "hidden",
  },
  edge: {
    position: "absolute",
    backgroundColor: "rgba(255,255,255,0.85)",
  },
  horizontalEdge: {
    left: 0,
    right: 0,
    height: 4,
  },
  verticalEdge: {
    top: 0,
    bottom: 0,
    width: 4,
  },
  topEdge: {
    top: 0,
  },
  bottomEdge: {
    bottom: 0,
  },
  leftEdge: {
    left: 0,
  },
  rightEdge: {
    right: 0,
  },
  labelContainer: {
    position: "absolute",
    top: "50%",
    left: 0,
    right: 0,
    alignItems: "center",
    marginTop: -18,
  },
  label: {
    color: "white",
    fontSize: 14,
    fontWeight: "700",
    backgroundColor: "rgba(0,0,0,0.72)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
    overflow: "hidden",
    textAlign: "center",
  },
});
