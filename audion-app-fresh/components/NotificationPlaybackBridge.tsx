/**
 * NotificationPlaybackBridge
 * 通知タップ時の音声再生を橋渡しするコンポーネント
 * GlobalAudioProvider配下でuseGlobalAudioを使用してplaySound実行
 */

import React, { useEffect } from 'react';
import { AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useGlobalAudio } from '../context/GlobalAudioContext';

export default function NotificationPlaybackBridge() {
  const { playSound } = useGlobalAudio();
  const router = useRouter();

  useEffect(() => {

    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      try {
        const data = response.notification.request.content.data;
        console.log('🔔 [NOTIFICATION-BRIDGE] Notification tapped:', data);

        // AutoPick完了通知からの再生
        if (data?.mode === 'autopick' && data?.audioUrl) {
          console.log('🔔 [NOTIFICATION-BRIDGE] Starting playback from notification:', {
            audioId: data.audioId,
            audioUrl: data.audioUrl,
            title: data.title
          });

          // 音声再生開始
          playSound({
            id: data.audioId,
            uri: data.audioUrl,
            title: data.title || 'AutoPick生成音声'
          });

          // 必要に応じて全画面プレイヤーへ遷移（任意）
          // router.push('/player');
          
          console.log('🎵 [NOTIFICATION-BRIDGE] Auto-play started from notification tap');
        }
      } catch (error) {
        console.error('🔔 [NOTIFICATION-BRIDGE] Error handling notification response:', error);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [playSound, router]);

  // このコンポーネントはUIをレンダリングしない
  return null;
}
