// Shared types across the application

export interface Article {
  id: string;
  title: string;
  summary: string;
  link: string;
  published: string;
  source_name: string;
  genre?: string; // Optional to match various article formats
  content?: string;
  [key: string]: unknown; // Allow additional properties for flexibility
}

export interface RSSSource {
  id: string;
  name: string;
  url: string;
  created_at: string;
  is_active?: boolean;
}

export interface User {
  id: string;
  email: string;
  created_at: string;
  is_verified?: boolean;
  profile?: {
    name?: string;
    preferences?: Record<string, unknown>;
  };
}

export interface DeletedAudio {
  id: string;
  user_id: string;
  title: string;
  file_path: string;
  deleted_at: string;
  permanent_delete_at: string;
  days_remaining?: number; // Add this property
}