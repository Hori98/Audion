import { Alert } from 'react-native';

export interface ErrorContext {
  action: string;
  source?: string;
  details?: Record<string, unknown>;
}

export interface ApiError {
  response?: {
    status: number;
    data?: {
      detail?: string;
    };
  };
  message?: string;
  code?: string;
}

export interface NetworkError extends Error {
  code: string;
  message: string;
}

export class ErrorHandlingService {
  /**
   * Type guards for error types
   */
  private static isApiError(error: unknown): error is ApiError {
    return typeof error === 'object' && error !== null && 'response' in error;
  }

  private static isNetworkError(error: unknown): error is NetworkError {
    return typeof error === 'object' && error !== null && 'code' in error && 'message' in error;
  }

  private static isError(error: unknown): error is Error {
    return error instanceof Error;
  }

  /**
   * Show user-friendly error messages based on error type and context
   */
  static showError(error: ApiError | NetworkError | Error | unknown, context: ErrorContext): void {
    const message = this.getErrorMessage(error, context);
    const title = this.getErrorTitle(context.action);
    
    Alert.alert(title, message);
  }

  /**
   * Get user-friendly error message based on error type
   */
  private static getErrorMessage(error: ApiError | NetworkError | Error | unknown, context: ErrorContext): string {
    // Network errors
    if (this.isNetworkError(error) && (error.code === 'NETWORK_ERROR' || error.message.includes('Network Error'))) {
      return 'Please check your internet connection and try again.';
    }

    // Check for generic Error with Network Error message
    if (this.isError(error) && error.message.includes('Network Error')) {
      return 'Please check your internet connection and try again.';
    }

    // Server errors
    if (this.isApiError(error) && error.response?.status) {
      switch (error.response.status) {
        case 400:
          return this.handleBadRequestError(error, context);
        case 401:
          return 'Your session has expired. Please log in again.';
        case 403:
          return 'You don\'t have permission to perform this action.';
        case 404:
          return this.handle404Error(context);
        case 429:
          return 'Too many requests. Please wait a moment and try again.';
        case 500:
          return 'The server is experiencing issues. Please try again later.';
        case 503:
          return this.handle503Error(error, context);
        default:
          return `Server error (${error.response.status}). Please try again later.`;
      }
    }

    // Timeout errors
    if ((this.isNetworkError(error) && error.code === 'ECONNABORTED') || 
        (this.isError(error) && error.message.includes('timeout'))) {
      return 'The request timed out. Please check your connection and try again.';
    }

    // Audio creation specific errors
    if (context.action === 'create_audio') {
      return this.handleAudioCreationError(error);
    }

    // RSS feed specific errors
    if (context.action === 'add_rss_source') {
      return this.handleRSSError(error);
    }

    // Authentication errors
    if (context.action === 'login' || context.action === 'register') {
      return this.handleAuthError(error);
    }

    // Generic fallback
    if (this.isApiError(error)) {
      return error.response?.data?.detail || 'Server error occurred.';
    }
    
    if (this.isError(error)) {
      return error.message;
    }
    
    return 'Something went wrong. Please try again.';
  }

  /**
   * Get appropriate error title based on action
   */
  private static getErrorTitle(action: string): string {
    switch (action) {
      case 'create_audio':
        return 'Audio Creation Failed';
      case 'login':
        return 'Login Failed';
      case 'register':
        return 'Registration Failed';
      case 'add_rss_source':
        return 'RSS Source Error';
      case 'fetch_articles':
        return 'Loading Failed';
      case 'play_audio':
        return 'Playback Error';
      case 'download_audio':
        return 'Download Failed';
      default:
        return 'Error';
    }
  }

  /**
   * Handle 400 Bad Request errors with context-specific messages
   */
  private static handleBadRequestError(error: ApiError | unknown, context: ErrorContext): string {
    const detail = this.isApiError(error) ? (error.response?.data?.detail || '') : '';
    
    if (context.action === 'create_audio') {
      if (detail.includes('no articles')) {
        return 'No articles were selected. Please choose at least one article to create audio.';
      }
      if (detail.includes('invalid article')) {
        return 'Some selected articles are no longer available. Please refresh and try again.';
      }
    }

    if (context.action === 'add_rss_source') {
      if (detail.includes('invalid URL')) {
        return 'The RSS URL is not valid. Please check the URL and try again.';
      }
      if (detail.includes('already exists')) {
        return 'This RSS source has already been added to your collection.';
      }
    }

    return detail || 'Invalid request. Please check your input and try again.';
  }

