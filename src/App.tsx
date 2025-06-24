import React, { useState, lazy, Suspense } from 'react';
import { AuthForm } from './components/AuthForm';
import { ChatHeader } from './components/ChatHeader';
import { ChatArea } from './components/ChatArea';
import { MessageInput } from './components/MessageInput';
import { UserProfile } from './components/UserProfile';
import { ProfilePreviewModal } from './components/ProfilePreviewModal';
import { DMNotification } from './components/DMNotification';
import { useMessages } from './hooks/useMessages';
import { useAuth } from './hooks/useAuth';
import { useDMNotifications } from './hooks/useDMNotifications';
import { LoadingSpinner } from './components/LoadingSpinner';
import { usePresence } from './hooks/usePresence';
import { useActiveUserProfiles } from './hooks/useActiveUserProfiles';

const DMsPage = lazy(() =>
  import('./components/DMsPage').then((m) => ({ default: m.DMsPage }))
);

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

  const activeUserIds = usePresence();
  const activeUsers = useActiveUserProfiles(activeUserIds);

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
      await sendMessage(
        content,
        user.username,
        user.id,
        user.avatar_color,
        user.avatar_url || null
      );
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
      <div className="flex flex-col h-screen bg-gray-900 overflow-hidden">
        <div className="hidden md:block">
          <ChatHeader
            userName={user.username}
            onClearUser={signOut}
            onShowProfile={() => setCurrentPage('profile')}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            hasUnreadDMs={hasUnread}
            activeUsers={activeUsers}
          />
        </div>
        <DMNotification
          preview={dmPreview}
          onJump={(id) => {
            setOpenConversationId(id);
            // already on DMs page
          }}
        />
        <Suspense
          fallback={
            <div className="flex-1 flex items-center justify-center">
              <LoadingSpinner />
            </div>
          }
        >
          <DMsPage
            currentUser={user}
            onUserClick={handleUserClick}
            unreadConversations={unreadConversations}
            onConversationOpen={(id, ts) => {
              markAsRead(id, ts);
              setOpenConversationId(null);
            }}
            initialConversationId={openConversationId}
            onBackToGroupChat={() => setCurrentPage('group-chat')}
            activeUserIds={activeUserIds}
          />
        </Suspense>
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
    <div className="flex flex-col h-screen bg-gray-900 overflow-hidden">
      <ChatHeader
        userName={user.username}
        onClearUser={signOut}
        onShowProfile={() => setCurrentPage('profile')}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        hasUnreadDMs={hasUnread}
        activeUsers={activeUsers}
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
        activeUserIds={activeUserIds}
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