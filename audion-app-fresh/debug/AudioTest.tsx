/**
 * Audio Test Component
 * テスト用の単純な音声再生コンポーネント - createAsync問題の特定
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Audio } from 'expo-av';

export default function AudioTest() {
  const [testStatus, setTestStatus] = useState<string>('待機中');

  const testAudioPlayback = async () => {
    setTestStatus('テスト開始...');
    
    // テスト用URL（実際に存在するファイル）
    const testUri = 'http://localhost:8003/audio/audio_24aa948d-bcc5-40af-8c59-b44f44bfe0ab.mp3';
    
    try {
      console.log('🔍 [AUDIO-TEST] Starting audio test with URI:', testUri);
      setTestStatus('Audio.Sound.createAsync実行中...');

      // Audio設定の確認
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      });
      
      console.log('🔍 [AUDIO-TEST] Audio mode configured');
      setTestStatus('createAsync呼び出し中...');

      const { sound } = await Audio.Sound.createAsync(
        { uri: testUri },
        { shouldPlay: false } // 自動再生は無効化してテスト
      );

      console.log('🔍 [AUDIO-TEST] Sound created successfully:', sound);
      setTestStatus('createAsync成功！手動再生テスト中...');

      // 手動で再生開始
      await sound.playAsync();
      console.log('🔍 [AUDIO-TEST] Playback started');
      setTestStatus('再生開始成功！');

      // 3秒後に停止
      setTimeout(async () => {
        try {
          await sound.unloadAsync();
          console.log('🔍 [AUDIO-TEST] Sound unloaded');
          setTestStatus('テスト完了 - 成功');
        } catch (unloadErr) {
          console.error('🔍 [AUDIO-TEST] Unload error:', unloadErr);
        }
      }, 3000);

    } catch (error) {
      console.error('🔍 [AUDIO-TEST] Test failed:', error);
      console.error('🔍 [AUDIO-TEST] Error type:', typeof error);
      console.error('🔍 [AUDIO-TEST] Error message:', error?.message);
      console.error('🔍 [AUDIO-TEST] Full error:', JSON.stringify(error, null, 2));
      
      setTestStatus(`テスト失敗: ${error?.message || 'Unknown error'}`);
      
      Alert.alert(
        'Audio Test Failed',
        `Error: ${error?.message || 'Unknown error'}\n\nURI: ${testUri}`,
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Audio Playback Test</Text>
      <Text style={styles.status}>Status: {testStatus}</Text>
      
      <TouchableOpacity style={styles.button} onPress={testAudioPlayback}>
        <Text style={styles.buttonText}>音声再生テスト実行</Text>
      </TouchableOpacity>
      
      <Text style={styles.note}>
        このテストはAudio.Sound.createAsyncの動作を確認します。
        {'\n'}コンソールログでエラー詳細を確認してください。
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 20,
  },
  status: {
    fontSize: 16,
    color: '#b3b3b3',
    marginBottom: 30,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#1db954',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  note: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 18,
  },
});
