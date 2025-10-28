/**
 * TrackPlayer Service
 * バックグラウンドで動作するメディアコントロールイベントハンドラー
 */

import TrackPlayer, { Event, RepeatMode } from 'react-native-track-player';

export async function TrackPlayerService() {
  // リモートコントロールイベントのハンドリング

  TrackPlayer.addEventListener(Event.RemotePlay, async () => {
    console.log('🎵 [TrackPlayer] Remote Play event');
    await TrackPlayer.play();
  });

  TrackPlayer.addEventListener(Event.RemotePause, async () => {
    console.log('🎵 [TrackPlayer] Remote Pause event');
    await TrackPlayer.pause();
  });

  TrackPlayer.addEventListener(Event.RemoteStop, async () => {
    console.log('🎵 [TrackPlayer] Remote Stop event');
    await TrackPlayer.stop();
  });

  TrackPlayer.addEventListener(Event.RemoteNext, async () => {
    console.log('🎵 [TrackPlayer] Remote Next event');
    await TrackPlayer.skipToNext();
  });

  TrackPlayer.addEventListener(Event.RemotePrevious, async () => {
    console.log('🎵 [TrackPlayer] Remote Previous event');
    await TrackPlayer.skipToPrevious();
  });

  TrackPlayer.addEventListener(Event.RemoteSeek, async (event) => {
    console.log('🎵 [TrackPlayer] Remote Seek event:', event.position);
    await TrackPlayer.seekTo(event.position);
  });

  TrackPlayer.addEventListener(Event.RemoteJumpForward, async (event) => {
    console.log('🎵 [TrackPlayer] Remote Jump Forward:', event.interval);
    const position = await TrackPlayer.getPosition();
    await TrackPlayer.seekTo(position + (event.interval || 10));
  });

  TrackPlayer.addEventListener(Event.RemoteJumpBackward, async (event) => {
    console.log('🎵 [TrackPlayer] Remote Jump Backward:', event.interval);
    const position = await TrackPlayer.getPosition();
    await TrackPlayer.seekTo(Math.max(0, position - (event.interval || 10)));
  });

  // 再生完了イベント
  TrackPlayer.addEventListener(Event.PlaybackQueueEnded, async (event) => {
    console.log('🎵 [TrackPlayer] Playback Queue Ended');
    // キューが終了したら停止
    await TrackPlayer.reset();
  });

  // エラーハンドリング
  TrackPlayer.addEventListener(Event.PlaybackError, (event) => {
    console.error('🎵 [TrackPlayer] Playback Error:', event);
  });
}
