/**
 * Bottom Sheet Component
 * Spotify風のボトムシートメニュー
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Dimensions,
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface BottomSheetOption {
  label: string;
  icon?: string;
  onPress: () => void;
  destructive?: boolean;
}

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  options: BottomSheetOption[];
}

export default function BottomSheet({ visible, onClose, title, options }: BottomSheetProps) {
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // 表示アニメーション
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // 非表示アニメーション
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleOptionPress = (option: BottomSheetOption) => {
    onClose();
    // アニメーション完了後にアクションを実行
    setTimeout(() => {
      option.onPress();
    }, 250);
  };

  // スワイプダウンジェスチャーハンドラー
  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationY: translateY } }],
    { useNativeDriver: true }
  );

  const onHandlerStateChange = (event: any) => {
    if (event.nativeEvent.state === State.END) {
      const { translationY, velocityY } = event.nativeEvent;
      
      // 下方向に十分にスワイプされた、または速度が十分な場合は閉じる
      if (translationY > 100 || velocityY > 500) {
        onClose();
      } else {
        // 元の位置に戻す
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* 背景タップ */}
        <TouchableOpacity 
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        >
          <Animated.View 
            style={[styles.backdropOverlay, { opacity }]}
          />
        </TouchableOpacity>

        {/* ボトムシート */}
        <PanGestureHandler
          onGestureEvent={onGestureEvent}
          onHandlerStateChange={onHandlerStateChange}
        >
          <Animated.View 
            style={[
              styles.bottomSheet,
              {
                transform: [{ translateY }],
              },
            ]}
          >
            {/* ハンドル */}
            <View style={styles.handle} />

            {/* タイトル */}
            {title && (
              <View style={styles.titleContainer}>
                <Text style={styles.title} numberOfLines={2}>
                  {title}
                </Text>
              </View>
            )}

            {/* オプション */}
            <View style={styles.optionsContainer}>
              {options.map((option, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.option}
                  onPress={() => handleOptionPress(option)}
                  activeOpacity={0.7}
                >
                  <View style={styles.optionContent}>
                    {option.icon && (
                      <Text style={styles.optionIcon}>{option.icon}</Text>
                    )}
                    <Text 
                      style={[
                        styles.optionLabel,
                        option.destructive && styles.destructiveLabel
                      ]}
                    >
                      {option.label}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
        </PanGestureHandler>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  backdropOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  bottomSheet: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 34, // Safe area bottom
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: '#666666',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  titleContainer: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: 22,
  },
  optionsContainer: {
    paddingTop: 8,
  },
  option: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionIcon: {
    fontSize: 20,
    marginRight: 16,
    width: 24,
    textAlign: 'center',
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
  },
  destructiveLabel: {
    color: '#ff453a',
  },
});