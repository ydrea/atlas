// Updated Quat.tsx - Fixed version with proper SVG lines and edge indicators
import { CameraView } from "@/ui/CameraView";
import * as Location from "expo-location";
import { DeviceMotion } from "expo-sensors";
import React, { useEffect, useState, useRef } from "react";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line } from "react-native-svg";
import { Tlog } from "@/utils/tlog";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const ISLANDS = [
    { id: 1, name: "Tresnjevacki trg Market", type: "Market", lat: 45.8000, lng: 15.9667, alt: 1 },
  { id: 2, name: "Cafic Eliscafe", type: "Cafic", lat: 45.7995, lng: 15.9670, alt: 1 },
  { id: 3, name: "Pekara Mlinar", type: "Bakery", lat: 45.8005, lng: 15.9660, alt: 1 },
  { id: 4, name: "Konoba Tresnjevka", type: "Restaurant", lat: 45.7990, lng: 15.9675, alt: 1 },
  { id: 5, name: "Park Maksimir", type: "Park", lat: 45.8100, lng: 15.9800, alt: 1 },
  { id: 6, name: "Trg Njegoševa", type: "Square", lat: 45.7980, lng: 15.9650, alt: 1 },
  { id: 7, name: "Konzum Superstore", type: "Supermarket", lat: 45.8010, lng: 15.9680, alt: 1 },
  { id: 8, name: "Ljekarna Tresnjevka", type: "Pharmacy", lat: 45.7985, lng: 15.9645, alt: 1 },
  { id: 9, name: "Osnovna škola Tresnjevka", type: "School", lat: 45.8020, lng: 15.9690, alt: 1 },
  { id: 10, name: "Crkva sv.Antuna", type: "Church", lat: 45.7975, lng: 15.9630, alt: 1 },
  { id: 11, name: "Pivnica Medvedgrad", type: "Pub", lat: 45.8030, lng: 15.9700, alt: 1 },
  { id: 12, name: "Bistrolana Tresnjevka", type: "Bistro", lat: 45.7990, lng: 15.9685, alt: 1 },
  { id: 13, name: "Frizerski salon Ana", type: "Hair Salon", lat: 45.8000, lng: 15.9655, alt: 1 },
  { id: 14, name: "Automehaničar Drop", type: "Car Repair", lat: 45.7970, lng: 15.9670, alt: 1 },
  { id: 15, name: "Vrtuljak Park", type: "Park", lat: 45.7960, lng: 15.9640, alt: 1 },
  { id: 16, name: "Benzinska postaja INA", type: "Gas Station", lat: 45.8040, lng: 15.9710, alt: 1 },
  { id: 17, name: "Poslovni centar Tresnjevka", type: "Business Center", lat: 45.8015, lng: 15.9695, alt: 1 },
  { id: 18, name: "Knjižara Algoritam", type: "Bookstore", lat: 45.7980, lng: 15.9665, alt: 1 },
  { id: 19, name: "Pekara Kruh", type: "Bakery", lat: 45.8025, lng: 15.9675, alt: 1 },
  { id: 20, name: "Ljekarna Jambo", type: "Pharmacy", lat: 45.7975, lng: 15.9680, alt: 1 },
  { id: 21, name: "Cibona", type: "Skyscraper", lat: 45.803249057020885, lng: 15.96347793271185, alt: 92 },
  { id: 22, name: "Zagrepčanka", type: "Skyscraper", lat: 45.798528643549396, lng: 15.96245585283698, alt: 95 },
  { id: 23, name: "Vjesnik", type: "Skyscraper", lat: 45.793551576662246, lng: 15.959205695046405, alt: 67 },
  { id: 24, name: "Jelenovac", type: "Park", lat: 45.82741901993836, lng: 15.956039702679561, alt: 135 },
  { id: 25, name: "Dom sportova", type: "Sports Venue", lat: 45.80736039531922, lng: 15.951976431579737, alt: 0 },
  { id: 26, name: "Sljeme", type: "Mountain", lat: 45.89946265300375, lng: 15.94482091926767, alt: 1033 },
  { id: 27, name: "Medvedgrad", type: "Castle", lat: 45.89946265300375, lng: 15.94482091926767, alt: 579 },
  { id: 28, name: "Grmoščica", type: "Hill", lat: 45.81692484023739, lng: 15.92419321766124, alt: 239 },
  { id: 29, name: "Trg Francuske Republike", type: "Square", lat: 45.81050656334719, lng: 15.95553638845962, alt: 0 },
  { id: 30, name: "Otok ljubavi", type: "Island", lat: 45.779416, lng: 15.93489, alt: 7 },
  { id: 31, name: "Otok veslača", type: "Island", lat: 45.778193, lng: 15.93373, alt: 10 },
  { id: 32, name: "Otok Trešnjevka", type: "Island", lat: 45.782458, lng: 15.918919, alt: 10 },
  { id: 33, name: "Otok Univerzijade", type: "Island", lat: 45.784486, lng: 15.914094, alt: 15 },
  { id: 34, name: "Otok hrvatske mladeži", type: "Island", lat: 45.778619, lng: 15.925837, alt: 14 },
  { id: 35, name: "Otok divljine", type: "Island", lat: 45.776107, lng: 15.927812, alt: 20 }
];

