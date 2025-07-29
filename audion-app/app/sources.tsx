import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, Modal, ActivityIndicator, SafeAreaView, Switch, Platform } from 'react-native';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface RSSSource {
  id: string;
  name: string;
  url: string;
  created_at: string;
  is_active?: boolean;
}

export default function SourcesScreen() {
  const { token } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [sources, setSources] = useState<RSSSource[]>([]);
  const [switchStates, setSwitchStates] = useState<{[key: string]: boolean}>({});
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceUrl, setNewSourceUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const API = process.env.EXPO_PUBLIC_BACKEND_URL ? `${process.env.EXPO_PUBLIC_BACKEND_URL}/api` : 'http://localhost:8000/api';

  useFocusEffect(
    React.useCallback(() => {
      if (token) {
        fetchSources();
      }
    }, [token])
  );

  // Debug: Track state changes
  useEffect(() => {
    console.log('State change - isEditMode:', isEditMode, 'selectedSources:', selectedSources);
  }, [isEditMode, selectedSources]);

  const fetchSources = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/rss-sources`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      // Process sources with proper is_active handling
      const sourcesWithStatus = response.data.map((source: RSSSource) => ({
        ...source,
        is_active: source.is_active ?? true
      }));
      
      // Load saved states from storage
      const savedStates = await loadSourceStatesFromStorage();
      
      // Initialize switch states (prioritize saved states over API data)
      const initialSwitchStates: {[key: string]: boolean} = {};
      sourcesWithStatus.forEach(source => {
        if (savedStates[source.id] !== undefined) {
          // Use saved state if exists
          initialSwitchStates[source.id] = savedStates[source.id];
        } else {
          // Fall back to API data or default true
          initialSwitchStates[source.id] = source.is_active ?? true;
        }
      });
      
      setSources(sourcesWithStatus);
      setSwitchStates(initialSwitchStates);
    } catch (error: any) {
      console.error('Error fetching RSS sources:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to fetch RSS sources.');
    } finally {
      setLoading(false);
    }
  };

  // Filter sources based on search query
  const filteredSources = sources.filter(source => 
    source.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    source.url.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddSource = async () => {
    if (!newSourceName.trim() || !newSourceUrl.trim()) {
      Alert.alert('Validation Error', 'Please provide both name and URL.');
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${API}/rss-sources`, {
        name: newSourceName.trim(),
        url: newSourceUrl.trim(),
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      Alert.alert('Success', 'RSS source added successfully!');
      setNewSourceName('');
      setNewSourceUrl('');
      setModalVisible(false);
      fetchSources(); // Refresh the list
    } catch (error: any) {
      console.error('Error adding RSS source:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to add RSS source.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleSource = async (sourceId: string) => {
    const currentStatus = switchStates[sourceId] ?? true;
    const newStatus = !currentStatus;
    const sourceName = sources.find(s => s.id === sourceId)?.name || 'Unknown Source';
    
    // Update switch state immediately for instant UI feedback
    setSwitchStates(prevStates => ({
      ...prevStates,
      [sourceId]: newStatus
    }));
    
    // Update source status immediately without any confirmation
    updateSourceStatus(sourceId, newStatus, sourceName);
  };

  const saveSourceStatesToStorage = async (states: {[key: string]: boolean}) => {
    try {
      if (AsyncStorage) {
        await AsyncStorage.setItem('rss_source_states', JSON.stringify(states));
      }
    } catch (error) {
      // Silent failure
    }
  };

  const loadSourceStatesFromStorage = async (): Promise<{[key: string]: boolean}> => {
    try {
      if (AsyncStorage) {
        const savedStates = await AsyncStorage.getItem('rss_source_states');
        if (savedStates) {
          return JSON.parse(savedStates);
        }
      }
    } catch (error) {
      // Silent failure
    }
    return {};
  };

  const updateSourceStatus = async (sourceId: string, newStatus: boolean, sourceName: string) => {
    // Update sources data 
    setSources(prevSources => 
      prevSources.map(source => 
        source.id === sourceId 
          ? { ...source, is_active: newStatus }
          : source
      )
    );
    
    // Update switch state and save to storage
    const newSwitchStates = { ...switchStates, [sourceId]: newStatus };
    setSwitchStates(newSwitchStates);
    await saveSourceStatesToStorage(newSwitchStates);
    
    // Try to sync with backend silently
    try {
      await axios.patch(`${API}/rss-sources/${sourceId}`, {
        is_active: newStatus
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (error: any) {
      // Silent failure - continue with local storage
    }
  };

  const handleEditMode = () => {
    console.log('handleEditMode called, current isEditMode:', isEditMode);
    setIsEditMode(!isEditMode);
    setSelectedSources([]); // Clear selections when toggling edit mode
    console.log('Edit mode toggled to:', !isEditMode);
  };

  const handleSourceSelection = (sourceId: string) => {
    console.log('handleSourceSelection called with sourceId:', sourceId);
    setSelectedSources(prevSelected => {
      const newSelected = prevSelected.includes(sourceId)
        ? prevSelected.filter(id => id !== sourceId)
        : [...prevSelected, sourceId];
      console.log('Updated selectedSources:', newSelected);
      return newSelected;
    });
  };

  const handleBulkDelete = () => {
    console.log('handleBulkDelete called, selectedSources:', selectedSources);
    
    if (selectedSources.length === 0) {
      Alert.alert('No Selection', 'Please select sources to delete.');
      return;
    }

    const selectedSourceNames = sources
      .filter(source => selectedSources.includes(source.id))
      .map(source => source.name);

    console.log('Selected source names:', selectedSourceNames);
    console.log('About to show Alert.alert');

    try {
      Alert.alert(
        'Delete RSS Sources',
        `Are you sure you want to delete the following ${selectedSources.length} source(s)?\n\n• ${selectedSourceNames.join('\n• ')}\n\nThis action cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              console.log('Delete confirmed, calling confirmBulkDelete');
              confirmBulkDelete();
            }
          }
        ]
      );
      console.log('Alert.alert called successfully');
    } catch (error) {
      console.error('Error showing Alert:', error);
      // Fallback:直接削除実行（開発用）
      if (confirm(`Are you sure you want to delete ${selectedSources.length} source(s): ${selectedSourceNames.join(', ')}?`)) {
        confirmBulkDelete();
      }
    }
  };

  const confirmBulkDelete = async () => {
    console.log('confirmBulkDelete called');
    setDeleting(true);
    
    try {
      // Delete from backend
      const deletePromises = selectedSources.map(sourceId =>
        axios.delete(`${API}/rss-sources/${sourceId}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      );
      
      console.log('Starting backend deletion for sources:', selectedSources);
      await Promise.all(deletePromises);
      console.log('Backend deletion completed successfully');
      
      // Update local state
      setSources(prevSources => 
        prevSources.filter(source => !selectedSources.includes(source.id))
      );
      console.log('Local sources state updated');
      
      // Clean up switch states
      const newSwitchStates = { ...switchStates };
      selectedSources.forEach(sourceId => {
        delete newSwitchStates[sourceId];
      });
      setSwitchStates(newSwitchStates);
      await saveSourceStatesToStorage(newSwitchStates);
      console.log('Switch states cleaned up');
      
      // Reset UI state
      setSelectedSources([]);
      setIsEditMode(false);
      console.log('UI state reset to normal mode');
      
      try {
        Alert.alert('Success', `${selectedSources.length} source(s) deleted successfully.`);
      } catch (alertError) {
        console.log('Success: Sources deleted successfully');
      }
      
    } catch (error: any) {
      console.error('Error deleting sources:', error);
      try {
        Alert.alert('Error', 'Failed to delete some sources. Please try again.');
      } catch (alertError) {
        console.error('Failed to delete sources. Please try again.');
      }
    } finally {
      setDeleting(false);
      console.log('confirmBulkDelete completed, deleting state reset');
    }
  };


  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text style={styles.loadingText}>Loading sources...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.push('/(tabs)/feed')}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>RSS Sources</Text>
        <View style={styles.headerActions}>
          {sources.length > 0 && (
            <TouchableOpacity 
              onPress={handleEditMode}
              style={[styles.minusButton, { backgroundColor: isEditMode ? theme.primary : 'transparent' }]}
            >
              <Ionicons 
                name={isEditMode ? "checkmark" : "remove"} 
                size={24} 
                color={isEditMode ? '#ffffff' : theme.primary} 
              />
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            onPress={() => setModalVisible(true)}
            style={styles.addButton}
          >
            <Ionicons name="add" size={24} color={theme.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchInputContainer, { backgroundColor: theme.surface }]}>
          <Ionicons name="search" size={20} color={theme.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search sources..."
            placeholderTextColor={theme.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Sources List */}
      <ScrollView style={styles.scrollContainer}>
        {sources.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="radio-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyTitle}>No RSS Sources</Text>
            <Text style={styles.emptySubtitle}>
              Add your first news source to get started with personalized audio content
            </Text>
            <TouchableOpacity 
              style={styles.emptyButton}
              onPress={() => setModalVisible(true)}
            >
              <Text style={styles.emptyButtonText}>Add RSS Source</Text>
            </TouchableOpacity>
          </View>
        ) : filteredSources.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyTitle}>No Sources Found</Text>
            <Text style={styles.emptySubtitle}>
              No sources match your search query "{searchQuery}"
            </Text>
            <TouchableOpacity 
              style={styles.emptyButton}
              onPress={() => setSearchQuery('')}
            >
              <Text style={styles.emptyButtonText}>Clear Search</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.sourcesList}>
            {filteredSources.map((source) => (
              <TouchableOpacity 
                key={source.id} 
                style={[
                  styles.sourceCard, 
                  { backgroundColor: theme.surface },
                  isEditMode && selectedSources.includes(source.id) && styles.sourceCardSelected
                ]}
                onPress={isEditMode ? () => handleSourceSelection(source.id) : undefined}
                activeOpacity={isEditMode ? 0.7 : 1}
              >
                {/* Selection Checkbox - Only show in edit mode */}
                {isEditMode && (
                  <TouchableOpacity 
                    style={styles.checkboxContainer}
                    onPress={() => handleSourceSelection(source.id)}
                  >
                    <View style={[
                      styles.checkbox, 
                      { borderColor: theme.primary },
                      selectedSources.includes(source.id) && { backgroundColor: theme.primary }
                    ]}>
                      {selectedSources.includes(source.id) && (
                        <Ionicons name="checkmark" size={16} color="#ffffff" />
                      )}
                    </View>
                  </TouchableOpacity>
                )}

                <View style={[styles.sourceIcon, { backgroundColor: (switchStates[source.id] ?? true) ? theme.primary + '20' : theme.surface }]}>
                  <Ionicons 
                    name={(switchStates[source.id] ?? true) ? "radio" : "radio-outline"} 
                    size={20} 
                    color={(switchStates[source.id] ?? true) ? theme.primary : theme.textMuted} 
                  />
                </View>
                <View style={styles.sourceInfo}>
                  <Text style={[styles.sourceName, { color: theme.text }]}>{source.name}</Text>
                  <Text style={[styles.sourceUrl, { color: theme.textSecondary }]} numberOfLines={1}>
                    {source.url}
                  </Text>
                  <Text style={[styles.sourceDate, { color: theme.textMuted }]}>
                    Added {new Date(source.created_at).toLocaleDateString()}
                  </Text>
                  <Text style={[styles.sourceStatus, { color: (switchStates[source.id] ?? true) ? theme.success : theme.textMuted }]}>
                    {(switchStates[source.id] ?? true) ? 'Active' : 'Inactive'}
                  </Text>
                </View>

                {/* Show actions only when not in edit mode */}
                {!isEditMode && (
                  <View style={styles.sourceActions}>
                    <Switch
                      trackColor={{ false: '#d1d5db', true: theme.primary + '40' }}
                      thumbColor={(switchStates[source.id] ?? true) ? theme.primary : '#9ca3af'}
                      ios_backgroundColor='#d1d5db'
                      onValueChange={() => handleToggleSource(source.id)}
                      value={switchStates[source.id] ?? true}
                      style={styles.switch}
                    />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Floating Delete Button - Show when in edit mode and sources are selected */}
      {isEditMode && selectedSources.length > 0 && (
        <View style={styles.floatingDeleteContainer}>
          <TouchableOpacity
            style={[styles.floatingDeleteButton, { backgroundColor: theme.error || '#ef4444' }]}
            onPress={() => {
              console.log('Floating delete button pressed, selectedSources:', selectedSources);
              handleBulkDelete();
            }}
            disabled={deleting}
            activeOpacity={0.8}
          >
            {deleting ? (
              <ActivityIndicator color="#ffffff" size={20} />
            ) : (
              <>
                <Ionicons name="trash" size={20} color="#ffffff" />
                <Text style={styles.floatingDeleteButtonText}>
                  Delete ({selectedSources.length})
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Add Source Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add RSS Source</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Source Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., TechCrunch, BBC News"
                  value={newSourceName}
                  onChangeText={setNewSourceName}
                  maxLength={100}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>RSS URL</Text>
                <TextInput
                  style={styles.input}
                  placeholder="https://example.com/rss"
                  value={newSourceUrl}
                  onChangeText={setNewSourceUrl}
                  keyboardType="url"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (!newSourceName.trim() || !newSourceUrl.trim() || submitting) && styles.submitButtonDisabled
                ]}
                onPress={handleAddSource}
                disabled={!newSourceName.trim() || !newSourceUrl.trim() || submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Add Source</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  minusButton: {
    padding: 4,
    borderRadius: 4,
  },
  addButton: {
    padding: 4,
  },
  scrollContainer: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 24,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  emptyButton: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  sourcesList: {
    padding: 16,
  },
  sourceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sourceIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#f0f0ff',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sourceInfo: {
    flex: 1,
  },
  sourceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  sourceUrl: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  sourceDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  sourceStatus: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  sourceActions: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
  },
  switch: {
    transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalContent: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#f9fafb',
  },
  submitButton: {
    backgroundColor: '#4f46e5',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  submitButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  checkboxContainer: {
    padding: 8,
    marginRight: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  sourceCardSelected: {
    borderWidth: 2,
    borderColor: '#4f46e5',
  },
  floatingDeleteContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: 'transparent',
    zIndex: 1000,
  },
  floatingDeleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    minHeight: 50,
  },
  floatingDeleteButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    lineHeight: 20,
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
  },
});