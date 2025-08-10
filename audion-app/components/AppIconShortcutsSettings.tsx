import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppIconShortcuts } from '../hooks/useAppIconShortcuts';
import { useTheme } from '../context/ThemeContext';
import * as Linking from 'expo-linking';

export default function AppIconShortcutsSettings() {
  const { getShortcuts, createTestURL, isSupported } = useAppIconShortcuts();
  const { theme } = useTheme();
  const shortcuts = getShortcuts();

  const getShortcutIcon = (iconType: string) => {
    switch (iconType) {
      case 'play':
        return 'play-circle';
      case 'search':
        return 'search';
      case 'bookmark':
        return 'bookmark';
      default:
        return 'apps';
    }
  };

  const handleTestShortcut = (action: string, title: string) => {
    const testURL = createTestURL(action);
    Alert.alert(
      'Test App Icon Shortcut',
      `This would simulate pressing "${title}" from the app icon long-press menu.\n\nTest URL: ${testURL}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Test URL',
          onPress: () => Linking.openURL(testURL),
        },
      ]
    );
  };

  if (!isSupported()) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.header}>
          <Ionicons name="apps" size={32} color={theme.textSecondary} />
          <Text style={[styles.title, { color: theme.text }]}>App Icon Shortcuts</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Not available on {Platform.OS}
          </Text>
        </View>
        
        <View style={[styles.unsupportedCard, { backgroundColor: theme.surface }]}>
          <Ionicons name="information-circle" size={24} color={theme.textSecondary} />
          <Text style={[styles.unsupportedText, { color: theme.textSecondary }]}>
            App icon shortcuts are only available on iOS devices with 3D Touch or Haptic Touch support.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Ionicons name="apps" size={32} color={theme.primary} />
        <Text style={[styles.title, { color: theme.text }]}>App Icon Shortcuts</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Quick actions from your home screen
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Available Shortcuts</Text>
        <Text style={[styles.sectionDescription, { color: theme.textSecondary }]}>
          Long press the Audion app icon on your home screen to access these shortcuts:
        </Text>
        
        {shortcuts.map((shortcut, index) => (
          <View key={index} style={[styles.shortcutCard, { backgroundColor: theme.surface }]}>
            <View style={styles.shortcutHeader}>
              <Ionicons 
                name={getShortcutIcon(shortcut.iconType) as any}
                size={24} 
                color={theme.primary} 
              />
              <View style={styles.shortcutInfo}>
                <Text style={[styles.shortcutTitle, { color: theme.text }]}>
                  {shortcut.title}
                </Text>
                <Text style={[styles.shortcutSubtitle, { color: theme.textSecondary }]}>
                  {shortcut.subtitle}
                </Text>
              </View>
            </View>
            
            <TouchableOpacity
              style={[styles.testButton, { backgroundColor: theme.primary + '20' }]}
              onPress={() => handleTestShortcut(shortcut.type.split('.').pop() || '', shortcut.title)}
            >
              <Ionicons name="play" size={16} color={theme.primary} />
              <Text style={[styles.testButtonText, { color: theme.primary }]}>Test</Text>
            </TouchableOpacity>
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
              Find the Audion app icon on your home screen
            </Text>
          </View>
          
          <View style={styles.instructionStep}>
            <View style={[styles.stepNumber, { backgroundColor: theme.primary }]}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <Text style={[styles.stepText, { color: theme.text }]}>
              Press and hold the app icon until a menu appears
            </Text>
          </View>
          
          <View style={styles.instructionStep}>
            <View style={[styles.stepNumber, { backgroundColor: theme.primary }]}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <Text style={[styles.stepText, { color: theme.text }]}>
              Tap on any of the quick action shortcuts
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Requirements</Text>
        <View style={[styles.requirementCard, { backgroundColor: theme.surface }]}>
          <Text style={[styles.requirementText, { color: theme.textSecondary }]}>
            • iOS device with 3D Touch or Haptic Touch{'\n'}
            • App installed from App Store{'\n'}
            • iOS 9.0 or later
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Demo</Text>
        <View style={[styles.demoCard, { backgroundColor: theme.surface }]}>
          <Text style={[styles.demoText, { color: theme.textSecondary }]}>
            On a real iOS device, you would see these shortcuts when long-pressing the app icon:
          </Text>
          <View style={styles.demoShortcuts}>
            {shortcuts.map((shortcut, index) => (
              <View key={index} style={[styles.demoShortcutItem, { borderColor: theme.border }]}>
                <Ionicons 
                  name={getShortcutIcon(shortcut.iconType) as any}
                  size={16} 
                  color={theme.primary} 
                />
                <Text style={[styles.demoShortcutText, { color: theme.text }]}>
                  {shortcut.title}
                </Text>
              </View>
            ))}
          </View>
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
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 15,
  },
  shortcutCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  shortcutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  shortcutInfo: {
    marginLeft: 12,
    flex: 1,
  },
  shortcutTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  shortcutSubtitle: {
    fontSize: 14,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  testButtonText: {
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
  demoCard: {
    padding: 16,
    borderRadius: 12,
  },
  demoText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  demoShortcuts: {
    gap: 8,
  },
  demoShortcutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 8,
  },
  demoShortcutText: {
    fontSize: 14,
    marginLeft: 8,
  },
  unsupportedCard: {
    padding: 20,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  unsupportedText: {
    fontSize: 14,
    lineHeight: 20,
    marginLeft: 12,
    flex: 1,
  },
});