import * as Location from "expo-location";
import {DeviceMotion} from "expo-sensors";

import {
  getCompassCalibrationPercent,
  SensorStartError,
  sensorHub,
} from "@/cumquat/sensors";

type HeadingSample = {
  accuracy: number;
  magHeading: number;
  trueHeading: number;
};

type MotionSample = {
  orientation: number;
  rotation: {
    qx: number;
    qy: number;
    qz: number;
    qw: number;
  };
};

describe("SensorHub compass integration", () => {
  const location = Location as jest.Mocked<typeof Location>;
  const deviceMotion = DeviceMotion as jest.Mocked<typeof DeviceMotion>;
  let emitHeading: ((sample: HeadingSample) => void) | null;
  let emitMotion: ((sample: MotionSample) => void) | null;
  let removeHeading: jest.Mock;
  let removeMotion: jest.Mock;

  beforeEach(() => {
    sensorHub.stop();
    jest.clearAllMocks();
    emitHeading = null;
    emitMotion = null;
    removeHeading = jest.fn();
    removeMotion = jest.fn();

    deviceMotion.isAvailableAsync.mockResolvedValue(true);
    deviceMotion.getPermissionsAsync.mockResolvedValue({
      status: "granted",
    } as Awaited<ReturnType<typeof DeviceMotion.getPermissionsAsync>>);
    deviceMotion.addListener.mockImplementation((callback) => {
      emitMotion = callback as unknown as (sample: MotionSample) => void;
      return {remove: removeMotion};
    });

    location.getForegroundPermissionsAsync.mockResolvedValue({
      status: "granted",
      ios: {accuracy: "full", scope: "whenInUse"},
    } as Awaited<ReturnType<typeof Location.getForegroundPermissionsAsync>>);

    location.watchPositionAsync.mockResolvedValue({
      remove: jest.fn(),
    } as Awaited<ReturnType<typeof Location.watchPositionAsync>>);

    location.watchHeadingAsync.mockImplementation(async (callback) => {
      emitHeading = callback as (sample: HeadingSample) => void;
      return {remove: removeHeading};
    });
  });

  afterEach(() => {
    sensorHub.stop();
  });

  test("two consumers share one native subscription", async () => {
    await sensorHub.start();
    await sensorHub.start();

    expect(Location.watchHeadingAsync).toHaveBeenCalledTimes(1);
    expect(DeviceMotion.addListener).toHaveBeenCalledTimes(1);

    sensorHub.stop();

    expect(removeHeading).not.toHaveBeenCalled();
    expect(removeMotion).not.toHaveBeenCalled();

    sensorHub.stop();

    expect(removeHeading).toHaveBeenCalledTimes(1);
    expect(removeMotion).toHaveBeenCalledTimes(1);
  });

  test("stores true heading and calibration accuracy in the snapshot", async () => {
    await sensorHub.start();

    expect(location.watchHeadingAsync).toHaveBeenCalledTimes(1);
    expect(emitHeading).toEqual(expect.any(Function));

    emitHeading?.({
      accuracy: 2,
      magHeading: 126,
      trueHeading: 121,
    });

    expect(sensorHub.getSnapshot()).toMatchObject({
      heading: 121,
      magneticHeading: 126,
      trueHeading: 121,
      headingAccuracy: 2,
    });

    expect(getCompassCalibrationPercent(2)).toBe(67);
  });

  test("stores the live DeviceMotion screen orientation", async () => {
    await sensorHub.start();

    emitMotion?.({
      orientation: 90,
      rotation: {qx: 0, qy: 0, qz: 0, qw: 1},
    });

    expect(sensorHub.getSnapshot()).toMatchObject({
      screenOrientationDegrees: 90,
      orientation: {x: 0, y: 0, z: 0, w: 1},
    });
  });

  test("rejects startup when device motion is unavailable", async () => {
    deviceMotion.isAvailableAsync.mockResolvedValue(false);

    await expect(sensorHub.start()).rejects.toEqual(
      expect.objectContaining<Partial<SensorStartError>>({
        code: "motion-unavailable",
      }),
    );

    expect(Location.watchPositionAsync).not.toHaveBeenCalled();
    expect(Location.watchHeadingAsync).not.toHaveBeenCalled();
  });

  test("falls back to magnetic heading when true heading is unavailable", async () => {
    await sensorHub.start();

    emitHeading?.({
      accuracy: 1,
      magHeading: -82,
      trueHeading: -1,
    });

    expect(sensorHub.getSnapshot()).toMatchObject({
      heading: 278,
      magneticHeading: 278,
      trueHeading: null,
      headingAccuracy: 1,
    });
  });

  test("stops the heading subscription", async () => {
    await sensorHub.start();
    sensorHub.stop();

    expect(removeHeading).toHaveBeenCalledTimes(1);
    expect(removeMotion).toHaveBeenCalledTimes(1);
  });

  test.each([
    [-1, 0],
    [0, 0],
    [1, 33],
    [2, 67],
    [3, 100],
    [4, 100],
  ])("maps accuracy %s to %s percent", (accuracy, expected) => {
    expect(getCompassCalibrationPercent(accuracy)).toBe(expected);
  });
});
