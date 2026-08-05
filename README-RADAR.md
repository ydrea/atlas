# Atlas Cumquat radar route

This overlay adds a `RADAR` tab to Atlas. It renders every in-range production
POI in a phone-forward, top-down radar driven by the exact orientation and
projected POIs exposed by `react-native-cumquat@0.1.8`.

- Two-finger vertical pan changes the maximum range.
- Two-finger horizontal pan changes the FOV cone.
- A blip can be tapped to inspect its distance, bearing, elevation, and whether
  it lies inside the current camera cone.
- The Cumquat engine is initialized once. Gesture updates use `setViewState()`.
- Compass heading is supplied only for Cumquat's initial startup reference; the live radar rotation comes from `frame.orientation`.

## Apply to Atlas

From the Atlas repository root, copy/extract these files over the matching
paths, then run:

```bash
npm install react-native-cumquat@latest react-native-cumquat-gestures@latest
npx tsc --noEmit
npm test -- --runInBand
```

rebuild the native development client:

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

## Implementation with a single useEffect

```tsx
useEffect(() => {
  let isAlive = true;
  let engineInstance: ReturnType<typeof CumquatEngine.create> | null = null;

  async function setupRadar() {
    try {
      const loaded = await loadPOIsFromAsset(poiBinaryAsset);
      if (!isAlive) return;

      const production = loaded.filter(
        (poi) => poi.id !== 999 && poi.name.trim().toUpperCase() !== "TEST",
      );

      if (production.length === 0) throw new Error("No production records.");
      setPOIs(production);

      // Instantiating the engine right here prevents race conditions
      const nativePOIs = production.map((poi) => ({
        id: String(poi.id),
        name: poi.name,
        latitude: poi.lat,
        longitude: poi.lon,
        altitude: poi.alt,
      }));

      engineInstance = CumquatEngine.create({
        datasetRadiusMeters: DATASET_RADIUS_METERS,
        maxVisiblePOIs: nativePOIs.length,
      });

      engineInstance.initialize(nativePOIs);
      engineInstance.setViewState(toNativeViewState(gestureStateRef.current));

      if (isAlive) {
        engineRef.current = engineInstance;
        setStatus("calibrating");
      }
    } catch (err) {
      if (isAlive) {
        setStatus("error");
        setError(err instanceof Error ? err.message : "Initialization failed.");
      }
    }
  }

  setupRadar();

  return () => {
    isAlive = false;
    if (engineInstance) {
      engineInstance.dispose();
    }
    engineRef.current = null;
  };
}, []); // Empty dependency array controls the whole lifecycle safely
```
