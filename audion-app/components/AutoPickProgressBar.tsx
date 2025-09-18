/**
 * AutoPick Progress Bar Component
 * フッター上部に表示される動的ステータス監視UI
 */

import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

interface AutoPickProgressBarProps {
  visible: boolean;
  progress: number; // 0-100
  message: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  onCancelPress?: () => void;
}

export default function AutoPickProgressBar({ 
  visible, 
  progress, 
  message, 
  status,
  onCancelPress,
}: AutoPickProgressBarProps) {
  const progressWidth = new Animated.Value(progress);

  React.useEffect(() => {
    Animated.timing(progressWidth, {
      toValue: progress,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  if (!visible) {
    return null;
  }

  const getStatusColor = () => {
    switch (status) {
      case 'pending':
        return '#ffa500';
      case 'in_progress':
        return '#007bff';
      case 'completed':
        return '#28a745';
      case 'failed':
        return '#dc3545';
      default:
        return '#6c757d';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'pending':
        return '⏳';
      case 'in_progress':
        return '⚙️';
      case 'completed':
        return '✅';
      case 'failed':
        return '❌';
      default:
        return '📱';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.icon}>{getStatusIcon()}</Text>
        <Text style={styles.message} numberOfLines={1}>
          {message}
        </Text>
        <Text style={styles.percentage}>{Math.round(progress)}%</Text>
        {status !== 'completed' && status !== 'failed' && (
          <Text style={styles.cancel} onPress={onCancelPress}>キャンセル</Text>
        )}
      </View>
      
      <View style={styles.progressContainer}>
        <View style={[styles.progressTrack, { backgroundColor: '#333333' }]}>
          <Animated.View 
            style={[
              styles.progressFill,
              {
                backgroundColor: getStatusColor(),
                width: progressWidth.interpolate({
                  inputRange: [0, 100],
                  outputRange: ['0%', '100%'],
                  extrapolate: 'clamp',
                })
              }
            ]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#333333',
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cancel: {
    color: '#ff6666',
    marginLeft: 8,
    fontWeight: '600',
  },
  icon: {
    fontSize: 16,
    marginRight: 8,
  },
  message: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
    marginRight: 8,
  },
  percentage: {
    color: '#cccccc',
    fontSize: 12,
    fontWeight: '600',
    minWidth: 40,
    textAlign: 'right',
  },
  progressContainer: {
    height: 4,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#333333',
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
    minWidth: 8, // Minimum visible width
  },
});
