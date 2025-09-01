/**
 * AutoPick Progress Service
 * Server-Sent Events (SSE) connection for real-time progress monitoring
 */

import { API_CONFIG } from '../config/api';
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
  private onProgressCallback: ((data: AutoPickProgressData) => void) | null = null;
  private onCompleteCallback: ((data: AutoPickProgressData) => void) | null = null;
  private onErrorCallback: ((error: string) => void) | null = null;

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

    try {
      // Note: EventSource doesn't support custom headers directly
      // We'll need to pass the token as a query parameter for authentication
      const url = `${API_CONFIG.BASE_URL}/auto-pick/status/${taskId}?token=${encodeURIComponent(token)}`;
      
      this.eventSource = new EventSource(url);

      this.eventSource.onopen = () => {
        console.log(`📡 [SSE] Connected to AutoPick progress stream for task ${taskId}`);
      };

      this.eventSource.onmessage = (event) => {
        try {
          const data: AutoPickProgressData = JSON.parse(event.data);
          console.log(`📊 [SSE] Progress update:`, data);

          if (this.onProgressCallback) {
            this.onProgressCallback(data);
          }

          // Check if task is completed or failed
          if (data.status === 'completed' || data.status === 'failed') {
            if (this.onCompleteCallback) {
              this.onCompleteCallback(data);
            }
            // Auto-close connection on completion
            this.stopMonitoring();
          }
        } catch (error) {
          console.error('📊 [SSE] Error parsing progress data:', error);
          if (this.onErrorCallback) {
            this.onErrorCallback('Failed to parse progress data');
          }
        }
      };

      this.eventSource.onerror = (error) => {
        console.error('📊 [SSE] EventSource error:', error);
        if (this.onErrorCallback) {
          this.onErrorCallback('Connection error occurred');
        }
        // Auto-reconnection is handled by EventSource by default
      };

    } catch (error) {
      console.error('📊 [SSE] Failed to create EventSource:', error);
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