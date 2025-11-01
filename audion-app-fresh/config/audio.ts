// Centralized audio feature flags and session configuration
// Reads from EXPO_PUBLIC_* env vars with sane defaults for development

const env = (key: string, fallback: string) => (process.env[key] ?? fallback).trim();
const envBool = (key: string, fallback: boolean) => {
  const v = process.env[key];
  if (v === undefined) return fallback;
  return /^(1|true|yes|on)$/i.test(v);
};
const envOpt = (key: string, values: string[], fallback: string) => {
  const v = (process.env[key] ?? fallback).toString();
  return values.includes(v) ? v : fallback;
};

// Session/Focus
const PLAY_IN_SILENT_IOS = envBool('EXPO_PUBLIC_AUDIO_PLAY_IN_SILENT_MODE_IOS', true);
// Keep session persistent only when needed to reduce system conflicts
const STAYS_ACTIVE_BG = envBool('EXPO_PUBLIC_AUDIO_STAYS_ACTIVE_IN_BACKGROUND', false);
// none | duck | mix
// Default to mixing instead of ducking to avoid affecting other apps
const DUCK_OTHERS = envOpt('EXPO_PUBLIC_AUDIO_DUCK_OTHERS', ['none', 'duck', 'mix'], 'mix') as
  | 'none'
  | 'duck'
  | 'mix';
const PLAY_THROUGH_EARPIECE_ANDROID = envBool('EXPO_PUBLIC_AUDIO_PLAY_THROUGH_EARPIECE_ANDROID', false);

// Background/Remote controls (only effective when not running in Expo Go)
const ENABLE_TRACK_PLAYER = envBool('EXPO_PUBLIC_AUDIO_ENABLE_TRACK_PLAYER', false);
const LOCKSCREEN_CONTROLS = envBool('EXPO_PUBLIC_AUDIO_LOCKSCREEN_CONTROLS', true);
const HEADSET_BUTTONS = envBool('EXPO_PUBLIC_AUDIO_HEADSET_BUTTONS', true);
const NOW_PLAYING_METADATA = envBool('EXPO_PUBLIC_AUDIO_NOW_PLAYING_METADATA', true);

// Core playback
const PREVENT_OVERLAP = envBool('EXPO_PUBLIC_AUDIO_PREVENT_OVERLAP', true);
const BUFFER_DOWNLOAD_FIRST = envBool('EXPO_PUBLIC_AUDIO_BUFFER_DOWNLOAD_FIRST', true);
const PLAYBACK_RATE_ENABLED = envBool('EXPO_PUBLIC_AUDIO_PLAYBACK_RATE_ENABLED', true);
const SEEK_ENABLED = envBool('EXPO_PUBLIC_AUDIO_SEEK_ENABLED', true);

// Queue/State
const QUEUE_ENABLED = envBool('EXPO_PUBLIC_AUDIO_QUEUE_ENABLED', true);
const PERSIST_QUEUE = envBool('EXPO_PUBLIC_AUDIO_PERSIST_QUEUE', false);
const RESUME_LAST_POSITION = envBool('EXPO_PUBLIC_AUDIO_RESUME_LAST_POSITION', true);

// Offline
const OFFLINE_DOWNLOAD_ENABLED = envBool('EXPO_PUBLIC_AUDIO_OFFLINE_DOWNLOAD_ENABLED', true);
const DOWNLOAD_RESUMABLE = envBool('EXPO_PUBLIC_AUDIO_DOWNLOAD_RESUMABLE', true);

// Quality/Analytics
const VOLUME_NORMALIZATION = envBool('EXPO_PUBLIC_AUDIO_VOLUME_NORMALIZATION', false);
const ANALYTICS_ENABLED = envBool('EXPO_PUBLIC_AUDIO_ANALYTICS_ENABLED', true);
const ROUTE_CHANGE_AUTO_PAUSE = envBool('EXPO_PUBLIC_AUDIO_ROUTE_CHANGE_AUTO_PAUSE', false);

export const AUDIO_FLAGS = {
  PLAY_IN_SILENT_IOS,
  STAYS_ACTIVE_BG,
  DUCK_OTHERS,
  PLAY_THROUGH_EARPIECE_ANDROID,
  ENABLE_TRACK_PLAYER,
  LOCKSCREEN_CONTROLS,
  HEADSET_BUTTONS,
  NOW_PLAYING_METADATA,
  PREVENT_OVERLAP,
  BUFFER_DOWNLOAD_FIRST,
  PLAYBACK_RATE_ENABLED,
  SEEK_ENABLED,
  QUEUE_ENABLED,
  PERSIST_QUEUE,
  RESUME_LAST_POSITION,
  OFFLINE_DOWNLOAD_ENABLED,
  DOWNLOAD_RESUMABLE,
  VOLUME_NORMALIZATION,
  ANALYTICS_ENABLED,
  ROUTE_CHANGE_AUTO_PAUSE,
} as const;

export type DuckMode = typeof AUDIO_FLAGS.DUCK_OTHERS;
