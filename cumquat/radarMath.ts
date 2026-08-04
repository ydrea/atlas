import type {FrameOrientation, Quaternion} from "react-native-cumquat";

type Vec3 = {x: number; y: number; z: number};

export type RadarPoint = {
  x: number;
  y: number;
  relativeBearing: number;
  radiusRatio: number;
};

const IDENTITY: Quaternion = {x: 0, y: 0, z: 0, w: 1};

export function normalizeDegrees(degrees: number): number {
  if (!Number.isFinite(degrees)) return 0;
  return ((degrees % 360) + 360) % 360;
}

export function signedAngle(degrees: number): number {
  const normalized = normalizeDegrees(degrees);
  return normalized > 180 ? normalized - 360 : normalized;
}

function normalizeQuaternion(source: Quaternion): Quaternion {
  const length = Math.hypot(source.x, source.y, source.z, source.w);
  if (!Number.isFinite(length) || length <= Number.EPSILON) {
    return IDENTITY;
  }

  return {
    x: source.x / length,
    y: source.y / length,
    z: source.z / length,
    w: source.w / length,
  };
}

function inverseQuaternion(source: Quaternion): Quaternion {
  const q = normalizeQuaternion(source);
  return {x: -q.x, y: -q.y, z: -q.z, w: q.w};
}

function rotateVector(vector: Vec3, source: Quaternion): Vec3 {
  const q = normalizeQuaternion(source);
  const tx = 2 * (q.y * vector.z - q.z * vector.y);
  const ty = 2 * (q.z * vector.x - q.x * vector.z);
  const tz = 2 * (q.x * vector.y - q.y * vector.x);

  return {
    x: vector.x + q.w * tx + (q.y * tz - q.z * ty),
    y: vector.y + q.w * ty + (q.z * tx - q.x * tz),
    z: vector.z + q.w * tz + (q.x * ty - q.y * tx),
  };
}

/** Geographic bearing of the physical rear camera used by this Cumquat frame. */
export function frameForwardBearing(
  orientation: FrameOrientation | null,
): number | null {
  if (!orientation) return null;

  const cameraToWorld =
    orientation.convention === "earth-from-device"
      ? normalizeQuaternion(orientation.quaternion)
      : inverseQuaternion(orientation.quaternion);
  const forward = rotateVector({x: 0, y: 0, z: -1}, cameraToWorld);

  if (Math.hypot(forward.x, forward.y) < 1e-6) return null;
  return normalizeDegrees((Math.atan2(forward.x, forward.y) * 180) / Math.PI);
}

/** Maps a geographic bearing/distance into a device-forward radar circle. */
export function projectRadarPoint(
  bearing: number,
  forwardBearing: number,
  distance: number,
  maxDistance: number,
  radius: number,
): RadarPoint {
  const relativeBearing = signedAngle(bearing - forwardBearing);
  const radians = (relativeBearing * Math.PI) / 180;
  const safeMax = Math.max(1, maxDistance);
  const radiusRatio = Math.max(0, Math.min(1, distance / safeMax));
  const projectedRadius = Math.max(0, radius) * radiusRatio;

  return {
    x: Math.sin(radians) * projectedRadius,
    y: -Math.cos(radians) * projectedRadius,
    relativeBearing,
    radiusRatio,
  };
}

export function isInsideFOV(relativeBearing: number, fov: number): boolean {
  return Math.abs(signedAngle(relativeBearing)) <= Math.max(1, fov) / 2;
}

export function formatRadarDistance(distance: number): string {
  return distance < 1000
    ? `${Math.round(distance)}m`
    : `${(distance / 1000).toFixed(1)}km`;
}
