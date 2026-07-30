import type {Quat, SensorSnapshot, Vec3} from "@/cumquat/types";

jest.mock("@/cumquat/sensors", () => ({
  sensorHub: {
    start: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn(),
    getSnapshot: jest.fn(),
  },
}));

import {sensorHub} from "@/cumquat/sensors";
import {
  cameraForwardBearing,
  createProjectionOrientation,
  installNorthAlignedOrientation,
} from "@/cumquat/northAlignedOrientation";

const NORTH_FACING_ORIENTATION: Quat = {
  x: -Math.SQRT1_2,
  y: 0,
  z: 0,
  w: Math.SQRT1_2,
};

const rawSnapshot: SensorSnapshot = {
  lat: 45.8,
  lon: 15.96,
  elevation: 120,
  orientation: NORTH_FACING_ORIENTATION,
  screenOrientationDegrees: 0,
  heading: 217,
  headingAccuracy: 3,
  magneticHeading: 217,
  trueHeading: 217,
  pitchDegrees: 0,
  rollDegrees: 0,
  timestamp: 1,
};

const rawGetSnapshot = sensorHub.getSnapshot as jest.MockedFunction<
  typeof sensorHub.getSnapshot
>;

function rotateVector(v: Vec3, q: Quat): Vec3 {
  const tx = 2 * (q.y * v.z - q.z * v.y);
  const ty = 2 * (q.z * v.x - q.x * v.z);
  const tz = 2 * (q.x * v.y - q.y * v.x);

  return {
    x: v.x + q.w * tx + (q.y * tz - q.z * ty),
    y: v.y + q.w * ty + (q.z * tx - q.x * tz),
    z: v.z + q.w * tz + (q.x * ty - q.y * tx),
  };
}

function orientationAtBearing(bearing: number): Quat {
  const halfRadians = (bearing * Math.PI) / 360;
  return {
    x: -Math.SQRT1_2 * Math.cos(halfRadians),
    y: Math.SQRT1_2 * Math.sin(halfRadians),
    z: Math.SQRT1_2 * Math.sin(halfRadians),
    w: Math.SQRT1_2 * Math.cos(halfRadians),
  };
}

function expectBearing(actual: number | null, expected: number): void {
  expect(actual).not.toBeNull();
  expect(actual as number).toBeCloseTo(expected, 10);
}

describe("DeviceMotion-only projection orientation", () => {
  beforeEach(() => {
    rawGetSnapshot.mockReturnValue({
      ...rawSnapshot,
      orientation: {...rawSnapshot.orientation},
    });
  });

  test("keeps DeviceMotion orientation unchanged in portrait", () => {
    const source = orientationAtBearing(30);
    const orientation = createProjectionOrientation(source, 0);

    expect(orientation).toEqual(source);
  });

  test("applies landscape-left screen rotation without rebuilding yaw", () => {
    const orientation = createProjectionOrientation(
      NORTH_FACING_ORIENTATION,
      -90,
    );

    expect(Math.hypot(
      orientation.x,
      orientation.y,
      orientation.z,
      orientation.w,
    )).toBeCloseTo(1, 10);
    expect(orientation).not.toEqual(NORTH_FACING_ORIENTATION);
  });

  test("applies landscape-right screen rotation without a fixed side", () => {
    const left = createProjectionOrientation(
      NORTH_FACING_ORIENTATION,
      -90,
    );
    const right = createProjectionOrientation(
      NORTH_FACING_ORIENTATION,
      90,
    );

    expect(left).not.toEqual(right);
  });

  test("installed projection ignores every heading field", () => {
    installNorthAlignedOrientation();

    const first = sensorHub.getSnapshot();
    rawGetSnapshot.mockReturnValue({
      ...rawSnapshot,
      heading: 0,
      magneticHeading: 359,
      trueHeading: 1,
      orientation: {...rawSnapshot.orientation},
      timestamp: 2,
    });
    const second = sensorHub.getSnapshot();

    expect(first.orientation).toEqual(second.orientation);
    expect(first.heading).toBe(217);
    expect(second.heading).toBe(0);
  });
});
