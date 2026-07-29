// sensors.ts - sensor hub and math utilities for Cumquat AR
import {DeviceMotion} from "expo-sensors";
import * as Location from "expo-location";
import {Platform} from "react-native";

import {AR_CONSTANTS} from "@/cumquat/constants";

import {nativeProjectionDebug} from "./nativeProjectionDebug";
import type {
  DeviceScreenOrientationDegrees,
  Quat,
  ScreenPosition,
  SensorSnapshot,
  Vec3,
} from "./types";

const {DEG2RAD, RAD2DEG, WGS84_F, WGS84_A} = AR_CONSTANTS;
const WGS84_E2 = WGS84_F * (2 - WGS84_F);

export type SensorStartErrorCode =
  | "motion-unavailable"
  | "motion-permission-denied"
  | "location-permission-denied"
  | "precise-location-required";

export class SensorStartError extends Error {
  readonly code: SensorStartErrorCode;

  constructor(code: SensorStartErrorCode, message: string) {
    super(message);
    this.name = "SensorStartError";
    this.code = code;
  }
}

function normalizeHeading(degrees: number): number {
  if (!Number.isFinite(degrees)) return 0;
  return ((degrees % 360) + 360) % 360;
}

function normalizeHeadingAccuracy(value: number): 0 | 1 | 2 | 3 {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(3, Math.round(value))) as 0 | 1 | 2 | 3;
}

function normalizeScreenOrientation(
  value: number,
): DeviceScreenOrientationDegrees {
  if (value === 90 || value === 180 || value === -90) return value;
  return 0;
}

function hasPreciseLocation(
  permission: Location.LocationPermissionResponse,
): boolean {
  return Platform.OS !== "ios" || permission.ios?.accuracy !== "reduced";
}

function getCompassCalibrationPercent(accuracy: number): number {
  return Math.round((normalizeHeadingAccuracy(accuracy) / 3) * 100);
}

// ============ QUATERNION MATH ============

function inverse(q: Quat): Quat {
  const norm = Math.hypot(q.x, q.y, q.z, q.w);
  if (norm === 0) return {x: 0, y: 0, z: 0, w: 1};

  return {
    x: -q.x / norm,
    y: -q.y / norm,
    z: -q.z / norm,
    w: q.w / norm,
  };
}

function rotateVector(v: Vec3, q: Quat): Vec3 {
  const {x: qx, y: qy, z: qz, w: qw} = q;
  const {x: vx, y: vy, z: vz} = v;

  const tx = 2 * (qy * vz - qz * vy);
  const ty = 2 * (qz * vx - qx * vz);
  const tz = 2 * (qx * vy - qy * vx);

  const result = {
    x: vx + qw * tx + (qy * tz - qz * ty),
    y: vy + qw * ty + (qz * tx - qx * tz),
    z: vz + qw * tz + (qx * ty - qy * tx),
  };

  nativeProjectionDebug.registerRotation(v, result, q);
  return result;
}

// ============ SENSOR HUB ============

class SensorHub {
  private snapshot: SensorSnapshot = {
    lat: 0,
    lon: 0,
    elevation: 0,
    orientation: {x: 0, y: 0, z: 0, w: 1},
    screenOrientationDegrees: 0,
    heading: 0,
    headingAccuracy: 0,
    magneticHeading: 0,
    trueHeading: null,
    timestamp: 0,
  };

  private deviceMotionSub: {remove(): void} | null = null;
  private locationWatch: {remove(): void} | null = null;
  private headingWatch: {remove(): void} | null = null;
  private startPromise: Promise<void> | null = null;
  private consumerCount = 0;

  async start(): Promise<void> {
    this.consumerCount += 1;

    if (!this.startPromise) {
      this.startPromise = this.startSensors().catch((error: unknown) => {
        this.consumerCount = 0;
        this.cleanupSubscriptions();
        this.startPromise = null;
        throw error;
      });
    }

    return this.startPromise;
  }

