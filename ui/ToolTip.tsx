// components/QuickHelpTooltip.tsx
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

interface QuickHelpTooltipProps {
  onClose: () => void;
}

export function QuickHelpTooltip({ onClose }: QuickHelpTooltipProps) {
  return (
    <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.overlay}>
      <View style={styles.tooltip}>
        <Text style={styles.title}>🎯 Two-Finger Gestures</Text>

        <View style={styles.row}>
          <Text style={styles.emoji}>👆⬆️⬇️</Text>
          <Text style={styles.text}>
            <Text style={styles.highlight}>Top finger</Text> → Adjust{" "}
            <Text style={styles.blue}>MAX distance</Text>
          </Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.emoji}>👇⬆️⬇️</Text>
          <Text style={styles.text}>
            <Text style={styles.highlight}>Bottom finger</Text> → Adjust{" "}
            <Text style={styles.green}>MIN distance</Text>
          </Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.emoji}>🤲⬆️⬇️</Text>
          <Text style={styles.text}>
            <Text style={styles.highlight}>Both fingers</Text> →{" "}
            <Text style={styles.orange}>Camera Zoom</Text>
          </Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.emoji}>✋↔️</Text>
          <Text style={styles.text}>
            <Text style={styles.highlight}>Horizontal pinch</Text> →{" "}
            <Text style={styles.cyan}>Field of View</Text>
          </Text>
        </View>

        <View style={styles.divider} />

        <Text style={styles.footer}>💡 Rubber band effect = limit reached</Text>

        <TouchableOpacity onPress={onClose} style={styles.gotItButton}>
          <Text style={styles.gotItText}>Got it!</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  tooltip: {
    backgroundColor: "#1a1a2e",
    borderRadius: 16,
    padding: 20,
    width: "85%",
    borderWidth: 1,
    borderColor: "#00ffff",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#00ffff",
    textAlign: "center",
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  emoji: {
    fontSize: 24,
    width: 60,
    textAlign: "center",
  },
  text: {
    fontSize: 14,
    color: "#ffffff",
    flex: 1,
  },
  highlight: {
    fontWeight: "bold",
    color: "#ffffff",
  },
  blue: {
    color: "#2196F3",
    fontWeight: "bold",
  },
  green: {
    color: "#4CAF50",
    fontWeight: "bold",
  },
  orange: {
    color: "#FF9800",
    fontWeight: "bold",
  },
  cyan: {
    color: "#00BCD4",
    fontWeight: "bold",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginVertical: 12,
  },
  footer: {
    fontSize: 12,
    color: "#888888",
    textAlign: "center",
    marginBottom: 16,
  },
  gotItButton: {
    backgroundColor: "#00ffff",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  gotItText: {
    color: "#1a1a2e",
    fontWeight: "bold",
    fontSize: 16,
  },
});
