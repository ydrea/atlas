// utils/updates.js
import * as Updates from "expo-updates";
import { Alert } from "react-native";

/**
 * Check for and apply updates if available
 * @param channel The update channel to check (e.g., 'preview', 'production')
 * @param silent If true, don't show alerts to the user
 */
export async function checkForUpdates(channel, silent = false) {
  try {
    // If channel specified, verify we're on the right one first
    if (channel) {
      const currentInfo = await getCurrentUpdateInfo();
      if (
        currentInfo.channel !== channel &&
        currentInfo.channel !== "unknown"
      ) {
        return false;
      }
    }

    const update = await Updates.checkForUpdateAsync();

    if (update.isAvailable) {
      if (!silent) {
        Alert.alert(
          "Update Available",
          "A new version is available. Restarting app...",
          [{ text: "OK" }],
        );
      }

      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
      return true;
    } else {
      return false;
    }
  } catch {
    if (!silent) {
      Alert.alert(
        "Update Error",
        "Failed to check for updates. Using cached version.",
      );
    }
    return false;
  }
}

/**
 * Get current update information
 */
export async function getCurrentUpdateInfo() {
  try {
    const update = await Updates.getCurrentUpdateAsync();
    return {
      updateId: update?.updateId ?? "unknown",
      channel: update?.channel ?? "unknown",
      runtimeVersion: update?.runtimeVersion ?? "unknown",
      isEmbeddedLaunch: update?.isEmbeddedLaunch ?? true,
    };
  } catch {
    return {
      updateId: "unknown",
      channel: "unknown",
      runtimeVersion: "unknown",
      isEmbeddedLaunch: true,
    };
  }
}

/**
 * Configure update behavior based on environment
 * @param buildProfile The build profile (development, preview, production)
 */
export function configureUpdates(buildProfile) {
  // Only configure updates in production builds
  if (__DEV__ === false) {
    // Set update check interval (in seconds)
    Updates.checkForUpdateAsync();

  }

}

/**
 * Get the appropriate update channel based on build profile
 */
export function getUpdateChannel(buildProfile) {
  switch (buildProfile) {
    case "development":
      return "development";
    case "preview":
      return "preview";
    default:
      return "production";
  }
}
