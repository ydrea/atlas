// __tests__/beta.test.js
import React from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";

import ARView from "@/app/(tabs)/gest";
import { AR_CONSTANTS } from "@/cumquat/constants";

const DEFAULT_POI_COUNT = 36;
const LARGE_DATASET_COUNT = 1118;
const originalError = console.error;
const originalLog = console.log;

function createMockPOIs(count) {
  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    name: `Island ${index + 1}`,
    lat: 42 + (index % 100) * 0.001,
    lon: 14 + Math.floor(index / 100) * 0.001,
    alt: index % 500,
  }));
}

const mockLoadPOIsFromAsset = jest.fn();

jest.mock("@/data/binaryDataLoader", () => ({
  loadPOIsFromAsset: (...args) => mockLoadPOIsFromAsset(...args),
}));

const mockSetGestureState = jest.fn((nextState) => nextState);
const mockUseARGestureController = jest.fn(() => ({
  gesture: { kind: "mock-two-finger-pan" },
  setState: mockSetGestureState,
}));
const mockAnimatedZoom = { value: 0 };

const mockProjectedPOIs = Array.from({ length: 36 }, (_, poiIndex) => ({
  poiIndex,
  x: 100,
  y: 100,
  depth: 10,
  distance: 10,
  bearing: 0,
  visible: true,
  clipped: false,
  clippedByDistance: null,
}));

const mockNativeEngine = {
  initialize: jest.fn(),
  setViewState: jest.fn(),
  update: jest.fn(() => 1),
  getFrame: jest.fn(() => ({
    sequence: 1,
    timestampNs: 1,
    projectedPOIs: mockProjectedPOIs,
    visiblePOIs: mockProjectedPOIs,
  })),
  dispose: jest.fn(),
};

const mockNativeEngineFactory = {
  create: jest.fn(() => mockNativeEngine),
  getNativeVersion: jest.fn(() => "test-cpp"),
};

jest.mock("react-native-cumquat", () => ({
  CumquatEngine: mockNativeEngineFactory,
}));

jest.mock("@/cumquat/gestures/useARGestureController", () => ({
  useARGestureController: (options) => mockUseARGestureController(options),
}));

jest.mock("@/hooks/useCameraZoom", () => {
  const React = require("react");
  const { View } = require("react-native");

  const MockAnimatedCamera = React.forwardRef((props, ref) => {
    const {
      animatedProps: _animatedProps,
      onCameraReady: _onCameraReady,
      onMountError: _onMountError,
      ...viewProps
    } = props;

    return <View ref={ref} testID="animated-camera" {...viewProps} />;
  });

  return {
    useCameraZoom: jest.fn(() => ({
      cameraRef: { current: null },
      animatedZoom: mockAnimatedZoom,
      animatedProps: { zoom: 0 },
      AnimatedCamera: MockAnimatedCamera,
      animateZoom: jest.fn(),
      setZoom: jest.fn(),
      resetZoom: jest.fn(),
      isAnimating: { value: false },
    })),
  };
});

jest.mock("@/cumquat/sensors", () => {
  const mockSensorHub = {
    start: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn(),
    getSnapshot: jest.fn(() => ({
      lat: 45.8,
      lon: 15.96,
      elevation: 120,
      orientation: { x: 0, y: 0, z: 0, w: 1 },
      screenOrientationDegrees: -90,
      heading: 225,
      headingAccuracy: 3,
      magneticHeading: 225,
      trueHeading: 225,
      timestamp: Date.now(),
    })),
  };

  return {
    sensorHub: mockSensorHub,
    geoToENU: jest.fn(() => ({ x: 0, y: 0, z: -10 })),
    rotateVector: jest.fn((vector) => vector),
    calculateBearing: jest.fn(() => 0),
    projectToScreenWithClipping: jest.fn(() => ({
      x: 100,
      y: 100,
      visible: true,
      clipped: false,
      clippedByDistance: null,
      depth: 10,
      radialDistance: 10,
    })),
  };
});

const mockRubberBandVisualFeedback = jest.fn(() => null);

