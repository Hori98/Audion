/**
 * Prompt Screen - 独立したプロンプト設定画面
 * 音声生成アプリの核心機能として強調
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useContentSettings } from '../../context/SettingsContext';
import PromptSettingsModal from './PromptSettingsModal';

interface PromptScreenProps {
  visible: boolean;
  onClose: () => void;
}

interface SettingItemProps {
  title: string;
  description?: string;
  icon: string;
  onPress?: () => void;
  rightText?: string;
  disabled?: boolean;
}

function SettingItem({ 
  title, 
  description, 
  icon, 
  onPress, 
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
      {rightText ? (
        <Text style={styles.rightText}>{rightText}</Text>
      ) : (
        !disabled && (
          <FontAwesome name="chevron-right" size={14} color="#666666" />
        )
      )}
    </TouchableOpacity>
  );
}

export default function PromptScreen({ visible, onClose }: PromptScreenProps) {
  const { content } = useContentSettings();
  const [showPromptSettings, setShowPromptSettings] = useState(false);
  const [promptSettingsMode, setPromptSettingsMode] = useState<'auto' | 'manual' | 'schedule'>('auto');

  const handleOpenPromptSettings = (mode: 'auto' | 'manual' | 'schedule') => {
    setPromptSettingsMode(mode);
    setShowPromptSettings(true);
  };

  const getPromptStyleDisplayName = (style: string) => {
    const styleNames: { [key: string]: string } = {
      'standard': '標準',
      'friendly': 'フレンドリー',
      'strict': '厳密',
      'insightful': '洞察的',
    };
    return styleNames[style] || style;
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
          <Text style={styles.headerTitle}>プロンプト設定</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* 説明セクション */}
          <View style={styles.descriptionSection}>
            <View style={styles.heroIconContainer}>
              <FontAwesome name="magic" size={32} color="#007bff" />
            </View>
            <Text style={styles.descriptionTitle}>AIプロンプト設定</Text>
            <Text style={styles.descriptionText}>
              音声生成のスタイルを決定する重要な設定です。各生成方式で異なるプロンプトを設定することで、
              シーンに応じた最適な音声コンテンツを作成できます。
            </Text>
          </View>

          {/* 現在の設定セクション */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>現在の設定</Text>
            
            <View style={styles.currentSettingsContainer}>
              <View style={styles.currentSettingItem}>
                <Text style={styles.currentSettingLabel}>デフォルトプロンプト</Text>
                <Text style={styles.currentSettingValue}>
                  {getPromptStyleDisplayName(content.promptTemplate)}
                </Text>
              </View>
            </View>
          </View>

          {/* 生成方式別設定セクション */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>生成方式別設定</Text>
            
            <SettingItem
              title="Auto-Pick プロンプト"
              description="自動記事選択時の音声生成スタイル"
              icon="magic"
              rightText="カスタマイズ"
              onPress={() => handleOpenPromptSettings('auto')}
            />

            <SettingItem
              title="Manual-Pick プロンプト"
              description="手動記事選択時の音声生成スタイル"
              icon="hand-paper-o"
              rightText="カスタマイズ"
              onPress={() => handleOpenPromptSettings('manual')}
            />

            <SettingItem
              title="Schedule-Pick プロンプト"
              description="スケジュール配信時の音声生成スタイル"
              icon="calendar"
              rightText="カスタマイズ"
              onPress={() => handleOpenPromptSettings('schedule')}
            />
          </View>

          {/* 利用可能なスタイル情報 */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>利用可能なスタイル</Text>
            
            <View style={styles.styleInfoContainer}>
              <View style={styles.styleInfoItem}>
                <FontAwesome name="star" size={16} color="#ffd700" />
                <View style={styles.styleInfoText}>
                  <Text style={styles.styleInfoTitle}>標準</Text>
                  <Text style={styles.styleInfoDescription}>バランスの取れた要約</Text>
                </View>
              </View>

              <View style={styles.styleInfoItem}>
                <FontAwesome name="heart" size={16} color="#ff6b9d" />
                <View style={styles.styleInfoText}>
                  <Text style={styles.styleInfoTitle}>フレンドリー</Text>
                  <Text style={styles.styleInfoDescription}>親しみやすい口調</Text>
                </View>
              </View>

              <View style={styles.styleInfoItem}>
                <FontAwesome name="shield" size={16} color="#4dabf7" />
                <View style={styles.styleInfoText}>
                  <Text style={styles.styleInfoTitle}>厳密</Text>
                  <Text style={styles.styleInfoDescription}>正確性重視</Text>
                </View>
              </View>

              <View style={styles.styleInfoItem}>
                <FontAwesome name="lightbulb-o" size={16} color="#69db7c" />
                <View style={styles.styleInfoText}>
                  <Text style={styles.styleInfoTitle}>洞察的</Text>
                  <Text style={styles.styleInfoDescription}>深い分析と考察</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </View>

      {/* プロンプト設定モーダル */}
      <PromptSettingsModal
        visible={showPromptSettings}
        onClose={() => setShowPromptSettings(false)}
        mode={promptSettingsMode}
      />
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
  descriptionSection: {
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  heroIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0,123,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  descriptionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  descriptionText: {
    fontSize: 14,
    color: '#cccccc',
    textAlign: 'center',
    lineHeight: 20,
  },
  section: {
    paddingTop: 24,
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
  currentSettingsContainer: {
    marginHorizontal: 16,
    backgroundColor: '#111111',
    borderRadius: 12,
    padding: 16,
  },
  currentSettingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  currentSettingLabel: {
    fontSize: 16,
    color: '#cccccc',
  },
  currentSettingValue: {
    fontSize: 16,
    color: '#007bff',
    fontWeight: '600',
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
    color: '#007bff',
    marginRight: 8,
    fontWeight: '500',
  },
  styleInfoContainer: {
    marginHorizontal: 16,
    gap: 12,
  },
  styleInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111111',
    borderRadius: 8,
    padding: 12,
  },
  styleInfoText: {
    marginLeft: 12,
    flex: 1,
  },
  styleInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 2,
  },
  styleInfoDescription: {
    fontSize: 12,
    color: '#888888',
  },
  bottomSpacer: {
    height: 32,
  },
});