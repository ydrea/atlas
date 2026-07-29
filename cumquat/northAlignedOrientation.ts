import {sensorHub} from "@/cumquat/sensors";
import {AR_CONSTANTS} from "@/cumquat/constants";
import type {Quat, SensorSnapshot} from "@/cumquat/types";

const IDENTITY_QUATERNION: Quat = {x: 0, y: 0, z: 0, w: 1};
export type ProjectionYawSign = -1 | 1;

function normalizeQuaternion(q: Quat): Quat {
  const length = Math.hypot(q.x, q.y, q.z, q.w);
  if (!Number.isFinite(length) || length <= Number.EPSILON) {
    return {...IDENTITY_QUATERNION};
  }

  return {
    x: q.x / length,
    y: q.y / length,
    z: q.z / length,
    w: q.w / length,
  };
}

/** Hamilton product. Applying the result rotates by right first, then left. */
function multiplyQuaternions(left: Quat, right: Quat): Quat {
  return {
    x:
      left.w * right.x +
      left.x * right.w +
      left.y * right.z -
      left.z * right.y,
    y:
      left.w * right.y -
      left.x * right.z +
      left.y * right.w +
      left.z * right.x,
    z:
      left.w * right.z +
      left.x * right.y -
      left.y * right.x +
      left.z * right.w,
    w:
      left.w * right.w -
      left.x * right.x -
      left.y * right.y -
      left.z * right.z,
  };
}

function zRotationQuaternion(degrees: number): Quat {
  const halfRadians = (degrees * Math.PI) / 360;
  return {
    x: 0,
    y: 0,
    z: Math.sin(halfRadians),
    w: Math.cos(halfRadians),
  };
}

function inverseUnitQuaternion(q: Quat): Quat {
  return {x: -q.x, y: -q.y, z: -q.z, w: q.w};
}

function rotateVector(
  vector: {x: number; y: number; z: number},
  q: Quat,
): {x: number; y: number; z: number} {
  const tx = 2 * (q.y * vector.z - q.z * vector.y);
  const ty = 2 * (q.z * vector.x - q.x * vector.z);
  const tz = 2 * (q.x * vector.y - q.y * vector.x);

  return {
    x: vector.x + q.w * tx + (q.y * tz - q.z * ty),
    y: vector.y + q.w * ty + (q.z * tx - q.x * tz),
    z: vector.z + q.w * tz + (q.x * ty - q.y * tx),
  };
}

export function cameraForwardBearing(orientation: Quat): number | null {
  const normalized = normalizeQuaternion(orientation);
  const worldForward = rotateVector(
    {x: 0, y: 0, z: -1},
    inverseUnitQuaternion(normalized),
  );
  const horizontalLength = Math.hypot(worldForward.x, worldForward.y);

  if (horizontalLength < 1e-6) return null;

  return (
    (Math.atan2(worldForward.x, worldForward.y) * 180) / Math.PI +
    360
  ) % 360;
}

/** Returns the signed shortest rotation from `from` to `to`. */
function shortestAngleDegrees(from: number, to: number): number {
  if (!Number.isFinite(from) || !Number.isFinite(to)) return 0;
  return ((to - from + 540) % 360) - 180;
}

/**
 * Prepares Expo DeviceMotion for projection.
 *
 * DeviceMotion remains the sole orientation source. Compass/magnetometer
 * headings are deliberately not accepted here and therefore cannot steer the
 * scene. Only the horizontal yaw convention is changed; the right-side Z
 * correction leaves the quaternion's pitch/roll (its transformed up axis)
 * unchanged.
 */
export function createProjectionOrientation(
  motionOrientation: Quat,
  screenOrientationDegrees: number,
  yawSign: ProjectionYawSign,
): Quat {
  const portraitToScreen = zRotationQuaternion(-screenOrientationDegrees);
  const screenOrientation = normalizeQuaternion(
    multiplyQuaternions(portraitToScreen, motionOrientation),
  );

  if (yawSign === 1) return screenOrientation;

  const motionBearing = cameraForwardBearing(screenOrientation);
  if (motionBearing === null) return screenOrientation;

  const desiredBearing = ((-motionBearing % 360) + 360) % 360;
  const correction = shortestAngleDegrees(motionBearing, desiredBearing);

  return normalizeQuaternion(
    multiplyQuaternions(
      screenOrientation,
      zRotationQuaternion(correction),
    ),
  );
}

let installed = false;

/**
 * Installs the DeviceMotion-only projection orientation at the SensorHub
 * snapshot boundary. Heading fields stay available for the HUD, but never
 * participate in the projection quaternion.
 */
export function installNorthAlignedOrientation(): void {
  if (installed) return;
  installed = true;

  const getRawSnapshot = sensorHub.getSnapshot.bind(sensorHub);
  const configuredSign = Number(AR_CONSTANTS.SENSOR.PROJECTION_YAW_SIGN);
  const yawSign: ProjectionYawSign = configuredSign === 1 ? 1 : -1;

  sensorHub.getSnapshot = (): SensorSnapshot => {
    const snapshot = getRawSnapshot();

    return {
      ...snapshot,
      orientation: createProjectionOrientation(
        snapshot.orientation,
        snapshot.screenOrientationDegrees,
        yawSign,
      ),
    };
  };
}