jest.mock("@/ui/RubberBandVisualFeedback", () => ({
  RubberBandVisualFeedback: (props) => {
    mockRubberBandVisualFeedback(props);
    return null;
  },
}));

jest.mock("expo-camera", () => {
  const cameraPermission = { status: "granted", granted: true };
  const requestCameraPermission = jest.fn().mockResolvedValue(cameraPermission);

  return {
    CameraView: "CameraView",
    useCameraPermissions: () => [cameraPermission, requestCameraPermission],
  };
});

jest.mock("react-native-gesture-handler", () => {
  const React = require("react");
  const { View } = require("react-native");

  return {
    GestureDetector: ({ children }) => <View>{children}</View>,
    GestureHandlerRootView: ({ children, ...props }) => (
      <View {...props}>{children}</View>
    ),
  };
});

describe("beta ARView", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockLoadPOIsFromAsset.mockResolvedValue(createMockPOIs(36));
    mockSetGestureState.mockImplementation((nextState) => nextState);
    mockUseARGestureController.mockImplementation(() => ({
      gesture: { kind: "mock-two-finger-pan" },
      setState: mockSetGestureState,
    }));

    mockNativeEngine.update.mockReturnValue(1);
    mockNativeEngine.getFrame.mockReturnValue({
      sequence: 1,
      timestampNs: 1,
      projectedPOIs: mockProjectedPOIs,
      visiblePOIs: mockProjectedPOIs,
    });
    mockNativeEngineFactory.create.mockReturnValue(mockNativeEngine);

    console.log = jest.fn();
    console.error = (...args) => {
      const first = String(args[0] || "");
      if (first.includes("not configured to support act")) return;
      if (first.includes("not wrapped in act")) return;
      originalError(...args);
    };
  });

  afterEach(() => {
    console.error = originalError;
    console.log = originalLog;
  });

  test("passes SensorHub heading to the native engine", async () => {
    await render(<ARView />);

    await waitFor(() => {
      expect(mockNativeEngine.update).toHaveBeenCalledWith(
        expect.objectContaining({
          headingDegrees: 225,
          location: expect.objectContaining({
            latitude: 45.8,
            longitude: 15.96,
            altitude: 120,
          }),
          viewportWidth: expect.any(Number),
          viewportHeight: expect.any(Number),
        }),
      );
    });
  });

  test("renders the animated camera and starts SensorHub", async () => {
    await render(<ARView />);

    expect(screen.getByTestId("animated-camera")).toBeTruthy();

    await waitFor(() => {
      expect(
        require("@/cumquat/sensors").sensorHub.start,
      ).toHaveBeenCalledTimes(1);
    });
  });

  test("updates the native engine with the latest sensor data", async () => {
    render(<ARView />);

    await waitFor(() => {
      expect(mockNativeEngine.update).toHaveBeenCalledWith(
        expect.objectContaining({
          headingDegrees: 225,
          location: expect.objectContaining({
            latitude: 45.8,
            longitude: 15.96,
            altitude: 120,
          }),
          viewportWidth: expect.any(Number),
          viewportHeight: expect.any(Number),
        }),
      );
    });
  });

  test("creates one native engine with a hard dataset radius", async () => {
    await render(<ARView />);

    await waitFor(() => {
      expect(mockNativeEngineFactory.create).toHaveBeenCalledWith({
        datasetRadiusMeters: AR_CONSTANTS.DISTANCE.MAX,
        maxVisiblePOIs: DEFAULT_POI_COUNT,
      });
      expect(mockNativeEngine.initialize).toHaveBeenCalledTimes(1);
      expect(mockNativeEngine.setViewState).toHaveBeenCalledWith({
        horizontalFovDegrees: AR_CONSTANTS.FOV.DEFAULT,
        minDistanceMeters: AR_CONSTANTS.DISTANCE.DEFAULT_MIN,
        maxDistanceMeters: AR_CONSTANTS.DISTANCE.DEFAULT_MAX,
      });
      expect(mockNativeEngine.update).toHaveBeenCalled();
      expect(mockNativeEngine.getFrame).toHaveBeenCalled();
    });
  });

  test("initializes the native engine with a large island dataset", async () => {
    mockLoadPOIsFromAsset.mockResolvedValueOnce(
      createMockPOIs(LARGE_DATASET_COUNT),
    );

    await render(<ARView />);

    await waitFor(() => {
      expect(mockNativeEngineFactory.create).toHaveBeenCalledWith({
        datasetRadiusMeters: AR_CONSTANTS.DISTANCE.MAX,
        maxVisiblePOIs: LARGE_DATASET_COUNT,
      });
    });

    const initializedPOIs = mockNativeEngine.initialize.mock.calls[0][0];
    expect(initializedPOIs).toHaveLength(LARGE_DATASET_COUNT);
  });

  test("configures the new gesture hook with default state and camera zoom", async () => {
    await render(<ARView />);

    expect(mockUseARGestureController).toHaveBeenCalled();
    const options = mockUseARGestureController.mock.calls.at(-1)[0];

    expect(options.initialState).toEqual({
      minDistance: AR_CONSTANTS.DISTANCE.DEFAULT_MIN,
      maxDistance: AR_CONSTANTS.DISTANCE.DEFAULT_MAX,
      zoom: 0,
      fov: AR_CONSTANTS.FOV.DEFAULT,
    });
    expect(options.cameraZoom).toBe(mockAnimatedZoom);
    expect(options.callbacks.onUpdate).toEqual(expect.any(Function));
    expect(options.callbacks.onEnd).toEqual(expect.any(Function));
  });

  test("passes inactive defaults to RubberBandVisualFeedback", async () => {
    await render(<ARView />);

    await waitFor(() => {
      expect(mockRubberBandVisualFeedback).toHaveBeenCalled();
    });

    expect(mockRubberBandVisualFeedback.mock.calls.at(-1)[0]).toEqual({
      isActive: false,
      intensity: 0,
      limitType: null,
    });
  });

  test("gesture updates mutate native view state without recreating the engine", async () => {
    await render(<ARView />);

    await waitFor(() => {
      expect(mockNativeEngineFactory.create).toHaveBeenCalledTimes(1);
    });

    const options = mockUseARGestureController.mock.calls.at(-1)[0];

    await act(() => {
      options.callbacks.onUpdate({
        state: {
          minDistance: 500,
          maxDistance: 25_000,
          zoom: 0.4,
          fov: 75,
        },
        rubberBanding: true,
        activeLimit: "max",
        excess: 500,
      });
    });

    expect(screen.getByText("0.5km")).toBeTruthy();
    expect(screen.getByText("25.0km")).toBeTruthy();
    expect(screen.getByText("75°")).toBeTruthy();
    expect(mockNativeEngine.setViewState).toHaveBeenLastCalledWith({
      horizontalFovDegrees: 75,
      minDistanceMeters: 500,
      maxDistanceMeters: 25_000,
    });
    expect(mockNativeEngineFactory.create).toHaveBeenCalledTimes(1);
    expect(mockNativeEngine.initialize).toHaveBeenCalledTimes(1);
    expect(mockNativeEngine.dispose).not.toHaveBeenCalled();
    expect(mockRubberBandVisualFeedback.mock.calls.at(-1)[0]).toEqual({
      isActive: true,
      intensity: 1,
      limitType: "max",
    });
  });

  // test("reset sends the default state through the gesture controller", async () => {
  //   await render(<ARView />);

  //   await waitFor(() => {
  //     expect(mockNativeEngineFactory.create).toHaveBeenCalled();
  //   });

  //   // fireEvent.press(screen.getByText("↺"));

  //   expect(mockSetGestureState).toHaveBeenCalledWith({
  //     minDistance: AR_CONSTANTS.DISTANCE.DEFAULT_MIN,
  //     maxDistance: AR_CONSTANTS.DISTANCE.DEFAULT_MAX,
  //     zoom: 0,
  //     fov: AR_CONSTANTS.FOV.DEFAULT,
  //   });
  //   expect(mockNativeEngine.dispose).toHaveBeenCalled();
  // });
});
