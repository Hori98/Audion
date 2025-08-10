import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LoadingButton from '../LoadingButton';
import { useTheme } from '../../context/ThemeContext';

interface ActionButtonsProps {
  selectedCount: number;
  showMiniPlayer: boolean;
  onCreateAudio: () => void;
  onAutoPickFromFeed: () => void;
  creatingAudio: boolean;
}

export default function ActionButtons({ 
  selectedCount,
  showMiniPlayer,
  onCreateAudio,
  onAutoPickFromFeed,
  creatingAudio 
}: ActionButtonsProps) {
  const { theme } = useTheme();

  return (
    <>
      {/* Main Action Buttons - Hide when mini player is active */}
      {!showMiniPlayer && (
        <View style={styles.actionButtonsContainer}>
          <LoadingButton
            title="Auto-pick"
            onPress={onAutoPickFromFeed}
            loading={creatingAudio}
            variant="outline"
            icon="shuffle"
            style={styles.autoPickButton}
            testID="auto-pick-button"
          />
          
          <LoadingButton
            title={`Create Audio (${selectedCount})`}
            onPress={onCreateAudio}
            loading={creatingAudio}
            variant="primary"
            icon="musical-notes"
            style={styles.createAudioButton}
            disabled={selectedCount === 0}
            testID="create-audio-button"
          />
        </View>
      )}

      {/* Floating Action Button - Show when mini player is active */}
      {showMiniPlayer && (
        <View style={styles.floatingButtonContainer}>
          <TouchableOpacity
            style={[styles.floatingButton, { backgroundColor: theme.primary }]}
            onPress={onCreateAudio}
            disabled={creatingAudio || selectedCount === 0}
          >
            <Ionicons 
              name="musical-notes" 
              size={24} 
              color="#fff" 
            />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.floatingButton, { backgroundColor: theme.secondary }]}
            onPress={onAutoPickFromFeed}
            disabled={creatingAudio}
          >
            <Ionicons 
              name="shuffle" 
              size={24} 
              color={theme.primary} 
            />
          </TouchableOpacity>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  actionButtonsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 15,
    gap: 12,
  },
  autoPickButton: {
    flex: 1,
  },
  createAudioButton: {
    flex: 2,
  },
  floatingButtonContainer: {
    position: 'absolute',
    bottom: 100, // Above mini player
    right: 20,
    gap: 12,
  },
  floatingButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
});