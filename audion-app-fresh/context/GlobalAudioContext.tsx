/**
 * Global Audio Context
 * アプリ全体で音声再生を管理し、重複再生を防ぐ
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import { Alert, AppState, Platform } from 'react-native';
import Constants from 'expo-constants';
import { useSettings } from './SettingsContext';
import { API_CONFIG } from '../config/api';
import { UI_FLAGS } from '../config/uiFlags';
import { useAuth } from './AuthContext';
import { AudioMetadataService, AudioMetadata } from '../services/AudioMetadataService';
import audioPlayHistoryService from '../services/AudioPlayHistoryService';

interface AudioTrack {
  id: string;
  uri: string;
  title: string;
  duration?: number; // Duration in milliseconds (from API)
  // 拡張メタデータ（全画面プレイヤー用）
  script?: string;
  chapters?: Array<{
    id: string;
    title: string;
    start_time: number;
    end_time: number;
    original_url: string;
  }>;
  sourceName?: string;
  publishedAt?: string;
  imageUrl?: string;
  // メタデータ読み込み状態（新規追加）
  metadata?: AudioMetadata;
  metadataLoading?: boolean;
}

interface GlobalAudioContextType {
  currentTrack: AudioTrack | null;
  isPlaying: boolean;
  // 進捗情報
  positionMs: number;
  durationMs: number;
  progress: number; // 0-1
  buffering: boolean;
  // キュー管理
  queue: AudioTrack[];
  currentIndex: number;
  // 再生操作
  playSound: (track: AudioTrack) => Promise<void>;
  pauseSound: () => Promise<void>;
  stopSound: () => Promise<void>;
  togglePlayPause: () => Promise<void>;
  seekTo: (positionMs: number) => Promise<void>;
  // キュー操作
  addToQueue: (track: AudioTrack) => void;
  playNext: () => Promise<void>;
  playPrevious: () => Promise<void>;
  clearQueue: () => void;
  // ユーティリティ
  isCurrentTrack: (trackId: string) => boolean;
  hasNext: boolean;
  hasPrevious: boolean;
  // Metadata helper
  refreshMetadata: (audioId?: string) => Promise<void>;
}

const GlobalAudioContext = createContext<GlobalAudioContextType | undefined>(undefined);

export const GlobalAudioProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [currentTrack, setCurrentTrack] = useState<AudioTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // 進捗情報
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [progress, setProgress] = useState(0);
  const [buffering, setBuffering] = useState(false);
  const { settings } = useSettings();
  const { token } = useAuth();
  
  // キュー管理
  const [queue, setQueue] = useState<AudioTrack[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  // Detect if running in Expo Go (no custom native modules available)
  const isExpoGo = (Constants as any)?.appOwnership === 'expo';
  const USE_TRACK_PLAYER = !isExpoGo; // TrackPlayerはExpo Goでは未対応

  // バックグラウンド再生の設定 + OSメディアコントロール統合
  useEffect(() => {
    const configureAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true, // サイレントモードでも再生
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
          staysActiveInBackground: true, // バックグラウンドでアクティブ
          // OSメディアコントロール統合
          interruptionModeIOS: InterruptionModeIOS.DuckOthers,
          interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
        });
        console.log('🎵 [GLOBAL] Audio mode configured for background playback + OS media controls');
      } catch (error) {
        console.error('🎵 [GLOBAL] Failed to configure audio mode:', error);
      }
    };

    configureAudio();
  }, []);

  // TrackPlayer初期化（OSメディアコントロール用）
  useEffect(() => {
    const setupTrackPlayer = async () => {
      if (!USE_TRACK_PLAYER) {
        // Expo Go環境ではTrackPlayerを初期化しない
        return;
      }

      // TEMPORARY FIX: Disable TrackPlayer completely to avoid native module errors in Expo Go
      console.log('🎵 [GLOBAL] TrackPlayer disabled (Expo Go compatibility)');
      return;

      try {
        // 動的インポート（Expo Go回避）
        const trackPlayerModule = await import('react-native-track-player');
        const TrackPlayer = trackPlayerModule.default;
        const { Capability, AppKilledPlaybackBehavior } = trackPlayerModule;
        const { TrackPlayerService } = await import('../services/TrackPlayerService');

        // TrackPlayerのセットアップ
        await TrackPlayer.setupPlayer({
          waitForBuffer: true,
        });

        // サービスハンドラー登録
        await TrackPlayer.registerPlaybackService(() => TrackPlayerService);

        // メディアコントロールのケーパビリティ設定
        await TrackPlayer.updateOptions({
          android: {
            appKilledPlaybackBehavior: AppKilledPlaybackBehavior.ContinuePlayback,
          },
          capabilities: [
            Capability.Play,
            Capability.Pause,
            Capability.Stop,
            Capability.SeekTo,
            Capability.Skip,
          ],
          compactCapabilities: [
            Capability.Play,
            Capability.Pause,
          ],
          progressUpdateEventInterval: 1,
        });

        console.log('🎵 [GLOBAL] TrackPlayer initialized for OS media controls');
      } catch (error) {
        console.error('🎵 [GLOBAL] Failed to setup TrackPlayer:', error);
      }
    };

    setupTrackPlayer();

    // クリーンアップ
    return () => {
      (async () => {
        try {
          if (!USE_TRACK_PLAYER) return;
          const TP = (await import('react-native-track-player')).default;
          await TP.reset();
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error('🎵 [GLOBAL] Failed to reset TrackPlayer:', errorMessage);
        }
      })();
    };
  }, []);

  // アプリ状態の変化を監視
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      console.log('🎵 [GLOBAL] App state changed to:', nextAppState);
      // バックグラウンドに移行しても再生は継続される（設定済み）
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, []);

  // OSメディアコントロール: Now Playing情報を更新（TrackPlayer実装版）
  const updateNowPlayingInfo = async (track: AudioTrack, positionMs: number, durationMs: number, isPlaying: boolean) => {
    if (!USE_TRACK_PLAYER) return; // Expo Goではスキップ

    // TEMPORARY FIX: Disable TrackPlayer completely
    return;

    try {
      // 動的インポート（Expo Go回避）
      const trackPlayerModule = await import('react-native-track-player');
      const TrackPlayer = trackPlayerModule.default;
      // TrackPlayerにトラック情報を追加/更新
      const trackExists = (await TrackPlayer.getQueue()).length > 0;

      const trackData = {
        id: track.id,
        url: track.uri,
        title: track.title || 'Audion News',
        artist: track.sourceName || 'Audion',
        album: 'News Summary',
        artwork: track.imageUrl || track.metadata?.imageUrl || undefined,
        duration: durationMs / 1000, // ミリ秒 → 秒
      };

      if (!trackExists) {
        // 初回: トラックを追加
        await TrackPlayer.add(trackData);
      } else {
        // 2回目以降: メタデータのみ更新
        await TrackPlayer.updateMetadataForTrack(0, trackData);
      }

      console.log('🎵 [GLOBAL] Now Playing info updated (TrackPlayer):', {
        title: track.title,
        artist: track.sourceName,
        position: `${Math.floor(positionMs / 1000)}s`,
        duration: `${Math.floor(durationMs / 1000)}s`,
        isPlaying,
      });
    } catch (error) {
      console.error('🎵 [GLOBAL] Failed to update Now Playing info (TrackPlayer):', error);
    }
  };

  // 新しい音声を再生するメイン関数
  const playSound = async (track: AudioTrack) => {
    console.log('🎵 [GLOBAL] playSound called with:', { id: track.id, title: track.title, uri: track.uri });
    try {
      // 同じトラックが再生中の場合は一時停止/再開を切り替える
      if (sound && currentTrack?.id === track.id) {
        if (isPlaying) {
          await sound.pauseAsync();
          setIsPlaying(false);
        } else {
          await sound.playAsync();
          setIsPlaying(true);
        }
        return;
      }

      // ⭐⭐⭐ 排他制御のコアロジック（順序改善）⭐⭐⭐
      // 既存サウンドのアンロードは「新規トラックのcurrentTrack設定」より前に行う
      if (sound) {
        console.log('🎵 [GLOBAL] Unloading previous sound...');
        try {
          await sound.unloadAsync();
        } catch (e) {
          console.warn('🎵 [GLOBAL] Previous sound unload failed:', e);
        }
        setSound(null);
        setIsPlaying(false);
        // 進捗情報をリセット（currentTrackはこの後に新規設定するため触らない）
        setPositionMs(0);
        setDurationMs(0);
        setProgress(0);
        setBuffering(false);
      }

      // キューに追加し、現在のインデックスを更新
      setQueue(prevQueue => {
        const trackExists = prevQueue.some(t => t.id === track.id);
        if (!trackExists) {
          const newQueue = [...prevQueue, track];
          setCurrentIndex(newQueue.length - 1);
          return newQueue;
        } else {
          const trackIndex = prevQueue.findIndex(t => t.id === track.id);
          setCurrentIndex(trackIndex);
          return prevQueue;
        }
      });

      console.log('🎵 [GLOBAL] Loading new sound:', track.title);
      console.log(`[AUDIO-PLAYBACK] Initializing audio ${track.id}, script: ${!!track.script}, chapters: ${track.chapters?.length || 0}`);
      
      if (!track.uri) {
        Alert.alert('エラー', '音声ファイルのURLが見つかりません');
        return;
      }

      // メタデータ補完の必要性チェック
      const needsMetadataFetch = !track.script || !track.chapters || track.chapters.length === 0;
      
  let newSound: Audio.Sound | null = null;
      try {
        // Normalize audio URL to ensure device-reachable origin (avoid localhost on device)
        const resolvePlayableUri = (uri: string): string => {
          try {
            const src = new URL(uri);
            const base = new URL(API_CONFIG.BASE_URL);
            // Replace origin when src is localhost or origin mismatch; keep path/query
            if (src.hostname === 'localhost' || src.hostname !== base.hostname || src.port !== base.port) {
              const rebuilt = `${base.origin}${src.pathname}${src.search || ''}`;
              console.log('🎵 [GLOBAL] Normalized audio URI:', { from: uri, to: rebuilt });
              return rebuilt;
            }
          } catch {}
          return uri;
        };

        const playableUri = resolvePlayableUri(track.uri);
        // Optional: lightweight preflight to avoid attempting to play non-audio payloads (e.g. text/plain)
        if (UI_FLAGS.AUDIO_PREFLIGHT_ENABLED) {
          try {
            const headOk = async () => {
              try {
                const res = await fetch(playableUri, { method: 'HEAD' });
                if (!res.ok) return null;
                const ct = res.headers.get('content-type') || res.headers.get('Content-Type');
                return ct || '';
              } catch {
                return null;
              }
            };
            let contentType = await headOk();
            if (!contentType) {
              // Fallback: tiny ranged GET
              try {
                const res = await fetch(playableUri, {
                  method: 'GET',
                  headers: { Range: 'bytes=0-0' },
                });
                if (res.ok) {
                  contentType = res.headers.get('content-type') || res.headers.get('Content-Type') || '';
                }
              } catch {
                // fail open
              }
            }
            if (contentType && !contentType.toLowerCase().startsWith('audio/')) {
              Alert.alert('再生エラー', '音声ファイルではない可能性があるため再生を中止しました');
              return; // Abort before createAsync
            }
          } catch (pfErr) {
            console.warn('🎵 [GLOBAL] Preflight check failed (non-fatal):', pfErr);
            // fail open: continue playback attempt
          }
        }
        console.log('🎵 [GLOBAL] Attempting Audio.Sound.createAsync with URI:', playableUri);

        // 頭欠け防止: shouldPlay: false でバッファ完了を待つ
        // SDK 54 / expo-av 16: createAsync(source, initialStatus, onPlaybackStatusUpdate, downloadFirst)
        const created = await Audio.Sound.createAsync(
          { uri: playableUri },
          { shouldPlay: false },  // ← 変更: 自動再生しない
          undefined,
          true  // downloadFirst: true
        );
        newSound = created.sound;
        console.log('🎵 [GLOBAL] Audio.Sound.createAsync successful (shouldPlay: false)');

        // 頭欠け防止: バッファ完了を待ってから再生開始
        try {
          // Faster status updates for smoother progress bar
          await newSound.setProgressUpdateIntervalAsync(250);

          // バッファ完了条件チェック
          const st = await newSound.getStatusAsync();
          if (st.isLoaded && !st.isBuffering && st.durationMillis && st.durationMillis > 0) {
            setDurationMs(st.durationMillis);
            console.log('🎵 [GLOBAL] Buffer ready:', {
              duration: `${Math.floor(st.durationMillis / 1000)}s`,
              isBuffering: st.isBuffering
            });

            // プレロール: OS出力準備のため150ms待機
            await new Promise(resolve => setTimeout(resolve, 150));

            // 位置0から再生開始
            console.log('🎵 [GLOBAL] Starting playback from position 0...');
            await newSound.playFromPositionAsync(0);

            // 位置ずれ補正（端末差吸収）
            const st2 = await newSound.getStatusAsync();
            if (st2.isLoaded && st2.positionMillis && st2.positionMillis > 10) {
              console.warn('🎵 [GLOBAL] Position drift detected, correcting:',
                `${st2.positionMillis}ms → 0ms`);
              await newSound.setPositionAsync(0);
            }

            setIsPlaying(true);
            console.log('🎵 [GLOBAL] Playback started successfully');
            
            // 再生履歴を記録（非同期、エラーでも再生は継続）
            audioPlayHistoryService.recordPlay(track.id).catch(error => {
              console.warn('🎵 [GLOBAL] Failed to record play history:', error);
            });
          } else {
            console.warn('🎵 [GLOBAL] Buffer not ready, retrying...', {
              isLoaded: st.isLoaded,
              isBuffering: st.isBuffering,
              duration: st.isLoaded ? st.durationMillis : 'unknown'
            });

            // 再試行: 250ms待ってもう一度
            await new Promise(resolve => setTimeout(resolve, 250));
            const st3 = await newSound.getStatusAsync();
            if (st3.isLoaded && !st3.isBuffering && st3.durationMillis && st3.durationMillis > 0) {
              setDurationMs(st3.durationMillis);
              await new Promise(resolve => setTimeout(resolve, 150));
              await newSound.playFromPositionAsync(0);
              setIsPlaying(true);
              console.log('🎵 [GLOBAL] Playback started (after retry)');
              
              // 再生履歴を記録（非同期、エラーでも再生は継続）
              audioPlayHistoryService.recordPlay(track.id).catch(error => {
                console.warn('🎵 [GLOBAL] Failed to record play history:', error);
              });
            } else {
              // フォールバック: 通常再生
              await newSound.playAsync();
              setIsPlaying(true);
              
              // 再生履歴を記録（非同期、エラーでも再生は継続）
              audioPlayHistoryService.recordPlay(track.id).catch(error => {
                console.warn('🎵 [GLOBAL] Failed to record play history:', error);
              });
              console.warn('🎵 [GLOBAL] Fallback to playAsync()');
            }
          }
        } catch (playErr) {
          console.error('🎵 [GLOBAL] Playback start failed:', playErr);
          // エラー時はフォールバックで再生試行
          try {
            await newSound.playAsync();
            setIsPlaying(true);
          } catch {}
        }
      } catch (loadErr) {
        console.error('🎵 [GLOBAL] createAsync failed:', loadErr);
        console.error('🎵 [GLOBAL] Track URI:', track.uri);
        console.error('🎵 [GLOBAL] Error type:', typeof loadErr);
        console.error('🎵 [GLOBAL] Error message:', loadErr?.message);
        console.error('🎵 [GLOBAL] Full error details:', JSON.stringify(loadErr, null, 2));
        
        Alert.alert(
          '再生エラー', 
          `音声の読み込みに失敗しました\\n\\nURI: ${track.uri}\\nエラー: ${loadErr?.message || 'Unknown error'}`
        );
        return; // currentTrackを設定せずに早期リターン
      }

      // ⭐ createAsync成功後にのみcurrentTrackを設定 ⭐
      const trackWithState: AudioTrack = {
        ...track,
        metadataLoading: needsMetadataFetch
      };
      setCurrentTrack(trackWithState);

      // 非同期でメタデータ補完開始（再生と並行）
      if (needsMetadataFetch) {
        console.log(`[AUDIO-PLAYBACK] Starting metadata fetch for audio ${track.id}`);
        enhanceTrackMetadata(track.id);
      }

      setSound(newSound);
      // setIsPlaying(true) は上のプレロールロジック内で設定済み

      // 初期ステータス確認とdurationの取得
      try {
        const initialStatus = await newSound.getStatusAsync();
        if (initialStatus.isLoaded) {
          const initialDuration = initialStatus.durationMillis || track.duration || 0;
          console.log('🎵 [GLOBAL] Sound loaded - Initial status:', {
            durationMillis: initialStatus.durationMillis,
            trackDuration: track.duration,
            finalDuration: initialDuration,
            positionMillis: initialStatus.positionMillis,
            uri: initialStatus.uri
          });
          if (initialDuration > 0) {
            setDurationMs(initialDuration);
            console.log('🎵 [GLOBAL] Set initial durationMs:', initialDuration);
          } else if (track.duration) {
            // Fallback to track.duration from API if status doesn't provide it
            setDurationMs(track.duration);
            console.log('🎵 [GLOBAL] Using track.duration as fallback:', track.duration);
          }
        }
      } catch (err) {
        console.warn('🎵 [GLOBAL] Failed to get initial status:', err);
        // Last resort: use track.duration if available
        if (track.duration) {
          setDurationMs(track.duration);
          console.log('🎵 [GLOBAL] Using track.duration after status error:', track.duration);
        }
      }

      // 再生速度の適用（可能な環境のみ）
      try {
        const speed = settings?.playback?.playbackSpeed ?? 1.0;
        if (newSound && typeof (newSound as any).setRateAsync === 'function' && speed && speed !== 1.0) {
          await (newSound as any).setRateAsync(speed, true);
        }
      } catch {}

      // 再生状態の監視（進捗情報も更新）
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          // 進捗情報更新
          const currentPosition = status.positionMillis || 0;
          // Use track.duration as fallback if status.durationMillis is undefined
          const totalDuration = status.durationMillis || track.duration || 0;
          const currentProgress = totalDuration > 0 ? currentPosition / totalDuration : 0;

          setPositionMs(currentPosition);
          if (totalDuration > 0 && totalDuration !== durationMs) {
            setDurationMs(totalDuration);
          }
          setProgress(currentProgress);
          setBuffering(status.isBuffering || false);
          setIsPlaying(status.isPlaying || false);

          // OSメディアコントロール: Now Playing情報を更新
          updateNowPlayingInfo(track, currentPosition, totalDuration, status.isPlaying || false);

          // 再生終了時の処理
          if (status.didJustFinish) {
            setIsPlaying(false);
            setCurrentTrack(null);
            setPositionMs(0);
            setProgress(0);
            console.log('🎵 [GLOBAL] Playback finished');
          }
        }
      });

    } catch (error) {
      console.error('🎵 [GLOBAL] Failed to load sound:', error);
      console.error('🎵 [GLOBAL] Track URI:', track.uri);
      console.error('🎵 [GLOBAL] Error details:', JSON.stringify(error, null, 2));
      
      // currentTrackをクリアして再試行可能な状態にする
      setCurrentTrack(null);
      setIsPlaying(false);
      setBuffering(false);
      
      Alert.alert('再生エラー', `音声の再生に失敗しました\\n\\nURI: ${track.uri}\\nエラー: ${error.message || error}`);
    }
  };

  const pauseSound = async () => {
    if (sound && isPlaying) {
      await sound.pauseAsync();
      setIsPlaying(false);
    }
  };

  const stopSound = async () => {
    if (sound) {
      console.log('🎵 [GLOBAL] Stopping sound');
      await sound.unloadAsync();
      setSound(null);
      setIsPlaying(false);
      setCurrentTrack(null);
      setPositionMs(0);
      setDurationMs(0);
      setProgress(0);
      setBuffering(false);
    }
  };

  // 新しいヘルパーメソッド
  const togglePlayPause = async () => {
    if (!sound || !currentTrack) return;
    
    try {
      if (isPlaying) {
        await sound.pauseAsync();
      } else {
        await sound.playAsync();
      }
    } catch (error) {
      console.error('🎵 [GLOBAL] Toggle play/pause error:', error);
    }
  };

  const seekTo = async (targetPositionMs: number) => {
    if (!sound) return;
    try {
      const st = await sound.getStatusAsync();
      if (!(st as any)?.isLoaded) return;
      const dur = (st as any).durationMillis || durationMs || 0;
      const clamped = Math.max(0, Math.min(targetPositionMs, dur > 0 ? dur - 10 : targetPositionMs));
      await sound.setPositionAsync(clamped);
      setPositionMs(clamped);
      setProgress(dur > 0 ? clamped / dur : 0);
    } catch (error) {
      console.error('🎵 [GLOBAL] Seek error:', error);
      // Handle transient "interrupted" by retrying once after a short delay
      try {
        await new Promise(r => setTimeout(r, 150));
        const st2 = await sound.getStatusAsync();
        if ((st2 as any)?.isLoaded) {
          const dur2 = (st2 as any).durationMillis || durationMs || 0;
          const clamped2 = Math.max(0, Math.min(targetPositionMs, dur2 > 0 ? dur2 - 10 : targetPositionMs));
          await sound.setPositionAsync(clamped2);
          setPositionMs(clamped2);
          setProgress(dur2 > 0 ? clamped2 / dur2 : 0);
        }
      } catch {}
    }
  };

  const isCurrentTrack = (trackId: string): boolean => {
    return currentTrack?.id === trackId && isPlaying;
  };

  // キュー管理関数
  const addToQueue = (track: AudioTrack) => {
    setQueue(prevQueue => {
      // 既に存在する場合は追加しない
      if (prevQueue.some(t => t.id === track.id)) {
        return prevQueue;
      }
      return [...prevQueue, track];
    });
  };

  const playNext = async () => {
    if (currentIndex < queue.length - 1) {
      const nextTrack = queue[currentIndex + 1];
      setCurrentIndex(currentIndex + 1);
      await playSound(nextTrack);
    }
  };

  const playPrevious = async () => {
    if (currentIndex > 0) {
      const previousTrack = queue[currentIndex - 1];
      setCurrentIndex(currentIndex - 1);
      await playSound(previousTrack);
    }
  };

  const clearQueue = () => {
    setQueue([]);
    setCurrentIndex(-1);
  };

  // キューナビゲーション用のヘルパー
  const hasNext = currentIndex < queue.length - 1;
  const hasPrevious = currentIndex > 0;

  // メタデータ補完関数
  const enhanceTrackMetadata = async (audioId: string) => {
    try {
      console.log(`[AUDIO-PLAYBACK] Fetching enhanced metadata for audio ${audioId}`);
      
      const metadata = await AudioMetadataService.getById(audioId, token || undefined);
      
      if (metadata && currentTrack?.id === audioId) {
        console.log(`[AUDIO-PLAYBACK] Metadata fetch successful for audio ${audioId}`);
        
        setCurrentTrack(prevTrack => {
          if (!prevTrack || prevTrack.id !== audioId) {
            // 別の音声に切り替わった場合は更新しない
            return prevTrack;
          }
          
          return {
            ...prevTrack,
            // タイトルが未設定/プレースホルダーならAPIのタイトルで補完
            title: (!prevTrack.title || prevTrack.title === 'AUTOPICK生成音声') && (metadata as any).title
              ? String((metadata as any).title)
              : prevTrack.title,
            // 既存データが優先、メタデータで補完
            script: prevTrack.script || metadata.script,
            chapters: prevTrack.chapters?.length ? prevTrack.chapters : metadata.chapters,
            sourceName: prevTrack.sourceName || metadata.sourceName,
            publishedAt: prevTrack.publishedAt || metadata.publishedAt,
            imageUrl: prevTrack.imageUrl || metadata.imageUrl,
            metadata: metadata,
            metadataLoading: false
          };
        });
      } else if (currentTrack?.id === audioId) {
        // メタデータ取得失敗時
        console.warn(`[AUDIO-PLAYBACK] Failed to fetch metadata for audio ${audioId}`);
        setCurrentTrack(prevTrack => 
          prevTrack ? { ...prevTrack, metadataLoading: false } : null
        );
      }
    } catch (error) {
      console.error(`[AUDIO-PLAYBACK] Error fetching metadata for audio ${audioId}:`, error);
      
      // エラー時もローディング状態を解除
      setCurrentTrack(prevTrack => 
        prevTrack && prevTrack.id === audioId 
          ? { ...prevTrack, metadataLoading: false } 
          : prevTrack
      );
    }
  };
  
  const refreshMetadata = async (audioId?: string) => {
    const id = audioId || currentTrack?.id;
    if (!id) return;
    await enhanceTrackMetadata(id);
  };

  // コンポーネントがアンマウントされるときのクリーンアップ
  useEffect(() => {
    return () => {
      if (sound) {
        console.log('🎵 [GLOBAL] Cleanup on unmount');
        sound.unloadAsync();
      }
    };
  }, [sound]);

  // Configure audio mode once (background, silent mode, mixing)
  useEffect(() => {
    (async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
          shouldDuckAndroid: true,
          interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
          playThroughEarpieceAndroid: false,
        });
      } catch (e) {
        console.warn('Audio mode setup failed:', e);
      }
    })();
  }, []);

  return (
    <GlobalAudioContext.Provider
      value={{
        currentTrack,
        isPlaying,
        positionMs,
        durationMs,
        progress,
        buffering,
        queue,
        currentIndex,
        playSound,
        pauseSound,
        stopSound,
        togglePlayPause,
        seekTo,
        addToQueue,
        playNext,
        playPrevious,
        clearQueue,
        isCurrentTrack,
        hasNext,
        hasPrevious,
        refreshMetadata,
      }}
    >
      {children}
    </GlobalAudioContext.Provider>
  );
};

export const useGlobalAudio = (): GlobalAudioContextType => {
  const context = useContext(GlobalAudioContext);
  if (!context) {
    throw new Error('useGlobalAudio must be used within a GlobalAudioProvider');
  }
  return context;
};