  private async startSensors(): Promise<void> {
    await this.startDeviceMotion();
    await this.startLocation();
    await this.startHeading();
  }

  getSnapshot(): SensorSnapshot {
    const nextSnapshot = {
      ...this.snapshot,
      orientation: {...this.snapshot.orientation},
    };
    nativeProjectionDebug.setSensorSnapshot(nextSnapshot);
    return nextSnapshot;
  }

  stop(): void {
    if (this.consumerCount > 0) {
      this.consumerCount -= 1;
    }

    if (this.consumerCount > 0) return;

    this.cleanupSubscriptions();
    this.startPromise = null;
  }

  private cleanupSubscriptions(): void {
    this.deviceMotionSub?.remove();
    this.locationWatch?.remove();
    this.headingWatch?.remove();
    this.deviceMotionSub = null;
    this.locationWatch = null;
    this.headingWatch = null;
    nativeProjectionDebug.dispose();
  }

  private async startDeviceMotion(): Promise<void> {
    if (this.deviceMotionSub) return;

    const available = await DeviceMotion.isAvailableAsync();
    if (!available) {
      throw new SensorStartError(
        "motion-unavailable",
        "Device motion is not available on this device.",
      );
    }

    const currentPermission = await DeviceMotion.getPermissionsAsync();
    const permission =
      currentPermission.status === "granted"
        ? currentPermission
        : await DeviceMotion.requestPermissionsAsync();

    if (permission.status !== "granted") {
      throw new SensorStartError(
        "motion-permission-denied",
        "Motion permission is required for the AR experience.",
      );
    }

    DeviceMotion.setUpdateInterval(16);

    this.deviceMotionSub = DeviceMotion.addListener((motion) => {
      this.snapshot.screenOrientationDegrees = normalizeScreenOrientation(
        motion.orientation,
      );

      if (!motion.rotation) return;

      const rot = motion.rotation as unknown as {
        qx?: number;
        qy?: number;
        qz?: number;
        qw?: number;
        alpha?: number;
        beta?: number;
        gamma?: number;
      };
      let orientation: Quat;

      if (
        rot.qx !== undefined &&
        rot.qy !== undefined &&
        rot.qz !== undefined &&
        rot.qw !== undefined
      ) {
        orientation = {x: rot.qx, y: rot.qy, z: rot.qz, w: rot.qw};
      } else if (
        rot.alpha !== undefined &&
        rot.beta !== undefined &&
        rot.gamma !== undefined
      ) {
        // Preserve the existing Z/X/Y conversion used by the JS projection.
        const yaw = rot.alpha;
        const pitch = rot.beta;
        const roll = rot.gamma;

        const cy = Math.cos(yaw * 0.5);
        const sy = Math.sin(yaw * 0.5);
        const cp = Math.cos(pitch * 0.5);
        const sp = Math.sin(pitch * 0.5);
        const cr = Math.cos(roll * 0.5);
        const sr = Math.sin(roll * 0.5);

        orientation = {
          w: cy * cp * cr + sy * sp * sr,
          x: cy * sp * cr + sy * cp * sr,
          y: sy * cp * cr - cy * sp * sr,
          z: cy * cp * sr - sy * sp * cr,
        };
      } else {
        return;
      }

      this.snapshot.orientation = orientation;
      this.snapshot.timestamp = Date.now();
    });
  }

  private async ensureLocationPermission(): Promise<Location.LocationPermissionResponse> {
    let permission = await Location.getForegroundPermissionsAsync();

    if (permission.status !== "granted") {
      permission = await Location.requestForegroundPermissionsAsync();
    }

    if (permission.status !== "granted") {
      throw new SensorStartError(
        "location-permission-denied",
        "Location permission is required for the AR experience.",
      );
    }

    if (!hasPreciseLocation(permission)) {
      throw new SensorStartError(
        "precise-location-required",
        "Precise location must be enabled for accurate AR placement.",
      );
    }

    return permission;
  }

