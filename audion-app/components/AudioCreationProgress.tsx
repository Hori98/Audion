/**
 * AudioCreationProgress - Shows progress during audio creation
 * Displays during AutoPick instant audio generation
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface AudioCreationProgressProps {
  visible: boolean;
  progress: number; // 0-100
  stage: 'articles' | 'script' | 'audio' | 'complete';
  articlesCount?: number;
}

const STAGE_INFO = {
  articles: {
    icon: 'newspaper-outline' as const,
    title: '記事を選択中',
    description: 'AIが最適な記事を選んでいます...',
  },
  script: {
    icon: 'create-outline' as const,
    title: 'スクリプト作成中',
    description: '読みやすい原稿を生成しています...',
  },
  audio: {
    icon: 'mic-outline' as const,
    title: '音声変換中',
    description: '高品質な音声を作成しています...',
  },
  complete: {
    icon: 'checkmark-circle' as const,
    title: '完了',
    description: '即席音声が準備できました',
  },
};

export default function AudioCreationProgress({ 
  visible, 
  progress, 
  stage, 
  articlesCount 
}: AudioCreationProgressProps) {
  const { theme } = useTheme();
  const progressAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Animate progress
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  // Pulse animation for active stages
  useEffect(() => {
    if (stage !== 'complete') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();

      return () => pulse.stop();
    } else {
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [stage]);

  const stageInfo = STAGE_INFO[stage];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: theme.surface }]}>
          {/* Icon */}
          <Animated.View 
            style={[
              styles.iconContainer,
              { 
                backgroundColor: stage === 'complete' ? '#4CAF50' : theme.primary,
                transform: [{ scale: pulseAnim }],
              },
            ]}
          >
            {stage === 'complete' ? (
              <Ionicons name={stageInfo.icon} size={32} color="#fff" />
            ) : (
              <ActivityIndicator size={32} color="#fff" />
            )}
          </Animated.View>

          {/* Content */}
          <View style={styles.content}>
            <Text style={[styles.title, { color: theme.text }]}>
              {stageInfo.title}
            </Text>
            <Text style={[styles.description, { color: theme.textSecondary }]}>
              {stageInfo.description}
            </Text>
            
            {articlesCount && stage === 'articles' && (
              <Text style={[styles.articlesCount, { color: theme.primary }]}>
                {articlesCount} 記事を処理中
              </Text>
            )}
          </View>

          {/* Progress Bar */}
          <View style={[styles.progressContainer, { backgroundColor: theme.divider }]}>
            <Animated.View
              style={[
                styles.progressBar,
                {
                  backgroundColor: stage === 'complete' ? '#4CAF50' : theme.primary,
                  width: progressAnim.interpolate({
                    inputRange: [0, 100],
                    outputRange: ['0%', '100%'],
                    extrapolate: 'clamp',
                  }),
                },
              ]}
            />
          </View>

          {/* Progress Text */}
          <Text style={[styles.progressText, { color: theme.textSecondary }]}>
            {Math.round(progress)}%
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  container: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 16,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 16,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  content: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
  },
  articlesCount: {
    fontSize: 13,
    fontWeight: '600',
  },
  progressContainer: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    marginBottom: 12,
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
  },
});