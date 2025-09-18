/**
 * Appearance Settings Screen (MECE準拠)
 * 外観と表示 - アプリの見た目に関する設定
 * 高優先度で実装可能な項目を実装
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  StatusBar,
  SafeAreaView,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AppearanceScreenProps {
  visible: boolean;
  onClose: () => void;
}

interface SettingItemProps {
  title: string;
  description?: string;
  icon: string;
  onPress?: () => void;
  showArrow?: boolean;
  toggle?: boolean;
  toggleValue?: boolean;
  onToggleChange?: (value: boolean) => void;
  rightText?: string;
  disabled?: boolean;
}

function SettingItem({ 
  title, 
  description, 
  icon, 
  onPress, 
  showArrow = true, 
  toggle = false,
  toggleValue = false,
  onToggleChange,
  rightText,
  disabled = false
}: SettingItemProps) {
  const handlePress = () => {
    if (!disabled && onPress) {
      onPress();
    }
  };

  return (
    <TouchableOpacity 
      style={[styles.settingItem, disabled && styles.settingItemDisabled]} 
      onPress={handlePress} 
      activeOpacity={disabled ? 1 : 0.7}
      disabled={disabled}
    >
      <View style={styles.settingItemLeft}>
        <View style={styles.iconContainer}>
          <FontAwesome 
            name={icon as any} 
            size={20} 
            color={disabled ? "#666666" : "#007bff"} 
          />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.settingTitle, disabled && styles.settingTitleDisabled]}>
            {title}
          </Text>
          {description && (
            <Text style={[styles.settingDescription, disabled && styles.settingDescriptionDisabled]}>
              {description}
            </Text>
          )}
        </View>
      </View>
      {toggle ? (
        <Switch
          value={toggleValue}
          onValueChange={onToggleChange}
          disabled={disabled}
          trackColor={{ false: '#333333', true: '#007bff' }}
          thumbColor={toggleValue ? '#ffffff' : '#cccccc'}
        />
      ) : rightText ? (
        <Text style={styles.rightText}>{rightText}</Text>
      ) : (
        showArrow && !disabled && (
          <FontAwesome name="chevron-right" size={14} color="#666666" />
        )
      )}
    </TouchableOpacity>
  );
}

export default function AppearanceScreen({ visible, onClose }: AppearanceScreenProps) {
  // 設定状態
  const [darkMode, setDarkMode] = useState(true); // デフォルトはダークモード
  const [fontSize, setFontSize] = useState('標準');
  const [language, setLanguage] = useState('日本語');
  const [autoRotation, setAutoRotation] = useState(true);
  const [animations, setAnimations] = useState(true);

  // 設定の読み込み
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const darkModeValue = await AsyncStorage.getItem('@appearance_dark_mode');
      const fontSizeValue = await AsyncStorage.getItem('@appearance_font_size');
      const languageValue = await AsyncStorage.getItem('@appearance_language');
      const autoRotationValue = await AsyncStorage.getItem('@appearance_auto_rotation');
      const animationsValue = await AsyncStorage.getItem('@appearance_animations');

      if (darkModeValue !== null) setDarkMode(JSON.parse(darkModeValue));
      if (fontSizeValue !== null) setFontSize(fontSizeValue);
      if (languageValue !== null) setLanguage(languageValue);
      if (autoRotationValue !== null) setAutoRotation(JSON.parse(autoRotationValue));
      if (animationsValue !== null) setAnimations(JSON.parse(animationsValue));
    } catch (error) {
      console.error('設定の読み込みに失敗しました:', error);
    }
  };

  const handleDarkModeToggle = async (value: boolean) => {
    setDarkMode(value);
    try {
      await AsyncStorage.setItem('@appearance_dark_mode', JSON.stringify(value));
      Alert.alert('変更完了', `${value ? 'ダークモード' : 'ライトモード'}に変更されました。アプリを再起動して完全に反映されます。`);
    } catch (error) {
      console.error('ダークモード設定の保存に失敗しました:', error);
    }
  };

  const handleAutoRotationToggle = async (value: boolean) => {
    setAutoRotation(value);
    try {
      await AsyncStorage.setItem('@appearance_auto_rotation', JSON.stringify(value));
    } catch (error) {
      console.error('画面回転設定の保存に失敗しました:', error);
    }
  };

  const handleAnimationsToggle = async (value: boolean) => {
    setAnimations(value);
    try {
      await AsyncStorage.setItem('@appearance_animations', JSON.stringify(value));
    } catch (error) {
      console.error('アニメーション設定の保存に失敗しました:', error);
    }
  };

  const handleFontSizePress = () => {
    Alert.alert(
      'フォントサイズ',
      '表示するフォントサイズを選択してください',
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: '小', onPress: () => changeFontSize('小') },
        { text: '標準', onPress: () => changeFontSize('標準') },
        { text: '大', onPress: () => changeFontSize('大') },
        { text: '特大', onPress: () => changeFontSize('特大') },
      ]
    );
  };

  const changeFontSize = async (size: string) => {
    setFontSize(size);
    try {
      await AsyncStorage.setItem('@appearance_font_size', size);
      Alert.alert('変更完了', `フォントサイズを「${size}」に変更しました`);
    } catch (error) {
      console.error('フォントサイズ設定の保存に失敗しました:', error);
    }
  };

  const handleLanguagePress = () => {
    Alert.alert(
      '言語設定',
      '表示言語を選択してください',
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: '日本語', onPress: () => changeLanguage('日本語') },
        { text: 'English', onPress: () => changeLanguage('English') },
        { text: '한국어', onPress: () => changeLanguage('한국어') },
      ]
    );
  };

  const changeLanguage = async (lang: string) => {
    setLanguage(lang);
    try {
      await AsyncStorage.setItem('@appearance_language', lang);
      Alert.alert('変更完了', `表示言語を「${lang}」に変更しました。アプリを再起動して完全に反映されます。`);
    } catch (error) {
      console.error('言語設定の保存に失敗しました:', error);
    }
  };

  const handleResetSettings = () => {
    Alert.alert(
      '設定をリセット',
      '外観設定をデフォルトに戻しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        { 
          text: 'リセット', 
          style: 'destructive',
          onPress: resetToDefaults
        }
      ]
    );
  };

  const resetToDefaults = async () => {
    try {
      await AsyncStorage.multiRemove([
        '@appearance_dark_mode',
        '@appearance_font_size', 
        '@appearance_language',
        '@appearance_auto_rotation',
        '@appearance_animations'
      ]);
      
      // デフォルト値に戻す
      setDarkMode(true);
      setFontSize('標準');
      setLanguage('日本語');
      setAutoRotation(true);
      setAnimations(true);
      
      Alert.alert('完了', '外観設定をデフォルトに戻しました');
    } catch (error) {
      console.error('設定のリセットに失敗しました:', error);
      Alert.alert('エラー', '設定のリセットに失敗しました');
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        
        {/* ヘッダー */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <FontAwesome name="arrow-left" size={18} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>外観と表示</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* テーマ設定セクション */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>テーマ</Text>
            
            <SettingItem
              title="ダークモード"
              description="暗いテーマで表示します"
              icon="moon-o"
              toggle={true}
              toggleValue={darkMode}
              onToggleChange={handleDarkModeToggle}
            />

            <SettingItem
              title="自動テーマ切り替え"
              description="システム設定に従って自動的に切り替え"
              icon="clock-o"
              onPress={() => Alert.alert('実装予定', '自動テーマ切り替え機能は実装予定です')}
              disabled={true}
            />
          </View>

          {/* 表示設定セクション */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>表示設定</Text>
            
            <SettingItem
              title="フォントサイズ"
              description="記事や設定の文字の大きさ"
              icon="font"
              rightText={fontSize}
              onPress={handleFontSizePress}
            />
            
            <SettingItem
              title="画面の向き"
              description="縦画面固定または回転を許可"
              icon="mobile"
              toggle={true}
              toggleValue={autoRotation}
              onToggleChange={handleAutoRotationToggle}
            />

            <SettingItem
              title="アニメーション"
              description="画面遷移やスクロール時のアニメーション"
              icon="magic"
              toggle={true}
              toggleValue={animations}
              onToggleChange={handleAnimationsToggle}
            />
          </View>

          {/* 言語・地域設定セクション */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>言語・地域</Text>
            
            <SettingItem
              title="表示言語"
              description="アプリの表示言語"
              icon="globe"
              rightText={language}
              onPress={handleLanguagePress}
            />
            
            <SettingItem
              title="地域設定"
              description="日付・時刻の表示形式"
              icon="map-marker"
              rightText="日本"
              onPress={() => Alert.alert('実装予定', '地域設定機能は実装予定です')}
              disabled={true}
            />
          </View>

          {/* アクセシビリティセクション */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>アクセシビリティ</Text>
            
            <SettingItem
              title="高コントラスト"
              description="テキストと背景のコントラストを強化"
              icon="adjust"
              onPress={() => Alert.alert('実装予定', '高コントラスト機能は実装予定です')}
              disabled={true}
            />
            
            <SettingItem
              title="読み上げサポート"
              description="スクリーンリーダー対応の強化"
              icon="volume-up"
              onPress={() => Alert.alert('実装予定', '読み上げサポート機能は実装予定です')}
              disabled={true}
            />
          </View>

          {/* 詳細設定セクション */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>詳細設定</Text>
            
            <SettingItem
              title="設定をリセット"
              description="外観設定をデフォルトに戻す"
              icon="refresh"
              onPress={handleResetSettings}
              showArrow={false}
            />
          </View>

          {/* 現在の設定状況表示 */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>現在の設定</Text>
            
            <View style={styles.statusCard}>
              <View style={styles.statusItem}>
                <FontAwesome name="moon-o" size={16} color="#007bff" />
                <Text style={styles.statusLabel}>テーマ</Text>
                <Text style={styles.statusValue}>{darkMode ? 'ダークモード' : 'ライトモード'}</Text>
              </View>
              
              <View style={styles.statusItem}>
                <FontAwesome name="font" size={16} color="#4CAF50" />
                <Text style={styles.statusLabel}>フォントサイズ</Text>
                <Text style={styles.statusValue}>{fontSize}</Text>
              </View>
              
              <View style={styles.statusItem}>
                <FontAwesome name="globe" size={16} color="#FF9800" />
                <Text style={styles.statusLabel}>言語</Text>
                <Text style={styles.statusValue}>{language}</Text>
              </View>
            </View>
          </View>

          {/* 下部の余白 */}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  backButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  headerRight: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888888',
    marginBottom: 12,
    marginHorizontal: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 14,
    color: '#888888',
  },
  settingItemDisabled: {
    opacity: 0.5,
  },
  settingTitleDisabled: {
    color: '#666666',
  },
  settingDescriptionDisabled: {
    color: '#444444',
  },
  rightText: {
    fontSize: 14,
    color: '#888888',
    marginRight: 8,
  },
  statusCard: {
    backgroundColor: '#111111',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusLabel: {
    flex: 1,
    fontSize: 14,
    color: '#cccccc',
    marginLeft: 12,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  bottomSpacer: {
    height: 32,
  },
});