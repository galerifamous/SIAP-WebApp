import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Safe localStorage overrides to prevent QuotaExceededError crashes
try {
  const originalSetItem = window.localStorage.setItem;
  window.localStorage.setItem = function (key, value) {
    try {
      originalSetItem.call(window.localStorage, key, value);
    } catch (e) {
      console.warn(`localStorage.setItem failed for key "${key}":`, e);
    }
  };
} catch (e) {
  console.warn("Failed to patch localStorage.setItem:", e);
}

try {
  const originalGetItem = window.localStorage.getItem;
  window.localStorage.getItem = function (key) {
    try {
      return originalGetItem.call(window.localStorage, key);
    } catch (e) {
      console.warn(`localStorage.getItem failed for key "${key}":`, e);
      return null;
    }
  };
} catch (e) {
  console.warn("Failed to patch localStorage.getItem:", e);
}

try {
  const originalRemoveItem = window.localStorage.removeItem;
  window.localStorage.removeItem = function (key) {
    try {
      originalRemoveItem.call(window.localStorage, key);
    } catch (e) {
      console.warn(`localStorage.removeItem failed for key "${key}":`, e);
    }
  };
} catch (e) {
  console.warn("Failed to patch localStorage.removeItem:", e);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
