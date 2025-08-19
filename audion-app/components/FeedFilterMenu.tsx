import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface FeedFilterMenuProps {
  visible: boolean;
  onClose: () => void;
  selectedReadingFilter: string;
  onReadingFilterChange: (filter: string) => void;
  readingFilters: string[];
}

export default function FeedFilterMenu({
  visible,
  onClose,
  selectedReadingFilter,
  onReadingFilterChange,
  readingFilters,
}: FeedFilterMenuProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const handleFilterSelect = (filter: string) => {
    onReadingFilterChange(filter);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.menuContainer}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={styles.menuContent}
          >
            {/* Header */}
            <View style={styles.menuHeader}>
              <Text style={styles.menuTitle}>記事フィルター</Text>
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Filter Options */}
            <ScrollView style={styles.filterList} showsVerticalScrollIndicator={false}>
              <Text style={styles.sectionTitle}>既読状況</Text>
              {readingFilters.map((filter) => {
                const isSelected = selectedReadingFilter === filter;
                const icon = getFilterIcon(filter);
                const description = getFilterDescription(filter);

                return (
                  <TouchableOpacity
                    key={filter}
                    style={[
                      styles.filterOption,
                      isSelected && styles.filterOptionSelected,
                    ]}
                    onPress={() => handleFilterSelect(filter)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.filterOptionContent}>
                      <View style={styles.filterOptionLeft}>
                        <View
                          style={[
                            styles.iconContainer,
                            isSelected && styles.iconContainerSelected,
                          ]}
                        >
                          <Ionicons
                            name={icon}
                            size={18}
                            color={isSelected ? theme.background : theme.textSecondary}
                          />
                        </View>
                        <View style={styles.filterTextContainer}>
                          <Text
                            style={[
                              styles.filterOptionText,
                              isSelected && styles.filterOptionTextSelected,
                            ]}
                          >
                            {filter}
                          </Text>
                          <Text style={styles.filterOptionDescription}>
                            {description}
                          </Text>
                        </View>
                      </View>
                      {isSelected && (
                        <Ionicons
                          name="checkmark"
                          size={20}
                          color={theme.primary}
                        />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// Helper functions
const getFilterIcon = (filter: string): string => {
  switch (filter) {
    case 'All Articles':
      return 'list-outline';
    case 'Unread':
      return 'radio-button-off-outline';
    case 'Read':
      return 'checkmark-circle-outline';
    case "This Week's Reads":
      return 'calendar-outline';
    default:
      return 'list-outline';
  }
};

const getFilterDescription = (filter: string): string => {
  switch (filter) {
    case 'All Articles':
      return 'すべての記事を表示';
    case 'Unread':
      return 'まだ読んでいない記事のみ';
    case 'Read':
      return '既読の記事のみ';
    case "This Week's Reads":
      return '今週読んだ記事のみ';
    default:
      return '';
  }
};

const createStyles = (theme: any) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 100, // Space from header
    paddingRight: 16,
  },
  menuContainer: {
    minWidth: 280,
    maxWidth: 320,
    maxHeight: Dimensions.get('window').height * 0.7,
  },
  menuContent: {
    backgroundColor: theme.background,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 16,
    overflow: 'hidden',
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: theme.surface,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: theme.border,
  },
  filterList: {
    maxHeight: 400,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.textSecondary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    paddingBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  filterOption: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  filterOptionSelected: {
    backgroundColor: theme.accent,
  },
  filterOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconContainerSelected: {
    backgroundColor: theme.primary,
  },
  filterTextContainer: {
    flex: 1,
  },
  filterOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.text,
    marginBottom: 2,
  },
  filterOptionTextSelected: {
    color: theme.text,
    fontWeight: '600',
  },
  filterOptionDescription: {
    fontSize: 13,
    color: theme.textSecondary,
    lineHeight: 16,
  },
});