import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Modal } from 'react-native';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useAudio } from '../../context/AudioContext';
import { useFocusEffect } from '@react-navigation/native';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';

interface AudioItem {
  id: string;
  title: string;
  audio_url: string;
  duration: number; // in seconds
  created_at: string;
  script?: string; // Added script field
}

export default function LibraryScreen() {
  const { token } = useAuth();
  const { playAudio } = useAudio();
  const [audioItems, setAudioItems] = useState<AudioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedAudioIds, setSelectedAudioIds] = useState<string[]>([]);
  const [scriptModalVisible, setScriptModalVisible] = useState(false);
  const [currentScript, setCurrentScript] = useState('');

  const API = process.env.EXPO_PUBLIC_BACKEND_URL ? `${process.env.EXPO_PUBLIC_BACKEND_URL}/api` : 'http://localhost:8000/api';

  useFocusEffect(
    React.useCallback(() => {
      if (token) {
        fetchAudioLibrary();
      }
      return () => {
        // Reset editing state when leaving screen
        setIsEditing(false);
        setSelectedAudioIds([]);
      };
    }, [token])
  );

  const fetchAudioLibrary = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/audio/library`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAudioItems(response.data);
    } catch (error: any) {
      console.error('Error fetching audio library:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to fetch audio library.');
    } finally {
      setLoading(false);
    }
  };

  const handlePlayAudio = (audioItem: AudioItem) => {
    playAudio(audioItem);
  };

  const toggleAudioSelection = (audioId: string) => {
    setSelectedAudioIds((prevSelected) =>
      prevSelected.includes(audioId)
        ? prevSelected.filter((id) => id !== audioId)
        : [...prevSelected, audioId]
    );
  };

  const handleDeleteSelected = async () => {
    if (selectedAudioIds.length === 0) {
      Alert.alert('No items selected', 'Please select audio items to delete.');
      return;
    }

    // Temporarily bypass Alert.alert for debugging
    try {
      // Note: Audio stopping is now handled by AudioContext

      console.log('Attempting to delete audio items:', selectedAudioIds); // Added log
      await Promise.all(
        selectedAudioIds.map((id) =>
          axios.delete(`${API}/audio/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
        )
      );
      Alert.alert('Success', 'Selected audio items deleted.');
      setSelectedAudioIds([]);
      fetchAudioLibrary(); // Re-fetch the list after deletion
    } catch (error: any) {
      console.error('Error deleting audio items:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to delete audio items.');
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  const handleViewScript = (scriptContent: string | undefined, audioUrl: string) => {
    setCurrentScript(scriptContent || 'No script available.');
    setScriptModalVisible(true);
    console.log('Viewing script for audio URL:', audioUrl); // Added log
  };


  const closeScriptModal = () => {
    setScriptModalVisible(false);
    setCurrentScript('');
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
      <View style={styles.header}>
        <Text style={styles.title}>Library</Text>
        <TouchableOpacity onPress={() => {
          setIsEditing(!isEditing);
          setSelectedAudioIds([]); // Clear selection when toggling mode
        }}>
          <Text style={styles.editButtonText}>{isEditing ? 'Done' : 'Edit'}</Text>
        </TouchableOpacity>
      </View>

      {isEditing && selectedAudioIds.length > 0 && (
        <TouchableOpacity
          style={styles.deleteSelectedButton}
          onPress={handleDeleteSelected}
        >
          <Text style={styles.deleteSelectedButtonText}>Delete Selected ({selectedAudioIds.length})</Text>
        </TouchableOpacity>
      )}

      <ScrollView style={styles.audioListContainer}>
        {audioItems.length === 0 ? (
          <Text style={styles.noAudioText}>No audio items in your library yet.</Text>
        ) : (
          audioItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.audioCard}
              onPress={() => isEditing ? toggleAudioSelection(item.id) : null}
            >
              <View style={styles.audioInfo}>
                <Text style={styles.audioTitle}>{item.title}</Text>
                <Text style={styles.audioDetails}>
                  {format(new Date(item.created_at), 'MMM dd, yyyy')} · {formatDuration(item.duration)}
                </Text>
                {!isEditing && item.script && (
                  <TouchableOpacity onPress={() => handleViewScript(item.script, item.audio_url)} style={styles.viewScriptButton}>
                    <Text style={styles.viewScriptButtonText}>View Script</Text>
                  </TouchableOpacity>
                )}
              </View>
              {isEditing ? (
                <Ionicons
                  name={selectedAudioIds.includes(item.id) ? 'checkmark-circle' : 'ellipse-outline'}
                  size={28}
                  color={selectedAudioIds.includes(item.id) ? '#4f46e5' : '#6b7280'}
                />
              ) : (
                <TouchableOpacity onPress={() => handlePlayAudio(item)} style={styles.playPauseButton}>
                  <Text style={styles.playPauseButtonText}>Play</Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <Modal
        animationType="slide"
        transparent={false}
        visible={scriptModalVisible}
        onRequestClose={closeScriptModal}
      >
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Audio Script</Text>
          <Text style={styles.modalUrl}>URL: {currentScript.includes('No script available') ? 'N/A' : audioItems.find(item => item.script === currentScript)?.audio_url || 'Loading...'}</Text>
          <ScrollView style={styles.scriptScrollView}>
            <Text style={styles.scriptText}>{currentScript}</Text>
          </ScrollView>
          <TouchableOpacity onPress={closeScriptModal} style={styles.closeModalButton}>
            <Text style={styles.closeModalButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
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
  audioListContainer: {
    flex: 1,
    paddingHorizontal: 15,
  },
  noAudioText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#6b7280',
  },
  audioCard: {
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
  audioInfo: {
    flex: 1,
    marginRight: 10,
  },
  audioTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  audioDetails: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 5,
  },
  playPauseButton: {
    backgroundColor: '#4f46e5',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
  },
  playPauseButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  editButtonText: {
    color: '#4f46e5',
    fontSize: 16,
    fontWeight: 'bold',
  },
  deleteSelectedButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 12,
    marginHorizontal: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  deleteSelectedButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  viewScriptButton: {
    backgroundColor: '#e0e7ff',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 5,
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  viewScriptButtonText: {
    color: '#4f46e5',
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#f0f4f8',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
    color: '#1f2937',
  },
  modalUrl: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 15,
    textAlign: 'center',
  },
  scriptScrollView: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
  },
  scriptText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#4b5563',
  },
  closeModalButton: {
    backgroundColor: '#4f46e5',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeModalButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});