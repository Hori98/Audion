import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useFocusEffect } from '@react-navigation/native';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8000';
const API = `${BACKEND_URL}/api`;

interface RSSSource {
  id: string;
  name: string;
  url: string;
}

export default function SourcesScreen() {
  const { token } = useAuth();
  const [sources, setSources] = useState<RSSSource[]>([]);
  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceUrl, setNewSourceUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [addingSource, setAddingSource] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      if (token) {
        fetchSources();
      }
    }, [token])
  );

  const fetchSources = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/sources`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSources(response.data);
    } catch (error: any) {
      console.error('Error fetching sources:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to fetch sources.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSource = async () => {
    if (!newSourceName || !newSourceUrl) {
      Alert.alert('Error', 'Please enter both source name and URL.');
      return;
    }
    setAddingSource(true);
    try {
      const response = await axios.post(
        `${API}/sources`,
        { name: newSourceName, url: newSourceUrl },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSources([...sources, response.data]);
      setNewSourceName('');
      setNewSourceUrl('');
      Alert.alert('Success', 'Source added successfully!');
    } catch (error: any) {
      console.error('Error adding source:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to add source.');
    } finally {
      setAddingSource(false);
    }
  };

  const handleDeleteSource = async (sourceId: string) => {
    console.log('handleDeleteSource called for ID:', sourceId); // Added this line
    // Temporarily bypass Alert.alert for debugging
    try {
      console.log('Attempting DELETE request to:', `${API}/sources/${sourceId}`); // Added log
      console.log('Auth Token (first 10 chars):', token ? token.substring(0, 10) + '...' : 'No token'); // Added log for token
      await axios.delete(`${API}/sources/${sourceId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSources(sources.filter((source) => source.id !== sourceId));
      Alert.alert('Success', 'Source deleted successfully!'); // Still use Alert for success/error
    } catch (error: any) {
      console.error('Error deleting source:', error);
      // More detailed error logging
      if (error.response) {
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
        console.error('Error response headers:', error.response.headers);
      } else if (error.request) {
        console.error('Error request:', error.request);
      } else {
        console.error('Error message:', error.message);
      }
      Alert.alert('Error', error.response?.data?.detail || 'Failed to delete source.');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.sourcesListContainer}>
        {sources.length === 0 ? (
          <Text style={styles.noSourcesText}>No RSS sources added yet. Add one below!</Text>
        ) : (
          sources.map((source) => (
            <View key={source.id} style={styles.sourceCard}>
              <View style={styles.sourceInfo}>
                <Text style={styles.sourceName}>{source.name}</Text>
                <Text style={styles.sourceUrl}>{source.url}</Text>
              </View>
              <TouchableOpacity onPress={() => handleDeleteSource(source.id)} style={styles.deleteButton}>
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      <View style={styles.addSourceContainer}>
        <Text style={styles.addSourceTitle}>Add New RSS Source</Text>
        <TextInput
          style={styles.input}
          placeholder="Source Name (e.g., TechCrunch)"
          value={newSourceName}
          onChangeText={setNewSourceName}
        />
        <TextInput
          style={styles.input}
          placeholder="Source URL (e.g., https://techcrunch.com/feed/)"
          value={newSourceUrl}
          onChangeText={setNewSourceUrl}
          autoCapitalize="none"
          keyboardType="url"
        />
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddSource}
          disabled={addingSource}
        >
          {addingSource ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.addButtonText}>Add Source</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f4f8',
    paddingTop: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f4f8',
  },
  sourcesListContainer: {
    flex: 1,
    paddingHorizontal: 15,
  },
  noSourcesText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#6b7280',
  },
  sourceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sourceInfo: {
    flex: 1,
    marginRight: 10,
  },
  sourceName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  sourceUrl: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 5,
  },
  deleteButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
  },
  deleteButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  addSourceContainer: {
    backgroundColor: '#ffffff',
    padding: 15,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 5,
  },
  addSourceTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    color: '#1f2937',
  },
  input: {
    height: 45,
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 10,
    fontSize: 16,
    color: '#1f2937',
  },
  addButton: {
    backgroundColor: '#4f46e5',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});