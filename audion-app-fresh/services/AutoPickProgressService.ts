/**
 * AutoPick Progress Service
 * Server-Sent Events (SSE) connection for real-time progress monitoring
 */

import { API_CONFIG, API_ENDPOINTS, buildPath } from '../config/api';
// @ts-ignore - react-native-sse type definitions may not be available
import EventSource from 'react-native-sse';

export interface AutoPickProgressData {
  task_id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: number;
  message: string;
  updated_at: string;
  result?: any;
  error?: string;
  debug_info?: any;
}

export class AutoPickProgressService {
  private eventSource: EventSource | null = null;
  private fetchController: AbortController | null = null;
  private onProgressCallback: ((data: AutoPickProgressData) => void) | null = null;
  private onCompleteCallback: ((data: AutoPickProgressData) => void) | null = null;
  private onErrorCallback: ((error: string) => void) | null = null;

  /**
   * Start monitoring progress for a task using polling (React Native compatible)
   */
  private async startPollingBasedMonitoring(
    taskId: string,
    token: string,
    callbacks: {
      onProgress?: (data: AutoPickProgressData) => void;
      onComplete?: (data: AutoPickProgressData) => void;
      onError?: (error: string) => void;
    }
  ): Promise<void> {
    // Create a simple polling endpoint (non-SSE)
    const statusPath = buildPath(API_ENDPOINTS.AUTOPICK_TASK.STATUS, { task_id: taskId });
    const url = `${API_CONFIG.BASE_URL}${statusPath}?token=${encodeURIComponent(token)}`;
    if (__DEV__) {
      console.log(`[POLLING] Starting polling-based monitoring for task ${taskId}`);
      console.log(`[POLLING] URL: ${url}`);
    }

    this.fetchController = new AbortController();
    let lastUpdateTime: string | null = null;
    let pollCount = 0;
    let didQuickRetry = false;
    let intervalMs = 2000; // adaptive polling interval
    const maxIntervalMs = 10000;
    let stagnantCount = 0;
    
    try {
      while (!this.fetchController.signal.aborted) {
        pollCount++;
        // Polling attempt (reduced logging)
        
        try {
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Cache-Control': 'no-cache',
            },
            signal: this.fetchController.signal,
          });

          // Response received

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const data: AutoPickProgressData = await response.json();
          // Data received from server

          // Only trigger callbacks if data has actually changed
          if (data.updated_at !== lastUpdateTime) {
            // Progress updated - triggering callbacks
            lastUpdateTime = data.updated_at;
            intervalMs = 2000; // reset backoff on progress
            stagnantCount = 0;
            
            if (callbacks.onProgress) {
              callbacks.onProgress(data);
            }

            if (data.status === 'completed' || data.status === 'failed') {
              if (callbacks.onComplete) {
                callbacks.onComplete(data);
              }
              console.log(`[POLLING] Task completed with status: ${data.status}`);
              return; // End monitoring
            }
          } else {
            // No change detected - light backoff every 3 stagnant polls
            stagnantCount += 1;
            if (stagnantCount % 3 === 0) {
              intervalMs = Math.min(maxIntervalMs, intervalMs * 2);
            }
          }

        } catch (fetchError: any) {
          if (fetchError.name === 'AbortError') {
            if (__DEV__) console.log('[POLLING] Monitoring aborted');
            return;
          } else {
            if (__DEV__) console.error(`[POLLING] Fetch error on attempt #${pollCount}:`, fetchError);
            // One-shot quick retry once before regular loop continues
            if (!didQuickRetry) {
              didQuickRetry = true;
              await new Promise(r => setTimeout(r, 1000));
              continue;
            }
            // Backoff more aggressively on fetch errors
            intervalMs = Math.min(maxIntervalMs, Math.max(4000, intervalMs * 2));
            // Continue polling despite individual fetch errors
          }
        }

