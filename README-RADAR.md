# Atlas Cumquat radar route

This overlay adds a `RADAR` tab to Atlas. It renders every in-range production
POI in a phone-forward, top-down radar driven by the exact orientation and
projected POIs exposed by `react-native-cumquat@0.1.6`.

- Two-finger vertical pan changes the maximum range.
- Two-finger horizontal pan changes the FOV cone.
- A blip can be tapped to inspect its distance, bearing, elevation, and whether
  it lies inside the current camera cone.
- The Cumquat engine is initialized once. Gesture updates use `setViewState()`.
- Compass heading is supplied only for Cumquat's frozen startup reference; the
  live radar rotation comes from `frame.orientation`.

## Apply to Atlas

From the Atlas repository root, copy/extract these files over the matching
paths, then run:

```bash
npm install react-native-cumquat@0.1.6 react-native-cumquat-gestures@0.1.0
npx tsc --noEmit
npm test -- --runInBand
```

Version 0.1.6 changes native Cumquat code, so Expo Go or an OTA JavaScript
update is not sufficient. Rebuild the native development client:

```bash
npx expo run:android
```

If this checkout has no generated native project yet, run `npx expo prebuild`
once before `npx expo run:android`.

Commit with a conventional subject so the repository hook accepts it:

```bash
git add -A
git commit -m "feat: add Cumquat radar route"
```
