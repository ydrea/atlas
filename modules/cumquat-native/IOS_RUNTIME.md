# iOS Runtime and Device Testing

This guide covers the application-layer iOS integration around the shared Cumquat C++ engine.

The native module architecture remains documented in `README.md`. The files here are outside the module but are required for correct AR behavior on iPhone and iPad.

## Verified status

The `iOSprod` branch has completed the full unsigned iOS Simulator pipeline:

1. dependency installation;
2. TypeScript checking;
3. Jest;
4. Expo iOS prebuild;
5. CocoaPods;
6. React Native Codegen;
7. Objective-C++ and shared C++20 compilation;
8. unsigned iOS Simulator linking.

This verifies build integration. Camera, GPS, heading, motion axes and performance still require a physical-device test.

## Runtime files

```text
components/ARPermissionGate.tsx
cumquat/sensors.ts
cumquat/northAlignedOrientation.ts
cumquat/types.ts
hooks/usePermissions.ts
hooks/useCameraZoom.ts
app.config.js
```

## Permission and sensor readiness

AR mounts only after all of these are usable:

- camera permission;
- foreground location permission;
- precise iOS location accuracy;
- available and granted device motion.

`SensorHub.start()` throws an explicit startup error when motion is unavailable, motion permission is denied, location permission is denied, or iOS location accuracy is reduced.

`ARPermissionGate` protects the AR route itself, so a deep link, restored route or development reload cannot bypass permission checks. It refreshes permission state when the app returns from system settings.

## Live screen orientation

`SensorSnapshot` contains:

```ts
screenOrientationDegrees: 0 | 90 | 180 | -90;
```

Each Expo DeviceMotion sample updates this value. `createNorthAlignedCameraQuaternion()` uses the live screen rotation rather than a fixed `-90` correction.

Both landscape directions must remain covered by tests:

```text
-90 = left landscape
 90 = right landscape
```

Keep `screenOrientationDegrees` in every mocked or manually constructed `SensorSnapshot`.

## Camera and iPad behavior

The camera wrapper forces preview-only picture mode instead of video mode.

The iOS app configuration uses:

```text
supportsTablet: true
requireFullScreen: true
initialOrientation: LANDSCAPE
```

Full-screen tablet behavior avoids split-view orientation ambiguity.

## Signing overrides

`app.config.js` supports:

```text
IOS_BUNDLE_IDENTIFIER
IOS_APPLE_TEAM_ID
```

These values let clean Expo prebuilds preserve physical-device signing settings without editing generated Xcode files.

## Type-check and test

```bash
npx tsc --noEmit
npm test -- --runInBand
```

The test suite covers sensor readiness, both landscape directions, projection, gestures and static iOS native integration.

## Unsigned iOS Simulator CI

The workflow is:

```text
.github/workflows/ios-simulator.yml
```

It runs for pushes and pull requests on `iOS` and `iOSprod`, and supports manual dispatch.

```bash
gh workflow run ios-simulator.yml --ref iOSprod

RUN_ID="$(
  gh run list \
    --branch iOSprod \
    --workflow ios-simulator.yml \
    --limit 1 \
    --json databaseId \
    --jq '.[0].databaseId'
)"

gh run watch "$RUN_ID" --exit-status
```

The workflow builds with code signing disabled. A green result proves simulator compilation and linkage, not installation on a physical iPhone.

## Physical iPhone build

A physical build requires macOS, Xcode and an Apple development team.

Generate the project with a bundle identifier unique to the selected team:

```bash
IOS_BUNDLE_IDENTIFIER=com.andrija.ar.se2 \
IOS_APPLE_TEAM_ID=YOUR_TEAM_ID \
EAS_BUILD_PROFILE=development \
npx expo prebuild --clean --platform ios

npx pod-install ios
npx expo run:ios --device
```

For the first build, open the generated `.xcworkspace`, enable automatic signing and select the intended team. After that, `IOS_APPLE_TEAM_ID` preserves the team across clean prebuilds.

## Native rebuild boundary

A new native build is required after changes to:

```text
modules/cumquat-native/cpp/**
modules/cumquat-native/ios/**
modules/cumquat-native/specs/**
modules/cumquat-native/CumquatNative.podspec
plugins/withCumquatNative.js
package.json codegenConfig
app.config.js native permissions, orientation or signing
native dependencies
```

Pure TypeScript or UI changes can use EAS Update only when they remain compatible with the installed native runtime.

## Troubleshooting

### Wrong landscape direction

Check that:

- DeviceMotion samples include `orientation`;
- `SensorHub` stores it as `screenOrientationDegrees`;
- `northAlignedOrientation.ts` reads the snapshot value;
- no fixed `-90` correction has been reintroduced.

### Permission gate never becomes ready

Confirm:

- camera is granted;
- foreground location is granted;
- iOS Precise Location is enabled;
- device motion is available and granted.

After changing system settings, return to the app so `ARPermissionGate` refreshes state.

### Physical signing fails

Use a unique bundle identifier, select the correct team in Xcode and keep signing values in `IOS_BUNDLE_IDENTIFIER` and `IOS_APPLE_TEAM_ID` rather than editing generated project files.

### JavaScript changed but native behavior did not

The installed app may still contain an older native binary. C++, podspec, provider, Codegen and native app-config changes require a rebuild and reinstall.

## Maintenance rules

- Keep route-level AR permission gating in place.
- Keep `screenOrientationDegrees` synchronized across runtime types and test fixtures.
- Do not reintroduce a fixed landscape-side assumption.
- Run TypeScript, Jest and the unsigned simulator workflow before merging iOS changes.
- Re-test camera, precise location, compass and motion behavior on a physical iPhone after native or sensor changes.
