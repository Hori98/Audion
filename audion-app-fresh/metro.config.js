const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Skip web platform entirely - Expo Go only runs on native platforms
// Web bundling causes issues with native-only modules like react-native-track-player
config.resolver = {
  ...config.resolver,
  // Skip modules that only support native platforms
  blacklistRE: new RegExp(
    `node_modules/(react-native-track-player|shaka-player)/.*`
  ),
  sourceExts: ['ts', 'tsx', 'js', 'jsx', 'json'],
};

module.exports = config;