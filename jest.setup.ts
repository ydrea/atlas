import "react-native-gesture-handler/jestSetup";

jest.mock("@/data/pois.json.bin", () => ({
  __esModule: true,
  default: 1,
}));

jest.mock("react-native-reanimated", () => {
  const React = require("react");

  const createAnimatedComponent = (Component: any) =>
    React.forwardRef((props: any, ref: any) =>
      React.createElement(Component, {...props, ref}),
    );

  const useSharedValue = <T>(initialValue: T) => ({value: initialValue});
  const useAnimatedProps = (updater: () => Record<string, unknown>) =>
    updater();
  const useDerivedValue = <T>(updater: () => T) => ({value: updater()});
  const runOnJS = (fn: (...args: any[]) => any) => fn;
  const runOnUI = (fn: (...args: any[]) => any) => fn;
  const cancelAnimation = jest.fn();

  const finishAnimation = (
    value: number,
    callback?: (finished: boolean) => void,
  ) => {
    callback?.(true);
    return value;
  };

  const withSpring = (
    value: number,
    _config?: unknown,
    callback?: (finished: boolean) => void,
  ) => finishAnimation(value, callback);

  const withTiming = (
    value: number,
    _config?: unknown,
    callback?: (finished: boolean) => void,
  ) => finishAnimation(value, callback);

  const Easing = {
    cubic: (value: number) => value,
    inOut: (easing: (value: number) => number) => easing,
  };

  return {
    __esModule: true,
    default: {
      createAnimatedComponent,
      call: () => {},
    },
    createAnimatedComponent,
    useSharedValue,
    useAnimatedProps,
    useDerivedValue,
    runOnJS,
    runOnUI,
    cancelAnimation,
    withSpring,
    withTiming,
    Easing,
  };
});

jest.mock("expo-camera", () => ({
  CameraView: "CameraView",
  useCameraPermissions: () => [null, jest.fn()],
}));

jest.mock("expo-sensors", () => ({
  DeviceMotion: {
    isAvailableAsync: jest.fn().mockResolvedValue(true),
    getPermissionsAsync: jest.fn().mockResolvedValue({status: "granted"}),
    requestPermissionsAsync: jest.fn().mockResolvedValue({status: "granted"}),
    setUpdateInterval: jest.fn(),
    addListener: jest.fn(() => ({remove: jest.fn()})),
  },
}));

jest.mock("expo-location", () => {
  const preciseLocationPermission = {
    status: "granted",
    ios: {accuracy: "full", scope: "whenInUse"},
  };

  return {
    getForegroundPermissionsAsync: jest
      .fn()
      .mockResolvedValue(preciseLocationPermission),
    requestForegroundPermissionsAsync: jest
      .fn()
      .mockResolvedValue(preciseLocationPermission),
    watchPositionAsync: jest.fn().mockResolvedValue({remove: jest.fn()}),
    watchHeadingAsync: jest.fn().mockResolvedValue({remove: jest.fn()}),
    Accuracy: {BestForNavigation: 1},
  };
});
