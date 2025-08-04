import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSiriShortcuts } from '../hooks/useSiriShortcuts';
import { useTheme } from '../context/ThemeContext';
import * as Linking from 'expo-linking';

export default function SiriShortcutsSettings() {
  const { getShortcuts, createTestURL, donateShortcut } = useSiriShortcuts();
  const { theme } = useTheme();
  const shortcuts = getShortcuts();

  const handleTestShortcut = (action: string) => {
    const testURL = createTestURL(action);
    Alert.alert(
      'Test Siri Shortcut',
      `This would trigger the "${action}" action. In a real iOS implementation, you would say the phrase to Siri.\n\nTest URL: ${testURL}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Test URL',
          onPress: () => Linking.openURL(testURL),
        },
      ]
    );
  };

  const handleDonateShortcut = (shortcutType: 'create-audio' | 'auto-pick') => {
    donateShortcut(shortcutType);
    Alert.alert(
      'Shortcut Donated',
      `The "${shortcutType}" shortcut has been donated to Siri. After using this action a few times, Siri will suggest it as a shortcut.`
    );
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Ionicons name="mic" size={32} color={theme.primary} />
        <Text style={[styles.title, { color: theme.text }]}>Siri Shortcuts</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Use Siri to quickly create audio from your news
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Available Shortcuts</Text>
        
        {shortcuts.map((shortcut, index) => (
          <View key={index} style={[styles.shortcutCard, { backgroundColor: theme.surface }]}>
            <View style={styles.shortcutHeader}>
              <Ionicons 
                name={shortcut.userInfo.action === 'create-audio' ? 'create' : 'shuffle'} 
                size={24} 
                color={theme.primary} 
              />
              <Text style={[styles.shortcutTitle, { color: theme.text }]}>
                {shortcut.title}
              </Text>
            </View>
            
            <Text style={[styles.shortcutPhrase, { color: theme.textSecondary }]}>
              Say: &ldquo;{shortcut.suggestedInvocationPhrase}&rdquo;
            </Text>
            
            <View style={styles.shortcutActions}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: theme.primary + '20' }]}
                onPress={() => handleTestShortcut(shortcut.userInfo.action)}
              >
                <Ionicons name="play" size={16} color={theme.primary} />
                <Text style={[styles.actionButtonText, { color: theme.primary }]}>Test</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: theme.primary }]}
                onPress={() => handleDonateShortcut(shortcut.userInfo.action)}
              >
                <Ionicons name="add" size={16} color="#fff" />
                <Text style={[styles.actionButtonText, { color: '#fff' }]}>Donate to Siri</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>How to Use</Text>
        <View style={[styles.instructionCard, { backgroundColor: theme.surface }]}>
          <View style={styles.instructionStep}>
            <View style={[styles.stepNumber, { backgroundColor: theme.primary }]}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <Text style={[styles.stepText, { color: theme.text }]}>
              Use the app to create audio a few times to establish usage patterns
            </Text>
          </View>
          
          <View style={styles.instructionStep}>
            <View style={[styles.stepNumber, { backgroundColor: theme.primary }]}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <Text style={[styles.stepText, { color: theme.text }]}>
              Tap &ldquo;Donate to Siri&rdquo; for shortcuts you want to use
            </Text>
          </View>
          
          <View style={styles.instructionStep}>
            <View style={[styles.stepNumber, { backgroundColor: theme.primary }]}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <Text style={[styles.stepText, { color: theme.text }]}>
              Say &ldquo;Hey Siri&rdquo; followed by the suggested phrase to activate shortcuts
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Requirements</Text>
        <View style={[styles.requirementCard, { backgroundColor: theme.surface }]}>
          <Text style={[styles.requirementText, { color: theme.textSecondary }]}>
            • iOS device with Siri enabled{'\n'}
            • App installed from App Store{'\n'}
            • Siri & Search permissions enabled for Audion
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  shortcutCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  shortcutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  shortcutTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  shortcutPhrase: {
    fontSize: 14,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  shortcutActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  instructionCard: {
    padding: 16,
    borderRadius: 12,
  },
  instructionStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  stepNumberText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  stepText: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  requirementCard: {
    padding: 16,
    borderRadius: 12,
  },
  requirementText: {
    fontSize: 14,
    lineHeight: 20,
  },
});