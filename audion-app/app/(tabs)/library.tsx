import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Modal, TextInput } from 'react-native';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useAudio } from '../../context/AudioContext';
import { useTheme } from '../../context/ThemeContext';
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

interface Playlist {
  id: string;
  name: string;
  description: string;
  audio_ids: string[];
  created_at: string;
  updated_at: string;
  is_public: boolean;
}

interface Album {
  id: string;
  name: string;
  description: string;
  audio_ids: string[];
  created_at: string;
  updated_at: string;
  is_public: boolean;
  tags: string[];
}

interface DownloadItem {
  download_info: {
    id: string;
    downloaded_at: string;
    auto_downloaded: boolean;
  };
  audio_data: AudioItem;
}

export default function LibraryScreen() {
  const { token } = useAuth();
  const { playAudio, cleanupAudio, currentAudio, isPlaying, pauseAudio, resumeAudio, setShowFullScreenPlayer } = useAudio();
  const { theme } = useTheme();
  
  // Current view state
  const [currentView, setCurrentView] = useState<'playlists' | 'albums' | 'mylist'>('playlists');
  
  // Data states
  const [audioItems, setAudioItems] = useState<AudioItem[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [mylistAudioItems, setMylistAudioItems] = useState<AudioItem[]>([]);
  const [downloadedAudioIds, setDownloadedAudioIds] = useState<Set<string>>(new Set());
  
  // Mylist filter state
  const [showDownloadedOnly, setShowDownloadedOnly] = useState(false);
  
  // UI states
  const [loading, setLoading] = useState(true);
  const [isEditingMyList, setIsEditingMyList] = useState(false);
  const [selectedAudioIds, setSelectedAudioIds] = useState<string[]>([]);
  const [scriptModalVisible, setScriptModalVisible] = useState(false);
  const [currentScript, setCurrentScript] = useState('');
  
  // Create modals
  const [createPlaylistModalVisible, setCreatePlaylistModalVisible] = useState(false);
  const [createAlbumModalVisible, setCreateAlbumModalVisible] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistDescription, setNewPlaylistDescription] = useState('');
  const [newAlbumName, setNewAlbumName] = useState('');
  const [newAlbumDescription, setNewAlbumDescription] = useState('');

  const API = process.env.EXPO_PUBLIC_BACKEND_URL ? `${process.env.EXPO_PUBLIC_BACKEND_URL}/api` : 'http://localhost:8000/api';

  useFocusEffect(
    React.useCallback(() => {
      if (token) {
        fetchLibraryData();
      }
      return () => {
        // Reset editing state when leaving screen
        setIsEditingMyList(false);
        setSelectedAudioIds([]);
        setShowDownloadedOnly(false);
      };
    }, [token, currentView])
  );

  const fetchLibraryData = async () => {
    setLoading(true);
    try {
      switch (currentView) {
        case 'playlists':
          const playlistsResponse = await axios.get(`${API}/playlists`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setPlaylists(playlistsResponse.data);
          break;
        case 'albums':
          const albumsResponse = await axios.get(`${API}/albums`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setAlbums(albumsResponse.data);
          break;
        case 'mylist':
          // Fetch all audio items
          const audioResponse = await axios.get(`${API}/audio/library`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setMylistAudioItems(audioResponse.data);
          
          // Fetch downloads to identify downloaded items
          const downloadsResponse = await axios.get(`${API}/downloads`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setDownloads(downloadsResponse.data);
          
          // Create set of downloaded audio IDs for quick lookup
          const downloadedIds = new Set(downloadsResponse.data.map((item: DownloadItem) => item.audio_data.id));
          setDownloadedAudioIds(downloadedIds);
          break;
      }
    } catch (error: any) {
      console.error(`Error fetching ${currentView}:`, error);
      Alert.alert('Error', error.response?.data?.detail || `Failed to fetch ${currentView}.`);
    } finally {
      setLoading(false);
    }
  };

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
    // Check if the same audio is currently loaded
    if (currentAudio && currentAudio.id === audioItem.id) {
      // Same audio: toggle play/pause
      if (isPlaying) {
        pauseAudio();
      } else {
        resumeAudio();
      }
    } else {
      // Different audio or no audio loaded: play the new audio
      playAudio(audioItem);
    }
  };

  const toggleAudioSelection = (audioId: string) => {
    setSelectedAudioIds((prevSelected) =>
      prevSelected.includes(audioId)
        ? prevSelected.filter((id) => id !== audioId)
        : [...prevSelected, audioId]
    );
  };

  const handleDeleteSelectedFromMyList = async () => {
    console.log('handleDeleteSelectedFromMyList called');
    console.log('selectedAudioIds:', selectedAudioIds);
    console.log('showDownloadedOnly:', showDownloadedOnly);
    console.log('token:', token);
    console.log('API URL:', API);

    if (selectedAudioIds.length === 0) {
      Alert.alert('No items selected', 'Please select items to remove from My List.');
      return;
    }

    console.log('Starting deletion process - removing audio files completely from both tabs...');
    try {
      // Always delete audio files completely (removes from both All and Downloaded tabs)
      for (const id of selectedAudioIds) {
        console.log(`Deleting audio file completely for ID: ${id}`);
        try {
          const response = await axios.delete(`${API}/audio/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          console.log(`Successfully deleted audio file ${id}:`, response.data);
          
          // Cleanup audio player if this audio is currently playing
          cleanupAudio(id);
        } catch (deleteError: any) {
          console.error(`Error deleting audio file ${id}:`, deleteError);
          console.error('Delete error response:', deleteError.response?.data);
          throw deleteError;
        }
      }
      
      // Update downloaded audio IDs to reflect removal
      setDownloadedAudioIds(prev => {
        const newSet = new Set(prev);
        selectedAudioIds.forEach(id => newSet.delete(id));
        return newSet;
      });
      
      Alert.alert('Success', 'Audio files deleted from My List.');
      
      console.log('All deletions completed successfully');
      setSelectedAudioIds([]);
      setIsEditingMyList(false);
      fetchLibraryData(); // Re-fetch the list after deletion
    } catch (error: any) {
      console.error('Error removing items from My List:', error);
      console.error('Error response data:', error.response?.data);
      console.error('Error status:', error.response?.status);
      console.error('Error headers:', error.response?.headers);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to remove items from My List.');
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

  const createPlaylist = async () => {
    if (!newPlaylistName.trim()) {
      Alert.alert('Error', 'Please enter a playlist name');
      return;
    }

    try {
      await axios.post(`${API}/playlists`, {
        name: newPlaylistName.trim(),
        description: newPlaylistDescription.trim(),
        is_public: false
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setCreatePlaylistModalVisible(false);
      setNewPlaylistName('');
      setNewPlaylistDescription('');
      fetchLibraryData();
      Alert.alert('Success', 'Playlist created successfully');
    } catch (error: any) {
      console.error('Error creating playlist:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create playlist');
    }
  };

  const createAlbum = async () => {
    if (!newAlbumName.trim()) {
      Alert.alert('Error', 'Please enter an album name');
      return;
    }

    try {
      await axios.post(`${API}/albums`, {
        name: newAlbumName.trim(),
        description: newAlbumDescription.trim(),
        is_public: false,
        tags: []
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setCreateAlbumModalVisible(false);
      setNewAlbumName('');
      setNewAlbumDescription('');
      fetchLibraryData();
      Alert.alert('Success', 'Album created successfully');
    } catch (error: any) {
      console.error('Error creating album:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create album');
    }
  };

  const handleDownloadAudio = async (audioId: string) => {
    try {
      await axios.post(`${API}/downloads/${audioId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update downloaded audio IDs
      setDownloadedAudioIds(prev => new Set([...prev, audioId]));
      Alert.alert('Success', 'Audio downloaded successfully');
    } catch (error: any) {
      console.error('Error downloading audio:', error);
      if (error.response?.status === 400 && error.response?.data?.detail?.includes('already downloaded')) {
        Alert.alert('Info', 'Audio is already downloaded');
      } else {
        Alert.alert('Error', error.response?.data?.detail || 'Failed to download audio');
      }
    }
  };

  const handleRemoveDownload = async (audioId: string) => {
    try {
      await axios.delete(`${API}/downloads/${audioId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update downloaded audio IDs
      setDownloadedAudioIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(audioId);
        return newSet;
      });
      Alert.alert('Success', 'Download removed successfully');
    } catch (error: any) {
      console.error('Error removing download:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to remove download');
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <Text style={[styles.title, { color: theme.text }]}>Library</Text>
        {currentView === 'mylist' ? (
          <TouchableOpacity onPress={() => {
            if (isEditingMyList) {
              setIsEditingMyList(false);
              setSelectedAudioIds([]);
            } else {
              setIsEditingMyList(true);
            }
          }}>
            <Ionicons 
              name={isEditingMyList ? "checkmark" : "create-outline"} 
              size={24} 
              color={isEditingMyList ? theme.success : theme.primary} 
            />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => {
            if (currentView === 'playlists') {
              setCreatePlaylistModalVisible(true);
            } else if (currentView === 'albums') {
              setCreateAlbumModalVisible(true);
            }
          }}>
            <Ionicons name="add" size={24} color={theme.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Category Selection Bar */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={[styles.categoryBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}
        contentContainerStyle={styles.categoryBarContent}
      >
        <TouchableOpacity
          style={[styles.categoryButton, { backgroundColor: currentView === 'playlists' ? theme.primary : theme.accent }]}
          onPress={() => setCurrentView('playlists')}
        >
          <Text style={[styles.categoryButtonText, { color: currentView === 'playlists' ? '#ffffff' : theme.textSecondary }]}>
            Playlists
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.categoryButton, { backgroundColor: currentView === 'albums' ? theme.primary : theme.accent }]}
          onPress={() => setCurrentView('albums')}
        >
          <Text style={[styles.categoryButtonText, { color: currentView === 'albums' ? '#ffffff' : theme.textSecondary }]}>
            Albums
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.categoryButton, { backgroundColor: currentView === 'mylist' ? theme.primary : theme.accent }]}
          onPress={() => setCurrentView('mylist')}
        >
          <Text style={[styles.categoryButtonText, { color: currentView === 'mylist' ? '#ffffff' : theme.textSecondary }]}>
            My List
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Main Content */}
      <ScrollView style={styles.contentContainer}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4f46e5" />
          </View>
        ) : (
          <>
            {/* Playlists View */}
            {currentView === 'playlists' && (
              <>
                {playlists.length === 0 ? (
                  <Text style={styles.emptyText}>No playlists yet. Create your first playlist!</Text>
                ) : (
                  playlists.map((playlist) => (
                    <TouchableOpacity key={playlist.id} style={[styles.listItem, { backgroundColor: theme.surface }]}>
                      <View style={[styles.itemIcon, { backgroundColor: theme.accent }]}>
                        <Ionicons name="musical-notes" size={24} color={theme.primary} />
                      </View>
                      <View style={styles.itemInfo}>
                        <Text style={[styles.itemTitle, { color: theme.text }]}>{playlist.name}</Text>
                        <Text style={[styles.itemSubtitle, { color: theme.textSecondary }]}>
                          {playlist.audio_ids.length} songs · {format(new Date(playlist.updated_at), 'MMM dd, yyyy')}
                        </Text>
                      </View>
                      <TouchableOpacity style={styles.itemAction}>
                        <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))
                )}
              </>
            )}

            {/* Albums View */}
            {currentView === 'albums' && (
              <>
                {albums.length === 0 ? (
                  <Text style={styles.emptyText}>No albums yet. Create your first album!</Text>
                ) : (
                  albums.map((album) => (
                    <TouchableOpacity key={album.id} style={[styles.listItem, { backgroundColor: theme.surface }]}>
                      <View style={[styles.itemIcon, { backgroundColor: theme.accent }]}>
                        <Ionicons name="albums" size={24} color={theme.primary} />
                      </View>
                      <View style={styles.itemInfo}>
                        <Text style={[styles.itemTitle, { color: theme.text }]}>{album.name}</Text>
                        <Text style={[styles.itemSubtitle, { color: theme.textSecondary }]}>
                          {album.audio_ids.length} songs · {format(new Date(album.updated_at), 'MMM dd, yyyy')}
                        </Text>
                      </View>
                      <TouchableOpacity style={styles.itemAction}>
                        <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))
                )}
              </>
            )}

            {/* My List View */}
            {currentView === 'mylist' && (
              <>
                {/* Filter Toggle */}
                <View style={[styles.filterContainer, { backgroundColor: theme.background }]}>
                  <TouchableOpacity
                    style={[
                      styles.filterButton, 
                      { backgroundColor: !showDownloadedOnly ? theme.primary : theme.surface, borderColor: theme.border },
                      !showDownloadedOnly && styles.filterButtonActive
                    ]}
                    onPress={() => setShowDownloadedOnly(false)}
                  >
                    <Text style={[
                      styles.filterButtonText, 
                      { color: !showDownloadedOnly ? '#ffffff' : theme.textSecondary },
                      !showDownloadedOnly && styles.filterButtonTextActive
                    ]}>
                      All ({mylistAudioItems.length})
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.filterButton, 
                      { backgroundColor: showDownloadedOnly ? theme.primary : theme.surface, borderColor: theme.border },
                      showDownloadedOnly && styles.filterButtonActive
                    ]}
                    onPress={() => setShowDownloadedOnly(true)}
                  >
                    <Text style={[
                      styles.filterButtonText, 
                      { color: showDownloadedOnly ? '#ffffff' : theme.textSecondary },
                      showDownloadedOnly && styles.filterButtonTextActive
                    ]}>
                      Downloaded ({downloadedAudioIds.size})
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Edit Mode Instructions */}
                {isEditingMyList && (
                  <View style={[styles.editInstructions, { backgroundColor: theme.accent }]}>
                    <Text style={[styles.editInstructionsText, { color: theme.textSecondary }]}>
                      Select items to remove from My List
                    </Text>
                    {selectedAudioIds.length > 0 && (
                      <TouchableOpacity 
                        style={[styles.deleteSelectedButton, { backgroundColor: theme.error }]}
                        onPress={() => {
                          console.log('Delete button pressed');
                          handleDeleteSelectedFromMyList();
                        }}
                      >
                        <Ionicons name="trash-outline" size={16} color="#fff" />
                        <Text style={styles.deleteSelectedButtonText}>
                          Remove ({selectedAudioIds.length})
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {/* Audio List */}
                {(() => {
                  const filteredAudio = showDownloadedOnly 
                    ? mylistAudioItems.filter(audio => downloadedAudioIds.has(audio.id))
                    : mylistAudioItems;
                  
                  return filteredAudio.length === 0 ? (
                    <Text style={styles.emptyText}>
                      {showDownloadedOnly ? 'No downloaded audio yet.' : 'No audio created yet.'}
                    </Text>
                  ) : (
                    filteredAudio.map((audio) => (
                      <TouchableOpacity
                        key={audio.id}
                        style={[
                          styles.audioCard,
                          { backgroundColor: theme.surface },
                          isEditingMyList && selectedAudioIds.includes(audio.id) && [styles.audioCardSelected, { borderColor: theme.error }]
                        ]}
                        onPress={() => {
                          if (isEditingMyList) {
                            toggleAudioSelection(audio.id);
                          } else {
                            // Load audio and open full screen player
                            playAudio(audio);
                            setShowFullScreenPlayer(true);
                          }
                        }}
                      >
                        <View style={styles.audioCardLeft}>
                          {isEditingMyList && (
                            <TouchableOpacity 
                              style={styles.selectionCheckbox}
                              onPress={() => toggleAudioSelection(audio.id)}
                            >
                              <Ionicons 
                                name={selectedAudioIds.includes(audio.id) ? "checkmark-circle" : "ellipse-outline"} 
                                size={24} 
                                color={selectedAudioIds.includes(audio.id) ? theme.error : theme.textMuted} 
                              />
                            </TouchableOpacity>
                          )}
                          <View style={[styles.itemIcon, { backgroundColor: theme.accent }]}>
                            <Ionicons 
                              name={downloadedAudioIds.has(audio.id) ? "download" : "musical-notes"} 
                              size={24} 
                              color={downloadedAudioIds.has(audio.id) ? theme.success : theme.primary} 
                            />
                          </View>
                          <View style={styles.itemInfo}>
                            <Text style={[styles.itemTitle, { color: theme.text }]}>{audio.title}</Text>
                            <Text style={[styles.itemSubtitle, { color: theme.textSecondary }]}>
                              {format(new Date(audio.created_at), 'MMM dd, yyyy')} · {formatDuration(audio.duration)}
                              {downloadedAudioIds.has(audio.id) && ' · Downloaded'}
                            </Text>
                          </View>
                        </View>
                        
                        {!isEditingMyList && (
                          <View style={styles.audioCardActions}>
                            {/* Play/Pause Button */}
                            <TouchableOpacity 
                              style={styles.playButton}
                              onPress={() => handlePlayAudio(audio)}
                            >
                              <Ionicons 
                                name={
                                  currentAudio && currentAudio.id === audio.id && isPlaying 
                                    ? "pause" 
                                    : "play"
                                } 
                                size={16} 
                                color="#fff" 
                              />
                            </TouchableOpacity>
                            
                            {/* Download/Remove Button */}
                            {downloadedAudioIds.has(audio.id) ? (
                              <TouchableOpacity 
                                style={styles.downloadedButton}
                                onPress={() => handleRemoveDownload(audio.id)}
                              >
                                <Ionicons name="checkmark-circle" size={20} color={theme.success} />
                              </TouchableOpacity>
                            ) : (
                              <TouchableOpacity 
                                style={styles.downloadButton}
                                onPress={() => handleDownloadAudio(audio.id)}
                              >
                                <Ionicons name="download-outline" size={20} color={theme.textMuted} />
                              </TouchableOpacity>
                            )}
                          </View>
                        )}
                      </TouchableOpacity>
                    ))
                  );
                })()}
              </>
            )}
          </>
        )}
      </ScrollView>

      {/* Create Playlist Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={createPlaylistModalVisible}
        onRequestClose={() => setCreatePlaylistModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.createModalContainer, { backgroundColor: theme.surface }]}>
            <Text style={[styles.createModalTitle, { color: theme.text }]}>Create Playlist</Text>
            
            <TextInput
              style={[styles.textInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
              placeholder="Playlist name"
              placeholderTextColor={theme.textMuted}
              value={newPlaylistName}
              onChangeText={setNewPlaylistName}
              maxLength={50}
            />
            
            <TextInput
              style={[styles.textInput, styles.textInputMultiline, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
              placeholder="Description (optional)"
              placeholderTextColor={theme.textMuted}
              value={newPlaylistDescription}
              onChangeText={setNewPlaylistDescription}
              multiline
              numberOfLines={3}
              maxLength={200}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.cancelButton, { backgroundColor: theme.background, borderColor: theme.border }]}
                onPress={() => {
                  setCreatePlaylistModalVisible(false);
                  setNewPlaylistName('');
                  setNewPlaylistDescription('');
                }}
              >
                <Text style={[styles.cancelButtonText, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.createButton, { backgroundColor: theme.primary }]}
                onPress={createPlaylist}
              >
                <Text style={styles.createButtonText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Create Album Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={createAlbumModalVisible}
        onRequestClose={() => setCreateAlbumModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.createModalContainer, { backgroundColor: theme.surface }]}>
            <Text style={[styles.createModalTitle, { color: theme.text }]}>Create Album</Text>
            
            <TextInput
              style={[styles.textInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
              placeholder="Album name"
              placeholderTextColor={theme.textMuted}
              value={newAlbumName}
              onChangeText={setNewAlbumName}
              maxLength={50}
            />
            
            <TextInput
              style={[styles.textInput, styles.textInputMultiline, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
              placeholder="Description (optional)"
              placeholderTextColor={theme.textMuted}
              value={newAlbumDescription}
              onChangeText={setNewAlbumDescription}
              multiline
              numberOfLines={3}
              maxLength={200}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.cancelButton, { backgroundColor: theme.background, borderColor: theme.border }]}
                onPress={() => {
                  setCreateAlbumModalVisible(false);
                  setNewAlbumName('');
                  setNewAlbumDescription('');
                }}
              >
                <Text style={[styles.cancelButtonText, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.createButton, { backgroundColor: theme.primary }]}
                onPress={createAlbum}
              >
                <Text style={styles.createButtonText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  categoryBar: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    maxHeight: 50,
  },
  categoryBarContent: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignItems: 'center',
  },
  categoryButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    marginRight: 12,
  },
  categoryButtonActive: {
    backgroundColor: '#4f46e5',
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  categoryButtonTextActive: {
    color: '#ffffff',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#6b7280',
    marginTop: 60,
    lineHeight: 24,
  },
  listItem: {
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
  itemIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  itemSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  itemAction: {
    padding: 8,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4f46e5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  createModalContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  createModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 20,
    textAlign: 'center',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#f9fafb',
  },
  textInputMultiline: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    marginRight: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  createButton: {
    flex: 1,
    paddingVertical: 12,
    marginLeft: 8,
    borderRadius: 8,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  // Mylist specific styles
  filterContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 4,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  filterButtonTextActive: {
    color: '#1f2937',
  },
  audioCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  audioCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  audioCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  downloadButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  downloadedButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f0fdf4',
  },
  // Edit mode specific styles
  editInstructions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  editInstructionsText: {
    fontSize: 14,
    color: '#856404',
    fontWeight: '500',
    flex: 1,
  },
  deleteSelectedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  deleteSelectedButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  audioCardSelected: {
    borderColor: '#ef4444',
    borderWidth: 2,
    backgroundColor: '#fef2f2',
  },
  selectionCheckbox: {
    marginRight: 12,
  },
});