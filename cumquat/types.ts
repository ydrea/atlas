// cumquat/types.ts
export type CompassAccuracy = 0 | 1 | 2 | 3;

export type DeviceScreenOrientationDegrees = 0 | 90 | 180 | -90;

export type SensorSnapshot = {
  lat: number;
  lon: number;
  elevation: number;
  orientation: Quat;
  screenOrientationDegrees: DeviceScreenOrientationDegrees;
  heading: number;
  headingAccuracy: CompassAccuracy;
  magneticHeading: number;
  trueHeading: number | null;
  timestamp: number;
};

export type Quat = {
  x: number;
  y: number;
  z: number;
  w: number;
};

export type WorldPosition = {
  position: Vec3;
  distance: number;
  bearing: number;
};

export type Vec3 = {
  x: number;
  y: number;
  z: number;
};

export type ScreenPosition = {
  clipped: boolean;
  x: number;
  y: number;
  visible: boolean;
  clippedByDistance?: "min" | "max" | null;
  depth?: number;
  radialDistance?: number;
};

export type ProjectedPOI = {
  id: number;
  name: string;
  distance: number;
  screenPos: ScreenPosition;
  rawPos: Vec3;
};

// AROutput type for the overlay
export type AROutput = {
  id: number;
  name: string;
  world: WorldPosition;
  screen: ScreenPosition;
  distance: number;
};