  private async startLocation(): Promise<void> {
    if (this.locationWatch) return;
    await this.ensureLocationPermission();

    this.locationWatch = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 1000,
        distanceInterval: 1,
      },
      (position) => {
        this.snapshot.lat = position.coords.latitude;
        this.snapshot.lon = position.coords.longitude;
        this.snapshot.elevation = position.coords.altitude ?? 0;
        this.snapshot.timestamp = Date.now();
      },
    );
  }

  private async startHeading(): Promise<void> {
    if (this.headingWatch) return;
    await this.ensureLocationPermission();

    try {
      this.headingWatch = await Location.watchHeadingAsync((reading) => {
        const magneticHeading = normalizeHeading(reading.magHeading);
        const hasTrueHeading =
          Number.isFinite(reading.trueHeading) && reading.trueHeading >= 0;
        const trueHeading = hasTrueHeading
          ? normalizeHeading(reading.trueHeading)
          : null;

        this.snapshot.magneticHeading = magneticHeading;
        this.snapshot.trueHeading = trueHeading;
        this.snapshot.heading = trueHeading ?? magneticHeading;
        this.snapshot.headingAccuracy = normalizeHeadingAccuracy(
          reading.accuracy,
        );
        this.snapshot.timestamp = Date.now();
      });
    } catch {
      this.headingWatch = null;
    }
  }
}

const sensorHub = new SensorHub();

// ============ GEO MATH ============

function geoToENU(
  lat1: number,
  lon1: number,
  alt1: number,
  lat2: number,
  lon2: number,
  alt2: number,
): Vec3 {
  if (!Number.isFinite(lat2) || !Number.isFinite(lon2)) {
    return {x: 0, y: 0, z: 0};
  }

  const phi1 = lat1 * DEG2RAD;
  const lambda1 = lon1 * DEG2RAD;
  const phi2 = lat2 * DEG2RAD;
  const lambda2 = lon2 * DEG2RAD;

  const sinPhi1 = Math.sin(phi1);
  const cosPhi1 = Math.cos(phi1);
  const n1 = WGS84_A / Math.sqrt(1 - WGS84_E2 * sinPhi1 * sinPhi1);

  const userX = (n1 + alt1) * cosPhi1 * Math.cos(lambda1);
  const userY = (n1 + alt1) * cosPhi1 * Math.sin(lambda1);
  const userZ = (n1 * (1 - WGS84_E2) + alt1) * sinPhi1;

  const sinPhi2 = Math.sin(phi2);
  const cosPhi2 = Math.cos(phi2);
  const n2 = WGS84_A / Math.sqrt(1 - WGS84_E2 * sinPhi2 * sinPhi2);

  const poiX = (n2 + alt2) * cosPhi2 * Math.cos(lambda2);
  const poiY = (n2 + alt2) * cosPhi2 * Math.sin(lambda2);
  const poiZ = (n2 * (1 - WGS84_E2) + alt2) * sinPhi2;

  const dx = poiX - userX;
  const dy = poiY - userY;
  const dz = poiZ - userZ;

  const result = {
    x: -Math.sin(lambda1) * dx + Math.cos(lambda1) * dy,
    y:
      -Math.sin(phi1) * Math.cos(lambda1) * dx -
      Math.sin(phi1) * Math.sin(lambda1) * dy +
      Math.cos(phi1) * dz,
    z:
      Math.cos(phi1) * Math.cos(lambda1) * dx +
      Math.cos(phi1) * Math.sin(lambda1) * dy +
      Math.sin(phi1) * dz,
  };

  nativeProjectionDebug.registerGeo(
    result,
    lat1,
    lon1,
    alt1,
    lat2,
    lon2,
    alt2,
  );
  return result;
}

// ============ BEARING CALCULATION ============

function calculateBearing(
  userLat: number,
  userLon: number,
  poiLat: number,
  poiLon: number,
): number {
  const phi1 = userLat * DEG2RAD;
  const phi2 = poiLat * DEG2RAD;
  const deltaLambda = (poiLon - userLon) * DEG2RAD;

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);

  return (Math.atan2(y, x) * RAD2DEG + 360) % 360;
}

