import type {Quat, ScreenPosition, SensorSnapshot, Vec3} from "./types";

type ProjectionParameters = {
  trueDistance: number;
  width: number;
  height: number;
  fov: number;
  minDistance: number;
  maxDistance: number;
};

// The side-by-side comparison served its purpose and is now intentionally a
// no-op. Keeping this shim lets the legacy JS fallback remain isolated without
// paying for a second native engine or changing the sensor utility API.
export const nativeProjectionDebug = {
  setSensorSnapshot(_snapshot: SensorSnapshot): void {},

  registerGeo(
    _vector: Vec3,
    _sourceLatitude: number,
    _sourceLongitude: number,
    _sourceAltitude: number,
    _targetLatitude: number,
    _targetLongitude: number,
    _targetAltitude: number,
  ): void {},

  registerRotation(
    _source: Vec3,
    _result: Vec3,
    _orientation: Quat,
  ): void {},

  compareProjection(
    _cameraPosition: Vec3,
    jsProjection: ScreenPosition,
    _parameters: ProjectionParameters,
  ): ScreenPosition {
    return jsProjection;
  },

  dispose(): void {},
};
