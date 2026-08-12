export default () => {
  const buildProfile =
    process.env.APP_VARIANT ?? process.env.EAS_BUILD_PROFILE ?? "development";

  let packageName = "com.ydrea.atlas.dev";
  let appName = "ATLAS (Dev)";
  let scheme = "atlas-dev";
  let iconConfig = {
    icon: "./assets/icons/development/icon.png",
    android: {
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/generated/android-foreground.png",
        backgroundImage: "./assets/generated/android-background.png",
        monochromeImage: "./assets/generated/android-monochrome.png",
      },
    },
  };

  if (buildProfile === "production") {
    packageName = "com.ydrea.atlas";
    appName = "ATLAS (Prod)";
    scheme = "atlas";
    iconConfig = {
      icon: "./assets/icons/production/icon.png",
      android: {
        adaptiveIcon: {
          backgroundColor: "#E6F4FE",
          foregroundImage: "./assets/icons/production/android-foreground.png",
          backgroundImage: "./assets/icons/production/android-background.png",
          monochromeImage: "./assets/icons/production/android-monochrome.png",
        },
      },
    };
  } else if (buildProfile === "preview") {
    packageName = "com.ydrea.atlas.preview";
    appName = "ATLAS (Preview)";
    scheme = "atlas-preview";
    iconConfig = {
      icon: "./assets/icons/preview/icon.png",
      android: {
        adaptiveIcon: {
          backgroundColor: "#E6F4FE",
          foregroundImage: "./assets/icons/preview/android-foreground.png",
          backgroundImage: "./assets/icons/preview/android-background.png",
          monochromeImage: "./assets/icons/preview/android-monochrome.png",
        },
      },
    };
  }

  const iosBundleIdentifier = process.env.IOS_BUNDLE_IDENTIFIER ?? packageName;
  const iosAppleTeamId = process.env.IOS_APPLE_TEAM_ID;

  return {
    name: appName,
    slug: "atlas",
    version: "1.0.1",
    orientation: "landscape",
    icon: iconConfig.icon,
    scheme,
    userInterfaceStyle: "automatic",
    ios: {
      supportsTablet: true,
      requireFullScreen: true,
      bundleIdentifier: iosBundleIdentifier,
      ...(iosAppleTeamId ? { appleTeamId: iosAppleTeamId } : {}),
      infoPlist: {
        NSLocationWhenInUseUsageDescription: "This app needs your location.",
        NSMotionUsageDescription:
          "This app uses motion sensors to enable the AR experience.",
      },
    },
    android: {
      package: packageName,
      adaptiveIcon: iconConfig.android.adaptiveIcon,
      predictiveBackGestureEnabled: false,
      permissions: [
        "android.permission.CAMERA",
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.ACCESS_FINE_LOCATION",
      ],
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png",
    },
    plugins: [
      "expo-router",
      "expo-image",
      "expo-asset",
      [
        "expo-screen-orientation",
        {
          initialOrientation: "LANDSCAPE",
        },
      ],
      "expo-web-browser",
      [
        "expo-camera",
        {
          cameraPermission:
            "Allow $(PRODUCT_NAME) to access your camera for AR features",
        },
      ],
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission:
            "This app needs your location to provide location-based AR content.",
        },
      ],
      [
        "expo-sensors",
        {
          motionPermission:
            "This app uses motion sensors to enable the AR experience.",
        },
      ],
      [
        "expo-splash-screen",
        {
          image: iconConfig.icon,
          imageWidth: 190,
          resizeMode: "contain",
          backgroundColor: "#dfdfdf",
          dark: {
            image: iconConfig.icon,
            backgroundColor: "#202020",
          },
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      router: {},
      eas: {
        projectId: "37940074-37e9-436d-b54f-4ae5a9cea661",
      },
    },
    owner: "ydrea",
    updates: {
      fallbackToCacheTimeout: 0,
      checkAutomatically: "ON_LOAD",
      url: "https://u.expo.dev/37940074-37e9-436d-b54f-4ae5a9cea661",
    },
    runtimeVersion: {
      policy: "appVersion",
    },
  };
};
