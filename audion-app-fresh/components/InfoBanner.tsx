import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type BannerType = 'info' | 'warn';

interface InfoBannerProps {
  type?: BannerType;
  message: string;
  ctaText?: string;
  onPressCTA?: () => void;
  storageKey?: string; // 設定されている場合、非表示状態を永続化
}

export default function InfoBanner({
  type = 'info',
  message,
  ctaText,
  onPressCTA,
  storageKey,
}: InfoBannerProps) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!storageKey) return;
      try {
        const v = await AsyncStorage.getItem(storageKey);
        if (mounted && v === 'true') setHidden(true);
      } catch {}
    };
    load();
    return () => { mounted = false; };
  }, [storageKey]);

  if (hidden) return null;

  const handleClose = async () => {
    setHidden(true);
    if (storageKey) {
      try { await AsyncStorage.setItem(storageKey, 'true'); } catch {}
    }
  };

  return (
    <View style={[styles.container, type === 'warn' ? styles.warn : styles.info]}>
      <Text style={styles.message}>{message}</Text>
      <View style={styles.actions}>
        {ctaText && onPressCTA && (
          <TouchableOpacity style={styles.cta} onPress={onPressCTA}>
            <Text style={styles.ctaText}>{ctaText}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.close} onPress={handleClose}>
          <Text style={styles.closeText}>非表示</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
  },
  info: {
    backgroundColor: '#0c2438',
    borderColor: '#1e4976',
  },
  warn: {
    backgroundColor: '#3a240c',
    borderColor: '#7a4b1c',
  },
  message: {
    color: '#ffffff',
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 12,
  },
  cta: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  ctaText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 13,
  },
  close: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  closeText: {
    color: '#cccccc',
    fontSize: 12,
  },
});

