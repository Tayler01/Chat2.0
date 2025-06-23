import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ToastProvider } from './components/Toast';
import './index.css';

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

window.addEventListener('focus', reloadOnFocus);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    reloadOnFocus();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </StrictMode>
);
