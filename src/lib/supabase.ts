import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Anon Key exists:', !!supabaseAnonKey);

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'X-Client-Info': 'supabase-js-web'
    }
  }
});

// Test the connection
supabase.from('users').select('count', { count: 'exact', head: true })
  .then(({ error }) => {
    if (error) {
      console.error('Supabase connection test failed:', error);
    } else {
      console.log('Supabase connection successful');
    }
  })
  .catch((err) => {
    console.error('Supabase connection error:', err);
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
          last_active: string | null;
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
          last_active?: string | null;
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
          last_active?: string | null;
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
      dms: {
        Row: {
          id: string;
          user1_id: string;
          user2_id: string;
          user1_username: string;
          user2_username: string;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user1_id: string;
          user2_id: string;
          user1_username: string;
          user2_username: string;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user1_id?: string;
          user2_id?: string;
          user1_username?: string;
          user2_username?: string;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      dm_messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          reactions: Record<string, string[]> | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          reactions?: Record<string, string[]> | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          sender_id?: string;
          content?: string;
          reactions?: Record<string, string[]> | null;
          created_at?: string | null;
        };
      };
    };
  };
}