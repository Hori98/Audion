/**
 * Storage & Data Settings Screen
 * ストレージとデータ設定画面
 */

import React, { useState } from 'react';
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

interface StorageDataScreenProps {
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
      ) : (
        showArrow && !disabled && (
          <FontAwesome name="chevron-right" size={14} color="#666666" />
        )
      )}
    </TouchableOpacity>
  );
}

export default function StorageDataScreen({ visible, onClose }: StorageDataScreenProps) {
  // 設定状態
  const [autoDownload, setAutoDownload] = useState(true);
  const [wifiOnlyDownload, setWifiOnlyDownload] = useState(true);
  const [dataSaverMode, setDataSaverMode] = useState(false);
  const [autoCleanup, setAutoCleanup] = useState(true);

  const handleStorageUsagePress = () => {
    Alert.alert('ストレージ使用状況', '使用状況詳細画面は実装予定です');
  };

  const handleDownloadSettingsPress = () => {
    Alert.alert('ダウンロード設定', 'ダウンロード設定詳細は実装予定です');
  };

  const handleCacheManagementPress = () => {
    Alert.alert('キャッシュ管理', 'キャッシュ管理画面は実装予定です');
  };

  const handleFileManagementPress = () => {
    Alert.alert('ファイル管理', 'ファイル管理画面は実装予定です');
  };

  const handleDataUsagePress = () => {
    Alert.alert('通信量モニタ', '通信量モニタ機能は実装予定です');
  };

  const handleConnectionSettingsPress = () => {
    Alert.alert('接続設定', '接続設定画面は実装予定です');
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
          <Text style={styles.headerTitle}>ストレージとデータ</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* ダウンロード設定セクション */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>ダウンロード設定</Text>
            
            <SettingItem
              title="自動ダウンロード"
              description="音声とお気に入り記事の自動DL"
              icon="download"
              toggle={true}
              toggleValue={autoDownload}
              onToggleChange={setAutoDownload}
            />
            
            <SettingItem
              title="Wi-Fi接続時のみDL"
              description="モバイルデータ使用量を節約"
              icon="wifi"
              toggle={true}
              toggleValue={wifiOnlyDownload}
              onToggleChange={setWifiOnlyDownload}
            />
            
            <SettingItem
              title="ストレージ容量管理"
              description="最大使用容量と容量不足時の動作"
              icon="hdd-o"
              onPress={handleDownloadSettingsPress}
            />
            
            <SettingItem
              title="自動削除設定"
              description="再生済み・古いファイルの削除"
              icon="trash-o"
              toggle={true}
              toggleValue={autoCleanup}
              onToggleChange={setAutoCleanup}
            />
          </View>

          {/* ストレージ使用状況セクション */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>ストレージ使用状況</Text>
            
            <SettingItem
              title="使用量詳細"
              description="音声・記事・キャッシュ使用量"
              icon="pie-chart"
              onPress={handleStorageUsagePress}
            />
            
            <SettingItem
              title="ファイル管理"
              description="ダウンロード済みファイル一覧"
              icon="folder-open"
              onPress={handleFileManagementPress}
            />
            
            <SettingItem
              title="キャッシュ管理"
              description="画像・記事キャッシュのクリア"
              icon="refresh"
              onPress={handleCacheManagementPress}
            />
          </View>

          {/* データ通信設定セクション */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>データ通信設定</Text>
            
            <SettingItem
              title="データセーバーモード"
              description="モバイルデータ時の音質制限"
              icon="tachometer"
              toggle={true}
              toggleValue={dataSaverMode}
              onToggleChange={setDataSaverMode}
            />
            
            <SettingItem
              title="通信量モニタ"
              description="月間データ使用量とアラート"
              icon="bar-chart"
              onPress={handleDataUsagePress}
            />
            
            <SettingItem
              title="接続設定"
              description="Wi-Fi・ローミング時の動作"
              icon="signal"
              onPress={handleConnectionSettingsPress}
            />
          </View>

          {/* 現在の使用量表示 */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>現在の使用量</Text>
            
            <View style={styles.usageCard}>
              <View style={styles.usageItem}>
                <FontAwesome name="music" size={16} color="#007bff" />
                <Text style={styles.usageLabel}>音声ファイル</Text>
                <Text style={styles.usageValue}>245 MB</Text>
              </View>
              
              <View style={styles.usageItem}>
                <FontAwesome name="file-text" size={16} color="#007bff" />
                <Text style={styles.usageLabel}>記事データ</Text>
                <Text style={styles.usageValue}>82 MB</Text>
              </View>
              
              <View style={styles.usageItem}>
                <FontAwesome name="image" size={16} color="#007bff" />
                <Text style={styles.usageLabel}>キャッシュ</Text>
                <Text style={styles.usageValue}>156 MB</Text>
              </View>
              
              <View style={[styles.usageItem, styles.totalUsage]}>
                <FontAwesome name="hdd-o" size={16} color="#ffffff" />
                <Text style={styles.totalLabel}>合計使用量</Text>
                <Text style={styles.totalValue}>483 MB</Text>
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
  usageCard: {
    backgroundColor: '#111111',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
  },
  usageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  usageLabel: {
    flex: 1,
    fontSize: 14,
    color: '#cccccc',
    marginLeft: 12,
  },
  usageValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  totalUsage: {
    borderTopWidth: 1,
    borderTopColor: '#333333',
    paddingTop: 12,
    marginTop: 8,
    marginBottom: 0,
  },
  totalLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginLeft: 12,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007bff',
  },
  bottomSpacer: {
    height: 32,
  },
});