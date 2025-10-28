/**
 * AutoPick Progress Service
 * Polling-based progress monitoring for React Native compatibility
 */

import { API_CONFIG, API_ENDPOINTS, buildPath } from '../config/api';

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
  // Toggle detailed polling logs (keep AP-CLIENT logs elsewhere)
  private static readonly POLLING_DEBUG = false;
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
    if (__DEV__ && AutoPickProgressService.POLLING_DEBUG) {
      console.log(`[POLLING] Starting polling-based monitoring for task ${taskId}`);
      console.log(`[POLLING] URL: ${url}`);
    }

    this.fetchController = new AbortController();
    const controller = this.fetchController; // capture local reference to avoid null races
    let lastUpdateTime: string | null = null;
    let pollCount = 0;
    let didQuickRetry = false;
    let intervalMs = 2000; // adaptive polling interval
    const maxIntervalMs = 10000;
    let stagnantCount = 0;
    
    try {
      while (!controller.signal.aborted) {
        pollCount++;
        // Polling attempt (reduced logging)
        
        try {
          if (AutoPickProgressService.POLLING_DEBUG) {
            console.log('🔍 [POLLING] Request URL:', url);
            console.log('🔍 [POLLING] Token length:', token?.length || 0);
          }
          
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Cache-Control': 'no-cache',
            },
            signal: controller.signal,
          });

          // Response received

          if (!response.ok) {
            const errorText = await response.text();
            if (AutoPickProgressService.POLLING_DEBUG) {
              console.error('🔍 [POLLING] Error response:', errorText);
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
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
            if (AutoPickProgressService.POLLING_DEBUG) {
              console.log(`[POLLING] Task completed with status: ${data.status}`);
            }
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
          controller.signal.addEventListener('abort', () => {
            clearTimeout(timeoutId);
            resolve(undefined);
          });
        });
      }
    } catch (error) {
      if (__DEV__ && AutoPickProgressService.POLLING_DEBUG) console.error('[POLLING] Polling error:', error);
      if (callbacks.onError) {
        callbacks.onError(`Polling error: ${error.message}`);
      }
    }
  }

  /**
   * Start monitoring progress for a task using polling (React Native compatible)
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

    // Use polling-based monitoring for React Native compatibility
    if (__DEV__ && AutoPickProgressService.POLLING_DEBUG) {
      console.log(`[POLLING] Starting polling-based monitoring for React Native compatibility`);
    }

    this.startPollingBasedMonitoring(taskId, token, callbacks).catch((error) => {
      if (__DEV__ && AutoPickProgressService.POLLING_DEBUG) {
        console.error('[POLLING] Monitoring failed:', error);
      }
      if (callbacks.onError) {
        callbacks.onError(`Monitoring failed: ${error.message}`);
      }
    });
  }

  /**
   * Stop monitoring progress
   */
  public stopMonitoring(): void {
    if (this.fetchController) {
      if (__DEV__ && AutoPickProgressService.POLLING_DEBUG) {
        console.log('📡 [POLLING] Aborting polling-based monitoring');
      }
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
    return this.fetchController !== null;
  }
}

// Global singleton instance
export const autoPickProgressService = new AutoPickProgressService();
