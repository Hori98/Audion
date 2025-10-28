/**
 * Progress Bar Layout
 * Wraps the main app content and shows AutoPick progress bar when active
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useAutoPick } from '../context/AutoPickContext';
import AutoPickProgressBar from './AutoPickProgressBar';

interface ProgressBarLayoutProps {
  children: React.ReactNode;
}

export default function ProgressBarLayout({ children }: ProgressBarLayoutProps) {
  const { currentTask, isProcessing } = useAutoPick();

  return (
    <View style={styles.container}>
      {children}
      
      {/* AutoPick Progress Bar - appears above tab bar when processing */}
      <AutoPickProgressBar
        visible={isProcessing && !!currentTask}
        progress={currentTask?.progress || 0}
        message={currentTask?.message || ''}
        status={currentTask?.status || 'pending'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});