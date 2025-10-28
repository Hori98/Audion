export type SectionVariant = 'emergency' | 'trending' | 'personalized' | 'default';

export const SectionColors = {
  emergency: {
    accent: '#FF4444',
    tint: 'rgba(255,68,68,0.10)',
  },
  trending: {
    accent: '#FF6B35',
    tint: 'rgba(255,107,53,0.10)',
  },
  personalized: {
    accent: '#7B61FF',
    tint: 'rgba(123,97,255,0.10)',
  },
  default: {
    accent: '#333333',
    tint: 'rgba(255,255,255,0.06)',
  },
} as const;

export type CardHighlightStrategy = 'none' | 'tint' | 'border';

export function getCardColors(variant: SectionVariant, strategy: CardHighlightStrategy) {
  const theme = SectionColors[variant] || SectionColors.default;
  switch (strategy) {
    case 'none':
      return { backgroundColor: '#111111', borderColor: '#333333' };
    case 'tint':
      return { backgroundColor: theme.tint, borderColor: 'transparent' };
    case 'border':
      return { backgroundColor: '#111111', borderColor: theme.accent };
    default:
      return { backgroundColor: '#111111', borderColor: '#333333' };
  }
}

