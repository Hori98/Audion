import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { Alert } from 'react-native';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

class ApiService {
  private instance: AxiosInstance;
  private authErrorHandler?: () => Promise<void>;

  constructor() {
    const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8003';
    
    this.instance = axios.create({
      baseURL: `${BACKEND_URL}/api`,
      timeout: 30000,
    });

    this.setupInterceptors();
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
    // Response interceptor for common error handling
    this.instance.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401 && this.authErrorHandler) {
          // Handle 401 errors automatically
          await this.authErrorHandler();
          return Promise.reject(error);
        }
        
        // Log other errors
        console.error('API Error:', error.response?.data || error.message);
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
export const apiService = new ApiService();
export default apiService;