import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');

interface PresetCategory {
  id: string;
  name: string;
  display_name: string;
  description: string;
  icon: string;
  color: string;
  rss_sources: Array<{ name: string; url: string }>;
}

export default function OnboardScreen() {
  const router = useRouter();
  const { token, setIsNewUser } = useAuth();
  
  const [categories, setCategories] = useState<PresetCategory[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [settingUp, setSettingUp] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const API = process.env.EXPO_PUBLIC_BACKEND_URL ? `${process.env.EXPO_PUBLIC_BACKEND_URL}/api` : 'http://localhost:8003/api';

  useEffect(() => {
    fetchPresetCategories();
  }, []);

  const fetchPresetCategories = async () => {
    try {
      const response = await axios.get(`${API}/onboard/categories`);
      setCategories(response.data);
    } catch (error: any) {
      console.error('Error fetching preset categories:', error);
      Alert.alert('Error', 'Failed to load categories. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (categoryName: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryName)
        ? prev.filter(name => name !== categoryName)
        : [...prev, categoryName]
    );
  };

  const handleSetupComplete = async () => {
    if (selectedCategories.length === 0) {
      Alert.alert('Selection Required', 'Please select at least one interest category.');
      return;
    }

    if (!acceptedTerms) {
      Alert.alert('Terms Required', 'Please accept the Terms of Service and Privacy Policy to continue.');
      return;
    }

    setSettingUp(true);
    try {
      const response = await axios.post(`${API}/onboard/setup`, {
        selected_categories: selectedCategories,
        user_preferences: {}
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Mark user as no longer new
      setIsNewUser(false);
      
      Alert.alert(
        'Welcome to Audion!', 
        `Setup complete! We've added ${response.data.added_sources.length} news sources for you.`,
        [
          {
            text: 'Get Started',
            onPress: () => router.replace('/(tabs)/')
          }
        ]
      );
    } catch (error: any) {
      console.error('Error setting up account:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Setup failed. Please try again.');
    } finally {
      setSettingUp(false);
    }
  };

  const getIconName = (iconName: string): any => {
    const iconMap: { [key: string]: any } = {
      'laptop-outline': 'laptop-outline',
      'trending-up-outline': 'trending-up-outline',
      'earth-outline': 'earth-outline',
      'flask-outline': 'flask-outline',
      'film-outline': 'film-outline',
    };
    return iconMap[iconName] || 'circle-outline';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text style={styles.loadingText}>Loading categories...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Welcome to Audion</Text>
          <Text style={styles.subtitle}>
            Choose your interests to get personalized audio news
          </Text>
        </View>

        {/* Categories Grid */}
        <View style={styles.categoriesContainer}>
          {categories.map((category) => {
            const isSelected = selectedCategories.includes(category.name);
            return (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryCard,
                  isSelected && { ...styles.categoryCardSelected, borderColor: category.color }
                ]}
                onPress={() => toggleCategory(category.name)}
                activeOpacity={0.8}
              >
                <View style={[styles.categoryIcon, { backgroundColor: category.color + '20' }]}>
                  <Ionicons 
                    name={getIconName(category.icon)} 
                    size={32} 
                    color={category.color} 
                  />
                </View>
                
                <Text style={styles.categoryName}>{category.display_name}</Text>
                <Text style={styles.categoryDescription}>{category.description}</Text>
                
                <View style={styles.sourcesInfo}>
                  <Text style={styles.sourcesCount}>
                    {category.rss_sources.length} sources
                  </Text>
                </View>

                {/* Selection Indicator */}
                {isSelected && (
                  <View style={[styles.selectionIndicator, { backgroundColor: category.color }]}>
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Selection Summary */}
        {selectedCategories.length > 0 && (
          <View style={styles.summaryContainer}>
            <Text style={styles.summaryText}>
              Selected {selectedCategories.length} categor{selectedCategories.length === 1 ? 'y' : 'ies'}
            </Text>
          </View>
        )}

        {/* Terms Acceptance Section */}
        <View style={styles.termsContainer}>
          <TouchableOpacity 
            style={styles.checkboxContainer}
            onPress={() => setAcceptedTerms(!acceptedTerms)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]}>
              {acceptedTerms && (
                <Ionicons name="checkmark" size={16} color="#fff" />
              )}
            </View>
            <View style={styles.termsTextContainer}>
              <Text style={styles.termsText}>I accept the </Text>
              <TouchableOpacity onPress={() => router.push('/terms-of-service')}>
                <Text style={styles.termsLink}>Terms of Service</Text>
              </TouchableOpacity>
              <Text style={styles.termsText}> and </Text>
              <TouchableOpacity onPress={() => router.push('/privacy-policy')}>
                <Text style={styles.termsLink}>Privacy Policy</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Continue Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            (selectedCategories.length === 0 || !acceptedTerms) && styles.continueButtonDisabled
          ]}
          onPress={handleSetupComplete}
          disabled={selectedCategories.length === 0 || !acceptedTerms || settingUp}
        >
          {settingUp ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.continueButtonText}>Continue</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  categoriesContainer: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryCard: {
    width: (width - 48) / 2,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  categoryCardSelected: {
    borderWidth: 2,
    shadowOpacity: 0.15,
  },
  categoryIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  categoryName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  categoryDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 12,
  },
  sourcesInfo: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sourcesCount: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
  },
  selectionIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryContainer: {
    marginHorizontal: 24,
    marginTop: 24,
    padding: 16,
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    alignItems: 'center',
  },
  summaryText: {
    fontSize: 16,
    color: '#3b82f6',
    fontWeight: '600',
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
    paddingVertical: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  continueButton: {
    backgroundColor: '#4f46e5',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  continueButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  continueButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  termsContainer: {
    marginHorizontal: 24,
    marginTop: 32,
    marginBottom: 16,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#4f46e5',
    borderColor: '#4f46e5',
  },
  termsTextContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  termsText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  termsLink: {
    fontSize: 14,
    color: '#4f46e5',
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
});