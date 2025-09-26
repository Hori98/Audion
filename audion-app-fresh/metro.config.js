const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Web用の最適化設定
if (process.env.EXPO_PLATFORM === 'web') {
  // HMR (Hot Module Replacement) の設定を最適化
  config.server = {
    ...config.server,
    enableVisualizer: false,
    port: 8084,
  };

  // WebSocket接続の安定化
  config.resolver = {
    ...config.resolver,
    alias: {
      ...config.resolver.alias,
      // React Native Web用のポリフィル
      'react-native$': 'react-native-web',
    },
  };

  // Metro bundler の安定化設定
  config.transformer = {
    ...config.transformer,
    minifierConfig: {
      // JavaScript minificationを軽量化
      keep_classnames: true,
      keep_fnames: true,
      mangle: {
        keep_classnames: true,
        keep_fnames: true,
      },
    },
  };

  // デバッグ出力を最小化 - より包括的な抑制
  config.reporter = {
    update: () => {}, // 頻繁なupdate出力を無効化
    transformStart: () => {}, // トランスフォーム開始ログを無効化
    transformEnd: () => {}, // トランスフォーム終了ログを無効化
  };
}

module.exports = config;