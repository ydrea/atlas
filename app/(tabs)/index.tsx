import {useLanguage} from "@/contexts/LanguageContext";
import {
  getCompassCalibrationPercent,
  sensorHub,
} from "@/cumquat/sensors";
import type {CompassAccuracy} from "@/cumquat/types";
import {usePermissions} from "@/hooks/usePermissions";
import {router} from "expo-router";
import {useCallback, useEffect, useState} from "react";

import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";

export default function IndexScreen() {
  const {height: screenHeight} = useWindowDimensions();
  const {
    currentLanguage,
    availableLanguages,
    changeLanguage,
    translate,
    getFlagEmoji,
  } = useLanguage();
  const permissions = usePermissions();
  const [permissionsReady, setPermissionsReady] = useState(false);
  const [ready, setReady] = useState(false);
  const [startupError, setStartupError] = useState<string | null>(null);
  const [heading, setHeading] = useState(0);
  const [headingAccuracy, setHeadingAccuracy] =
    useState<CompassAccuracy>(0);

  const calibrationPercent =
    getCompassCalibrationPercent(headingAccuracy);

  const prepareAR = useCallback(async () => {
    setPermissionsReady(false);
    setReady(false);
    setStartupError(null);

    try {
      const granted = await permissions.requestAllPermissions();
      if (!granted) {
        setPermissionsReady(true);
        return false;
      }

      await sensorHub.start();
      setPermissionsReady(true);
      setReady(true);
      return true;
    } catch (error: unknown) {
      setStartupError(
        error instanceof Error ? error.message : "Unable to start AR sensors.",
      );
      setPermissionsReady(true);
      setReady(false);
      return false;
    }
  }, [permissions.requestAllPermissions]);

  useEffect(() => {
    let cancelled = false;

    void prepareAR().then((started) => {
      if (cancelled && started) sensorHub.stop();
    });

    return () => {
      cancelled = true;
      sensorHub.stop();
    };
  }, []);

  useEffect(() => {
    if (!ready) return;

    const updateCompassState = () => {
      const snapshot = sensorHub.getSnapshot();
      setHeading(snapshot.heading);
      setHeadingAccuracy(snapshot.headingAccuracy);
    };

    updateCompassState();
    const snapshotInterval = setInterval(updateCompassState, 100);
    return () => clearInterval(snapshotInterval);
  }, [ready]);

  const canStart =
    ready &&
    permissionsReady &&
    permissions.allGranted &&
    Boolean(currentLanguage);

  const handleStartAR = () => {
    router.replace("./gest");
  };

  const handleRetry = () => {
    void prepareAR();
  };

  const getLanguageName = (langCode: string): string => {
    const languageMap: Record<string, string> = {
      hr: "hr",
      en: "en",
      de: "de",
      fr: "fr",
      it: "it",
      es: "es",
    };
    return languageMap[langCode] ?? langCode.toUpperCase();
  };

  const showPermissionProblem =
    permissionsReady && (!permissions.allGranted || startupError !== null);

  return (
    <View style={styles.container}>
      <View style={styles.textGroup}>
        <Text style={styles.calibrationText}>
          {translate("compassCalibration")}: {calibrationPercent}% (
          {heading.toFixed(0)}°)
        </Text>

        {ready && headingAccuracy < 2 ? (
          <Text style={styles.calibrationHint}>
            Move the phone in a figure eight
          </Text>
        ) : null}
      </View>

      {!permissionsReady && (
        <ActivityIndicator size="large" color="#ff4412" />
      )}

      {showPermissionProblem ? (
        <View style={styles.permissionPanel}>
          <Text style={styles.permissionTitle}>AR setup required</Text>
          <Text style={styles.permissionText}>
            {startupError ??
              `Missing: ${permissions.missingPermissions.join(", ") || "Unknown permission"}`}
          </Text>

          <View style={styles.permissionActions}>
            <TouchableOpacity style={styles.permissionButton} onPress={handleRetry}>
              <Text style={styles.permissionButtonText}>Try again</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.permissionButton, styles.settingsButton]}
              onPress={permissions.openSettings}
            >
              <Text style={styles.permissionButtonText}>Open settings</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {ready && permissions.allGranted && (
        <View style={styles.readyContainer}>
          <Text style={styles.sectionTitle}>{translate("selectLanguage")}</Text>

          <View
            style={[styles.scrollContainer, {maxHeight: screenHeight * 0.4}]}
          >
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator
            >
              {availableLanguages.map((lang: string) => {
                const flag = getFlagEmoji(lang);
                const isSelected = currentLanguage === lang;

                return (
                  <TouchableOpacity
                    key={lang}
                    onPress={() => changeLanguage(lang)}
                    style={[
                      styles.languageButton,
                      {
                        backgroundColor: isSelected ? "#666aaa" : "#333",
                      },
                    ]}
                  >
                    <Text style={styles.flagText}>{flag}</Text>
                    <Text style={styles.languageText}>
                      {getLanguageName(lang)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <TouchableOpacity
            onPress={handleStartAR}
            disabled={!canStart}
            style={[
              styles.startButton,
              {
                backgroundColor: canStart ? "#666aaa" : "#666",
              },
            ]}
          >
            <Text style={styles.startButtonText}>{translate("startAR")}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#010101",
    gap: 15,
  },
  textGroup: {
    alignItems: "center",
    marginBottom: 20,
  },
  calibrationText: {
    color: "white",
    fontSize: 16,
  },
  calibrationHint: {
    marginTop: 6,
    color: "rgba(255,255,255,0.65)",
    fontSize: 12,
  },
  permissionPanel: {
    width: "80%",
    maxWidth: 520,
    alignItems: "center",
    gap: 12,
    padding: 20,
    borderRadius: 12,
    backgroundColor: "#171717",
  },
  permissionTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
  },
  permissionText: {
    color: "rgba(255,255,255,0.72)",
    textAlign: "center",
  },
  permissionActions: {
    flexDirection: "row",
    gap: 12,
  },
  permissionButton: {
    minWidth: 120,
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 9,
    backgroundColor: "#666aaa",
  },
  settingsButton: {
    backgroundColor: "#444",
  },
  permissionButtonText: {
    color: "white",
    fontWeight: "600",
  },
  readyContainer: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    color: "white",
    marginBottom: 6,
    fontSize: 12,
    fontWeight: "600",
  },
  scrollContainer: {
    width: "100%",
    marginBottom: 4,
  },
  scrollContent: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 14,
  },
  languageButton: {
    width: "14%",
    padding: 4,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  flagText: {
    fontSize: 18,
    marginRight: 8,
  },
  languageText: {
    color: "white",
    fontSize: 14,
  },
  startButton: {
    marginTop: 20,
    width: "80%",
    maxWidth: 320,
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  startButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 12,
  },
});
