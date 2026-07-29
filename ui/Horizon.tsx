import { Dimensions, View } from "react-native";

const { height } = Dimensions.get("window");

export default function Horizon({ pitch }: { pitch: number }) {
  const offset = (pitch / 90) * height;

  return (
    <View
      style={{
        position: "absolute",
        top: height / 2 + offset,
        left: 0,
        right: 0,
        height: 2,
        backgroundColor: "rgba(255,255,255,0.6)",
      }}
    />
  );
}
