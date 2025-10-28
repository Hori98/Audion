import React from 'react';
import { Ionicons } from '@expo/vector-icons';

type SemanticIcon =
  | 'user'
  | 'search'
  | 'eye'
  | 'eye-off'
  | 'play'
  | 'pause'
  | 'stop'
  | 'chevron-down'
  | 'chevron-up'
  | 'chevron-forward'
  | 'music'
  | 'sparkles';

interface IconProps {
  name: SemanticIcon;
  size?: number;
  color?: string;
}

const mapToIonicon = (name: SemanticIcon): keyof typeof Ionicons.glyphMap => {
  switch (name) {
    case 'user': return 'person-outline';
    case 'search': return 'search-outline';
    case 'eye': return 'eye-outline';
    case 'eye-off': return 'eye-off-outline';
    case 'play': return 'play';
    case 'pause': return 'pause';
    case 'stop': return 'stop';
    case 'chevron-down': return 'chevron-down';
    case 'chevron-up': return 'chevron-up';
    case 'chevron-forward': return 'chevron-forward';
    case 'music': return 'musical-notes-outline';
    case 'sparkles': return 'sparkles';
    default: return 'ellipse-outline';
  }
};

export default function Icon({ name, size = 18, color = '#ffffff' }: IconProps) {
  const ion = mapToIonicon(name);
  return <Ionicons name={ion} size={size} color={color} />;
}

