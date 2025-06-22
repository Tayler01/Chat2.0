import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          username: string;
          avatar_url: string | null;
          banner_url: string | null;
          avatar_color: string;
          bio: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id: string;
          email: string;
          username: string;
          avatar_url?: string | null;
          banner_url?: string | null;
          avatar_color?: string;
          bio?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          email?: string;
          username?: string;
          avatar_url?: string | null;
          banner_url?: string | null;
          avatar_color?: string;
          bio?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      messages: {
        Row: {
          id: string;
          content: string;
          user_name: string;
          user_id: string;
          avatar_color: string;
          created_at: string | null;
          avatar_url: string | null;
          reactions: Record<string, string[]> | null;
        };
        Insert: {
          id?: string;
          content: string;
          user_name: string;
          user_id: string;
          avatar_color?: string;
          created_at?: string | null;
          avatar_url?: string | null;
          reactions?: Record<string, string[]> | null;
        };
        Update: {
          id?: string;
          content?: string;
          user_name?: string;
          user_id?: string;
          avatar_color?: string;
          created_at?: string | null;
          avatar_url?: string | null;
          reactions?: Record<string, string[]> | null;
        };
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string | null;
          subscription: Record<string, unknown>;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          subscription: Record<string, unknown>;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          subscription?: Record<string, unknown>;
          created_at?: string | null;
        };
      };
      dms: {
        Row: {
          id: string;
          user1_id: string;
          user2_id: string;
          user1_username: string;
          user2_username: string;
          messages: Record<string, unknown>[] | null;
          created_at: string | null;
          updated_at: string | null;
          user1_last_read: string | null;
          user2_last_read: string | null;
        };
        Insert: {
          id?: string;
          user1_id: string;
          user2_id: string;
          user1_username: string;
          user2_username: string;
          messages?: Record<string, unknown>[] | null;
          created_at?: string | null;
          updated_at?: string | null;
          user1_last_read?: string | null;
          user2_last_read?: string | null;
        };
        Update: {
          id?: string;
          user1_id?: string;
          user2_id?: string;
          user1_username?: string;
          user2_username?: string;
          messages?: Record<string, unknown>[] | null;
          created_at?: string | null;
          updated_at?: string | null;
          user1_last_read?: string | null;
          user2_last_read?: string | null;
        };
      };
      message_reads: {
        Row: {
          message_id: string;
          user_id: string;
          read_at: string | null;
        };
        Insert: {
          message_id: string;
          user_id: string;
          read_at?: string | null;
        };
        Update: {
          message_id?: string;
          user_id?: string;
          read_at?: string | null;
        };
      };
    };
  };
}