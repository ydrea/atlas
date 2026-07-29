// metro.config.js
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Increase timeout for larger apps
config.server = {
  ...config.server,
  port: 8081,
};

// Ensure resolver handles all file types
config.resolver = {
  ...config.resolver,
  sourceExts: [...config.resolver.sourceExts, "mjs", "cjs"],
};

// Ensure resolver handles all data file types
if (!config.resolver.assetExts.includes("bin")) {
  config.resolver.assetExts.push("bin");
}

if (!config.resolver.assetExts.includes("json")) {
  config.resolver.assetExts.push("json");
}

module.exports = config;
