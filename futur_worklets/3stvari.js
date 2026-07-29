//Step 3: The Integrated AR Engine Architecture 
// Inside your main component, set up the tracking architecture using 
// useSharedValue and map your locations into the camera viewport matrix 
// inside useDerivedValue.
export default function Quat() {
  // 1. Thread Communication State
  const userLat = useSharedValue(45.8000); // Default placeholder coordinates
  const userLng = useSharedValue(15.9667);
  const userAlt = useSharedValue(0);
  const quatShared = useSharedValue([1, 0, 0, 0]); // Device orientation cache

  const minDistance = useSharedValue(AR_CONSTANTS.DISTANCE.MIN);
  const maxDistance = useSharedValue(AR_CONSTANTS.DISTANCE.MAX);

  // Gesture lifecycle values
  const startTopY = useSharedValue(0);
  const startBottomY = useSharedValue(0);
  const topTouchId = useSharedValue(null);
  const bottomTouchId = useSharedValue(null);
  const gestureMode = useSharedValue("undetermined");
  const baseMinDist = useSharedValue(0);
  const baseMaxDist = useSharedValue(0);

  // 2. Hardware Stream Listener Subscriptions
  useEffect(() => {
    let subscription;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const loc = await Location.getCurrentPositionAsync({});
      userLat.value = loc.coords.latitude;
      userLng.value = loc.coords.longitude;
      userAlt.value = loc.coords.altitude || 0;

      Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 2, timeInterval: 1000 },
        (newLoc) => {
          userLat.value = newLoc.coords.latitude;
          userLng.value = newLoc.coords.longitude;
          userAlt.value = newLoc.coords.altitude || 0;
        }
      );

      DeviceMotion.setUpdateInterval(16); // ~60 Hz device orientation stream
      subscription = DeviceMotion.addListener((data) => {
        if (data.rotation) {
          const { alpha, beta, gamma } = data.rotation;
          
          // Compute Quaternion structure directly on sensor updates
          const z = alpha / 2; const x = beta / 2; const y = gamma / 2;
          const c1 = Math.cos(z), s1 = Math.sin(z);
          const c2 = Math.cos(x), s2 = Math.sin(x);
          const c3 = Math.cos(y), s3 = Math.sin(y);

          // Update shared array directly (triggers immediate re-evaluation of useDerivedValue)
          quatShared.value = [
            c1 * c2 * c3 - s1 * s2 * s3,
            c1 * s2 * c3 - s1 * c2 * s3,
            c1 * c2 * s3 + s1 * s2 * c3,
            s1 * c2 * c3 + c1 * s2 * s3,
          ];
        }
      });
    })();

    return () => subscription?.remove();
  }, []);

  // 3. Centralized Viewport Matrix Projection Worklet Loop
  const processedMarkers = useDerivedValue(() => {
    const uLat = userLat.value;
    const uLng = userLng.value;
    const uAlt = userAlt.value;
    const currentQuat = quatShared.value;

    const userEcef = workletGeodeticToEcef(uLat, uLng, uAlt);
    const φ = workletToRad(uLat);
    const λ = workletToRad(uLng);

    // Approximate camera focal projection matrix settings
    const fovRad = workletToRad(AR_CONSTANTS.FOV.DEFAULT);
    const focalLengthX = SCREEN_WIDTH / (2 * Math.tan(fovRad / 2));
    const focalLengthY = SCREEN_HEIGHT / (2 * Math.tan(fovRad / 2));

    return ISLANDS.map((island) => {
      const islandEcef = workletGeodeticToEcef(island.lat, island.lng, island.alt);
      
      const dx = islandEcef.x - userEcef.x;
      const dy = islandEcef.y - userEcef.y;
      const dz = islandEcef.z - userEcef.z;

      // Map to Earth Ground Horizon Plane (ENU)
      const e = -Math.sin(λ) * dx + Math.cos(λ) * dy;
      const n = -Math.sin(φ) * Math.cos(λ) * dx - Math.sin(φ) * Math.sin(λ) * dy + Math.cos(φ) * dz;
      const u = Math.cos(φ) * Math.cos(λ) * dx + Math.cos(φ) * Math.sin(λ) * dy + Math.sin(φ) * dz;

      const rawDistance = Math.sqrt(e * e + n * n + u * u);

      // Check distance visibility mask boundaries
      const isInDistanceWindow = rawDistance >= minDistance.value && rawDistance <= maxDistance.value;

      // Apply device orientation quaternion to ENU spatial tracking vector
      const enuVector = { x: e, y: n, z: u };
      const rotated = workletRotateVector(enuVector, currentQuat);

      // Camera coordinate mapping convention: X=Right, Y=Up, Z=Forward (into screen)
      const camX = rotated.x;
      const camY = rotated.z; // Swap coordinate maps according to device orientation
      const camZ = rotated.y; 

      let screenX = -9999;
      let screenY = -9999;
      let isFacingCamera = camZ > 0.1; // Behind device plane clipping check

      if (isFacingCamera) {
        screenX = SCREEN_WIDTH / 2 + (camX * focalLengthX) / camZ;
        screenY = SCREEN_HEIGHT / 2 - (camY * focalLengthY) / camZ;
      }

      // Check boundary constraints
      const isWithinScreenBounds = screenX >= 0 && screenX <= SCREEN_WIDTH && screenY >= 0 && screenY <= SCREEN_HEIGHT;
      const fullyVisible = isInDistanceWindow && isFacingCamera && isWithinScreenBounds;

      return {
        id: island.id,
        name: island.name,
        x: screenX,
        y: screenY,
        distance: rawDistance,
        opacity: fullyVisible ? 1 : 0,
      };
    });
  });

  // 4. Input Tracking Touch Engine Config
  const panGesture = Gesture.Pan()
    .minPointers(2)
    .maxPointers(2)
    .onTouchesStart((e) => {
      if (e.allTouches.length !== 2) return;
      const [t1, t2] = e.allTouches;
      if (t1.y < t2.y) {
        startTopY.value = t1.y; topTouchId.value = t1.id;
        startBottomY.value = t2.y; bottomTouchId.value = t2.id;
      } else {
        startTopY.value = t2.y; topTouchId.value = t2.id;
        startBottomY.value = t1.y; bottomTouchId.value = t1.id;
      }
      baseMinDist.value = minDistance.value;
      baseMaxDist.value = maxDistance.value;
      gestureMode.value = "undetermined";
    })
    .onTouchesMove((e) => {
      if (e.allTouches.length !== 2) return;
      const topTouch = e.allTouches.find((t) => t.id === topTouchId.value);
      const bottomTouch = e.allTouches.find((t) => t.id === bottomTouchId.value);
      if (!topTouch || !bottomTouch) return;

      const topDeltaY = topTouch.y - startTopY.value;
      const bottomDeltaY = bottomTouch.y - startBottomY.value;

      if (gestureMode.value === "undetermined") {
        const absTop = Math.abs(topDeltaY);
        const absBottom = Math.abs(bottomDeltaY);
        if (absTop > absBottom * 1.5) gestureMode.value = "above";
        else if (absBottom > absTop * 1.5) gestureMode.value = "below";
      }

      const METER_PER_PIXEL = 350; // Drag step scaling mapping factor

      if (gestureMode.value === "above") {
        let targetMin = baseMinDist.value + topDeltaY * METER_PER_PIXEL;
        if (targetMin < AR_CONSTANTS.DISTANCE.MIN) targetMin = AR_CONSTANTS.DISTANCE.MIN;
        if (targetMin > maxDistance.value - 2000) targetMin = maxDistance.value - 2000;
        minDistance.value = targetMin;
      } else if (gestureMode.value === "below") {
        let targetMax = baseMaxDist.value + bottomDeltaY * METER_PER_PIXEL;
        if (targetMax > AR_CONSTANTS.DISTANCE.MAX) targetMax = AR_CONSTANTS.DISTANCE.MAX;
        if (targetMax < minDistance.value + 2000) targetMax = minDistance.value + 2000;
        maxDistance.value = targetMax;
      }
    })
    .onEnd(() => {
      topTouchId.value = null; bottomTouchId.value = null;
      gestureMode.value = "undetermined";
    });

  return (
    <GestureHandlerRootView style={styles.container}>
      <GestureDetector gesture={panGesture}>
        <View style={styles.container}>
          <CameraView style={StyleSheet.absoluteFillObject} />
          
          {/* Dynamic Layer Elements Renderer */}
          <Svg style={StyleSheet.absoluteFillObject}>
            {ISLANDS.map((island, idx) => (
              <ARNodePointer key={island.id} index={idx} streamRef={processedMarkers} />
            ))}
          </Svg>
        </View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}
