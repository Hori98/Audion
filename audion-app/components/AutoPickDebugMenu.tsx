/**
 * AutoPick制限解放専用デバッグメニュー
 * シンプルで軽量な実装
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  TextInput,
  ScrollView,
  Modal,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import DebugService from '../services/DebugService';
import SubscriptionService, { SubscriptionTier } from '../services/SubscriptionService';

interface AutoPickDebugMenuProps {
  visible: boolean;
  onClose: () => void;
}

export default function AutoPickDebugMenu({ visible, onClose }: AutoPickDebugMenuProps) {
  const { theme } = useTheme();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isDebugMode, setIsDebugMode] = useState(false);
  const [entryPassword, setEntryPassword] = useState('');
  const [debugPassword, setDebugPassword] = useState('');
  const [settings, setSettings] = useState({
    bypassInitialUserLimits: false,
    skipOnboardingRequirements: false,
    bypassSubscriptionLimits: false,
  });
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionTier>(SubscriptionTier.FREE);
  const [apiEndpoint, setApiEndpoint] = useState<'default' | 'local' | 'staging' | 'production'>('default');
  const [apiError, setApiError] = useState<'none' | '401' | '429' | '500' | 'timeout'>('none');

  const styles = createStyles(theme);

  useEffect(() => {
    if (visible) {
      // リセット状態でスタート
      setIsAuthenticated(false);
      setEntryPassword('');
      setDebugPassword('');
      loadSettings();
    }
  }, [visible]);

  const loadSettings = async () => {
    try {
      const debugSettings = await DebugService.loadDebugSettings();
      console.log('🔄 Loading debug settings:', debugSettings);
      
      setIsDebugMode(DebugService.isDebugModeEnabled());
      setSettings({
        bypassInitialUserLimits: debugSettings.bypassInitialUserLimits,
        skipOnboardingRequirements: debugSettings.skipOnboardingRequirements,
        bypassSubscriptionLimits: debugSettings.bypassSubscriptionLimits,
      });
      
      // サブスクリプションプラン設定を読み込み
      if (debugSettings.forcedSubscriptionTier) {
        setSelectedPlan(debugSettings.forcedSubscriptionTier);
        console.log('📊 Forced subscription tier:', debugSettings.forcedSubscriptionTier);
      } else {
        setSelectedPlan(SubscriptionTier.FREE);
        console.log('📊 No forced subscription tier, using FREE');
      }
      
      // API設定を読み込み
      setApiEndpoint(debugSettings.apiEndpointOverride || 'default');
      setApiError(debugSettings.simulatedAPIError || 'none');
      
    } catch (error) {
      console.error('❌ Failed to load debug settings:', error);
    }
  };

  const handleEntryAuthentication = () => {
    // 入力された文字列をトリムして比較（空白文字除去）
    const trimmedPassword = entryPassword.trim();
    const expectedPassword = 'audion_dev_2025';
    
    console.log('🔍 Password Debug:', {
      input: trimmedPassword,
      expected: expectedPassword,
      inputLength: trimmedPassword.length,
      expectedLength: expectedPassword.length,
      match: trimmedPassword === expectedPassword,
      charCodes: trimmedPassword.split('').map(c => c.charCodeAt(0))
    });
    
    if (trimmedPassword === expectedPassword) {
      setIsAuthenticated(true);
      setEntryPassword('');
      Alert.alert('✅ 認証成功', '開発者オプションにアクセスできます');
    } else {
      Alert.alert(
        '❌ 認証失敗', 
        `入力: "${trimmedPassword}" (長さ: ${trimmedPassword.length})\n期待: "${expectedPassword}" (長さ: ${expectedPassword.length})\n\nコピペで入力してください。`
      );
      setEntryPassword('');
    }
  };

  const handleEnableDebugMode = async () => {
    const success = await DebugService.enableDebugMode(debugPassword);
    if (success) {
      Alert.alert('✅ Success', 'Debug mode enabled!');
      setDebugPassword('');
      await loadSettings();
    } else {
      Alert.alert('❌ Error', 'Invalid password');
      setDebugPassword('');
    }
  };

  const handleDisableDebugMode = async () => {
    Alert.alert(
      '🔒 デバッグモード無効化',
      'デバッグモードを無効化しますか？すべての制限解放設定がリセットされます。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '無効化',
          style: 'destructive',
          onPress: async () => {
            await DebugService.disableDebugMode();
            Alert.alert('✅ Success', 'Debug mode disabled');
            await loadSettings();
          }
        }
      ]
    );
  };

  const handleToggleSetting = async (settingKey: keyof typeof settings) => {
    try {
      switch (settingKey) {
        case 'bypassInitialUserLimits':
          await DebugService.toggleBypassInitialUserLimits();
          break;
        case 'skipOnboardingRequirements':
          await DebugService.toggleSkipOnboardingRequirements();
          break;
        case 'bypassSubscriptionLimits':
          await DebugService.toggleBypassSubscriptionLimits();
          break;
      }
      loadSettings();
    } catch (error) {
      console.error('Failed to toggle setting:', error);
      Alert.alert('Error', 'Failed to update setting');
    }
  };

  const handlePlanChange = async (tier: SubscriptionTier) => {
    try {
      console.log('🎯 Changing subscription plan to:', tier);
      
      // 強制的にサブスクリプションティアを設定
      await DebugService.setForcedSubscriptionTier(tier);
      
      // 保存後に設定を再読み込みして確認
      const updatedSettings = await DebugService.loadDebugSettings();
      console.log('📊 Updated settings after plan change:', updatedSettings);
      
      if (updatedSettings.forcedSubscriptionTier === tier) {
        setSelectedPlan(tier);
        console.log('✅ Plan change confirmed:', tier);
        Alert.alert('✅ プラン変更成功', `${tier.toUpperCase()}プランに変更しました`);
      } else {
        console.error('❌ Plan change failed - settings not updated');
        Alert.alert('❌ エラー', `プラン変更に失敗しました\n期待: ${tier}\n実際: ${updatedSettings.forcedSubscriptionTier || 'undefined'}`);
      }
    } catch (error) {
      console.error('❌ Failed to change plan:', error);
      Alert.alert('Error', 'Failed to change subscription plan: ' + error.message);
    }
  };

  const handleVerifyCurrentPlan = async () => {
    try {
      console.log('🔍 Verifying current subscription plan...');
      
      // デバッグ設定から取得
      const debugSettings = DebugService.getCurrentSettings();
      const forcedTier = debugSettings.forcedSubscriptionTier;
      
      // SubscriptionService から実際の有効なティアを取得
      const currentTier = SubscriptionService.getCurrentTier();
      
      console.log('📊 Debug forced tier:', forcedTier);
      console.log('📊 Effective current tier:', currentTier);
      console.log('🎯 Debug mode enabled:', DebugService.isDebugModeEnabled());
      
      let message = `現在の有効プラン: ${currentTier.toUpperCase()}\n`;
      
      if (DebugService.isDebugModeEnabled()) {
        message += `\nデバッグモード: ON\n`;
        if (forcedTier) {
          message += `強制設定プラン: ${forcedTier.toUpperCase()}\n`;
          if (forcedTier === currentTier) {
            message += `✅ 強制設定が正常に適用されています`;
          } else {
            message += `❌ 強制設定が適用されていません\n期待: ${forcedTier.toUpperCase()}\n実際: ${currentTier.toUpperCase()}`;
          }
        } else {
          message += `強制設定プラン: なし\n✅ デフォルトプランが使用されています`;
        }
      } else {
        message += `デバッグモード: OFF\n✅ 通常のプラン判定が使用されています`;
      }
      
      Alert.alert('🔍 プラン確認結果', message);
      
    } catch (error) {
      console.error('❌ Failed to verify current plan:', error);
      Alert.alert('❌ エラー', 'プランの確認に失敗しました: ' + error.message);
    }
  };

  const handleTestAllDebugFunctions = async () => {
    try {
      console.log('🧪 Starting comprehensive debug functionality test...');
      
      let testResults: string[] = [];
      let passedTests = 0;
      let totalTests = 0;
      
      // Test 1: Debug mode status
      totalTests++;
      const debugModeStatus = DebugService.isDebugModeEnabled();
      testResults.push(`1. デバッグモード状態: ${debugModeStatus ? '✅ ON' : '❌ OFF'}`);
      if (debugModeStatus) passedTests++;
      
      // Test 2: Settings persistence
      totalTests++;
      try {
        const currentSettings = DebugService.getCurrentSettings();
        testResults.push(`2. 設定読み込み: ✅ 成功 (${Object.keys(currentSettings).length} 項目)`);
        passedTests++;
      } catch (error) {
        testResults.push(`2. 設定読み込み: ❌ 失敗 (${error.message})`);
      }
      
      // Test 3: Subscription tier functionality
      totalTests++;
      try {
        const forcedTier = DebugService.getForcedSubscriptionTier();
        const currentTier = SubscriptionService.getCurrentTier();
        if (forcedTier && forcedTier === currentTier) {
          testResults.push(`3. プラン強制設定: ✅ 正常動作 (${forcedTier.toUpperCase()})`);
          passedTests++;
        } else if (!forcedTier && currentTier === SubscriptionTier.FREE) {
          testResults.push(`3. プラン強制設定: ✅ デフォルト動作 (FREE)`);
          passedTests++;
        } else {
          testResults.push(`3. プラン強制設定: ❌ 不整合 (設定:${forcedTier || 'なし'} 実際:${currentTier})`);
        }
      } catch (error) {
        testResults.push(`3. プラン強制設定: ❌ エラー (${error.message})`);
      }
      
      // Test 4: API endpoint configuration
      totalTests++;
      try {
        const apiEndpoint = DebugService.getAPIEndpoint();
        testResults.push(`4. APIエンドポイント: ✅ 取得成功 (${apiEndpoint})`);
        passedTests++;
      } catch (error) {
        testResults.push(`4. APIエンドポイント: ❌ エラー (${error.message})`);
      }
      
      // Test 5: Toggle functions check
      totalTests++;
      try {
        const meceStatus = DebugService.getMECEStatus();
        const activeToggles = Object.entries(meceStatus).filter(([_, value]) => value).length;
        testResults.push(`5. トグル機能: ✅ 動作確認 (${activeToggles}/${Object.keys(meceStatus).length} 項目有効)`);
        passedTests++;
      } catch (error) {
        testResults.push(`5. トグル機能: ❌ エラー (${error.message})`);
      }
      
      const successRate = Math.round((passedTests / totalTests) * 100);
      const summary = `テスト結果: ${passedTests}/${totalTests} (${successRate}%)${successRate === 100 ? ' 🎉' : ' ⚠️'}`;
      
      console.log('🧪 Debug functionality test completed:', { passedTests, totalTests, successRate });
      
      Alert.alert(
        '🧪 全機能テスト結果',
        [summary, '', ...testResults].join('\n'),
        [{ text: 'OK', style: 'default' }]
      );
      
    } catch (error) {
      console.error('❌ Failed to run debug functionality test:', error);
      Alert.alert('❌ テストエラー', 'デバッグ機能テストの実行に失敗しました: ' + error.message);
    }
  };

  const handleAPIEndpointChange = async (endpoint: 'default' | 'local' | 'staging' | 'production') => {
    try {
      await DebugService.setAPIEndpoint(endpoint);
      setApiEndpoint(endpoint);
      Alert.alert('✅ エンドポイント変更', `${endpoint}エンドポイントに変更しました`);
    } catch (error) {
      console.error('Failed to change API endpoint:', error);
      Alert.alert('Error', 'Failed to change API endpoint');
    }
  };

  const handleClearAppCache = async () => {
    Alert.alert(
      '🗑️ キャッシュクリア',
      'アプリの全キャッシュをクリアしますか？この操作は元に戻せません。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: 'クリア',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🗑️ Clearing app cache...');
              await DebugService.clearAppCache();
              console.log('✅ App cache cleared successfully');
              Alert.alert('✅ 完了', 'キャッシュをクリアしました');
            } catch (error) {
              console.error('❌ Failed to clear app cache:', error);
              Alert.alert('❌ エラー', 'キャッシュのクリアに失敗しました: ' + error.message);
            }
          }
        }
      ]
    );
  };

  const handleResetPersonalization = async () => {
    Alert.alert(
      '🔄 推薦データリセット',
      'パーソナライズデータをリセットしますか？推薦エンジンが初期状態に戻ります。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: 'リセット',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🔄 Resetting personalization data...');
              await DebugService.resetPersonalizationData();
              console.log('✅ Personalization data reset successfully');
              Alert.alert('✅ 完了', '推薦データをリセットしました');
            } catch (error) {
              console.error('❌ Failed to reset personalization data:', error);
              Alert.alert('❌ エラー', '推薦データのリセットに失敗しました: ' + error.message);
            }
          }
        }
      ]
    );
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            🎯 AutoPick制限解放
          </Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {!isAuthenticated ? (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                🔐 開発者認証
              </Text>
              <Text style={[styles.description, { color: theme.textMuted }]}>
                開発者オプションにアクセスするには、パスワードを入力してください。
              </Text>
              
              {/* パスワードコピー用ヘルパー */}
              <View style={styles.passwordHelper}>
                <Text style={[styles.helperText, { color: theme.textMuted }]}>
                  パスワード: audion_dev_2025
                </Text>
                <TouchableOpacity
                  style={[styles.copyButton, { backgroundColor: theme.accent }]}
                  onPress={() => setEntryPassword('audion_dev_2025')}
                >
                  <Text style={[styles.copyButtonText, { color: theme.primary }]}>自動入力</Text>
                </TouchableOpacity>
              </View>
              
              <TextInput
                style={[styles.passwordInput, { 
                  borderColor: theme.border, 
                  color: theme.text,
                  backgroundColor: theme.surface 
                }]}
                placeholder="開発者パスワード"
                placeholderTextColor={theme.textMuted}
                value={entryPassword}
                onChangeText={setEntryPassword}
                secureTextEntry={false}
                autoCapitalize="none"
                autoCorrect={false}
                spellCheck={false}
              />
              <TouchableOpacity
                style={[styles.button, { backgroundColor: theme.primary }]}
                onPress={handleEntryAuthentication}
              >
                <Text style={styles.buttonText}>認証してアクセス</Text>
              </TouchableOpacity>
            </View>
          ) : !isDebugMode ? (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                デバッグモード認証
              </Text>
              <Text style={[styles.description, { color: theme.textMuted }]}>
                AutoPick制限解放機能を使用するには、デバッグモードを有効化してください。
              </Text>
              <TextInput
                style={[styles.passwordInput, { 
                  borderColor: theme.border, 
                  color: theme.text,
                  backgroundColor: theme.surface 
                }]}
                placeholder="デバッグパスワード"
                placeholderTextColor={theme.textMuted}
                value={debugPassword}
                onChangeText={setDebugPassword}
                secureTextEntry
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={[styles.button, { backgroundColor: theme.primary }]}
                onPress={handleEnableDebugMode}
              >
                <Text style={styles.buttonText}>デバッグモード有効化</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.section}>
                <View style={styles.statusHeader}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>
                    🔓 開発者モード有効
                  </Text>
                  <TouchableOpacity
                    style={[styles.disableButton, { backgroundColor: theme.surface }]}
                    onPress={handleDisableDebugMode}
                  >
                    <Text style={[styles.disableButtonText, { color: theme.textMuted }]}>
                      無効化
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  制限解放設定
                </Text>
                <Text style={[styles.description, { color: theme.textMuted }]}>
                  AutoPickの各種制限を解放します。
                </Text>

                <View style={styles.settingsList}>
                  <View style={[styles.settingRow, { borderBottomColor: theme.border }]}>
                    <View style={styles.settingInfo}>
                      <Text style={[styles.settingTitle, { color: theme.text }]}>
                        初期ユーザー制限バイパス
                      </Text>
                      <Text style={[styles.settingSubtitle, { color: theme.textMuted }]}>
                        新規ユーザーの制限を解放
                      </Text>
                    </View>
                    <Switch
                      value={settings.bypassInitialUserLimits}
                      onValueChange={() => handleToggleSetting('bypassInitialUserLimits')}
                      trackColor={{ false: theme.textMuted, true: theme.primary + '40' }}
                      thumbColor={settings.bypassInitialUserLimits ? theme.primary : '#f4f3f4'}
                    />
                  </View>

                  <View style={[styles.settingRow, { borderBottomColor: theme.border }]}>
                    <View style={styles.settingInfo}>
                      <Text style={[styles.settingTitle, { color: theme.text }]}>
                        オンボーディング要件スキップ
                      </Text>
                      <Text style={[styles.settingSubtitle, { color: theme.textMuted }]}>
                        初回設定の制限を解放
                      </Text>
                    </View>
                    <Switch
                      value={settings.skipOnboardingRequirements}
                      onValueChange={() => handleToggleSetting('skipOnboardingRequirements')}
                      trackColor={{ false: theme.textMuted, true: theme.primary + '40' }}
                      thumbColor={settings.skipOnboardingRequirements ? theme.primary : '#f4f3f4'}
                    />
                  </View>

                  <View style={[styles.settingRow, { borderBottomColor: theme.border }]}>
                    <View style={styles.settingInfo}>
                      <Text style={[styles.settingTitle, { color: theme.text }]}>
                        サブスクリプション制限バイパス
                      </Text>
                      <Text style={[styles.settingSubtitle, { color: theme.textMuted }]}>
                        プラン制限を解放
                      </Text>
                    </View>
                    <Switch
                      value={settings.bypassSubscriptionLimits}
                      onValueChange={() => handleToggleSetting('bypassSubscriptionLimits')}
                      trackColor={{ false: theme.textMuted, true: theme.primary + '40' }}
                      thumbColor={settings.bypassSubscriptionLimits ? theme.primary : '#f4f3f4'}
                    />
                  </View>
                </View>
              </View>

              {/* 🚀 サブスクリプションプラン選択 */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  サブスクリプションプラン選択
                </Text>
                <Text style={[styles.description, { color: theme.textMuted }]}>
                  テスト用にプランを強制的に変更します
                </Text>
                <View style={styles.planSelector}>
                  {Object.values(SubscriptionTier).map((tier) => (
                    <TouchableOpacity
                      key={tier}
                      style={[
                        styles.planButton,
                        selectedPlan === tier && [styles.planButtonActive, { backgroundColor: theme.primary }]
                      ]}
                      onPress={() => handlePlanChange(tier)}
                    >
                      <Text
                        style={[
                          styles.planButtonText,
                          { color: selectedPlan === tier ? '#fff' : theme.text }
                        ]}
                      >
                        {tier.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                
                {/* 現在のプラン確認ボタン */}
                <TouchableOpacity
                  style={[styles.verifyButton, { backgroundColor: theme.surface }]}
                  onPress={handleVerifyCurrentPlan}
                >
                  <Ionicons name="checkmark-circle-outline" size={18} color={theme.primary} />
                  <Text style={[styles.verifyButtonText, { color: theme.text }]}>
                    現在のプランを確認
                  </Text>
                </TouchableOpacity>
                
                {/* 全機能テストボタン */}
                <TouchableOpacity
                  style={[styles.verifyButton, { backgroundColor: theme.primary }]}
                  onPress={handleTestAllDebugFunctions}
                >
                  <Ionicons name="flask-outline" size={18} color="#fff" />
                  <Text style={[styles.verifyButtonText, { color: "#fff" }]}>
                    全機能テスト実行
                  </Text>
                </TouchableOpacity>
              </View>

              {/* 🚀 APIエンドポイント切り替え */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  APIエンドポイント
                </Text>
                <View style={styles.apiSelector}>
                  {(['default', 'local', 'staging', 'production'] as const).map((endpoint) => (
                    <TouchableOpacity
                      key={endpoint}
                      style={[
                        styles.apiButton,
                        apiEndpoint === endpoint && [styles.apiButtonActive, { backgroundColor: theme.accent }]
                      ]}
                      onPress={() => handleAPIEndpointChange(endpoint)}
                    >
                      <Text
                        style={[
                          styles.apiButtonText,
                          { color: apiEndpoint === endpoint ? theme.primary : theme.textMuted }
                        ]}
                      >
                        {endpoint}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* 🚀 クイックアクション */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  クイックアクション
                </Text>
                <View style={styles.quickActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: theme.surface }]}
                    onPress={handleClearAppCache}
                  >
                    <Ionicons name="trash-outline" size={18} color={theme.accent} />
                    <Text style={[styles.actionButtonText, { color: theme.text }]}>
                      キャッシュクリア
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: theme.surface }]}
                    onPress={handleResetPersonalization}
                  >
                    <Ionicons name="refresh-outline" size={18} color={theme.accent} />
                    <Text style={[styles.actionButtonText, { color: theme.text }]}>
                      推薦データリセット
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={[styles.warningText, { color: theme.accent }]}>
                  ⚠️ これらの設定は開発・テスト用です。本番環境では使用しないでください。
                </Text>
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  passwordInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  button: {
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  disableButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  disableButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  settingsList: {
    marginTop: 8,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  settingSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  warningText: {
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 20,
  },
  planSelector: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  planButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
  },
  planButtonActive: {
    borderColor: 'transparent',
  },
  planButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  apiSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  apiButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.border,
  },
  apiButtonActive: {
    borderColor: 'transparent',
  },
  apiButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  passwordHelper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: theme.surface,
    borderRadius: 6,
    marginVertical: 8,
  },
  helperText: {
    fontSize: 12,
    fontFamily: 'monospace',
    flex: 1,
  },
  copyButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  copyButtonText: {
    fontSize: 11,
    fontWeight: '600',
  },
});