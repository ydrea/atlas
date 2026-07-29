const fs = require('fs');
const os = require('os');
const path = require('path');
const {execFileSync} = require('child_process');

const describeNative = process.platform === 'win32' ? describe.skip : describe;

describeNative('Cumquat native projection', () => {
  test('projects a straight-ahead island exactly behind the crosshair', () => {
    const packageRoot = path.dirname(
      require.resolve('react-native-cumquat/package.json'),
    );
    const tempDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'cumquat-projection-test-'),
    );
    const sourcePath = path.join(tempDir, 'projection_center_test.cpp');
    const executablePath = path.join(tempDir, 'projection_center_test');

    const source = String.raw`
#include <cmath>
#include <iostream>
#include "projection/Projection.h"

namespace {

bool centeredForViewport(double width, double height) {
  cumquat::SensorState sensor;
  sensor.hasOrientationQuaternion = true;
  sensor.orientation = {0.0, 0.0, 0.0, 1.0};
  sensor.viewportWidth = width;
  sensor.viewportHeight = height;

  cumquat::ViewState view;
  view.horizontalFovDeg = 90.0;
  view.minDistanceMeters = 0.0;
  view.maxDistanceMeters = 135000.0;

  const cumquat::Vec3 islandWorldDirection{0.0, 0.0, -1000.0};
  const cumquat::Vec3 camera =
      cumquat::projection::worldToCamera(islandWorldDirection, sensor);

  double x = 0.0;
  double y = 0.0;
  double depth = 0.0;
  const bool visible = cumquat::projection::projectToScreen(
      camera,
      sensor,
      view,
      x,
      y,
      depth);

  const double crosshairX = width * 0.5;
  const double crosshairY = height * 0.5;
  constexpr double tolerance = 1e-9;

  if (!visible ||
      std::abs(x - crosshairX) > tolerance ||
      std::abs(y - crosshairY) > tolerance) {
    std::cerr
        << "Expected centered projection at ("
        << crosshairX << ", " << crosshairY
        << "), got (" << x << ", " << y
        << "), visible=" << visible
        << ", depth=" << depth << '\n';
    return false;
  }

  return true;
}

} // namespace

int main() {
  if (!centeredForViewport(1920.0, 1080.0)) return 1;
  if (!centeredForViewport(1000.0, 600.0)) return 1;
  if (!centeredForViewport(720.0, 1280.0)) return 1;
  return 0;
}
`;

    fs.writeFileSync(sourcePath, source);

    try {
      execFileSync(
        process.env.CXX || 'c++',
        [
          '-std=c++20',
          '-I',
          path.join(packageRoot, 'cpp'),
          sourcePath,
          path.join(packageRoot, 'cpp/projection/Projection.cpp'),
          '-o',
          executablePath,
        ],
        {stdio: 'pipe'},
      );

      execFileSync(executablePath, [], {stdio: 'pipe'});
    } finally {
      fs.rmSync(tempDir, {recursive: true, force: true});
    }
  });
});