const WGS84 = { a: 6378137, f: 1 / 298.257223563 };
const e2 = WGS84.f * (2 - WGS84.f);
const toRad = (deg) => (deg * Math.PI) / 180;

const geodeticToEcef = (lat, lon, h) => {
  const φ = toRad(lat);
  const λ = toRad(lon);
  const N = WGS84.a / Math.sqrt(1 - e2 * Math.sin(φ) ** 2);
  return {
    x: (N + h) * Math.cos(φ) * Math.cos(λ),
    y: (N + h) * Math.cos(φ) * Math.sin(λ),
    z: (N * (1 - e2) + h) * Math.sin(φ),
  };
};

const rotateVector = (v, q) => {
  const [qw, qx, qy, qz] = q;
  const [vx, vy, vz] = [v.x, v.y, v.z];

  const ix = qw * vx + qy * vz - qz * vy;
  const iy = qw * vy + qz * vx - qx * vz;
  const iz = qw * vz + qx * vy - qy * vx;
  const iw = -qx * vx - qy * vy - qz * vz;

  return {
    x: ix * qw + iw * -qx + iy * -qz - iz * -qy,
    y: iy * qw + iw * -qy + iz * -qx - ix * -qz,
    z: iz * qw + iw * -qz + ix * -qy - iy * -qx,
  };
};

const eulerToQuaternion = (alpha, beta, gamma) => {
  const z = alpha / 2;
  const x = beta / 2;
  const y = gamma / 2;

  const c1 = Math.cos(z), s1 = Math.sin(z);
  const c2 = Math.cos(x), s2 = Math.sin(x);
  const c3 = Math.cos(y), s3 = Math.sin(y);

  return [
    c1 * c2 * c3 - s1 * s2 * s3,
    c1 * s2 * c3 - s1 * c2 * s3,
    c1 * c2 * s3 + s1 * s2 * c3,
    s1 * c2 * c3 + c1 * s2 * s3,
  ];
};

// Format distance
const formatDistance = (meters) => {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
};

