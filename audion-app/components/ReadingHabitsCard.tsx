import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import PersonalizationService from '../services/PersonalizationService';
import NotificationService from '../services/NotificationService';

interface ReadingHabitsCardProps {
  onInsightAction?: (insight: any) => void;
}

export default function ReadingHabitsCard({ onInsightAction }: ReadingHabitsCardProps) {
  const { theme } = useTheme();
  const { token } = useAuth();
  const [insights, setInsights] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReadingHabits();
  }, []);

  const loadReadingHabits = async () => {
    try {
      const [habitsInsights, analyticsData] = await Promise.all([
        PersonalizationService.getReadingHabitInsights(),
        PersonalizationService.getAnalyticsData(),
      ]);
      
      setInsights(habitsInsights);
      setStats(analyticsData.stats);
    } catch (error) {
      console.error('Error loading reading habits:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInsightAction = async (insight: any) => {
    switch (insight.type) {
      case 'motivation':
        // Navigate to recommended articles or start reading
        if (onInsightAction) {
          onInsightAction(insight);
        }
        break;
        
      case 'achievement':
        // Show achievement celebration
        Alert.alert(
          '🎉 Congratulations!',
          insight.message,
          [{ text: 'Keep Going!', onPress: () => onInsightAction?.(insight) }]
        );
        break;
        
      case 'suggestion':
        // Offer to adjust goals or settings
        Alert.alert(
          '💡 Suggestion',
          `${insight.message}\n\n${insight.action}`,
          [
            { text: 'Maybe Later', style: 'cancel' },
            { text: 'Apply Suggestion', onPress: () => applySuggestion(insight) }
          ]
        );
        break;
        
      case 'pattern':
        // Offer to set notification reminder
        Alert.alert(
          '⏰ Set Reading Reminder',
          `${insight.message}\n\nWould you like us to remind you at your optimal reading time?`,
          [
            { text: 'No Thanks', style: 'cancel' },
            { text: 'Yes, Remind Me', onPress: () => setupPersonalizedReminder() }
          ]
        );
        break;
    }
  };

  const applySuggestion = async (insight: any) => {
    // This could navigate to settings or automatically apply changes
    if (insight.message.includes('smaller daily reading goal')) {
      // Could integrate with a settings service to adjust goals
      Alert.alert('Goal Adjusted', 'Your daily reading goal has been set to 10 minutes.');
    }
  };

  const setupPersonalizedReminder = async () => {
    try {
      const optimalTime = await PersonalizationService.getOptimalNotificationTime();
      if (optimalTime !== null) {
        await NotificationService.getInstance().schedulePersonalizedReadingReminder(optimalTime);
        Alert.alert('Reminder Set', 'We\'ll notify you at your optimal reading time!');
      }
    } catch (error) {
      Alert.alert('Error', 'Could not set up reminder. Please try again.');
    }
  };

  const sendStreakMotivation = async () => {
    if (stats?.currentStreak !== undefined) {
      await NotificationService.getInstance().sendStreakMotivationNotification(stats.currentStreak);
    }
  };

  const styles = createStyles(theme);

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading reading habits...</Text>
      </View>
    );
  }

  if (insights.length === 0 && !stats) {
    return null; // Don't show card if no data
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="analytics-outline" size={20} color={theme.primary} />
        <Text style={styles.title}>Reading Habits</Text>
      </View>

      {/* Stats Section */}
      {stats && (
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.currentStreak}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.consistency}%</Text>
            <Text style={styles.statLabel}>Consistency</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.readingSpeed}</Text>
            <Text style={styles.statLabel}>WPM</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.engagementScore}%</Text>
            <Text style={styles.statLabel}>Engagement</Text>
          </View>
        </View>
      )}

      {/* Insights Section */}
      {insights.map((insight, index) => (
        <TouchableOpacity
          key={index}
          style={styles.insightCard}
          onPress={() => handleInsightAction(insight)}
          activeOpacity={0.7}
        >
          <View style={styles.insightContent}>
            <View style={styles.insightIcon}>
              {insight.type === 'achievement' && (
                <Ionicons name="trophy-outline" size={16} color={theme.success} />
              )}
              {insight.type === 'motivation' && (
                <Ionicons name="flame-outline" size={16} color={theme.warning} />
              )}
              {insight.type === 'suggestion' && (
                <Ionicons name="bulb-outline" size={16} color={theme.info} />
              )}
              {insight.type === 'pattern' && (
                <Ionicons name="time-outline" size={16} color={theme.primary} />
              )}
            </View>
            <View style={styles.insightText}>
              <Text style={styles.insightMessage}>{insight.message}</Text>
              <Text style={styles.insightAction}>{insight.action}</Text>
            </View>
            <Ionicons name="chevron-forward-outline" size={16} color={theme.textMuted} />
          </View>
        </TouchableOpacity>
      ))}

      {/* Quick Actions */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={sendStreakMotivation}
        >
          <Ionicons name="notifications-outline" size={16} color={theme.primary} />
          <Text style={styles.actionText}>Motivate Me</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={loadReadingHabits}
        >
          <Ionicons name="refresh-outline" size={16} color={theme.primary} />
          <Text style={styles.actionText}>Refresh</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    backgroundColor: theme.card,
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text,
  },
  loadingText: {
    color: theme.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingVertical: 12,
    backgroundColor: theme.surface,
    borderRadius: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.text,
  },
  statLabel: {
    fontSize: 12,
    color: theme.textSecondary,
    marginTop: 2,
  },
  insightCard: {
    backgroundColor: theme.surface,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  insightContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  insightIcon: {
    width: 24,
    alignItems: 'center',
  },
  insightText: {
    flex: 1,
  },
  insightMessage: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.text,
    marginBottom: 2,
  },
  insightAction: {
    fontSize: 12,
    color: theme.textSecondary,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.surface,
    borderRadius: 6,
    padding: 8,
    gap: 6,
  },
  actionText: {
    fontSize: 12,
    color: theme.primary,
    fontWeight: '500',
  },
});