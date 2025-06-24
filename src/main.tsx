import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ToastProvider } from './components/Toast';
import './index.css';

// Component responsible for setting up focus/visibility event listeners.
function Root() {
  useEffect(() => {
    // Reload the entire page whenever the tab regains focus after being
    // backgrounded. This helps recover when the app becomes flaky after a
    // long period of inactivity.
    let hasFocusedOnce = document.hasFocus();

    const reloadOnFocus = () => {
      if (hasFocusedOnce) {
        window.location.reload();
      } else {
        hasFocusedOnce = true;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        reloadOnFocus();
      }
    };

    window.addEventListener('focus', reloadOnFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', reloadOnFocus);
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
