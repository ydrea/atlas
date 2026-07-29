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
  createNorthAlignedCameraQuaternion,
  installNorthAlignedOrientation,
} from "@/cumquat/northAlignedOrientation";

const rawSnapshot: SensorSnapshot = {
  lat: 45.8,
  lon: 15.96,
  elevation: 120,
  orientation: {x: 0, y: 0, z: 0, w: 1},
  screenOrientationDegrees: -90,
  heading: 0,
  headingAccuracy: 3,
  magneticHeading: 350,
  trueHeading: 0,
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

function expectVectorClose(actual: Vec3, expected: Vec3): void {
  expect(actual.x).toBeCloseTo(expected.x, 10);
  expect(actual.y).toBeCloseTo(expected.y, 10);
  expect(actual.z).toBeCloseTo(expected.z, 10);
}

describe("north-aligned camera quaternion", () => {
  beforeEach(() => {
    rawGetSnapshot.mockReturnValue({
      ...rawSnapshot,
      orientation: {...rawSnapshot.orientation},
    });
  });

  test("uses live left-landscape orientation", () => {
    const orientation = createNorthAlignedCameraQuaternion(
      {x: 0, y: 0, z: 0, w: 1},
      -90,
      0,
      null,
    );

    expectVectorClose(rotateVector({x: 1, y: 0, z: 0}, orientation), {
      x: 0,
      y: 1,
      z: 0,
    });
  });

  test("uses live right-landscape orientation", () => {
    const orientation = createNorthAlignedCameraQuaternion(
      {x: 0, y: 0, z: 0, w: 1},
      90,
      0,
      null,
    );

    expectVectorClose(rotateVector({x: 1, y: 0, z: 0}, orientation), {
      x: 0,
      y: -1,
      z: 0,
    });
  });

  test("fuses true-minus-magnetic declination into the quaternion", () => {
    const orientation = createNorthAlignedCameraQuaternion(
      {x: 0, y: 0, z: 0, w: 1},
      0,
      350,
      0,
    );

    const tenDegrees = (10 * Math.PI) / 180;
    expectVectorClose(rotateVector({x: 1, y: 0, z: 0}, orientation), {
      x: Math.cos(tenDegrees),
      y: Math.sin(tenDegrees),
      z: 0,
    });
  });

  test("does not invent a true-north correction when true heading is unavailable", () => {
    const source = {x: 0.2, y: -0.3, z: 0.4, w: 0.842614977};
    const orientation = createNorthAlignedCameraQuaternion(
      source,
      0,
      278,
      null,
    );

    const sourceLength = Math.hypot(source.x, source.y, source.z, source.w);
    expect(orientation.x).toBeCloseTo(source.x / sourceLength, 10);
    expect(orientation.y).toBeCloseTo(source.y / sourceLength, 10);
    expect(orientation.z).toBeCloseTo(source.z / sourceLength, 10);
    expect(orientation.w).toBeCloseTo(source.w / sourceLength, 10);
  });

  test("declination correction preserves the gravity/up transform", () => {
    const source = {x: 0.2, y: -0.3, z: 0.4, w: 0.842614977};
    const magnetic = createNorthAlignedCameraQuaternion(source, 0, 350, null);
    const trueNorth = createNorthAlignedCameraQuaternion(source, 0, 350, 0);

    expectVectorClose(
      rotateVector({x: 0, y: 0, z: 1}, trueNorth),
      rotateVector({x: 0, y: 0, z: 1}, magnetic),
    );
  });

  test("always returns a unit quaternion", () => {
    const orientation = createNorthAlignedCameraQuaternion(
      {x: 2, y: -3, z: 4, w: 5},
      -90,
      355,
      2,
    );

    expect(
      Math.hypot(
        orientation.x,
        orientation.y,
        orientation.z,
        orientation.w,
      ),
    ).toBeCloseTo(1, 12);
  });

  test("installs fusion using the snapshot screen orientation", () => {
    installNorthAlignedOrientation();

    const snapshot = sensorHub.getSnapshot();
    const expected = createNorthAlignedCameraQuaternion(
      rawSnapshot.orientation,
      rawSnapshot.screenOrientationDegrees,
      rawSnapshot.magneticHeading,
      rawSnapshot.trueHeading,
    );

    expect(rawGetSnapshot).toHaveBeenCalledTimes(1);
    expect(snapshot.orientation.x).toBeCloseTo(expected.x, 12);
    expect(snapshot.orientation.y).toBeCloseTo(expected.y, 12);
    expect(snapshot.orientation.z).toBeCloseTo(expected.z, 12);
    expect(snapshot.orientation.w).toBeCloseTo(expected.w, 12);
  });
});
