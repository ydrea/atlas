// __tests__/radar.test.tsx
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";

const mockPOIs = [
  { id: 1, name: "North Island", lat: 45.9, lon: 15.96, alt: 123 },
];
const mockLoadPOIsFromAsset = jest.fn().mockResolvedValue(mockPOIs);

jest.mock("@/data/binaryDataLoader", () => ({
  loadPOIsFromAsset: (...args: unknown[]) => mockLoadPOIsFromAsset(...args),
}));

const mockSensorHub = {
  start: jest.fn().mockResolvedValue(undefined),
  stop: jest.fn(),
  getSnapshot: jest.fn(() => ({
    lat: 45.8,
    lon: 15.96,
    elevation: 120,
    orientation: { x: 0, y: 0, z: 0, w: 1 },
    screenOrientationDegrees: 90,
    heading: 225,
    headingAccuracy: 3,
    timestamp: 10,
  })),
};

jest.mock("@/cumquat/sensors", () => ({
  sensorHub: mockSensorHub,
  getCompassCalibrationPercent: (accuracy: number) =>
    Math.round((accuracy / 3) * 100),
  getCompassCameraHeading: (snapshot: {
    heading: number;
    screenOrientationDegrees: number;
  }) =>
    ((snapshot.heading + snapshot.screenOrientationDegrees) % 360 + 360) %
    360,
}));

const orientation = {
  quaternion: { x: Math.SQRT1_2, y: 0, z: 0, w: Math.SQRT1_2 },
  convention: "earth-from-device",
};
const projected = {
  poiIndex: 0,
  x: 0,
  y: 0,
  depth: 500,
  distance: 500,
  bearing: 0,
  visible: true,
  clipped: false,
  clippedByDistance: null,
};
const mockEngine = {
  initialize: jest.fn(),
  setViewState: jest.fn(),
  update: jest.fn(() => 1),
  getFrame: jest.fn(() => ({
    sequence: 1,
    timestampNs: 10_000_000,
    orientation,
    projectedPOIs: [projected],
    visiblePOIs: [projected],
  })),
  dispose: jest.fn(),
};

jest.mock("react-native-cumquat", () => ({
  CumquatEngine: { create: jest.fn(() => mockEngine) },
}));

let gestureOptions: any;
const mockSetControllerState = jest.fn((state) => state);

jest.mock("react-native-cumquat-gestures", () => ({
  cloneGestureConfig: () => ({
    distance: { min: 0, max: 135000, minGap: 100 },
    fov: { min: 30, max: 120 },
    gesture: {
      verticalPixelToZoom: 0.003,
      zoomCouplingFactor: 0.5,
    },
  }),
  useARGestureController: (options: any) => {
    gestureOptions = options;
    return { gesture: { kind: "mock" }, setState: mockSetControllerState };
  },
}));

jest.mock("expo-router", () => {
  const React = require("react");
  return {
    useFocusEffect: (callback: () => void | (() => void)) => {
      React.useEffect(callback, [callback]);
    },
  };
});

jest.mock("react-native-gesture-handler", () => {
  const React = require("react");
  const { View } = require("react-native");
  return { GestureDetector: ({ children }: any) => <View>{children}</View> };
});

jest.mock("@/ui/RubberBandVisualFeedback", () => ({
  RubberBandVisualFeedback: () => null,
}));

jest.mock("@/utils/tlog", () => ({
  Tlog: jest.fn(),
}));

const RadarView = require("@/components/RadarView").default;

describe("RadarView", () => {
  let radarTick: (() => void) | null;
  let intervalSpy: jest.SpiedFunction<typeof global.setInterval>;

  beforeEach(() => {
    jest.clearAllMocks();
    radarTick = null;
    intervalSpy = jest
      .spyOn(global, "setInterval")
      .mockImplementation((callback) => {
        radarTick = callback as () => void;
        return 1 as unknown as ReturnType<typeof setInterval>;
      });
  });

  afterEach(() => {
    intervalSpy.mockRestore();
  });

  test("uses Cumquat orientation and POIs for an interactive radar", async () => {
    const view = await render(<RadarView />);

    await waitFor(() => expect(mockEngine.initialize).toHaveBeenCalledTimes(1));
    await act(async () => {
      radarTick?.();
    });

    expect(mockEngine.update).toHaveBeenCalledWith(
      expect.objectContaining({
        initialHeadingDegrees: 315,
        location: { latitude: 45.8, longitude: 15.96, altitude: 120 },
      }),
    );
    expect(screen.getByTestId("radar-blip-1")).toBeTruthy();

    fireEvent.press(screen.getByTestId("radar-blip-1"));
    await waitFor(() => expect(screen.getByText("North Island")).toBeTruthy());
    expect(screen.getByText("500m")).toBeTruthy();
    await view.unmount();
  });

  test("gesture updates mutate Cumquat view state without rebuilding", async () => {
    const view = await render(<RadarView />);
    await waitFor(() => expect(mockEngine.initialize).toHaveBeenCalledTimes(1));

    await act(() => {
      gestureOptions.callbacks.onUpdate({
        state: { minDistance: 0, maxDistance: 25_000, zoom: 0, fov: 75 },
        rubberBanding: false,
        activeLimit: null,
        excess: 0,
      });
    });

    expect(mockEngine.setViewState).toHaveBeenLastCalledWith({
      horizontalFovDegrees: 75,
      minDistanceMeters: 0,
      maxDistanceMeters: 25_000,
    });
    expect(
      require("react-native-cumquat").CumquatEngine.create,
    ).toHaveBeenCalledTimes(1);
    await view.unmount();
  });
});
