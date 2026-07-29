// Step 2: Write Thread-Safe Math WorkletsThese inline helper functions include
//  the "worklet"; directive at the top. This instructs Reanimated to copy 
// these mathematical formulas directly into the native C++ runtime environment
//  so they can run outside the main JavaScript execution loop. This is crucial
//  for maintaining a smooth 60 FPS AR experience without any stuttering or lag
//  caused by JS thread congestion. By converting geodetic coordinates to ECEF
//  and applying quaternion rotations entirely within the UI thread, ensure
//  that spatial calculations are performed with efficiency and responsiveness.

function workletToRad(deg) {
  "worklet";
  return (deg * Math.PI) / 180;
}

function workletGeodeticToEcef(lat, lon, h) {
  "worklet";
  const φ = workletToRad(lat);
  const λ = workletToRad(lon);
  const N = WGS84.a / Math.sqrt(1 - e2 * Math.sin(φ) ** 2);
  return {
    x: (N + h) * Math.cos(φ) * Math.cos(λ),
    y: (N + h) * Math.cos(φ) * Math.sin(λ),
    z: (N * (1 - e2) + h) * Math.sin(φ),
  };
}

function workletRotateVector(v, q) {
  "worklet";
  const [qw, qx, qy, qz] = q;
  const [vx, vy, vz] = [v.x, v.y, v.z];

  // Hamilton product components
  const ix = qw * vx + qy * vz - qz * vy;
  const iy = qw * vy + qz * vx - qx * vz;
  const iz = qw * vz + qx * vy - qy * vx;
  const iw = -qx * vx - qy * vy - qz * vz;

  return {
    x: ix * qw + iw * -qx + iy * -qz - iz * -qy,
    y: iy * qw + iw * -qy + iz * -qx - ix * -qz,
    z: iz * qw + iw * -qz + ix * -qy - iy * -qx,
  };
}
