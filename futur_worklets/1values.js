//To convert your full 3D spatial rotation logic (eulerToQuaternion and rotateVector) into the Reanimated useDerivedValue worklet, everything must be converted into shared values.If you use standard React useState for the device orientation quaternion, it updates on the JavaScript thread, which completely defeats the purpose of the worklet and causes stuttering.
// Instead, we pipe the DeviceMotion sensor data straight into a single shared value array on the UI thread [Link: React Native Reanimated swmansion.com].Here is the complete, high-performance optimization for your AR tracking engine:Step 1: Initialize Global Shared Values

import React, { useEffect, useState } from "react";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import { CameraView } from "@/ui/CameraView";
import * as Location from "expo-location";
import { DeviceMotion } from "expo-sensors";
import Svg, { Circle, Line, Text as SvgText } from "react-native-svg";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useDerivedValue,
  useAnimatedProps,
  useAnimatedStyle,
} from "react-native-reanimated";
import { AR_CONSTANTS } from "@/cumquat/constants";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Wrap SVG elements for native UI thread manipulation
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedText = Animated.createAnimatedComponent(SvgText);
const AnimatedLine = Animated.createAnimatedComponent(Line);

// Fixed math factors
const WGS84 = { a: 6378137, f: 1 / 298.257223563 };
const e2 = WGS84.f * (2 - WGS84.f);
