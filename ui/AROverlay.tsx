// import { AROutput } from "@/cumquat/types";
// import { StyleSheet, View } from "react-native";
// import { ARLabel } from "./ARLabel";

// type AROverlayProps = {
//   arOutputs: AROutput[];
//   screenWidth: number;
// };

// export function AROverlay({ arOutputs, screenWidth }: AROverlayProps) {
//   return (
//     <View style={styles.container}>
//       {arOutputs.map((output) => {
//         if (!output.screen || !output.screen.visible) return null;

//         // Ensure world property exists
//         // const world = output.world || { distance: output.distance };

//         return (
//           <ARLabel
//             key={output.id}
//             id={output.id}
//             name={output.name}
//             world={output.world}
//             screen={output.screen}
//             screenWidth={screenWidth}
//           />
//         );
//       })}
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     ...StyleSheet.absoluteFill,
//   },
// });
// ui/AROverlay.tsx
import { AROutput } from "@/cumquat/types";
import { StyleSheet, View } from "react-native";
import { ARLabel } from "./ARLabel";

type AROverlayProps = {
  arOutputs: AROutput[];
  screenWidth: number;
};

export function AROverlay({ arOutputs, screenWidth }: AROverlayProps) {
  return (
    <View style={styles.container}>
      {arOutputs.map((output) => {
        if (!output.screen || !output.screen.visible) return null;

        return (
          <ARLabel
            key={output.id.toString()}
            id={output.id}
            name={output.name}
            world={output.world}
            screen={output.screen}
            screenWidth={screenWidth}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
  },
});
