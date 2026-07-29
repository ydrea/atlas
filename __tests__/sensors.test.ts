// __tests__/sensors.test.ts
import {
  calculateBearing,
  geoToENU,
  projectToScreen,
  projectToScreenWithClipping,
  rotateVector,
} from "@/cumquat/sensors";

describe("sensors utilities", () => {
  describe("geoToENU", () => {
    test("returns near-zero for identical coordinates", () => {
      const point = geoToENU(45.8, 15.96, 120, 45.8, 15.96, 120);
      expect(point.x).toBeCloseTo(0, 2);
      expect(point.y).toBeCloseTo(0, 2);
      expect(point.z).toBeCloseTo(0, 2);
    });

    test("east, north and up use positive ENU axes", () => {
      expect(geoToENU(45.8, 15.96, 0, 45.8, 15.961, 0).x).toBeGreaterThan(0);
      expect(geoToENU(45.8, 15.96, 0, 45.801, 15.96, 0).y).toBeGreaterThan(0);
      expect(geoToENU(45.8, 15.96, 0, 45.8, 15.96, 10).z).toBeGreaterThan(0);
    });

    test("invalid POI coordinates return the zero vector", () => {
      expect(geoToENU(45.8, 15.96, 0, NaN, NaN, 0)).toEqual({
        x: 0,
        y: 0,
        z: 0,
      });
    });
  });

  describe("rotateVector", () => {
    test("identity quaternion preserves a vector", () => {
      const vector = { x: 3, y: 4, z: 12 };
      expect(rotateVector(vector, { x: 0, y: 0, z: 0, w: 1 })).toEqual(vector);
    });

    test("180 degree yaw flips the forward vector", () => {
      const result = rotateVector(
        { x: 0, y: 0, z: -1 },
        { x: 0, y: 1, z: 0, w: 0 },
      );
      expect(result.z).toBeCloseTo(1, 3);
    });

    test("90 degree pitch rotates forward toward positive Y", () => {
      const result = rotateVector(
        { x: 0, y: 0, z: -1 },
        { x: 0.7071, y: 0, z: 0, w: 0.7071 },
      );
      expect(result.y).toBeCloseTo(1, 2);
    });
  });

  describe("projectToScreen", () => {
    test("rejects points behind the camera", () => {
      const result = projectToScreen({ x: 0, y: 0, z: 10 }, 1000, 500, 60);
      expect(result.visible).toBe(false);
      expect(result.clipped).toBe(true);
    });

    test("projects a forward centered point to screen center", () => {
      const result = projectToScreen({ x: 0, y: 0, z: -10 }, 1000, 500, 60);
      expect(result.visible).toBe(true);
      expect(result.clipped).toBe(false);
      expect(result.x).toBeCloseTo(500, 1);
      expect(result.y).toBeCloseTo(250, 1);
    });
  });

  describe("projectToScreenWithClipping", () => {
    const project = (
      cameraPos: { x: number; y: number; z: number },
      trueDistance: number,
      fov = 60,
      minDistance = 1,
      maxDistance = 100,
    ) =>
      projectToScreenWithClipping(
        cameraPos,
        trueDistance,
        1000,
        500,
        fov,
        minDistance,
        maxDistance,
      );

    test("a visible point is not distance-clipped", () => {
      const result = project({ x: 0, y: 0, z: -10 }, 10);
      expect(result).toMatchObject({
        visible: true,
        clipped: false,
        clippedByDistance: null,
        depth: 10,
      });
    });

    test("clips points below minDistance", () => {
      const result = project({ x: 0, y: 0, z: -0.05 }, 0.05);
      expect(result).toMatchObject({
        visible: false,
        clipped: true,
        clippedByDistance: "min",
        depth: 0.05,
      });
    });

    test("clips points above maxDistance", () => {
      const result = project({ x: 0, y: 0, z: -500 }, 500);
      expect(result).toMatchObject({
        visible: false,
        clipped: true,
        clippedByDistance: "max",
        depth: 500,
      });
    });

    test("a behind-camera point is clipped by direction, not distance", () => {
      const result = project({ x: 0, y: 0, z: 10 }, 10);
      expect(result).toMatchObject({
        visible: false,
        clipped: true,
        clippedByDistance: null,
        depth: 10,
      });
    });

    test("an offscreen point is not marked as distance-clipped", () => {
      const result = project({ x: 1000, y: 0, z: -10 }, 10);
      expect(result.visible).toBe(false);
      expect(result.clipped).toBe(true);
      expect(result.clippedByDistance).toBe(null);
    });

    test("distance boundaries are inclusive", () => {
      expect(project({ x: 0, y: 0, z: -1 }, 1).clippedByDistance).toBe(null);
      expect(project({ x: 0, y: 0, z: -100 }, 100).clippedByDistance).toBe(
        null,
      );
    });

    test("wider FOV compresses horizontal projection toward center", () => {
      // sensors.ts maps camera-space -Y to screen +X.
      const cameraPos = { x: 0, y: -1, z: -10 };
      const narrow = project(cameraPos, 10, 30);
      const wide = project(cameraPos, 10, 90);

      expect(narrow.visible).toBe(true);
      expect(wide.visible).toBe(true);
      expect(Math.abs(wide.x - 500)).toBeLessThan(Math.abs(narrow.x - 500));
    });

    test("narrower FOV expands horizontal projection", () => {
      // sensors.ts maps camera-space -Y to screen +X.
      const cameraPos = { x: 0, y: -1, z: -10 };
      const narrow = project(cameraPos, 10, 30);
      const wide = project(cameraPos, 10, 90);

      expect(narrow.visible).toBe(true);
      expect(wide.visible).toBe(true);
      expect(Math.abs(narrow.x - 500)).toBeGreaterThan(Math.abs(wide.x - 500));
    });
  });

  describe("calculateBearing", () => {
    test.each([
      {
        label: "same point",
        from: [45.8, 15.96],
        to: [45.8, 15.96],
        expected: 0,
      },
      { label: "east", from: [45.8, 15.96], to: [45.8, 15.97], expected: 90 },
      { label: "north", from: [45.8, 15.96], to: [45.81, 15.96], expected: 0 },
      {
        label: "south",
        from: [45.8, 15.96],
        to: [45.79, 15.96],
        expected: 180,
      },
      { label: "west", from: [45.8, 15.96], to: [45.8, 15.95], expected: 270 },
    ])("returns the expected bearing for $label", ({ from, to, expected }) => {
      expect(calculateBearing(from[0], from[1], to[0], to[1])).toBeCloseTo(
        expected,
        1,
      );
    });

    test("always returns a normalized bearing", () => {
      const bearing = calculateBearing(45.8, 15.96, 45.81, 15.97);
      expect(bearing).toBeGreaterThanOrEqual(0);
      expect(bearing).toBeLessThan(360);
    });
  });
});
