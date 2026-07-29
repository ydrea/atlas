#pragma once

#include <cstdint>
#include <string>
#include <vector>

namespace cumquat {

struct GeoPoint {
  double latitudeDeg{0.0};
  double longitudeDeg{0.0};
  double altitudeMeters{0.0};
};

struct Quaternion {
  double x{0.0};
  double y{0.0};
  double z{0.0};
  double w{1.0};
};

struct POI {
  std::string id;
  std::string name;
  GeoPoint position;
};

struct EngineConfig {
  // Immutable hard spatial-query radius. POIs outside this radius never enter
  // a frame and therefore never cross the JSI boundary.
  double datasetRadiusMeters{135000.0};
  std::uint32_t maxVisiblePOIs{256};
};

struct ViewState {
  // Mutable AR presentation state owned by the native engine and updated by
  // gesture output without recreating or reinitializing the engine.
  double horizontalFovDeg{90.0};
  double minDistanceMeters{0.0};
  double maxDistanceMeters{135000.0};
};

struct SensorState {
  std::int64_t timestampNs{0};
  GeoPoint location;

  // Direct device quaternion mode preserves the exact JS q*v*q^-1 path.
  Quaternion orientation;
  bool hasOrientationQuaternion{false};

  // Euler mode remains available for conventional/native callers and tests.
  double headingDeg{0.0};
  double pitchDeg{0.0};
  double rollDeg{0.0};

  double viewportWidth{1.0};
  double viewportHeight{1.0};
};

enum class DistanceClip : std::uint8_t {
  None = 0,
  Min = 1,
  Max = 2,
};

struct VisiblePOI {
  std::uint32_t poiIndex{0};
  double x{0.0};
  double y{0.0};
  double depth{0.0};
  double distance{0.0};
  double bearingDeg{0.0};
  bool visible{false};
  bool clipped{true};
  DistanceClip clippedByDistance{DistanceClip::None};
};

struct FrameSnapshot {
  std::uint64_t sequence{0};
  std::int64_t timestampNs{0};

  // Stable POI-index order for the active hard-radius subset. Includes visible,
  // offscreen, behind-camera, and gesture-distance-clipped entries so the UI
  // can render labels and edge indicators without running a second projection.
  std::vector<VisiblePOI> projectedPOIs;

  // Visible-only, depth-sorted view retained for picking and compatibility.
  std::vector<VisiblePOI> visiblePOIs;
};

struct PickResult {
  std::uint32_t poiIndex{0};
  double distancePixels{0.0};
};

} // namespace cumquat
