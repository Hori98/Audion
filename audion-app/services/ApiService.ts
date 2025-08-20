import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { Alert } from 'react-native';
import { API_CONFIG, buildEndpointURL } from '../config/api';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

class ApiService {
  private static _instance: ApiService;
  private instance: AxiosInstance;
  private authErrorHandler?: () => Promise<void>;

  private constructor() {
    // Debug logging for mobile
    if (__DEV__) {
      console.log(`📱 ApiService Debug:
        Base URL: ${API_CONFIG.apiURL}
        Backend URL from env: ${process.env.EXPO_PUBLIC_BACKEND_URL}
      `);
    }

    this.instance = axios.create({
      baseURL: API_CONFIG.apiURL,
      timeout: API_CONFIG.timeout,
      headers: API_CONFIG.defaultHeaders,
    });

    this.setupInterceptors();
  }

  // Singleton pattern
  static getInstance(): ApiService {
    if (!ApiService._instance) {
      ApiService._instance = new ApiService();
    }
    return ApiService._instance;
  }

  // Set the auth error handler from AuthContext
  setAuthErrorHandler(handler: () => Promise<void>) {
    this.authErrorHandler = handler;
  }

  // Set authorization token
  setAuthToken(token: string | null) {
    if (token) {
      this.instance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete this.instance.defaults.headers.common['Authorization'];
    }
  }

  private setupInterceptors() {
    // Request interceptor for debugging
    this.instance.interceptors.request.use(
      (config) => {
        console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
        console.log(`[API] Full URL: ${config.baseURL}${config.url}`);
        console.log(`[API] Timeout: ${config.timeout}ms`);
        return config;
      },
      (error) => {
        console.error('[API] Request setup error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for common error handling
    this.instance.interceptors.response.use(
      (response: AxiosResponse) => {
        console.log(`[API] Response: ${response.status} ${response.config.url}`);
        return response;
      },
      async (error: AxiosError) => {
        const status = error.response?.status;
        const url = error.config?.url;
        
        console.error(`[API] Error: ${status} ${url}`, error.response?.data || error.message);
        
        // Enhanced error logging for mobile debugging
        if (!error.response) {
          console.error('[API] Network Error Details:', {
            message: error.message,
            code: error.code,
            stack: error.stack,
            config: {
              url: error.config?.url,
              baseURL: error.config?.baseURL,
              timeout: error.config?.timeout,
              method: error.config?.method
            }
          });
        }
        
        if (status === 401 && this.authErrorHandler) {
          await this.authErrorHandler();
          return Promise.reject(error);
        }
        
        // Handle common errors
        if (status === 429) {
          Alert.alert('Rate Limited', 'Too many requests. Please try again later.');
        } else if (status && status >= 500) {
          Alert.alert('Server Error', 'Server is experiencing issues. Please try again.');
        }
        
        return Promise.reject(error);
      }
    );
  }

  // Generic GET request
  async get<T>(url: string, config?: any): Promise<ApiResponse<T>> {
    try {
      const response = await this.instance.get(url, config);
      return { success: true, data: response.data };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.response?.data?.detail || error.message || 'Request failed' 
      };
    }
  }

  // Endpoint-based GET request
  async getEndpoint<T>(endpointPath: string, config?: any): Promise<ApiResponse<T>> {
    try {
      const url = buildEndpointURL(endpointPath);
      return await this.get<T>(url.replace(API_CONFIG.apiURL, ''), config);
    } catch (error: any) {
      return { 
        success: false, 
        error: error.message || 'Invalid endpoint path' 
      };
    }
  }

  // Generic POST request
  async post<T>(url: string, data?: any, config?: any): Promise<ApiResponse<T>> {
    try {
      const response = await this.instance.post(url, data, config);
      return { success: true, data: response.data };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.response?.data?.detail || error.message || 'Request failed' 
      };
    }
  }

  // Endpoint-based POST request
  async postEndpoint<T>(endpointPath: string, data?: any, config?: any): Promise<ApiResponse<T>> {
    try {
      const url = buildEndpointURL(endpointPath);
      return await this.post<T>(url.replace(API_CONFIG.apiURL, ''), data, config);
    } catch (error: any) {
      return { 
        success: false, 
        error: error.message || 'Invalid endpoint path' 
      };
    }
  }

  // Generic PUT request
  async put<T>(url: string, data?: any, config?: any): Promise<ApiResponse<T>> {
    try {
      const response = await this.instance.put(url, data, config);
      return { success: true, data: response.data };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.response?.data?.detail || error.message || 'Request failed' 
      };
    }
  }

  // Generic DELETE request
  async delete<T>(url: string, config?: any): Promise<ApiResponse<T>> {
    try {
      const response = await this.instance.delete(url, config);
      return { success: true, data: response.data };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.response?.data?.detail || error.message || 'Request failed' 
      };
    }
  }

  // Raw axios instance for backwards compatibility
  get axios() {
    return this.instance;
  }
}

// Export singleton instance
export const apiService = ApiService.getInstance();
export default apiService;

// Export the class for type definitions
export { ApiService };