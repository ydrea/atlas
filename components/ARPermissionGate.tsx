import ARBetaNativeOverlayView from "@/components/ARBetaNativeOverlayView";
import {usePermissions} from "@/hooks/usePermissions";
import {useCallback, useEffect, useState} from "react";
import {
  ActivityIndicator,
  AppState,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function ARPermissionGate() {
  const permissions = usePermissions();
  const [requesting, setRequesting] = useState(false);
  const [initialAttemptComplete, setInitialAttemptComplete] = useState(false);

  const requestPermissions = useCallback(async () => {
    setRequesting(true);

    try {
      await permissions.requestAllPermissions();
    } finally {
      setRequesting(false);
      setInitialAttemptComplete(true);
    }
  }, [permissions.requestAllPermissions]);

  useEffect(() => {
    void requestPermissions();
  }, [requestPermissions]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void permissions.refreshPermissions();
      }
    });

    return () => subscription.remove();
  }, [permissions.refreshPermissions]);

  if (
    permissions.isChecking ||
    requesting ||
    !initialAttemptComplete
  ) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#ff4412" />
        <Text style={styles.message}>Preparing AR permissions…</Text>
      </View>
    );
  }

  if (permissions.allGranted) {
    return <ARBetaNativeOverlayView />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>AR permissions required</Text>
      <Text style={styles.message}>
        Missing: {permissions.missingPermissions.join(", ") || "Unknown"}
      </Text>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.button} onPress={requestPermissions}>
          <Text style={styles.buttonText}>Try again</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={permissions.openSettings}
        >
          <Text style={styles.buttonText}>Open settings</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    padding: 24,
    backgroundColor: "#010101",
  },
  title: {
    color: "white",
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },
  message: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 15,
    textAlign: "center",
  },
  actions: {
    flexDirection: "row",
    gap: 12,
  },
  button: {
    minWidth: 130,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: "#666aaa",
  },
  secondaryButton: {
    backgroundColor: "#444",
  },
  buttonText: {
    color: "white",
    fontWeight: "600",
  },
});
