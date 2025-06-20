import React, { useState } from 'react';
import { AuthForm } from './components/AuthForm';
import { ChatHeader } from './components/ChatHeader';
import { ChatArea } from './components/ChatArea';
import { MessageInput } from './components/MessageInput';
import { UserProfile } from './components/UserProfile';
import { ProfilePreviewModal } from './components/ProfilePreviewModal';
import { DMsPage } from './components/DMsPage';
import { DMNotification } from './components/DMNotification';
import { useMessages } from './hooks/useMessages';
import { useAuth } from './hooks/useAuth';
import { useDMNotifications } from './hooks/useDMNotifications';
import { LoadingSpinner } from './components/LoadingSpinner';
import { supabase } from './lib/supabase';

type PageType = 'group-chat' | 'dms' | 'profile';

function App() {
  const { user, loading: authLoading, signOut, updateUser } = useAuth();
  const [previewUserId, setPreviewUserId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<PageType>('group-chat');
  const [openConversationId, setOpenConversationId] = useState<string | null>(null);

  const {
    unreadConversations,
    hasUnread,
    preview: dmPreview,
    markAsRead,
  } = useDMNotifications(user?.id ?? null);

  // Only call useMessages if user is authenticated
  const {
    messages,
    loading,
    error,
    sendMessage,
    fetchOlderMessages,
    hasMore,
  } = useMessages(user?.id ?? null);

  // Show loading spinner while checking auth
  if (authLoading) {
    return (
      <div className="h-screen bg-gray-900">
        <LoadingSpinner />
      </div>
    );
  }

  // Show auth form if not authenticated
  if (!user) {
    return <AuthForm onAuthSuccess={() => {}} />;
  }
  
  // Show profile page if requested
  if (currentPage === 'profile') {
    return (
      <UserProfile
        user={user}
        onClose={() => setCurrentPage('group-chat')}
        onUserUpdate={updateUser}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
      />
    );
  }

  const handleSendMessage = async (content: string) => {
    if (user) {
      // Get the latest user data including avatar_url
      const { data: userData } = await supabase
        .from('users')
        .select('avatar_url')
        .eq('id', user.id)
        .single();
      
      await sendMessage(content, user.username, user.id, user.avatar_color, userData?.avatar_url || null);
    }
  };

  const handleUserClick = (userId: string) => {
    // Only show preview for other users, not current user
    if (userId && userId !== user.id) {
      setPreviewUserId(userId);
    }
  };

  // Show DMs page
  if (currentPage === 'dms') {
    return (
      <div className="flex flex-col h-screen bg-gray-900">
        <ChatHeader
          userName={user.username}
          onClearUser={signOut}
          onShowProfile={() => setCurrentPage('profile')}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          hasUnreadDMs={hasUnread}
        />
        <DMNotification
          preview={dmPreview}
          onJump={(id) => {
            setOpenConversationId(id);
            // already on DMs page
          }}
        />
        <DMsPage
          currentUser={user}
          onUserClick={handleUserClick}
          unreadConversations={unreadConversations}
          onConversationOpen={(id, ts) => {
            markAsRead(id, ts);
            setOpenConversationId(null);
          }}
          initialConversationId={openConversationId}
        />
        {previewUserId && (
          <ProfilePreviewModal
            userId={previewUserId}
            onClose={() => setPreviewUserId(null)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-900">
      <ChatHeader
        userName={user.username}
        onClearUser={signOut}
        onShowProfile={() => setCurrentPage('profile')}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        hasUnreadDMs={hasUnread}
      />
      <DMNotification
        preview={dmPreview}
        onJump={(id) => {
          setOpenConversationId(id);
          setCurrentPage('dms');
        }}
      />

      <ChatArea
        messages={messages}
        currentUserId={user.id}
        loading={loading}
        error={error}
        onRetry={() => window.location.reload()}
        fetchOlderMessages={fetchOlderMessages}
        hasMore={hasMore}
        onUserClick={handleUserClick}
      />

      <MessageInput 
        onSendMessage={handleSendMessage}
        disabled={loading}
      />

      {previewUserId && (
        <ProfilePreviewModal
          userId={previewUserId}
          onClose={() => setPreviewUserId(null)}
        />
      )}
    </div>
  );
}

export default App;