// ============ PROJECTION ============

function projectToScreen(
  cameraPos: Vec3,
  width: number,
  height: number,
  fov: number,
): ScreenPosition {
  const depth = Math.hypot(cameraPos.x, cameraPos.y, cameraPos.z);

  if (cameraPos.z > 0 || depth <= 0.1) {
    return {
      x: 0,
      y: 0,
      visible: false,
      clipped: true,
      clippedByDistance: null,
      depth,
    };
  }

  const correctedX = -cameraPos.y;
  const correctedY = -cameraPos.x;
  const focalLength = width / 2 / Math.tan((fov * DEG2RAD) / 2);
  const screenX = width / 2 + (correctedX / depth) * focalLength;
  const screenY = height / 2 - (correctedY / depth) * focalLength;
  const margin = 200;
  const visible =
    screenX >= -margin &&
    screenX <= width + margin &&
    screenY >= -margin &&
    screenY <= height + margin;

  return {
    x: screenX,
    y: screenY,
    visible,
    clipped: !visible,
    clippedByDistance: null,
    depth,
  };
}

function compareProjection(
  cameraPos: Vec3,
  result: ScreenPosition,
  trueDistance: number,
  width: number,
  height: number,
  fov: number,
  minDistance: number,
  maxDistance: number,
): ScreenPosition {
  return nativeProjectionDebug.compareProjection(cameraPos, result, {
    trueDistance,
    width,
    height,
    fov,
    minDistance,
    maxDistance,
  });
}

function projectToScreenWithClipping(
  cameraPos: Vec3,
  trueDistance: number,
  width: number,
  height: number,
  fov: number,
  minDistance: number,
  maxDistance: number,
): ScreenPosition {
  if (trueDistance < minDistance) {
    return compareProjection(
      cameraPos,
      {
        x: 0,
        y: 0,
        visible: false,
        clipped: true,
        clippedByDistance: "min",
        depth: trueDistance,
      },
      trueDistance,
      width,
      height,
      fov,
      minDistance,
      maxDistance,
    );
  }

  if (trueDistance > maxDistance) {
    return compareProjection(
      cameraPos,
      {
        x: 0,
        y: 0,
        visible: false,
        clipped: true,
        clippedByDistance: "max",
        depth: trueDistance,
      },
      trueDistance,
      width,
      height,
      fov,
      minDistance,
      maxDistance,
    );
  }

  if (cameraPos.z > 0) {
    return compareProjection(
      cameraPos,
      {
        x: 0,
        y: 0,
        visible: false,
        clipped: true,
        clippedByDistance: null,
        depth: trueDistance,
      },
      trueDistance,
      width,
      height,
      fov,
      minDistance,
      maxDistance,
    );
  }

  const focalLength = width / 2 / Math.tan((fov * DEG2RAD) / 2);
  const correctedX = -cameraPos.y;
  const correctedY = -cameraPos.x;
  const screenX = width / 2 + (correctedX / trueDistance) * focalLength;

  const verticalFov = fov / (width / height);
  const verticalFocalLength =
    height / 2 / Math.tan((verticalFov * DEG2RAD) / 2);
  const screenY =
    height / 2 - (correctedY / trueDistance) * verticalFocalLength;

  const margin = 200;
  const visible =
    screenX >= -margin &&
    screenX <= width + margin &&
    screenY >= -margin &&
    screenY <= height + margin;

  return compareProjection(
    cameraPos,
    {
      x: screenX,
      y: screenY,
      visible,
      clipped: !visible,
      clippedByDistance: null,
      depth: trueDistance,
      radialDistance: trueDistance,
    },
    trueDistance,
    width,
    height,
    fov,
    minDistance,
    maxDistance,
  );
}

export {
  sensorHub,
  geoToENU,
  projectToScreen,
  projectToScreenWithClipping,
  inverse,
  rotateVector,
  calculateBearing,
  getCompassCalibrationPercent,
};
