// /constants.js

export const AR_CONSTANTS = {
  DEG2RAD: Math.PI / 180,
  RAD2DEG: 180 / Math.PI,
  R: 6371000,

  // Gesture settings
  GESTURE: {
    MIN_DISTANCE_GAP: 100,
    RUBBER_BAND_FACTOR: 0.3,
    VERTICAL_PIXEL_TO_METER: 400,
    VERTICAL_PIXEL_TO_ZOOM: 0.003,
    HORIZONTAL_PIXEL_TO_FOV: 0.2,
    RUBBER_BAND_MAX_RESISTANCE: 0.8,
    RUBBER_BAND_LOG_FACTOR: 0.15,
    SPRING_STIFFNESS: 240,
    SPRING_DAMPING: 24,
    SPRING_MASS: 1,
    DISTANCE_SENSITIVITY: 1,
    ZOOM_SENSITIVITY: 1,
    FOV_SENSITIVITY: 1,
    ZOOM_COUPLING_FACTOR: 0.5,
  },
  // WGS84 constants
  WGS84_A: 6378137,
  WGS84_F: 1 / 298.257223563,

  // FOV settings
  FOV: {
    MIN: 30,
    MAX: 120,
    DEFAULT: 90,
    STEP: 10,
  },

  // Distance settings (in meters)
  DISTANCE: {
    MIN: 0,
    MAX: 135000, // 135km
    DEFAULT_MIN: 0,
    DEFAULT_MAX: 13500, // 13.5km default
    STEP: 10000, // 10km steps
  },

  // UI settings
  UI: {
    MIN_GAP: 50,
    THUMB_SIZE: 32,
  },
};
