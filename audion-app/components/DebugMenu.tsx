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
    bypassSubscriptionLimits: false,
    showDebugInfo: false,
    enableBetaFeatures: false,
    mockPremiumUser: false,
    enableTestAlerts: false,
  });
  const [password, setPassword] = useState('');
  const [currentTier, setCurrentTier] = useState<SubscriptionTier>(SubscriptionTier.FREE);

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
            loadDebugSettings();
            Alert.alert('Success', `Forced subscription tier set to ${tier}`);
          }
        }
      ]
    );
  };

  const handleClearForcedTier = async () => {
    await DebugService.setForcedSubscriptionTier(undefined);
    loadDebugSettings();
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
            loadDebugSettings();
            Alert.alert('Success', 'All debug settings reset');
          }
        }
      ]
    );
  };

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
                  {Object.values(SubscriptionTier).map((tier) => (
                    <TouchableOpacity
                      key={tier}
                      style={[styles.tierButton, { backgroundColor: theme.card }]}
                      onPress={() => handleSetSubscriptionTier(tier)}
                    >
                      <Text style={[styles.tierButtonText, { color: theme.text }]}>
                        Force {tier.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: theme.accent }]}
                  onPress={handleClearForcedTier}
                >
                  <Text style={[styles.buttonText, { color: theme.text }]}>
                    Clear Forced Tier
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  Debug Settings
                </Text>
                
                {[
                  { key: 'bypassSubscriptionLimits', label: 'Bypass Subscription Limits' },
                  { key: 'showDebugInfo', label: 'Show Debug Info' },
                  { key: 'enableBetaFeatures', label: 'Enable Beta Features' },
                  { key: 'mockPremiumUser', label: 'Mock Premium User' },
                  { key: 'enableTestAlerts', label: 'Enable Test Alerts' },
                ].map(({ key, label }) => (
                  <View key={key} style={styles.settingRow}>
                    <Text style={[styles.settingLabel, { color: theme.text }]}>
                      {label}
                    </Text>
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
});