        // Wait with adaptive interval
        await new Promise(resolve => {
          const timeoutId = setTimeout(resolve, intervalMs);
          // Allow abortion during wait
          this.fetchController.signal.addEventListener('abort', () => {
            clearTimeout(timeoutId);
            resolve(undefined);
          });
        });
      }
    } catch (error) {
      if (__DEV__) console.error('[POLLING] Polling error:', error);
      if (callbacks.onError) {
        callbacks.onError(`Polling error: ${error.message}`);
      }
    }
  }

  /**
   * Start monitoring progress for a task
   */
  public startMonitoring(
    taskId: string,
    token: string,
    callbacks: {
      onProgress?: (data: AutoPickProgressData) => void;
      onComplete?: (data: AutoPickProgressData) => void;
      onError?: (error: string) => void;
    }
  ): void {
    // Close existing connection
    this.stopMonitoring();

    this.onProgressCallback = callbacks.onProgress || null;
    this.onCompleteCallback = callbacks.onComplete || null;
    this.onErrorCallback = callbacks.onError || null;

    // 🚀 Use polling-based monitoring for React Native compatibility
    if (__DEV__) console.log(`[SSE] Using polling-based monitoring for React Native compatibility`);
    this.startPollingBasedMonitoring(taskId, token, callbacks).catch((error) => {
      if (__DEV__) console.error('[SSE] Polling-based monitoring failed:', error);
      if (callbacks.onError) {
        callbacks.onError(`Monitoring failed: ${error.message}`);
      }
    });
    
    return; // Skip EventSource implementation for now
    
    try {
      // Note: EventSource doesn't support custom headers directly
      // We'll need to pass the token as a query parameter for authentication
      const ssePath = buildPath(API_ENDPOINTS.AUTOPICK_TASK.STATUS, { task_id: taskId }).replace('task-status', 'status');
      const url = `${API_CONFIG.BASE_URL}${ssePath}?token=${encodeURIComponent(token)}`;
      
      // --- ★ 追加ログ 1: 接続先URLの確認 ---
      if (__DEV__) {
        console.log(`[SSE DEBUG] Attempting to connect to: ${url}`);
        console.log(`[SSE DEBUG] API_CONFIG.BASE_URL: ${API_CONFIG.BASE_URL}`);
        console.log(`[SSE DEBUG] Task ID: ${taskId}`);
        console.log(`[SSE DEBUG] Token length: ${token ? token.length : 0}`);
      }

      this.eventSource = new EventSource(url);
      
      if (__DEV__) {
        console.log(`[SSE DEBUG] EventSource created, readyState: ${this.eventSource.readyState}`);
        console.log(`[SSE DEBUG] EventSource constants: CONNECTING=${EventSource.CONNECTING}, OPEN=${EventSource.OPEN}, CLOSED=${EventSource.CLOSED}`);
      }
      
      // React Native EventSource state monitoring with timeout
      let connectionTimeout = setTimeout(() => {
        if (__DEV__) console.error('[SSE DEBUG] Connection timeout - no onopen event received within 10 seconds');
        if (this.eventSource && this.eventSource.readyState !== EventSource.OPEN) {
          if (__DEV__) console.error('[SSE DEBUG] Forcing connection close due to timeout');
          this.eventSource.close();
          if (this.onErrorCallback) {
            this.onErrorCallback('Connection timeout - please try again');
          }
        }
      }, 10000); // 10 second timeout

      this.eventSource.onopen = () => {
        clearTimeout(connectionTimeout);
        if (__DEV__) {
          console.log(`📡 [SSE] Connected to AutoPick progress stream for task ${taskId}`);
          console.log(`[SSE DEBUG] Connection opened, readyState: ${this.eventSource?.readyState}`);
        }
      };

      this.eventSource.onmessage = (event) => {
        // --- ★ 追加ログ 2: 生データの確認 ---
        if (__DEV__) {
          console.log(`[SSE DEBUG] Raw data received:`, event.data);
          console.log(`[SSE DEBUG] Event type:`, event.type);
          console.log(`[SSE DEBUG] Event lastEventId:`, event.lastEventId);
        }

        try {
          // バックエンドからのkeep-aliveメッセージなどを考慮
          if (!event.data || event.data.startsWith(':')) {
            console.log('[SSE DEBUG] Keep-alive or empty message received. Skipping parse.');
            return;
          }

          const data: AutoPickProgressData = JSON.parse(event.data);
          console.log(`📊 [SSE] Progress update:`, data);

          if (this.onProgressCallback) {
            if (__DEV__) console.log(`[SSE DEBUG] Calling onProgressCallback with data:`, data);
            this.onProgressCallback(data);
          } else {
            if (__DEV__) console.log(`[SSE DEBUG] No onProgressCallback set!`);
          }

          // Check if task is completed or failed
          if (data.status === 'completed' || data.status === 'failed') {
            if (__DEV__) console.log(`[SSE DEBUG] Task finished with status: ${data.status}`);
            if (this.onCompleteCallback) {
              if (__DEV__) console.log(`[SSE DEBUG] Calling onCompleteCallback with data:`, data);
              this.onCompleteCallback(data);
            } else {
              if (__DEV__) console.log(`[SSE DEBUG] No onCompleteCallback set!`);
            }
            // Auto-close connection on completion
            this.stopMonitoring();
          }
        } catch (error) {
          if (__DEV__) {
            console.error('📊 [SSE] Error parsing progress data:', error);
            console.error('[SSE DEBUG] Raw data that failed to parse:', event.data);
          }
          if (this.onErrorCallback) {
            this.onErrorCallback('Failed to parse progress data');
          }
        }
      };

      this.eventSource.onerror = (error) => {
        // --- ★ 修正ログ 3: 詳細なエラー情報の確認 ---
        if (__DEV__) {
          console.error('📊 [SSE] EventSource error. Full error object:', JSON.stringify(error, null, 2));
          console.error('[SSE DEBUG] EventSource readyState:', this.eventSource?.readyState);
          console.error('[SSE DEBUG] Error details:', error);
        }
        if (this.onErrorCallback) {
          this.onErrorCallback('Connection error occurred');
        }
        // Auto-reconnection is handled by EventSource by default
      };

    } catch (error) {
      console.error('📊 [SSE] Failed to create EventSource:', error);
      console.error('[SSE DEBUG] Exception during EventSource creation:', error);
      if (this.onErrorCallback) {
        this.onErrorCallback('Failed to start monitoring');
      }
    }
  }

  /**
   * Stop monitoring progress
   */
  public stopMonitoring(): void {
    if (this.eventSource) {
      console.log('📡 [SSE] Closing AutoPick progress stream');
      this.eventSource.close();
      this.eventSource = null;
    }
    
    if (this.fetchController) {
      console.log('📡 [SSE FETCH] Aborting fetch-based monitoring');
      this.fetchController.abort();
      this.fetchController = null;
    }
    
    this.onProgressCallback = null;
    this.onCompleteCallback = null;
    this.onErrorCallback = null;
  }

  /**
   * Check if currently monitoring
   */
  public isMonitoring(): boolean {
    return this.eventSource !== null && this.eventSource.readyState !== EventSource.CLOSED;
  }
}

// Global singleton instance
export const autoPickProgressService = new AutoPickProgressService();
