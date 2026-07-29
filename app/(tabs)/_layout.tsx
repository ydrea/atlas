import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { SymbolView } from "expo-symbols";
import { Link, Tabs } from "expo-router";
import { Pressable } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { useClientOnlyValue } from "@/components/useClientOnlyValue";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors[colorScheme].tint,
          // Keep the tab bar above native camera/gesture surfaces on Android.
          tabBarStyle: {
            zIndex: 100,
            elevation: 100,
          },
          // Disable the static render of the header on web
          // to prevent a hydration error in React Navigation v6.
          headerShown: useClientOnlyValue(false, true),
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            headerShown: false,
            title: "Home",
            tabBarIcon: ({ color, focused }) => (
              <MaterialCommunityIcons
                name={focused ? "home-variant" : "home-outline"}
                size={28}
                color={color}
              />
            ),
            headerRight: () => (
              <Link href="/modal" asChild>
                <Pressable style={{ marginRight: 15 }}>
                  {({ pressed }) => (
                    <SymbolView
                      name={{ ios: "info.circle", android: "info", web: "info" }}
                      size={25}
                      tintColor={Colors[colorScheme].text}
                      style={{ opacity: pressed ? 0.5 : 1 }}
                    />
                  )}
                </Pressable>
              </Link>
            ),
          }}
        />
        <Tabs.Screen
          name="gest"
          options={{
            title: "AR Beta",
            headerShown: false,
            tabBarIcon: ({ color, focused }) => (
              <MaterialCommunityIcons
                name={focused ? "line-scan" : "scan-helper"}
                size={28}
                color={color}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="help"
          options={{
            title: "HELP",
            headerShown: false,
            tabBarIcon: ({ color, focused }) => (
              <MaterialCommunityIcons
                name={focused ? "help-rhombus" : "help-rhombus-outline"}
                size={28}
                color={color}
              />
            ),
          }}
        />
      </Tabs>
    </GestureHandlerRootView>
  );
}
