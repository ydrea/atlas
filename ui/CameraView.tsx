// ui/CameraView.tsx
import {
  CameraView as ARMCamera,
  useCameraPermissions,
  CameraType,
} from "expo-camera";
import { StyleSheet, Text, View } from "react-native";

interface CameraViewProps {
  facing?: CameraType;
  mode?: "picture" | "video";
  zoom?: number;
  onCameraReady?: () => void;
  onMountError?: (error: any) => void;
  style?: any;
}

export function CameraView({
  facing = "back",
  mode = "video",
  zoom = 0,
  onCameraReady,
  onMountError,
  style,
}: CameraViewProps) {
  const [permission, requestPermission] = useCameraPermissions();

  if (!permission) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Loading camera...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No access to camera</Text>
      </View>
    );
  }

  return (
    <ARMCamera
      style={[styles.camera, style]}
      facing={facing}
      mode={mode}
      zoom={zoom}
      onCameraReady={onCameraReady}
      onMountError={onMountError}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "black",
    justifyContent: "center",
    alignItems: "center",
  },
  camera: {
    ...StyleSheet.absoluteFill,
  },
  errorText: {
    color: "white",
    textAlign: "center",
    paddingHorizontal: 24,
    fontSize: 14,
  },
});
