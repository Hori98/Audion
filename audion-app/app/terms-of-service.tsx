import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';

export default function TermsOfServiceScreen() {
  const router = useRouter();
  const { theme } = useTheme();

  const styles = createStyles(theme);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms of Service</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.lastUpdated}>Last updated: August 5, 2025</Text>
        
        <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
        <Text style={styles.paragraph}>
          By downloading, installing, or using the Audion mobile application ("App"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, please do not use the App.
        </Text>

        <Text style={styles.sectionTitle}>2. Description of Service</Text>
        <Text style={styles.paragraph}>
          Audion is an AI-powered audio news platform that converts RSS feed articles into conversational podcast-style audio content. Our service includes:
        </Text>
        <Text style={styles.bulletPoint}>• RSS feed management and article aggregation</Text>
        <Text style={styles.bulletPoint}>• AI-generated audio summaries using OpenAI technology</Text>
        <Text style={styles.bulletPoint}>• Personal audio library and playlist management</Text>
        <Text style={styles.bulletPoint}>• Automatic content recommendations</Text>

        <Text style={styles.sectionTitle}>3. User Accounts</Text>
        <Text style={styles.paragraph}>
          To use Audion, you must create an account and provide accurate information. You are responsible for:
        </Text>
        <Text style={styles.bulletPoint}>• Maintaining the confidentiality of your account credentials</Text>
        <Text style={styles.bulletPoint}>• All activities that occur under your account</Text>
        <Text style={styles.bulletPoint}>• Notifying us immediately of any unauthorized account access</Text>

        <Text style={styles.sectionTitle}>4. AI-Generated Content</Text>
        <Text style={styles.paragraph}>
          Audion uses artificial intelligence to create audio summaries of news articles. Please note:
        </Text>
        <Text style={styles.bulletPoint}>• AI-generated content may contain inaccuracies or omissions</Text>
        <Text style={styles.bulletPoint}>• We strive for accuracy but do not guarantee the completeness of AI summaries</Text>
        <Text style={styles.bulletPoint}>• Original source articles are always provided for verification</Text>
        <Text style={styles.bulletPoint}>• Users should verify important information from original sources</Text>

        <Text style={styles.sectionTitle}>5. Content and Copyright</Text>
        <Text style={styles.paragraph}>
          Audion respects intellectual property rights:
        </Text>
        <Text style={styles.bulletPoint}>• We create transformative summaries under fair use principles</Text>
        <Text style={styles.bulletPoint}>• Original articles remain property of their respective publishers</Text>
        <Text style={styles.bulletPoint}>• Users may not redistribute or commercially use generated audio content</Text>
        <Text style={styles.bulletPoint}>• We respond promptly to valid copyright concerns</Text>

        <Text style={styles.sectionTitle}>6. Usage Limits and Fair Use</Text>
        <Text style={styles.paragraph}>
          To ensure quality service for all users:
        </Text>
        <Text style={styles.bulletPoint}>• Free accounts have daily audio generation limits</Text>
        <Text style={styles.bulletPoint}>• Excessive or automated usage may result in account suspension</Text>
        <Text style={styles.bulletPoint}>• Premium subscriptions offer increased usage limits</Text>

        <Text style={styles.sectionTitle}>7. Privacy and Data</Text>
        <Text style={styles.paragraph}>
          Your privacy is important to us. Please review our Privacy Policy for detailed information about how we collect, use, and protect your data.
        </Text>

        <Text style={styles.sectionTitle}>8. Prohibited Conduct</Text>
        <Text style={styles.paragraph}>
          You may not use Audion to:
        </Text>
        <Text style={styles.bulletPoint}>• Violate any applicable laws or regulations</Text>
        <Text style={styles.bulletPoint}>• Infringe on intellectual property rights</Text>
        <Text style={styles.bulletPoint}>• Distribute malicious software or content</Text>
        <Text style={styles.bulletPoint}>• Attempt to reverse engineer or compromise the App</Text>
        <Text style={styles.bulletPoint}>• Use the service for illegal or harmful purposes</Text>

        <Text style={styles.sectionTitle}>9. Service Availability</Text>
        <Text style={styles.paragraph}>
          We strive to maintain continuous service availability but cannot guarantee:
        </Text>
        <Text style={styles.bulletPoint}>• Uninterrupted access to the App or services</Text>
        <Text style={styles.bulletPoint}>• Error-free operation at all times</Text>
        <Text style={styles.bulletPoint}>• Continued availability of specific features</Text>

        <Text style={styles.sectionTitle}>10. Disclaimers</Text>
        <Text style={styles.paragraph}>
          AUDION IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
        </Text>

        <Text style={styles.sectionTitle}>11. Limitation of Liability</Text>
        <Text style={styles.paragraph}>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF AUDION.
        </Text>

        <Text style={styles.sectionTitle}>12. Changes to Terms</Text>
        <Text style={styles.paragraph}>
          We may update these Terms periodically. Significant changes will be communicated through the App. Continued use after changes constitutes acceptance of the new Terms.
        </Text>

        <Text style={styles.sectionTitle}>13. Termination</Text>
        <Text style={styles.paragraph}>
          We may terminate or suspend your account immediately if you violate these Terms. You may delete your account at any time through the App settings.
        </Text>

        <Text style={styles.sectionTitle}>14. Governing Law</Text>
        <Text style={styles.paragraph}>
          These Terms are governed by the laws of Japan. Any disputes will be resolved through binding arbitration.
        </Text>

        <Text style={styles.sectionTitle}>15. Contact Information</Text>
        <Text style={styles.paragraph}>
          For questions about these Terms, please contact us at:
        </Text>
        <Text style={styles.bulletPoint}>• Email: legal@audion.app</Text>
        <Text style={styles.bulletPoint}>• Support: support@audion.app</Text>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By using Audion, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  lastUpdated: {
    fontSize: 14,
    color: theme.textSecondary,
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 30,
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
    marginTop: 30,
    marginBottom: 15,
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 24,
    color: theme.text,
    marginBottom: 15,
  },
  bulletPoint: {
    fontSize: 16,
    lineHeight: 24,
    color: theme.text,
    marginBottom: 8,
    marginLeft: 10,
  },
  footer: {
    backgroundColor: theme.card,
    borderRadius: 12,
    padding: 20,
    margin: 20,
    marginBottom: 40,
  },
  footerText: {
    fontSize: 14,
    lineHeight: 20,
    color: theme.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});