export default function Quat() {
  const [location, setLocation] = useState(null);
  const [quat, setQuat] = useState([1, 0, 0, 0]);
  const [poiData, setPoiData] = useState([]);
  
  useEffect(() => {
    (async () => {
      const { status: locStatus } = await Location.requestForegroundPermissionsAsync();
      if (locStatus !== 'granted') return;

      const initialLoc = await Location.getCurrentPositionAsync({});
      setLocation(initialLoc);

      Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 5, timeInterval: 1000 },
        (loc) => setLocation(loc)
      );

      DeviceMotion.setUpdateInterval(50);
      DeviceMotion.addListener((data) => {
        if (data.rotation) {
          const { alpha, beta, gamma } = data.rotation;
          const deviceQuat = eulerToQuaternion(alpha, beta, gamma);
          setQuat(deviceQuat);
        }
      });
    })();

    return () => DeviceMotion.removeAllListeners();
  }, []);

  // Update POI calculations
  useEffect(() => {
    if (!location) return;

    const userEcef = geodeticToEcef(
      location.coords.latitude,
      location.coords.longitude,
      location.coords.altitude || 0
    );
    const φ = toRad(location.coords.latitude);
    const λ = toRad(location.coords.longitude);

    const updatedPOIs = [];

    for (const island of ISLANDS) {
      const islandEcef = geodeticToEcef(island.lat, island.lng, island.alt);

      const dx = islandEcef.x - userEcef.x;
      const dy = islandEcef.y - userEcef.y;
      const dz = islandEcef.z - userEcef.z;

      // ENU transformation
      const e = -Math.sin(λ) * dx + Math.cos(λ) * dy;
      const n = -Math.sin(φ) * Math.cos(λ) * dx - Math.sin(φ) * Math.sin(λ) * dy + Math.cos(φ) * dz;
      const u = Math.cos(φ) * Math.cos(λ) * dx + Math.cos(φ) * Math.sin(λ) * dy + Math.sin(φ) * dz;

      const distanceMeters = Math.sqrt(e * e + n * n + u * u);
      const distanceKm = distanceMeters / 1000;
      
      if (distanceKm > 50) continue;

      // Calculate bearing
      let bearing = Math.atan2(e, n) * 180 / Math.PI;
      if (bearing < 0) bearing += 360;

      // Rotate to camera space
      const cameraSpace = rotateVector({ x: e, y: n, z: u }, [
        quat[0],
        -quat[1],
        -quat[2],
        -quat[3]
      ]);

      // Skip if behind camera
      if (cameraSpace.z > 0) continue;

      // Swap X and Y for landscape orientation correction
      const correctedSpace = {
        x: -cameraSpace.y,
        y: -cameraSpace.x,
        z: cameraSpace.z
      };

      // Perspective projection
      const focalLength = SCREEN_WIDTH / (2 * Math.tan(toRad(60 / 2)));
      const depth = -cameraSpace.z;
      
      let screenX = SCREEN_WIDTH / 2 + (correctedSpace.x * focalLength) / depth;
      let screenY = SCREEN_HEIGHT / 2 - (correctedSpace.y * focalLength) / depth;
      
      // Clamp to screen edges with padding to prevent cut-off labels
      const LABEL_WIDTH = 120;
      const LABEL_HEIGHT = 60;
      const PADDING = 10;
      
      let clampedX = screenX;
      let clampedY = screenY;
      let isAtEdge = false;
      
      // Clamp X with label width consideration
      if (clampedX < LABEL_WIDTH/2 + PADDING) {
        clampedX = LABEL_WIDTH/2 + PADDING;
        isAtEdge = true;
      }
      if (clampedX > SCREEN_WIDTH - LABEL_WIDTH/2 - PADDING) {
        clampedX = SCREEN_WIDTH - LABEL_WIDTH/2 - PADDING;
        isAtEdge = true;
      }
      
      // Clamp Y with label height consideration
      if (clampedY < LABEL_HEIGHT/2 + PADDING) {
        clampedY = LABEL_HEIGHT/2 + PADDING;
        isAtEdge = true;
      }
      if (clampedY > SCREEN_HEIGHT - LABEL_HEIGHT/2 - PADDING) {
        clampedY = SCREEN_HEIGHT - LABEL_HEIGHT/2 - PADDING;
        isAtEdge = true;
      }
      
      // Check if on screen
      const isOnScreen = screenX >= -200 && screenX <= SCREEN_WIDTH + 200 && 
                         screenY >= -200 && screenY <= SCREEN_HEIGHT + 200;
      
      updatedPOIs.push({
        id: island.id.toString(),
        name: island.name,
        type: island.type,
        distanceMeters,
        bearing,
        rawX: screenX,
        rawY: screenY,
        screenX: clampedX,
        screenY: clampedY,
        isOnScreen,
        isAtEdge,
        world: { distance: distanceMeters },
      });
    }

    setPoiData(updatedPOIs);
  }, [location, quat]);

  // Separate on-screen and off-screen POIs
  const onScreenPOIs = poiData.filter(p => p.isOnScreen);
  const offscreenPOIs = poiData.filter(p => !p.isOnScreen);

  // Get edge indicator positions for off-screen POIs
  const getEdgeIndicator = (rawX, rawY) => {
    const MARGIN = 30;
    let x = rawX;
    let y = rawY;
    
    if (x < 0) x = MARGIN;
    if (x > SCREEN_WIDTH) x = SCREEN_WIDTH - MARGIN;
    if (y < 0) y = MARGIN;
    if (y > SCREEN_HEIGHT) y = SCREEN_HEIGHT - MARGIN;
    
    return { x, y };
  };

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} />
      <View style={styles.overlay}>
        {/* On-screen POI Labels with SVG Circles and Lines */}
        {onScreenPOIs.map((poi) => {
          // Calculate anchor point for leader line (offset from label)
          const anchorOffset = 45; // Distance from label center to line endpoint
          let anchorX = poi.screenX;
          let anchorY = poi.screenY - anchorOffset;
          
          // Adjust anchor direction based on screen position
          if (poi.screenY < 100) {
            // Near top, draw line downward
            anchorY = poi.screenY + anchorOffset;
          }
          
          // Calculate line coordinates
          const dx = anchorX - poi.rawX;
          const dy = anchorY - poi.rawY;
          const lineLength = Math.sqrt(dx * dx + dy * dy);
          
          // Only show line if significant offset
          const showLine = Math.abs(poi.screenX - poi.rawX) > 5 || 
                          Math.abs(poi.screenY - poi.rawY) > 5;
          
          // Color based on distance
          const getLineColor = (dist) => {
            if (dist < 100) return "#4caf50";
            if (dist < 500) return "#ffc107";
            return "#ff5722";
          };
          
          const lineColor = getLineColor(poi.distanceMeters);
          
          return (
            <View key={`poi-${poi.id}`}>
              {/* SVG Leader Line and Circles */}
              {showLine && (
                <Svg
                  style={{
                    position: "absolute",
                    left: Math.min(poi.rawX, anchorX),
                    top: Math.min(poi.rawY, anchorY),
                    width: Math.abs(dx),
                    height: Math.abs(dy),
                  }}
                >
                  <Line
                    x1={dx > 0 ? 0 : Math.abs(dx)}
                    y1={dy > 0 ? 0 : Math.abs(dy)}
                    x2={dx > 0 ? Math.abs(dx) : 0}
                    y2={dy > 0 ? Math.abs(dy) : 0}
                    stroke={lineColor}
                    strokeWidth={2}
                    strokeDasharray={poi.distanceMeters > 500 ? "4,4" : "none"}
                  />
                  {/* Circle at anchor point */}
                  <Circle
                    cx={dx > 0 ? 0 : Math.abs(dx)}
                    cy={dy > 0 ? 0 : Math.abs(dy)}
                    r={5}
                    fill={lineColor}
                    opacity={0.9}
                  />
                  {/* Circle at label */}
                  <Circle
                    cx={dx > 0 ? Math.abs(dx) : 0}
                    cy={dy > 0 ? Math.abs(dy) : 0}
                    r={3}
                    fill="white"
                    opacity={0.7}
                  />
                </Svg>
              )}
              
              {/* Label */}
              <View
                style={[
                  styles.label,
                  {
                    left: poi.screenX,
                    top: poi.screenY,
                    transform: [{ translateX: -60 }, { translateY: -30 }],
                  },
                ]}
              >
                <Text style={styles.text}>{poi.name}</Text>
                <Text style={styles.dist}>{formatDistance(poi.distanceMeters)}</Text>
                <Text style={styles.bearing}>{Math.round(poi.bearing)}°</Text>
              </View>
            </View>
          );
        })}
        
        {/* Edge Indicators for Off-screen POIs */}
        {offscreenPOIs.map((poi) => {
          const edgePos = getEdgeIndicator(poi.rawX, poi.rawY);
          return (
            <View
              key={`edge-${poi.id}`}
              style={[
                styles.edgeIndicator,
                {
                  left: edgePos.x,
                  top: edgePos.y,
                  transform: [{ translateX: -40 }, { translateY: -20 }],
                },
              ]}
            >
              <View style={styles.edgeContent}>
                <Text style={styles.edgeArrow}>▲</Text>
                <Text style={styles.edgeName} numberOfLines={1}>
                  {poi.name}
                </Text>
                <Text style={styles.edgeDist}>
                  {formatDistance(poi.distanceMeters)}
                </Text>
              </View>
            </View>
          );
        })}
        
        {/* Debug Overlay */}
        {location && (
          <View style={styles.debugOverlay}>
            <Text style={styles.debugText}>
              Loc: {location.coords.latitude.toFixed(4)}, {location.coords.longitude.toFixed(4)}
            </Text>
            <Text style={styles.debugText}>
              POIs: {onScreenPOIs.length} on-screen | {offscreenPOIs.length} off-screen
            </Text>
            <Text style={styles.debugText}>
              Quat: [{quat.map(q => q.toFixed(2)).join(', ')}]
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  camera: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFill },
  
  label: {
    position: "absolute",
    backgroundColor: "rgba(0,0,0,0.85)",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#4caf50",
    minWidth: 120,
  },
  text: { color: "white", fontWeight: "bold", fontSize: 12 },
  dist: { color: "#4caf50", fontSize: 10 },
  bearing: { color: "#ffaa00", fontSize: 9 },
  
  edgeIndicator: {
    position: "absolute",
  },
  edgeContent: {
    backgroundColor: "rgba(0,0,0,0.85)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#ffc107",
  },
  edgeArrow: {
    color: "#ffc107",
    fontSize: 14,
    fontWeight: "bold",
  },
  edgeName: {
    color: "white",
    fontSize: 11,
    maxWidth: 100,
  },
  edgeDist: {
    color: "#4caf50",
    fontSize: 10,
  },
  
  debugOverlay: {
    position: "absolute",
    top: 40,
    left: 10,
    backgroundColor: "rgba(0,0,0,0.7)",
    padding: 8,
    borderRadius: 5,
  },
  debugText: { color: "#00ff00", fontSize: 10, fontFamily: "monospace" },
});