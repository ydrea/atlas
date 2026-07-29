#include "core/Engine.h"
#include "projection/Projection.h"

#include <cassert>
#include <cmath>

namespace {
bool near(double a, double b, double epsilon = 2.0) {
  return std::abs(a - b) <= epsilon;
}
}

int main() {
  cumquat::Engine engine({
      .datasetRadiusMeters = 5000.0,
      .maxVisiblePOIs = 16,
  });
  engine.setViewState({
      .horizontalFovDeg = 90.0,
      .minDistanceMeters = 0.5,
      .maxDistanceMeters = 5000.0,
  });

  const cumquat::GeoPoint observer{45.80041, 15.95619, 120.0};
  engine.initialize({
      {"north", "North", {45.80141, 15.95619, 120.0}},
      {"east", "East", {45.80041, 15.95748, 120.0}},
      {"far", "Far", {46.80041, 15.95619, 120.0}},
  });

  cumquat::SensorState state;
  state.timestampNs = 1;
  state.location = observer;
  state.headingDeg = 0.0;
  state.viewportWidth = 1000.0;
  state.viewportHeight = 500.0;

  engine.update(state);
  const auto& northFrame = engine.getFrame();
  assert(northFrame.sequence == 1);
  // The far POI is beyond the immutable dataset radius and is not serialized.
  assert(northFrame.projectedPOIs.size() == 2);
  assert(northFrame.visiblePOIs.size() == 1);
  assert(northFrame.visiblePOIs[0].poiIndex == 0);
  assert(near(northFrame.visiblePOIs[0].x, 500.0));

  // Gesture-produced distance state updates without recreating the engine.
  engine.setViewState({
      .horizontalFovDeg = 90.0,
      .minDistanceMeters = 0.5,
      .maxDistanceMeters = 50.0,
  });
  state.timestampNs = 2;
  engine.update(state);
  const auto& clippedFrame = engine.getFrame();
  assert(clippedFrame.sequence == 2);
  assert(clippedFrame.projectedPOIs.size() == 2);
  assert(clippedFrame.visiblePOIs.empty());
  assert(
      clippedFrame.projectedPOIs[0].clippedByDistance ==
      cumquat::DistanceClip::Max);
  assert(
      clippedFrame.projectedPOIs[1].clippedByDistance ==
      cumquat::DistanceClip::Max);

  engine.setViewState({
      .horizontalFovDeg = 90.0,
      .minDistanceMeters = 0.5,
      .maxDistanceMeters = 5000.0,
  });
  state.timestampNs = 3;
  state.headingDeg = 90.0;
  engine.update(state);
  const auto& eastFrame = engine.getFrame();
  assert(eastFrame.sequence == 3);
  assert(eastFrame.projectedPOIs.size() == 2);
  assert(eastFrame.visiblePOIs.size() == 1);
  assert(eastFrame.visiblePOIs[0].poiIndex == 1);
  assert(near(eastFrame.visiblePOIs[0].x, 500.0));

  const auto picked = engine.pick(500.0, 250.0, 40.0);
  assert(picked.has_value());
  assert(picked->poiIndex == 1);

  // Identity quaternion follows the current JS compatibility convention:
  // q*v*q^-1, radial depth, -Z forward, and X/Y axis remapping. A POI due
  // north therefore lands on the left edge for this synthetic orientation.
  state.timestampNs = 4;
  state.hasOrientationQuaternion = true;
  state.orientation = {0.0, 0.0, 0.0, 1.0};
  engine.update(state);
  const auto& quaternionFrame = engine.getFrame();
  assert(quaternionFrame.sequence == 4);
  assert(quaternionFrame.projectedPOIs.size() == 2);
  assert(quaternionFrame.visiblePOIs.size() == 1);
  assert(quaternionFrame.visiblePOIs[0].poiIndex == 0);
  assert(near(quaternionFrame.visiblePOIs[0].x, 0.0, 3.0));

  // Contract: when a quaternion is present, it takes precedence over the
  // separate heading/pitch/roll fields. An identity quaternion therefore
  // leaves the vector unchanged even when headingDeg says 180 degrees.
  {
    cumquat::SensorState quaternionState;
    quaternionState.hasOrientationQuaternion = true;
    quaternionState.orientation = {0.0, 0.0, 0.0, 1.0};
    quaternionState.headingDeg = 180.0;
    quaternionState.pitchDeg = 0.0;
    quaternionState.rollDeg = 0.0;

    const cumquat::Vec3 enu{1.0, 2.0, 3.0};
    const cumquat::Vec3 camera =
        cumquat::projection::worldToCamera(enu, quaternionState);

    assert(near(camera.x, 1.0, 1e-9));
    assert(near(camera.y, 2.0, 1e-9));
    assert(near(camera.z, 3.0, 1e-9));
  }

  // Contract: without a quaternion, heading/pitch/roll drive the transform.
  // A 180-degree heading rotates east/north to west/south and preserves up.
  {
    cumquat::SensorState headingState;
    headingState.hasOrientationQuaternion = false;
    headingState.headingDeg = 180.0;
    headingState.pitchDeg = 0.0;
    headingState.rollDeg = 0.0;

    const cumquat::Vec3 enu{1.0, 2.0, 3.0};
    const cumquat::Vec3 camera =
        cumquat::projection::worldToCamera(enu, headingState);

    assert(near(camera.x, -1.0, 1e-9));
    assert(near(camera.y, -2.0, 1e-9));
    assert(near(camera.z, 3.0, 1e-9));
  }

  // Behind-camera POIs still produce finite screen-direction coordinates so
  // the UI can place a stable edge indicator instead of falling back to (0, 0).
  double behindX = 0.0;
  double behindY = 0.0;
  double behindDepth = 0.0;
  const bool behindVisible = cumquat::projection::projectToScreen(
      {10.0, 20.0, 100.0},
      state,
      engine.getViewState(),
      behindX,
      behindY,
      behindDepth);
  assert(!behindVisible);
  assert(std::isfinite(behindX));
  assert(std::isfinite(behindY));
  assert(behindX != 0.0 || behindY != 0.0);
  assert(!near(behindX, 500.0, 0.001) || !near(behindY, 250.0, 0.001));

  return 0;
}
