# Atlas

Atlas is an Expo/React Native augmented-reality application for exploring geographic points of interest. It combines a camera AR view, a north-aligned radar, GPS positioning, device-motion tracking, and two-finger controls for distance, field of view, and camera zoom.

## Main views

- **Home** — permissions, language selection, and the corrected rear-camera bearing.
- **AR Beta** — camera overlay with projected POI labels, distances, and edge indicators.
- **Radar** — top-down POI display aligned with the same geographic orientation as AR.
- **Help** — in-app guidance.

Radar and AR use the same POI dataset, sensor hub, Cumquat engine, view limits, and geographic orientation contract.

## Core versions

- Expo SDK 56
- React Native 0.85.3
- React 19.2.3
- `react-native-cumquat@0.1.8`
- `react-native-cumquat-gestures@^0.1.0`

Keep Cumquat pinned to `0.1.8`. The compass/camera correction belongs to Atlas and does not require another Cumquat release.

## Orientation architecture

Atlas deliberately gives the compass and motion sensors different responsibilities:

1. `expo-location` supplies a fresh geographic compass heading.
2. Expo reports that heading along the phone's portrait top edge.
3. Atlas converts it to the physical rear-camera direction for the active screen rotation:

   ```ts
   cameraHeading = normalizeDegrees(
     compassHeading + screenOrientationDegrees,
   );
   ```

4. Atlas passes that camera heading to Cumquat as `initialHeadingDegrees`.
5. Cumquat pairs it once with its non-magnetic game quaternion.
6. The game quaternion tracks subsequent movement smoothly without continuous magnetometer steering.
7. Radar and AR display the bearing derived from Cumquat's anchored frame.

This separation avoids the two failure modes encountered during development:

- A DeviceMotion/game quaternion is smooth but may begin with an arbitrary geographic yaw.
- A continuously applied magnetometer heading can steer or destabilize the projected scene.

### Compass accuracy

Expo's compass accuracy grade is informational only. It does not block Home, Radar, AR, or POI rendering, and Atlas does not require a figure-eight calibration step.

Atlas does require a **fresh finite heading sample** for each sensor session. On sensor shutdown it invalidates the previous heading so a new Cumquat engine cannot freeze a stale geographic reference.

### Verified Galaxy S7 result

A north-facing physical-device test on a Samsung Galaxy S7 produced:

| Source | Bearing |
| --- | ---: |
| Home camera bearing | 1° |
| Radar | 3° |
| AR | 3° |
| Independent compass shortly afterward | 8° |

The same run restored all 35 active POIs, with two visible in the camera FOV. Small differences of a few degrees are normal compass variation.

## POI display

### AR indicators

| Indicator | Meaning |
| --- | --- |
| Label and dot | POI is visible in the camera view |
| White edge triangle | POI is outside the current screen bounds |
| Yellow distance indicator | POI is beyond the maximum range |
| Blue distance indicator | POI is inside the minimum range |

Distance clipping uses true radial distance rather than camera-space depth.

### Radar

Radar shows every projected POI within the selected distance range. The blue cone represents the camera FOV; blips inside the cone are visually distinguished from surrounding POIs. Tapping a blip opens its name, distance, bearing, relative bearing, and elevation.

Radar never hides POIs because of Expo's compass-accuracy grade. Before the first Cumquat frame is available, it can use the corrected compass camera heading as its temporary forward bearing.

## Two-finger controls

| Gesture | Result |
| --- | --- |
| Move the top finger vertically | Adjust maximum POI distance |
| Move the bottom finger vertically | Adjust minimum POI distance |
| Move both fingers vertically | Adjust camera zoom in AR |
| Spread or pinch horizontally | Adjust horizontal FOV |

Radar has no camera zoom; vertical movement controls its range. Rubber-band feedback indicates configured limits.

The reset control restores the default distance, FOV, and zoom values.

## Development

Install dependencies:

```bash
npm install
```

Build and install the Android development client:

```bash
npx expo run:android
```

Start the development client with a clean Metro cache:

```bash
npm run dev
```

If a USB-connected Android device cannot reach Metro:

```bash
adb reverse tcp:8081 tcp:8081
npm run dev
```

## Validation

Run TypeScript and the complete Jest suite before a build or merge:

```bash
npx tsc --noEmit
npm test -- --runInBand
```

The orientation regression coverage includes:

- portrait and both landscape screen rotations
- Galaxy S7 captured quaternion behavior
- compass top-edge to rear-camera conversion
- low accuracy grades remaining non-blocking
- stale compass invalidation between sensor sessions
- Radar/AR Cumquat initialization
- native projection and iOS integration
- POI projection, distance clipping, gestures, and radar math

## Field test

For a final orientation check:

1. Start the app while pointing the rear camera at a known direction.
2. Compare Home's camera bearing with an independent compass.
3. Open Radar and confirm its bearing agrees with Home.
4. Open AR and confirm its HUD agrees with Radar.
5. Rotate approximately 90° east or west and verify Radar and AR follow by the same amount.
6. Force-stop, restart, and repeat to confirm a fresh session anchor.

A figure-eight motion may improve a poorly calibrated physical magnetometer, but Atlas neither requires nor gates functionality on it.
