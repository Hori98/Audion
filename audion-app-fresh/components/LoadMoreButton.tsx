/**
 * LoadMoreButton Component
 * 最新セクション用の「もっと見る▼」ボタン
 * 右端配置、下線付きのミニマルデザイン
 */

import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import Icon from './common/Icon';

interface LoadMoreButtonProps {
  onPress: () => void;
  visible: boolean;
}

const LoadMoreButton: React.FC<LoadMoreButtonProps> = ({ onPress, visible }) => {
  if (!visible) return null;

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.row}>
        <Text style={styles.text}>もっと見る</Text>
        <Icon name="chevron-down" size={16} color="#FFFFFF" />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-end', // 右端配置
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginTop: 8,
    marginRight: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  text: {
    fontSize: 14,
    color: '#FFFFFF',
    textDecorationLine: 'underline', // 下線付き
    textDecorationColor: '#FFFFFF',
    letterSpacing: 0.2,
  },
});

export default LoadMoreButton;
