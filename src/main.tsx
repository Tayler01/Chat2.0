import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ToastProvider } from './components/Toast';
import './index.css';
import { triggerAuthRefresh } from './hooks/useAuth';
import { triggerMessagesRefresh } from './hooks/useMessages';
import { triggerDMsRefresh } from './hooks/useDirectMessages';
import { updatePresence } from './utils/updatePresence';
import { supabase } from './lib/supabase';

// Component responsible for setting up focus/visibility event listeners.
export function Root() {
  useEffect(() => {
    const handleRefresh = () => {
      supabase.realtime.connect();
      triggerAuthRefresh();
      triggerMessagesRefresh();
      triggerDMsRefresh();
      updatePresence();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleRefresh();
      }
    };

    window.addEventListener('focus', handleRefresh);
    window.addEventListener('pageshow', handleRefresh);
    window.addEventListener('online', handleRefresh);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleRefresh);
      window.removeEventListener('pageshow', handleRefresh);
      window.removeEventListener('online', handleRefresh);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <ToastProvider>
      <App />
    </ToastProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>
);
