// __tests__/gestures.test.ts
import { AR_CONSTANTS } from "@/cumquat/constants";
import {
  applyRubberBandValue,
  clamp,
  createGestureInput,
  gestureConfig,
  getLimitExcess,
  normalizeState,
  rubberBandResistance,
  snapState,
  updateHorizontal,
  updateVertical,
  validateState,
} from "@/cumquat/gestures/gestureMath";
import type {
  GestureConfig,
  GestureState,
} from "@/cumquat/gestures/types";

const state = (
  overrides: Partial<GestureState> = {},
): GestureState => ({
  minDistance: 100,
  maxDistance: 13_500,
  zoom: 0.25,
  fov: 60,
  ...overrides,
});

describe("gestureMath", () => {
  describe("basic state utilities", () => {
    test("clamp supports normal and reversed bounds", () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(-1, 0, 10)).toBe(0);
      expect(clamp(11, 0, 10)).toBe(10);
      expect(clamp(11, 10, 0)).toBe(10);
    });

    test("normalizeState orders min and max without mutating input", () => {
      const input = state({ minDistance: 1_000, maxDistance: 500 });
      const result = normalizeState(input);

      expect(result.minDistance).toBe(500);
      expect(result.maxDistance).toBe(1_000);
      expect(input.minDistance).toBe(1_000);
      expect(result).not.toBe(input);
    });

    test("validateState preserves valid values", () => {
      expect(validateState(state())).toEqual(state());
    });

    test("validateState normalizes ordering and enforces the distance gap", () => {
      expect(
        validateState(state({ minDistance: 1_000, maxDistance: 500 })),
      ).toEqual(state({ minDistance: 500, maxDistance: 1_000 }));

      const close = validateState(
        state({ minDistance: 100, maxDistance: 150 }),
      );
      expect(close.maxDistance - close.minDistance).toBe(
        AR_CONSTANTS.GESTURE.MIN_DISTANCE_GAP,
      );
    });

    test("validateState clamps distance, zoom and FOV", () => {
      const result = validateState(
        state({
          minDistance: -1_000,
          maxDistance: 1_000_000,
          zoom: 2.5,
          fov: 999,
        }),
      );

      expect(result).toEqual({
        minDistance: AR_CONSTANTS.DISTANCE.MIN,
        maxDistance: AR_CONSTANTS.DISTANCE.MAX,
        zoom: 1,
        fov: AR_CONSTANTS.FOV.MAX,
      });
    });

    test("validateState keeps the minimum gap at the upper distance edge", () => {
      const result = validateState(
        state({ minDistance: 1e9, maxDistance: 2e9 }),
      );

      expect(result.maxDistance).toBe(AR_CONSTANTS.DISTANCE.MAX);
      expect(result.minDistance).toBe(
        AR_CONSTANTS.DISTANCE.MAX -
          AR_CONSTANTS.GESTURE.MIN_DISTANCE_GAP,
      );
    });

    test("validateState turns NaN and Infinity into a finite valid state", () => {
      const result = validateState({
        minDistance: NaN,
        maxDistance: Infinity,
        zoom: -Infinity,
        fov: NaN,
      });

      expect(Number.isFinite(result.minDistance)).toBe(true);
      expect(Number.isFinite(result.maxDistance)).toBe(true);
      expect(Number.isFinite(result.zoom)).toBe(true);
      expect(Number.isFinite(result.fov)).toBe(true);
      expect(result.maxDistance - result.minDistance).toBeGreaterThanOrEqual(
        AR_CONSTANTS.GESTURE.MIN_DISTANCE_GAP,
      );
      expect(result.zoom).toBeGreaterThanOrEqual(0);
      expect(result.zoom).toBeLessThanOrEqual(1);
      expect(result.fov).toBeGreaterThanOrEqual(AR_CONSTANTS.FOV.MIN);
      expect(result.fov).toBeLessThanOrEqual(AR_CONSTANTS.FOV.MAX);
    });
  });

  describe("rubber band", () => {
    test("resistance starts at one and falls as excess grows", () => {
      const small = rubberBandResistance(10);
      const large = rubberBandResistance(10_000);

      expect(rubberBandResistance(0)).toBe(1);
      expect(small).toBeLessThanOrEqual(1);
      expect(large).toBeLessThan(small);
      expect(large).toBeGreaterThanOrEqual(
        1 - AR_CONSTANTS.GESTURE.RUBBER_BAND_MAX_RESISTANCE,
      );
    });

    test("a value inside its limits passes through unchanged", () => {
      expect(applyRubberBandValue(50, 0, 100, "fov")).toEqual({
        value: 50,
        rubberBanding: false,
        activeLimit: null,
        excess: 0,
      });
    });

    test("overshoot stays beyond the edge but is resisted", () => {
      const below = applyRubberBandValue(-100, 0, 100, "min");
      const above = applyRubberBandValue(200, 0, 100, "max");

      expect(below.rubberBanding).toBe(true);
      expect(below.activeLimit).toBe("min");
      expect(below.excess).toBe(100);
      expect(below.value).toBeLessThan(0);
      expect(below.value).toBeGreaterThan(-100);

      expect(above.rubberBanding).toBe(true);
      expect(above.activeLimit).toBe("max");
      expect(above.excess).toBe(100);
      expect(above.value).toBeGreaterThan(100);
      expect(above.value).toBeLessThan(200);
    });
  });

  describe("gesture pipelines", () => {
    test("createGestureInput supplies safe defaults", () => {
      expect(createGestureInput(12, -5)).toEqual({
        translationX: 12,
        translationY: -5,
        velocityX: 0,
        velocityY: 0,
        scale: 1,
        focalX: 0,
        focalY: 0,
        numberOfPointers: 2,
      });
    });

    test("horizontal movement changes only FOV", () => {
      const base = state();
      const result = updateHorizontal(base, createGestureInput(100, 0));

      expect(result.state).toEqual({ ...base, fov: 80 });
      expect(result.rubberBanding).toBe(false);
      expect(result.activeLimit).toBe(null);
    });

    test("horizontal FOV overshoot rubber-bands and snaps back", () => {
      const result = updateHorizontal(
        state({ fov: AR_CONSTANTS.FOV.MAX }),
        createGestureInput(100, 0),
      );

      expect(result.rubberBanding).toBe(true);
      expect(result.activeLimit).toBe("fov");
      expect(result.excess).toBe(20);
      expect(result.state.fov).toBeGreaterThan(AR_CONSTANTS.FOV.MAX);
      expect(result.state.fov).toBeLessThan(140);
      expect(snapState(result.state).fov).toBe(AR_CONSTANTS.FOV.MAX);
    });

    test("upward vertical movement increases max distance and zoom", () => {
      const base = state({ zoom: 0, maxDistance: 13_500 });
      const result = updateVertical(base, createGestureInput(0, -10));

      expect(result.state.minDistance).toBe(base.minDistance);
      expect(result.state.maxDistance).toBe(17_500);
      expect(result.state.zoom).toBeCloseTo(0.015, 8);
      expect(result.state.fov).toBe(base.fov);
      expect(result.rubberBanding).toBe(false);
    });

    test("max-distance overshoot is resisted and snaps to DISTANCE.MAX", () => {
      const result = updateVertical(
        state({ maxDistance: 134_000 }),
        createGestureInput(0, -10),
      );

      expect(result.rubberBanding).toBe(true);
      expect(result.activeLimit).toBe("max");
      expect(result.excess).toBe(3_000);
      expect(result.state.maxDistance).toBeGreaterThan(
        AR_CONSTANTS.DISTANCE.MAX,
      );
      expect(result.state.maxDistance).toBeLessThan(138_000);
      expect(snapState(result.state).maxDistance).toBe(
        AR_CONSTANTS.DISTANCE.MAX,
      );
    });

    test("zoom can be the active limit when distance coupling is disabled", () => {
      const config: GestureConfig = {
        ...gestureConfig,
        distance: { ...gestureConfig.distance, max: 1_000_000_000 },
        gesture: {
          ...gestureConfig.gesture,
          verticalPixelToMeter: 0,
          verticalPixelToZoom: 1,
          zoomCouplingFactor: 1,
        },
      };

      const result = updateVertical(
        state({ zoom: 0.5 }),
        createGestureInput(0, -2),
        config,
      );

      expect(result.rubberBanding).toBe(true);
      expect(result.activeLimit).toBe("zoom");
      expect(result.excess).toBe(1.5);
      expect(result.state.zoom).toBeGreaterThan(1);
      expect(result.state.zoom).toBeLessThan(2.5);
    });
  });

  test("getLimitExcess reports only actual overflow", () => {
    expect(getLimitExcess(state(), "fov")).toBe(0);
    expect(getLimitExcess(state({ fov: 125 }), "fov")).toBe(5);
    expect(getLimitExcess(state({ zoom: -0.2 }), "zoom")).toBeCloseTo(0.2);
    expect(
      getLimitExcess(
        state({ maxDistance: AR_CONSTANTS.DISTANCE.MAX + 500 }),
        "max",
      ),
    ).toBe(500);
  });
});
