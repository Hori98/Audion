/**
 * Advanced Connection Service with Retry Logic and Health Monitoring
 * Prevents infinite loading screens and provides connection diagnostics
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ConnectionStatus {
  isConnected: boolean;
  lastChecked: number;
  serverHealth: 'healthy' | 'degraded' | 'unhealthy';
  latency: number;
  errors: string[];
}

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryCondition?: (error: any) => boolean;
}

class ConnectionService {
  private static instance: ConnectionService;
  private axiosInstance: AxiosInstance;
  private connectionStatus: ConnectionStatus;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private readonly HEALTH_CHECK_INTERVAL = 60000; // 60 seconds (reduced frequency)
  private readonly CONNECTION_TIMEOUT = 30000; // 30 seconds (increased for slow networks)
  private readonly BACKEND_URLS = [
    process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8003',
    'http://localhost:8003', // Primary development server (uvicorn)
    'http://127.0.0.1:8003', // Localhost alternative
    'http://localhost:8002', // Alternative port
    'http://localhost:8001', // Legacy fallback
    'http://192.168.11.63:8003', // Current network IP
  ];

  private constructor() {
    this.connectionStatus = {
      isConnected: false,
      lastChecked: 0,
      serverHealth: 'unhealthy',
      latency: 0,
      errors: []
    };

    this.axiosInstance = axios.create({
      timeout: this.CONNECTION_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      }
    });

    this.setupInterceptors();
    this.startHealthMonitoring();
  }

  static getInstance(): ConnectionService {
    if (!ConnectionService.instance) {
      ConnectionService.instance = new ConnectionService();
    }
    return ConnectionService.instance;
  }

  private setupInterceptors() {
    // Request interceptor
    this.axiosInstance.interceptors.request.use(
      (config: any) => {
        // Add timestamp for latency calculation
        config.metadata = { startTime: Date.now() };
        return config;
      },
      (error) => {
        console.error('Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse & { config: any }) => {
        // Calculate latency
        const endTime = Date.now();
        const startTime = response.config.metadata?.startTime || endTime;
        this.connectionStatus.latency = endTime - startTime;
        this.connectionStatus.isConnected = true;
        this.connectionStatus.serverHealth = 'healthy';
        this.connectionStatus.lastChecked = endTime;
        
        return response;
      },
      (error) => {
        this.handleConnectionError(error);
        return Promise.reject(error);
      }
    );
  }

  private handleConnectionError(error: any) {
    const errorMessage = error.message || 'Unknown error';
    this.connectionStatus.errors.unshift(errorMessage);
    this.connectionStatus.errors = this.connectionStatus.errors.slice(0, 5); // Keep last 5 errors
    this.connectionStatus.lastChecked = Date.now();

    if (error.code === 'ECONNABORTED' || errorMessage.includes('timeout')) {
      this.connectionStatus.serverHealth = 'degraded';
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      this.connectionStatus.isConnected = false;
      this.connectionStatus.serverHealth = 'unhealthy';
    }
  }

  async findWorkingBackendUrl(): Promise<string> {
    // Skip connection testing in SSR environment
    if (typeof window === 'undefined') {
      const defaultUrl = this.BACKEND_URLS[0];
      this.axiosInstance.defaults.baseURL = `${defaultUrl}/api`;
      return defaultUrl;
    }
    
    console.log('🔍 Searching for working backend URL...');
    
    for (const url of this.BACKEND_URLS) {
      try {
        console.log(`Testing: ${url}`);
        const startTime = Date.now();
        
        const response = await axios.get(`${url}/health`, {
          timeout: 5000,
          headers: { 'Accept': 'application/json' }
        });
        
        const latency = Date.now() - startTime;
        
        if (response.status === 200) {
          console.log(`✅ Found working backend: ${url} (${latency}ms)`);
          this.connectionStatus = {
            isConnected: true,
            lastChecked: Date.now(),
            serverHealth: latency < 1000 ? 'healthy' : 'degraded',
            latency,
            errors: []
          };
          
          // Update axios base URL
          this.axiosInstance.defaults.baseURL = `${url}/api`;
          
          // Cache the working URL
          await AsyncStorage.setItem('last_working_backend_url', url);
          
          return url;
        }
      } catch (error: any) {
        console.log(`❌ ${url} failed: ${error.message}`);
        continue;
      }
    }
    
    throw new Error('No working backend server found');
  }

  async ensureConnection(): Promise<void> {
    // Skip connection check in SSR environment
    if (typeof window === 'undefined') {
      return;
    }
    
    if (this.connectionStatus.isConnected && 
        this.connectionStatus.serverHealth === 'healthy' &&
        Date.now() - this.connectionStatus.lastChecked < 30000) {
      return; // Recent healthy connection
    }

    try {
      // Add initial grace period for backend startup (increased for slow networks)
      console.log('⏳ Waiting for backend to be ready...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Set a maximum timeout for the entire connection process
      const connectionPromise = this.findWorkingBackendUrl();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout')), 30000)
      );
      
      await Promise.race([connectionPromise, timeoutPromise]);
    } catch (error) {
      console.warn('Backend connection failed:', error?.message || error);
      throw new Error(`Connection failed: ${error?.message || 'Unknown error'}. App will continue in offline mode.`);
    }
  }

  async requestWithRetry<T = any>(
    requestConfig: AxiosRequestConfig,
    retryConfig: Partial<RetryConfig> = {}
  ): Promise<T> {
    const config: RetryConfig = {
      maxRetries: 2, // Reduced retries for faster failure detection
      baseDelay: 3000, // Increased for slow networks
      maxDelay: 15000, // Increased max delay
      backoffMultiplier: 2,
      retryCondition: (error) => {
        // Retry on network/timeout errors, not on 4xx client errors
        const shouldRetry = !error.response || error.response.status >= 500 || error.code === 'ECONNABORTED' || error.message === 'Network Error';
        if (shouldRetry && error.message === 'Network Error') {
          console.log('🔄 Network error detected, will retry...');
        }
        return shouldRetry;
      },
      ...retryConfig
    };

    let lastError: any;
    
    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        // Ensure connection before each attempt
        if (attempt > 0) {
          await this.ensureConnection();
        }
        
        console.log(`📡 API Request attempt ${attempt + 1}/${config.maxRetries + 1}: ${requestConfig.method?.toUpperCase()} ${requestConfig.url}`);
        
        const response = await this.axiosInstance(requestConfig);
        
        if (attempt > 0) {
          console.log(`✅ Request succeeded on attempt ${attempt + 1}`);
        }
        
        return response.data;
        
      } catch (error: any) {
        lastError = error;
        console.error(`❌ Request attempt ${attempt + 1} failed:`, error.message);
        
        // Don't retry if it's not a retryable error
        if (!config.retryCondition!(error)) {
          console.log('🚫 Error is not retryable, giving up');
          break;
        }
        
        // Don't wait after the last attempt
        if (attempt < config.maxRetries) {
          const delay = Math.min(
            config.baseDelay * Math.pow(config.backoffMultiplier, attempt),
            config.maxDelay
          );
          console.log(`⏳ Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    console.error(`🔥 All ${config.maxRetries + 1} attempts failed`);
    throw lastError;
  }

  private async startHealthMonitoring() {
    // Skip health monitoring in SSR environment
    if (typeof window === 'undefined') {
      return;
    }
    
    // Initial connection attempt
    try {
      await this.findWorkingBackendUrl();
    } catch (error) {
      console.warn('Initial backend connection failed, will retry periodically');
    }

    // Periodic health checks
    this.healthCheckInterval = setInterval(async () => {
      try {
        const startTime = Date.now();
        await this.axiosInstance.get('/health');
        const latency = Date.now() - startTime;
        
        this.connectionStatus = {
          ...this.connectionStatus,
          isConnected: true,
          serverHealth: latency < 1000 ? 'healthy' : 'degraded',
          latency,
          lastChecked: Date.now()
        };
        
      } catch (error: any) {
        this.handleConnectionError(error);
        
        // Try to find alternative backend if current one fails
        if (!this.connectionStatus.isConnected) {
          try {
            await this.findWorkingBackendUrl();
          } catch (e) {
            // Will try again in next health check
          }
        }
      }
    }, this.HEALTH_CHECK_INTERVAL);
  }

  stopHealthMonitoring() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  getConnectionStatus(): ConnectionStatus {
    return { ...this.connectionStatus };
  }

  getAxiosInstance(): AxiosInstance {
    return this.axiosInstance;
  }

  // Convenience methods with built-in retry
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.requestWithRetry<T>({ method: 'GET', url, ...config });
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.requestWithRetry<T>({ method: 'POST', url, data, ...config });
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.requestWithRetry<T>({ method: 'PUT', url, data, ...config });
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.requestWithRetry<T>({ method: 'DELETE', url, ...config });
  }
}

export default ConnectionService;