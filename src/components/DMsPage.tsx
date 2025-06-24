import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Search, MessageSquare, Send, X, Clock, Users, ArrowLeft } from 'lucide-react';
import { Smile } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from './Toast';
import { Avatar } from './Avatar';

interface User {
  id: string;
  username: string;
  avatar_url?: string;
  avatar_color: string;
  bio?: string;
}

interface DMMessage {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  reactions?: Record<string, string[]>;
}

interface DMConversation {
  id: string;
  user1_id: string;
  user2_id: string;
  user1_username: string;
  user2_username: string;
  messages: DMMessage[];
  updated_at: string;
}

const normalizeConversation = (conv: unknown): DMConversation => {
  const c = conv as Partial<DMConversation> & { messages?: unknown };
  return {
    ...(c as DMConversation),
    messages: Array.isArray(c.messages) ? (c.messages as DMMessage[]) : []
  };
};

interface DMsPageProps {
  currentUser: {
    id: string;
    username: string;
    avatar_color: string;
    avatar_url?: string;
  };
  onUserClick?: (userId: string) => void;
  unreadConversations?: string[];
  onConversationOpen?: (
    id: string,
    lastTimestamp: string
  ) => void;
  initialConversationId?: string | null;
  onBackToGroupChat?: () => void;
  activeUserIds: string[];
}

export function DMsPage({ currentUser, onUserClick, unreadConversations = [], onConversationOpen, initialConversationId, onBackToGroupChat, activeUserIds }: DMsPageProps) {
  // ... rest of the code remains the same ...
  
  return (
    // ... JSX remains the same ...
  );
}verflow-hidden bg-gray-900">
      {/* ... rest of the JSX ... */}
    </div>
  );
}