  /**
   * Handle 404 Not Found errors with context-specific messages
   */
  private static handle404Error(context: ErrorContext): string {
    switch (context.action) {
      case 'fetch_articles':
        return 'No articles found. Try adding more RSS sources or refresh the page.';
      case 'play_audio':
        return 'This audio file is no longer available.';
      case 'fetch_audio_library':
        return 'Your audio library is empty. Create some audio content first.';
      default:
        return 'The requested resource was not found.';
    }
  }

  /**
   * Handle audio creation specific errors
   */
  private static handleAudioCreationError(error: ApiError | Error | unknown): string {
    let detail = '';
    if (this.isApiError(error)) {
      detail = error.response?.data?.detail || '';
    } else if (this.isError(error)) {
      detail = error.message;
    }
    
    if (detail.includes('quota') || detail.includes('limit')) {
      return 'You\'ve reached your audio creation limit. Please upgrade your plan or wait until tomorrow.';
    }
    
    if (detail.includes('processing')) {
      return 'Audio processing failed. Please try again with different articles.';
    }
    
    if (detail.includes('articles too long')) {
      return 'The selected articles are too long to process. Please choose shorter articles.';
    }
    
    return 'Failed to create audio. Please check your article selection and try again.';
  }

  /**
   * Handle RSS feed specific errors
   */
  private static handleRSSError(error: ApiError | Error | unknown): string {
    let detail = '';
    if (this.isApiError(error)) {
      detail = error.response?.data?.detail || '';
    } else if (this.isError(error)) {
      detail = error.message;
    }
    
    if (detail.includes('feed not accessible')) {
      return 'The RSS feed could not be accessed. Please check if the URL is correct and publicly available.';
    }
    
    if (detail.includes('invalid feed format')) {
      return 'The URL does not contain a valid RSS feed. Please verify the feed URL.';
    }
    
    if (detail.includes('parsing error')) {
      return 'There was an error reading the RSS feed. The feed may be corrupted or in an unsupported format.';
    }
    
    return 'Failed to add RSS source. Please check the URL and try again.';
  }

  /**
   * Handle 503 Service Unavailable errors with context-specific messages
   */
  private static handle503Error(error: ApiError | unknown, context: ErrorContext): string {
    const detail = this.isApiError(error) ? (error.response?.data?.detail || '') : '';
    
    // Database connectivity issues for auto-pick features
    if (context.action === 'fetch_articles' && context.source === 'Auto-pick Screen') {
      return 'Auto-pick is temporarily unavailable due to database connectivity issues. Please try manual article selection instead.';
    }
    
    if (context.action === 'fetch_user_profile' || context.action === 'fetch_user_insights') {
      return 'User preferences are temporarily unavailable due to database connectivity issues. Basic features will work without personalization.';
    }
    
    if (detail.includes('Database service unavailable')) {
      return 'The database service is temporarily unavailable. Some features may not work properly. Please try again later.';
    }
    
    return 'The service is temporarily unavailable. Please try again later.';
  }

  /**
   * Handle authentication specific errors
   */
  private static handleAuthError(error: ApiError | Error | unknown): string {
    let detail = '';
    if (this.isApiError(error)) {
      detail = error.response?.data?.detail || '';
    } else if (this.isError(error)) {
      detail = error.message;
    }
    
    if (detail.includes('invalid credentials') || detail.includes('incorrect password')) {
      return 'Invalid email or password. Please check your credentials and try again.';
    }
    
    if (detail.includes('user already exists') || detail.includes('email already registered')) {
      return 'An account with this email already exists. Please try logging in instead.';
    }
    
    if (detail.includes('weak password')) {
      return 'Password is too weak. Please use at least 8 characters with a mix of letters and numbers.';
    }
    
    if (detail.includes('invalid email')) {
      return 'Please enter a valid email address.';
    }
    
    return 'Authentication failed. Please check your credentials and try again.';
  }

  /**
   * Show success message with context
   */
  static showSuccess(message: string, title?: string): void {
    Alert.alert(title || 'Success', message);
  }

  /**
   * Show confirmation dialog
   */
  static showConfirmation(
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel?: () => void
  ): void {
    Alert.alert(
      title,
      message,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: onCancel
        },
        {
          text: 'Confirm',
          style: 'default',
          onPress: onConfirm
        }
      ]
    );
  }
}