/**
 * Authentication Types for New Audion Frontend
 * Type definitions matching the new backend API
 */

// User Types
export interface User {
  id: string;
  email: string;
  display_name: string;
  subscription_tier: 'free' | 'basic' | 'premium';
  created_at?: string;
  updated_at?: string;
}

// Authentication Request Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  display_name: string;
}

// Authentication Response Types
export interface AuthResponse {
  access_token: string;
  token_type: 'bearer';
  user: User;
}

export interface RegisterResponse extends AuthResponse {
  message: string;
}

// Authentication Context Types
export interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

// Error Types
export interface ApiError {
  message: string;
  detail?: string;
  status?: number;
}

export class AuthenticationError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'AuthenticationError';
  }
}