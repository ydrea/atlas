//radarMath.test.ts
import {
  frameForwardBearing,
  isInsideFOV,
  projectRadarPoint,
  signedAngle,
} from "@/cumquat/radarMath";

const HALF_SQRT_TWO = Math.SQRT1_2;

describe("radar math", () => {
  test("wraps angles onto the short signed arc", () => {
    expect(signedAngle(350)).toBe(-10);
    expect(signedAngle(-350)).toBe(10);
  });

  test("reads north-facing Earth-from-device camera orientation", () => {
    expect(
      frameForwardBearing({
        quaternion: { x: HALF_SQRT_TWO, y: 0, z: 0, w: HALF_SQRT_TWO },
        convention: "earth-from-device",
      }),
    ).toBeCloseTo(0);
  });

  test("reads north-facing world-to-camera orientation", () => {
    expect(
      frameForwardBearing({
        quaternion: { x: -HALF_SQRT_TWO, y: 0, z: 0, w: HALF_SQRT_TWO },
        convention: "world-to-camera",
      }),
    ).toBeCloseTo(0);
  });

  test("projects north up and east right", () => {
    const north = projectRadarPoint(0, 0, 100, 100, 50);
    expect(north.x).toBeCloseTo(0);
    expect(north.y).toBeCloseTo(-50);

    const east = projectRadarPoint(90, 0, 100, 100, 50);
    expect(east.x).toBeCloseTo(50);
    expect(east.y).toBeCloseTo(0);
  });

  test("handles FOV across geographic north", () => {
    expect(isInsideFOV(-20, 60)).toBe(true);
    expect(isInsideFOV(40, 60)).toBe(false);
  });
});
