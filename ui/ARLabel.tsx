import { Text, View } from "react-native";
import Svg, { Circle, Line } from "react-native-svg";

type Props = {
  id: string | number;
  name: string;
  world: {
    distance: number;
  };
  screen: {
    x: number;
    y: number;
    scale?: number;
    opacity?: number;
    stability?: number;
    anchorX?: number;
    anchorY?: number;
  };
  screenWidth: number;
};

function formatDistance(d: number) {
  if (d < 1000) return `${Math.round(d)} m`;
  return `${(d / 1000).toFixed(1)} km`;
}

function normalizeDistance(d: number, min = 100, max = 50000) {
  return Math.min(1, Math.max(0, (d - min) / (max - min)));
}

export function ARLabel({ name, world, screen, screenWidth }: Props) {
  const {
    x,
    y,
    scale = 1,
    opacity = 1,
    stability = 1,
    anchorX,
    anchorY,
  } = screen;

  const distance = world.distance;

  // 📐 bearing factor (-1 left → +1 right)
  const centerX = screenWidth / 2;
  const bearing = (x - centerX) / centerX;

  // smooth clamp
  const b = Math.max(-1, Math.min(1, bearing));

  // 🎯 alignment shift
  const alignOffsetX = b * 12; // tweak (10–30 feels good)
  //more cinematic → 30 / 12
  //subtle (recommended) → 15 / 6

  // 🎯 subtle rotation (very small!)
  const rotation = b * 2; // degrees

  // 📏 displacement for leader line
  const dx = (anchorX ?? x) - x;
  const dy = (anchorY ?? y) - y;
  const distPx = Math.sqrt(dx * dx + dy * dy);

  const SHOW_LINE_THRESHOLD = 12;
  const showLine = distPx > SHOW_LINE_THRESHOLD;

  // 🎯 depth fade
  const dNorm = normalizeDistance(distance);
  const depthFade = 1 - dNorm * 0.85;
  const stabilityFade = stability ?? 1;

  const lineOpacity = showLine ? depthFade * stabilityFade : 0;
  const strokeWidth = 1.5 * (1 - dNorm * 0.5);

  const distanceLabel = formatDistance(distance);

  return (
    <View
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: [
          { translateX: alignOffsetX },
          { rotate: `${rotation}deg` },
          { scale },
        ],
        opacity,
        alignItems: "center",
      }}
    >
      {/* 🔗 Leader line */}
      {showLine && anchorX != null && anchorY != null && (
        <Svg
          style={{
            position: "absolute",
            left: -(x - anchorX),
            top: -(y - anchorY),
            width: Math.abs(dx),
            height: Math.abs(dy),
          }}
        >
          <Line
            x1={dx > 0 ? 0 : Math.abs(dx)}
            y1={dy > 0 ? 0 : Math.abs(dy)}
            x2={dx > 0 ? Math.abs(dx) : 0}
            y2={dy > 0 ? Math.abs(dy) : 0}
            stroke="white"
            strokeWidth={strokeWidth}
            opacity={lineOpacity}
          />
          <Circle
            cx={dx > 0 ? 0 : Math.abs(dx)}
            cy={dy > 0 ? 0 : Math.abs(dy)}
            r={2}
            fill="white"
            opacity={lineOpacity}
          />
        </Svg>
      )}

      {/* 🏷 Label */}
      <View
        style={{
          backgroundColor: "rgba(0,0,0,0.7)",
          paddingHorizontal: 8,
          paddingVertical: 4,
          borderRadius: 6,
          alignItems: "center",
        }}
      >
        <Text
          style={{
            color: "white",
            fontSize: 12,
            fontWeight: "600",
          }}
        >
          {name}
        </Text>

        <Text
          style={{
            color: "#ccc",
            fontSize: 10,
            marginTop: 1,
          }}
        >
          {distanceLabel}
        </Text>
      </View>
    </View>
  );
}
