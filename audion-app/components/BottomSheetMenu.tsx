import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  ScrollView,
  SafeAreaView,
  TextInput,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import PlaylistService, { RecentAudioItem, Playlist, ReportReason } from '../services/PlaylistService';
import { useRouter } from 'expo-router';

const { height: screenHeight } = Dimensions.get('window');

interface BottomSheetMenuProps {
  audioItem: RecentAudioItem;
  visible: boolean;
  onClose: () => void;
  playlistId?: string;
  onSourcesPress?: (audioItem: RecentAudioItem) => void;
  onDeletePress?: (audioId: string) => void;
}

export default function BottomSheetMenu({
  audioItem,
  visible,
  onClose,
  playlistId = 'default',
  onSourcesPress,
  onDeletePress
}: BottomSheetMenuProps) {
  const { theme } = useTheme();
  const router = useRouter();
  
  const [showPlaylistSelector, setShowPlaylistSelector] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [selectedReportReason, setSelectedReportReason] = useState<string>('');
  const [reportDescription, setReportDescription] = useState('');
  const [slideAnim] = useState(new Animated.Value(screenHeight));

  React.useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    } else {
      Animated.spring(slideAnim, {
        toValue: screenHeight,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    }
  }, [visible]);

  // Load playlists when showing playlist selector
  React.useEffect(() => {
    if (showPlaylistSelector) {
      loadPlaylists();
    }
  }, [showPlaylistSelector]);

  const loadPlaylists = async () => {
    try {
      const userPlaylists = await PlaylistService.getInstance().getPlaylists();
      setPlaylists(userPlaylists);
    } catch (error) {
      console.error('Error loading playlists:', error);
      Alert.alert('Error', 'Failed to load playlists.');
    }
  };

  const handleShare = async () => {
    try {
      await PlaylistService.getInstance().shareAudio(audioItem);
      onClose();
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleAddToPlaylist = () => {
    setShowPlaylistSelector(true);
  };

  const handlePlaylistSelect = async (playlist: Playlist) => {
    try {
      await PlaylistService.getInstance().addToPlaylist(playlist.id, audioItem.id);
      Alert.alert('Success', `Added to "${playlist.name}"`);
      setShowPlaylistSelector(false);
      onClose();
    } catch (error) {
      console.error('Error adding to playlist:', error);
      Alert.alert('Error', 'Failed to add to playlist.');
    }
  };

  const handleCreateNewPlaylist = async () => {
    if (!newPlaylistName.trim()) {
      Alert.alert('Error', 'Please enter a playlist name.');
      return;
    }

    try {
      const newPlaylist = await PlaylistService.getInstance().createPlaylist({
        name: newPlaylistName.trim(),
        description: `Created from "${audioItem.title}"`,
        user_id: 'current',
        is_public: false
      });

      await PlaylistService.getInstance().addToPlaylist(newPlaylist.id, audioItem.id);
      
      Alert.alert('Success', `Created playlist "${newPlaylistName}" and added audio.`);
      setNewPlaylistName('');
      setShowPlaylistSelector(false);
      onClose();
    } catch (error) {
      console.error('Error creating playlist:', error);
      Alert.alert('Error', 'Failed to create playlist.');
    }
  };

  const handleRemoveFromPlaylist = () => {
    Alert.alert(
      'Remove from Playlist',
      'Are you sure you want to remove this audio from the current playlist?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await PlaylistService.getInstance().removeFromPlaylist(playlistId, audioItem.id);
              Alert.alert('Success', 'Removed from playlist.');
              onClose();
            } catch (error) {
              console.error('Error removing from playlist:', error);
              Alert.alert('Error', 'Failed to remove from playlist.');
            }
          }
        }
      ]
    );
  };

  const handleAddToQueue = async () => {
    try {
      await PlaylistService.getInstance().addToQueue(audioItem);
      onClose();
    } catch (error) {
      console.error('Error adding to queue:', error);
    }
  };

  const handleGoToCreator = async () => {
    try {
      await PlaylistService.getInstance().goToCreator(audioItem);
      onClose();
    } catch (error) {
      console.error('Error showing creator info:', error);
    }
  };

  const handleShowSources = () => {
    if (onSourcesPress) {
      onSourcesPress(audioItem);
      onClose();
    } else {
      // Fallback: navigate to article list or show modal
      PlaylistService.getInstance().showSources(audioItem);
      onClose();
    }
  };

  const handleReport = () => {
    setShowReportModal(true);
  };

  const handleViewScript = () => {
    try {
      // Show script/transcript modal - for now show alert with script info
      const scriptInfo = audioItem.summary 
        ? `音声要約:\n${audioItem.summary}\n\n作成日時: ${new Date(audioItem.created_at).toLocaleString('ja-JP')}`
        : '原稿情報が利用できません。';
      
      Alert.alert('原稿確認', scriptInfo);
      onClose();
    } catch (error) {
      console.error('Error showing script:', error);
      Alert.alert('Error', 'Failed to load script information.');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      '削除確認',
      'この音声を削除しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: () => {
            if (onDeletePress) {
              onDeletePress(audioItem.id);
              onClose();
            }
          }
        }
      ]
    );
  };

  const submitReport = async () => {
    if (!selectedReportReason) {
      Alert.alert('Error', 'Please select a reason for reporting.');
      return;
    }

    try {
      await PlaylistService.getInstance().reportContent(
        audioItem,
        selectedReportReason,
        reportDescription
      );
      
      setSelectedReportReason('');
      setReportDescription('');
      setShowReportModal(false);
      onClose();
    } catch (error) {
      console.error('Error submitting report:', error);
    }
  };

  const menuItems = [
    {
      icon: 'share-outline' as const,
      title: '共有',
      action: handleShare,
      destructive: false
    },
    {
      icon: 'add' as const,
      title: 'プレイリストに追加',
      action: handleAddToPlaylist,
      destructive: false
    },
    // Only show remove option if not in default playlist
    ...(playlistId !== 'default' ? [{
      icon: 'remove' as const,
      title: 'プレイリストから削除',
      action: handleRemoveFromPlaylist,
      destructive: true
    }] : []),
    {
      icon: 'add-circle-outline' as const,
      title: '次に再生',
      action: handleAddToQueue,
      destructive: false
    },
    {
      icon: 'person-outline' as const,
      title: '作成者',
      action: handleGoToCreator,
      destructive: false
    },
    {
      icon: 'document-text-outline' as const,
      title: '原稿確認',
      action: handleViewScript,
      destructive: false
    },
    {
      icon: 'newspaper-outline' as const,
      title: 'ソース一覧',
      action: handleShowSources,
      destructive: false
    },
    {
      icon: 'flag-outline' as const,
      title: 'Report',
      action: handleReport,
      destructive: true
    },
    // Delete option always at the bottom for future extensibility
    {
      icon: 'trash-outline' as const,
      title: '削除',
      action: handleDelete,
      destructive: true
    }
  ];

  const reportReasons = PlaylistService.getInstance().getReportReasons();

  if (!visible) return null;

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="none"
        onRequestClose={onClose}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={onClose}
        >
          <Animated.View
            style={[
              styles.bottomSheet,
              { backgroundColor: theme.surface, transform: [{ translateY: slideAnim }] }
            ]}
          >
            <TouchableOpacity activeOpacity={1}>
              {/* Handle */}
              <View style={styles.handle} />
              
              {/* Header */}
              <View style={styles.header}>
                <Text style={[styles.audioTitle, { color: theme.text }]} numberOfLines={1}>
                  {audioItem.title}
                </Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Menu Items */}
              <ScrollView style={styles.menuContainer}>
                {menuItems.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.menuItem, { borderBottomColor: theme.border }]}
                    onPress={item.action}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={item.icon}
                      size={24}
                      color={item.destructive ? theme.error : theme.text}
                      style={styles.menuIcon}
                    />
                    <Text style={[
                      styles.menuText,
                      { color: item.destructive ? theme.error : theme.text }
                    ]}>
                      {item.title}
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={theme.textSecondary}
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* Playlist Selector Modal */}
      <Modal
        visible={showPlaylistSelector}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPlaylistSelector(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={() => setShowPlaylistSelector(false)}>
              <Text style={[styles.cancelButton, { color: theme.primary }]}>キャンセル</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.text }]}>プレイリストを選択</Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView style={styles.playlistList}>
            {/* Create New Playlist */}
            <View style={[styles.newPlaylistSection, { backgroundColor: theme.surface }]}>
              <TextInput
                style={[styles.playlistNameInput, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]}
                placeholder="新しいプレイリスト名"
                placeholderTextColor={theme.textSecondary}
                value={newPlaylistName}
                onChangeText={setNewPlaylistName}
              />
              <TouchableOpacity
                style={[styles.createButton, { backgroundColor: theme.primary }]}
                onPress={handleCreateNewPlaylist}
                disabled={!newPlaylistName.trim()}
              >
                <Text style={styles.createButtonText}>作成</Text>
              </TouchableOpacity>
            </View>

            {/* Existing Playlists */}
            {playlists.map((playlist) => (
              <TouchableOpacity
                key={playlist.id}
                style={[styles.playlistItem, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}
                onPress={() => handlePlaylistSelect(playlist)}
              >
                <Ionicons name="musical-notes" size={24} color={theme.primary} />
                <View style={styles.playlistInfo}>
                  <Text style={[styles.playlistName, { color: theme.text }]}>{playlist.name}</Text>
                  <Text style={[styles.playlistCount, { color: theme.textSecondary }]}>
                    {playlist.audio_count || 0} 件の音声
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Report Modal */}
      <Modal
        visible={showReportModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowReportModal(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={() => setShowReportModal(false)}>
              <Text style={[styles.cancelButton, { color: theme.primary }]}>キャンセル</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.text }]}>コンテンツを報告</Text>
            <TouchableOpacity onPress={submitReport}>
              <Text style={[styles.submitButton, { color: theme.primary }]}>送信</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.reportContainer}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>報告理由を選択してください</Text>
            
            {reportReasons.map((reason) => (
              <TouchableOpacity
                key={reason.id}
                style={[
                  styles.reasonItem,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                  selectedReportReason === reason.id && { borderColor: theme.primary, backgroundColor: theme.accent }
                ]}
                onPress={() => setSelectedReportReason(reason.id)}
              >
                <View style={styles.reasonContent}>
                  <Text style={[styles.reasonTitle, { color: theme.text }]}>{reason.name}</Text>
                  <Text style={[styles.reasonDescription, { color: theme.textSecondary }]}>
                    {reason.description}
                  </Text>
                </View>
                {selectedReportReason === reason.id && (
                  <Ionicons name="checkmark-circle" size={24} color={theme.primary} />
                )}
              </TouchableOpacity>
            ))}

            <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 24 }]}>
              詳細 (任意)
            </Text>
            <TextInput
              style={[
                styles.descriptionInput,
                { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border }
              ]}
              placeholder="詳しい説明があれば入力してください..."
              placeholderTextColor={theme.textSecondary}
              value={reportDescription}
              onChangeText={setReportDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: screenHeight * 0.7,
    paddingBottom: 20,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#E5E5E5',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  audioTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 16,
  },
  closeButton: {
    padding: 4,
  },
  menuContainer: {
    maxHeight: 400,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  menuIcon: {
    marginRight: 16,
  },
  menuText: {
    fontSize: 16,
    flex: 1,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  cancelButton: {
    fontSize: 16,
    fontWeight: '500',
  },
  submitButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 60,
  },
  newPlaylistSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  playlistNameInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 8,
    fontSize: 16,
  },
  createButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  playlistList: {
    flex: 1,
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  playlistInfo: {
    flex: 1,
    marginLeft: 12,
  },
  playlistName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  playlistCount: {
    fontSize: 14,
  },
  reportContainer: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 12,
  },
  reasonContent: {
    flex: 1,
  },
  reasonTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  reasonDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  descriptionInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 100,
  },
});