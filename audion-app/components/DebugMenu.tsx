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
import DebugService, { DebugSettings } from '../services/DebugService';
import SubscriptionService, { SubscriptionTier } from '../services/SubscriptionService';

interface DebugMenuProps {
  visible: boolean;
  onClose: () => void;
}

export default function DebugMenu({ visible, onClose }: DebugMenuProps) {
  const { theme } = useTheme();
  const [debugSettings, setDebugSettings] = useState<DebugSettings>({
    enableDebugMode: false,
    forcedSubscriptionTier: undefined,
    bypassSubscriptionLimits: false,
    showDebugInfo: false,
    enableBetaFeatures: false,
    mockPremiumUser: false,
    enableTestAlerts: false,
    // 🆕 MECE補完項目
    forcedAPIErrors: false,
    mockNetworkConditions: false,
    enablePerformanceMetrics: false,
    mockDataGeneration: false,
  });
  const [password, setPassword] = useState('');
  const [currentTier, setCurrentTier] = useState<SubscriptionTier>(SubscriptionTier.FREE);
  const [forcedTier, setForcedTier] = useState<SubscriptionTier | undefined>(undefined);

  const styles = createStyles(theme);

  useEffect(() => {
    if (visible) {
      loadDebugSettings();
    }
  }, [visible]);

  const loadDebugSettings = async () => {
    try {
      const settings = await DebugService.loadDebugSettings();
      setDebugSettings(settings);
      setCurrentTier(SubscriptionService.getCurrentTier());
      
      // 🔄 forcedTierを設定から取得
      const forced = settings.forcedSubscriptionTier;
      setForcedTier(forced);
      
    } catch (error) {
      console.error('Failed to load debug settings:', error);
    }
  };

  const handleEnableDebugMode = async () => {
    if (await DebugService.enableDebugMode(password)) {
      Alert.alert('Success', 'Debug mode enabled!');
      setPassword('');
      loadDebugSettings();
    } else {
      Alert.alert('Error', 'Invalid password');
      setPassword('');
    }
  };

  const handleDisableDebugMode = async () => {
    await DebugService.disableDebugMode();
    Alert.alert('Success', 'Debug mode disabled');
    loadDebugSettings();
  };

  const handleToggleSetting = async (setting: keyof DebugSettings) => {
    switch (setting) {
      case 'bypassSubscriptionLimits':
        await DebugService.toggleBypassSubscriptionLimits();
        break;
      case 'showDebugInfo':
        await DebugService.toggleDebugInfo();
        break;
      case 'enableBetaFeatures':
        await DebugService.toggleBetaFeatures();
        break;
      case 'mockPremiumUser':
        await DebugService.toggleMockPremiumUser();
        break;
      case 'enableTestAlerts':
        await DebugService.toggleTestAlerts();
        break;
      // 🆕 MECE補完項目
      case 'forcedAPIErrors':
        await DebugService.toggleForcedAPIErrors();
        break;
      case 'mockNetworkConditions':
        await DebugService.toggleMockNetworkConditions();
        break;
      case 'enablePerformanceMetrics':
        await DebugService.togglePerformanceMetrics();
        break;
      case 'mockDataGeneration':
        await DebugService.toggleMockDataGeneration();
        break;
    }
    loadDebugSettings();
  };

  const handleSetSubscriptionTier = (tier: SubscriptionTier) => {
    Alert.alert(
      'Force Subscription Tier',
      `Set subscription tier to ${tier} for testing?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            await DebugService.setForcedSubscriptionTier(tier);
            await loadDebugSettings(); // Reload to update UI
            Alert.alert('Success', `Forced subscription tier set to ${tier}`);
          }
        }
      ]
    );
  };

  const handleClearForcedTier = async () => {
    await DebugService.setForcedSubscriptionTier(undefined);
    await loadDebugSettings(); // Reload to update UI
    Alert.alert('Success', 'Forced subscription tier cleared');
  };

  const handleResetAll = () => {
    Alert.alert(
      'Reset Debug Settings',
      'Are you sure you want to reset all debug settings?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await DebugService.resetDebugSettings();
            
            // 🔐 デバッグモード状態を保持しつつ設定をリセット
            const currentDebugMode = debugSettings.enableDebugMode;
            const resetSettings = {
              enableDebugMode: currentDebugMode, // 🎯 ログイン状態保持
              forcedSubscriptionTier: undefined,
              bypassSubscriptionLimits: false,
              showDebugInfo: false,
              enableBetaFeatures: false,
              mockPremiumUser: false,
              enableTestAlerts: false,
              forcedAPIErrors: false,
              mockNetworkConditions: false,
              enablePerformanceMetrics: false,
              mockDataGeneration: false,
            };
            
            // ローカル状態も手動で更新
            setDebugSettings(resetSettings);
            setForcedTier(undefined);
            
            Alert.alert('Success', 'All debug settings reset');
          }
        }
      ]
    );
  };;

  const renderEnvironmentInfo = () => {
    const envInfo = DebugService.getEnvironmentInfo();
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Environment Info</Text>
        <Text style={styles.infoText}>
          {JSON.stringify(envInfo, null, 2)}
        </Text>
      </View>
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
            🧪 Debug Menu
          </Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content}>
          {!debugSettings.enableDebugMode ? (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Enable Debug Mode
              </Text>
              <TextInput
                style={[styles.passwordInput, { borderColor: theme.border, color: theme.text }]}
                placeholder="Enter debug password"
                placeholderTextColor={theme.textSecondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
              <TouchableOpacity
                style={[styles.button, { backgroundColor: theme.primary }]}
                onPress={handleEnableDebugMode}
              >
                <Text style={styles.buttonText}>Enable Debug Mode</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  Debug Mode Active ✅
                </Text>
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: theme.error || '#ef4444' }]}
                  onPress={handleDisableDebugMode}
                >
                  <Text style={styles.buttonText}>Disable Debug Mode</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  Subscription Testing
                </Text>
                
                <View style={styles.tierButtons}>
                  {Object.values(SubscriptionTier).map((tier) => {
                    const isSelected = forcedTier === tier;
                    return (
                      <TouchableOpacity
                        key={tier}
                        style={[
                          styles.tierButton,
                          {
                            backgroundColor: isSelected ? theme.primary : theme.card,
                            borderColor: isSelected ? theme.primary : theme.border,
                            borderWidth: 2,
                          }
                        ]}
                        onPress={() => handleSetSubscriptionTier(tier)}
                      >
                        <Text style={[
                          styles.tierButtonText,
                          { 
                            color: isSelected ? '#ffffff' : theme.text,
                            fontWeight: isSelected ? '700' : '500'
                          }
                        ]}>
                          {isSelected && '✓ '}{tier.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                
                <View style={styles.currentTierInfo}>
                  <Text style={[styles.infoText, { color: theme.textSecondary }]}>
                    {forcedTier ? (
                      `🎯 Forced: ${forcedTier.toUpperCase()} (Original: ${currentTier.toUpperCase()})`
                    ) : (
                      `✅ Using Original: ${currentTier.toUpperCase()}`
                    )}
                  </Text>
                </View>
                
                {forcedTier && (
                  <TouchableOpacity
                    style={[
                      styles.button,
                      { backgroundColor: theme.error || '#ef4444' }
                    ]}
                    onPress={handleClearForcedTier}
                  >
                    <Text style={[styles.buttonText, { color: '#ffffff' }]}>
                      ✖ Clear Forced Tier
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  Debug Settings
                </Text>
                
                {[
                  // 👑 コア機能
                  { key: 'bypassSubscriptionLimits', label: 'Bypass Subscription Limits', category: 'core' },
                  { key: 'showDebugInfo', label: 'Show Debug Info', category: 'core' },
                  { key: 'enableBetaFeatures', label: 'Enable Beta Features', category: 'core' },
                  { key: 'mockPremiumUser', label: 'Mock Premium User', category: 'core' },
                  { key: 'enableTestAlerts', label: 'Enable Test Alerts', category: 'core' },
                  // 🆕 MECE補完機能
                  { key: 'forcedAPIErrors', label: 'Force API Errors', category: 'testing' },
                  { key: 'mockNetworkConditions', label: 'Mock Network Issues', category: 'testing' },
                  { key: 'enablePerformanceMetrics', label: 'Performance Metrics', category: 'monitoring' },
                  { key: 'mockDataGeneration', label: 'Mock Test Data', category: 'testing' },
                ].map(({ key, label, category }) => (
                  <View key={key} style={[
                    styles.settingRow,
                    category === 'testing' && { borderLeftWidth: 3, borderLeftColor: '#ff6b6b', paddingLeft: 13 },
                    category === 'monitoring' && { borderLeftWidth: 3, borderLeftColor: '#4ecdc4', paddingLeft: 13 }
                  ]}>
                    <View style={styles.settingLabelContainer}>
                      <Text style={[styles.settingLabel, { color: theme.text }]}>
                        {category === 'testing' && '🧪 '}
                        {category === 'monitoring' && '📊 '}
                        {category === 'core' && '👑 '}
                        {label}
                      </Text>
                      {(key === 'forcedAPIErrors' || key === 'mockNetworkConditions') && (
                        <Text style={[styles.categoryBadge, { color: '#ff6b6b' }]}>TEST</Text>
                      )}
                      {key === 'enablePerformanceMetrics' && (
                        <Text style={[styles.categoryBadge, { color: '#4ecdc4' }]}>MONITOR</Text>
                      )}
                    </View>
                    <Switch
                      value={debugSettings[key as keyof DebugSettings] as boolean}
                      onValueChange={() => handleToggleSetting(key as keyof DebugSettings)}
                      trackColor={{ false: theme.textMuted, true: theme.primary + '40' }}
                      thumbColor={
                        debugSettings[key as keyof DebugSettings] 
                          ? theme.primary 
                          : '#f4f3f4'
                      }
                    />
                  </View>
                ))}
              </View>

              {debugSettings.showDebugInfo && renderEnvironmentInfo()}

              <View style={styles.section}>
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: theme.error || '#ef4444' }]}
                  onPress={handleResetAll}
                >
                  <Text style={styles.buttonText}>Reset All Settings</Text>
                </TouchableOpacity>
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
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  passwordInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 16,
  },
  button: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  tierButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  tierButton: {
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: theme.border,
  },
  tierButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  settingLabel: {
    fontSize: 16,
    flex: 1,
  },
  infoText: {
    fontSize: 12,
    fontFamily: 'monospace',
    backgroundColor: theme.accent,
    padding: 12,
    borderRadius: 8,
    color: theme.text,
  },
  currentTierInfo: {
    marginTop: 12,
    padding: 12,
    backgroundColor: theme.accent + '50',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: theme.primary,
  },
  settingLabelContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryBadge: {
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: 'transparent',
    borderRadius: 4,
  },
});