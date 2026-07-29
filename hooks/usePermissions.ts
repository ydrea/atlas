// hooks/usePermissions.ts

import {useCameraPermissions} from "expo-camera";
import * as Location from "expo-location";
import {DeviceMotion} from "expo-sensors";
import {useCallback, useEffect, useMemo, useState} from "react";
import {Linking, Platform} from "react-native";

type IOSLocationAccuracy = "full" | "reduced" | null;

function getIOSLocationAccuracy(
  permission: Location.LocationPermissionResponse,
): IOSLocationAccuracy {
  return permission.ios?.accuracy ?? null;
}

function isPreciseLocation(
  permission: Location.LocationPermissionResponse,
): boolean {
  return Platform.OS !== "ios" || permission.ios?.accuracy !== "reduced";
}

export function usePermissions() {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [locationGranted, setLocationGranted] = useState(false);
  const [locationAccuracy, setLocationAccuracy] =
    useState<IOSLocationAccuracy>(null);
  const [motionGranted, setMotionGranted] = useState(false);
  const [motionAvailable, setMotionAvailable] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  const applyLocationPermission = useCallback(
    (permission: Location.LocationPermissionResponse) => {
      setLocationGranted(permission.status === "granted");
      setLocationAccuracy(getIOSLocationAccuracy(permission));
      return permission.status === "granted" && isPreciseLocation(permission);
    },
    [],
  );

  const refreshPermissions = useCallback(async () => {
    setChecking(true);

    try {
      const [locationPermission, available, motionPermission] =
        await Promise.all([
          Location.getForegroundPermissionsAsync(),
          DeviceMotion.isAvailableAsync(),
          DeviceMotion.getPermissionsAsync(),
        ]);

      applyLocationPermission(locationPermission);
      setMotionAvailable(available);
      setMotionGranted(available && motionPermission.status === "granted");
    } finally {
      setChecking(false);
    }
  }, [applyLocationPermission]);

  useEffect(() => {
    void refreshPermissions();
  }, [refreshPermissions]);

  const requestLocationPermission = useCallback(async () => {
    let permission = await Location.getForegroundPermissionsAsync();

    if (permission.status !== "granted") {
      permission = await Location.requestForegroundPermissionsAsync();
    }

    return applyLocationPermission(permission);
  }, [applyLocationPermission]);

  const requestMotionPermission = useCallback(async () => {
    const available = await DeviceMotion.isAvailableAsync();
    setMotionAvailable(available);

    if (!available) {
      setMotionGranted(false);
      return false;
    }

    let permission = await DeviceMotion.getPermissionsAsync();
    if (permission.status !== "granted") {
      permission = await DeviceMotion.requestPermissionsAsync();
    }

    const granted = permission.status === "granted";
    setMotionGranted(granted);
    return granted;
  }, []);

  const requestAllPermissions = useCallback(async () => {
    setChecking(true);

    try {
      let camera = cameraPermission?.granted ?? false;

      if (!camera) {
        const cameraResult = await requestCameraPermission();
        camera = cameraResult.granted;
      }

      const location = await requestLocationPermission();
      const motion = await requestMotionPermission();

      return camera && location && motion;
    } finally {
      setChecking(false);
    }
  }, [
    cameraPermission?.granted,
    requestCameraPermission,
    requestLocationPermission,
    requestMotionPermission,
  ]);

  const camera = cameraPermission?.granted ?? false;
  const location = locationGranted;
  const preciseLocation =
    location && (Platform.OS !== "ios" || locationAccuracy !== "reduced");
  const motion = motionAvailable === true && motionGranted;
  const allGranted = camera && location && preciseLocation && motion;
  const isChecking = checking || cameraPermission === null;

  const missingPermissions = useMemo(
    () =>
      [
        !camera && "Camera",
        !location && "Location",
        location && !preciseLocation && "Precise location",
        motionAvailable === false && "Device motion unavailable",
        motionAvailable !== false && !motion && "Motion",
      ].filter((value): value is string => Boolean(value)),
    [camera, location, motion, motionAvailable, preciseLocation],
  );

  return {
    camera,
    location,
    locationAccuracy,
    preciseLocation,
    motion,
    motionAvailable,
    allGranted,
    isChecking,
    missingPermissions,

    requestCameraPermission,
    requestLocationPermission,
    requestMotionPermission,
    requestAllPermissions,
    refreshPermissions,

    openSettings: () => Linking.openSettings(),
  };
}
