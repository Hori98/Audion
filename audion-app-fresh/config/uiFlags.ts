// UI rollout flags (safe rollback)
// Default: enable Home Latest cell view + compact density; keep Feed as-is.

export const UI_FLAGS = {
  // Home Tab
  USE_CELL_HOME_LATEST: true,
  COMPACT_HERO: false,

  // Feed Tab
  USE_CELL_FEED_LIST: false,

  // Global density + lines
  DENSITY_COMPACT: true,
  USE_STRONGER_HAIRLINE: true,
  HEADER_TIGHT: true,
  USE_SECTION_FOOTER_DIVIDERS: true,
  // カードのハイライト方針: 'none' | 'tint' | 'border'
  CARD_HIGHLIGHT_STRATEGY: 'none' as 'none' | 'tint' | 'border',
  // セクションごとの上書き（未指定は上の戦略に従う）
  CARD_HIGHLIGHT_BY_SECTION: {
    emergency: 'border' as 'none' | 'tint' | 'border',
    trending: 'none' as 'none' | 'tint' | 'border',
    personalized: 'none' as 'none' | 'tint' | 'border',
  },
  // 角丸をなくす（スクエア）
  SQUARE_CARDS: true,
  // カード間の隙間を0に（リスト/カルーセル）
  ZERO_CARD_GAP: true,
  // セクションヘッダ: 中立帯（SURFACE_1）を使う
  NEUTRAL_BAND: true,
  // セクションヘッダ左の2pxアクセントバーを表示するか
  ACCENT_BAR: false,

  // AutoPick completion UX: show blocking popup alert on completion
  // Default off to avoid duplication with notifications/auto-play
  SHOW_AUTOPICK_COMPLETION_ALERT: false,

  // Audio safeguards
  // Preflight HEAD/Range check to ensure URL serves audio/* before playback.
  // Fails open (logs only) on CORS/HEAD unsupported to avoid UX regression.
  AUDIO_PREFLIGHT_ENABLED: true,
};
