// import { ThemedText } from "@/components/themed-text";
import { StyleSheet, View, Text } from "react-native";

interface DebugOverlayProps {
  pitch?: number;
  yaw?: number;
  roll?: number;
  location: {
    coords: {
      latitude: number;
      longitude: number;
      accuracy?: number;
    };
  } | null;
  islandCount?: number;
  fov?: number;
  minDistance?: number;
  maxDistance?: number;
}

export function DebugOverlay({
  pitch,
  yaw,
  roll,
  location,
  islandCount,
  fov,
  minDistance,
  maxDistance,
}: DebugOverlayProps) {
  const lat = location?.coords.latitude;
  const lng = location?.coords.longitude;
  const accuracy = location?.coords.accuracy;

  return (
    <View style={styles.container}>
      {/* prettier-ignore */}
      <Text style={styles.text}>
        Heading: {yaw?.toFixed(1) ?? "—"}°
        Pitch: {pitch?.toFixed(1) ?? "—"}°
        Roll: {roll?.toFixed(1) ?? "—"}°
      </Text>

      {lat != null && (
        <Text style={styles.text}>Lat: {lat.toFixed(5)}</Text>
      )}

      {lng != null && (
        <Text style={styles.text}>Lng: {lng.toFixed(5)}</Text>
      )}

      {accuracy != null && (
        <Text style={styles.text}>
          GPS ±{accuracy.toFixed(1)} m
        </Text>
      )}

      <Text style={styles.text}>Visible POIs: {islandCount}</Text>
      <Text style={styles.text}>
        FOV: {fov?.toFixed(0) ?? "—"}°
      </Text>
      <Text style={styles.text}>
        Range: {minDistance ?? 0}m — {maxDistance ?? 0}m
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 10,
    left: 10,
    padding: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 8,
  },
  text: {
    fontSize: 10,
    color: "#ffffff",
    fontFamily: "monospace",
  },
});
