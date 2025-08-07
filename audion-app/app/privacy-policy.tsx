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

export default function PrivacyPolicyScreen() {
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
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.lastUpdated}>Last updated: August 5, 2025</Text>
        
        <Text style={styles.sectionTitle}>1. Information We Collect</Text>
        
        <Text style={styles.subsectionTitle}>Account Information</Text>
        <Text style={styles.paragraph}>
          When you create an Audion account, we collect:
        </Text>
        <Text style={styles.bulletPoint}>• Email address (for account identification and login)</Text>
        <Text style={styles.bulletPoint}>• Encrypted password (we never store plain text passwords)</Text>
        <Text style={styles.bulletPoint}>• Profile information you choose to provide</Text>

        <Text style={styles.subsectionTitle}>Usage Information</Text>
        <Text style={styles.paragraph}>
          To improve our service, we collect:
        </Text>
        <Text style={styles.bulletPoint}>• RSS sources you add and manage</Text>
        <Text style={styles.bulletPoint}>• Articles you select for audio generation</Text>
        <Text style={styles.bulletPoint}>• Audio listening history and preferences</Text>
        <Text style={styles.bulletPoint}>• App usage patterns and feature interactions</Text>
        <Text style={styles.bulletPoint}>• Technical information (device type, OS version, app version)</Text>

        <Text style={styles.subsectionTitle}>Generated Content</Text>
        <Text style={styles.paragraph}>
          We store audio content and scripts you generate to:
        </Text>
        <Text style={styles.bulletPoint}>• Provide your personal audio library</Text>
        <Text style={styles.bulletPoint}>• Enable playback across devices</Text>
        <Text style={styles.bulletPoint}>• Support playlist and organization features</Text>

        <Text style={styles.sectionTitle}>2. How We Use Your Information</Text>
        
        <Text style={styles.subsectionTitle}>Service Provision</Text>
        <Text style={styles.bulletPoint}>• Creating and managing your account</Text>
        <Text style={styles.bulletPoint}>• Processing RSS feeds and generating audio content</Text>
        <Text style={styles.bulletPoint}>• Providing personalized content recommendations</Text>
        <Text style={styles.bulletPoint}>• Syncing your data across devices</Text>

        <Text style={styles.subsectionTitle}>Service Improvement</Text>
        <Text style={styles.bulletPoint}>• Analyzing usage patterns to improve features</Text>
        <Text style={styles.bulletPoint}>• Optimizing AI content generation quality</Text>
        <Text style={styles.bulletPoint}>• Developing new features based on user behavior</Text>
        <Text style={styles.bulletPoint}>• Troubleshooting technical issues</Text>

        <Text style={styles.subsectionTitle}>Communication</Text>
        <Text style={styles.bulletPoint}>• Sending important service updates</Text>
        <Text style={styles.bulletPoint}>• Responding to your support requests</Text>
        <Text style={styles.bulletPoint}>• Providing security and account notifications</Text>

        <Text style={styles.sectionTitle}>3. Third-Party Services</Text>
        
        <Text style={styles.subsectionTitle}>OpenAI Integration</Text>
        <Text style={styles.paragraph}>
          We use OpenAI's services to generate audio summaries:
        </Text>
        <Text style={styles.bulletPoint}>• Article content is sent to OpenAI for processing</Text>
        <Text style={styles.bulletPoint}>• Personal information is not included in these requests</Text>
        <Text style={styles.bulletPoint}>• Generated content is subject to OpenAI's usage policies</Text>
        <Text style={styles.bulletPoint}>• OpenAI may retain data according to their privacy policy</Text>

        <Text style={styles.subsectionTitle}>Cloud Storage</Text>
        <Text style={styles.paragraph}>
          Audio files are stored using secure cloud infrastructure:
        </Text>
        <Text style={styles.bulletPoint}>• Files are encrypted in transit and at rest</Text>
        <Text style={styles.bulletPoint}>• Access is restricted to authorized systems only</Text>
        <Text style={styles.bulletPoint}>• Regular security audits and monitoring</Text>

        <Text style={styles.sectionTitle}>4. Data Sharing</Text>
        <Text style={styles.paragraph}>
          We do not sell, trade, or rent your personal information. We may share information only in these limited circumstances:
        </Text>
        <Text style={styles.bulletPoint}>• With third-party services necessary for app functionality (OpenAI, cloud storage)</Text>
        <Text style={styles.bulletPoint}>• When required by law or to protect legal rights</Text>
        <Text style={styles.bulletPoint}>• In connection with a business transfer or merger (with user notification)</Text>
        <Text style={styles.bulletPoint}>• With your explicit consent for specific purposes</Text>

        <Text style={styles.sectionTitle}>5. Data Security</Text>
        <Text style={styles.paragraph}>
          We implement comprehensive security measures:
        </Text>
        <Text style={styles.bulletPoint}>• End-to-end encryption for data transmission</Text>
        <Text style={styles.bulletPoint}>• Encrypted storage of sensitive information</Text>
        <Text style={styles.bulletPoint}>• Regular security assessments and updates</Text>
        <Text style={styles.bulletPoint}>• Limited employee access on a need-to-know basis</Text>
        <Text style={styles.bulletPoint}>• Secure authentication and session management</Text>

        <Text style={styles.sectionTitle}>6. Data Retention</Text>
        <Text style={styles.paragraph}>
          We retain your information for different periods based on type:
        </Text>
        <Text style={styles.bulletPoint}>• Account information: Until you delete your account</Text>
        <Text style={styles.bulletPoint}>• Audio content: Until you delete individual items or your account</Text>
        <Text style={styles.bulletPoint}>• Usage analytics: Anonymized after 12 months</Text>
        <Text style={styles.bulletPoint}>• Support communications: 2 years for service quality</Text>

        <Text style={styles.sectionTitle}>7. Your Privacy Rights</Text>
        
        <Text style={styles.subsectionTitle}>Access and Control</Text>
        <Text style={styles.bulletPoint}>• View and update your profile information</Text>
        <Text style={styles.bulletPoint}>• Export your data in a portable format</Text>
        <Text style={styles.bulletPoint}>• Delete individual content items or your entire account</Text>
        <Text style={styles.bulletPoint}>• Opt out of non-essential communications</Text>

        <Text style={styles.subsectionTitle}>Regional Rights</Text>
        <Text style={styles.paragraph}>
          Depending on your location, you may have additional rights:
        </Text>
        <Text style={styles.bulletPoint}>• Right to data portability (GDPR, CCPA)</Text>
        <Text style={styles.bulletPoint}>• Right to rectification and erasure</Text>
        <Text style={styles.bulletPoint}>• Right to restrict or object to processing</Text>
        <Text style={styles.bulletPoint}>• Right to lodge complaints with supervisory authorities</Text>

        <Text style={styles.sectionTitle}>8. Children's Privacy</Text>
        <Text style={styles.paragraph}>
          Audion is not designed for children under 13. We do not knowingly collect personal information from children under 13. If we learn that we have collected such information, we will delete it promptly.
        </Text>

        <Text style={styles.sectionTitle}>9. International Data Transfers</Text>
        <Text style={styles.paragraph}>
          Your information may be processed in countries other than your own. We ensure adequate protection through:
        </Text>
        <Text style={styles.bulletPoint}>• Compliance with international data protection frameworks</Text>
        <Text style={styles.bulletPoint}>• Contractual safeguards with service providers</Text>
        <Text style={styles.bulletPoint}>• Regular monitoring of data handling practices</Text>

        <Text style={styles.sectionTitle}>10. Changes to This Policy</Text>
        <Text style={styles.paragraph}>
          We may update this Privacy Policy periodically. Significant changes will be communicated through:
        </Text>
        <Text style={styles.bulletPoint}>• In-app notifications</Text>
        <Text style={styles.bulletPoint}>• Email notifications to registered users</Text>
        <Text style={styles.bulletPoint}>• Prominent notices on our website</Text>

        <Text style={styles.sectionTitle}>11. Contact Us</Text>
        <Text style={styles.paragraph}>
          For privacy-related questions or requests, contact us at:
        </Text>
        <Text style={styles.bulletPoint}>• Email: privacy@audion.app</Text>
        <Text style={styles.bulletPoint}>• Data Protection Officer: dpo@audion.app</Text>
        <Text style={styles.bulletPoint}>• Support: support@audion.app</Text>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            This Privacy Policy explains how Audion collects, uses, and protects your information. By using our service, you consent to the practices described in this policy.
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
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.text,
    marginTop: 20,
    marginBottom: 10,
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