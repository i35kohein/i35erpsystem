import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ThemeProvider } from './context/ThemeContext.tsx';
import { LanguageProvider } from './context/LanguageContext.tsx';

// ERP is deliberately online-only. Remove the legacy offline worker and its
// cache once so previous browser data cannot be shown or uploaded later.
if (typeof window !== 'undefined') {
  void navigator.serviceWorker?.getRegistrations?.().then((registrations) =>
    Promise.all(registrations.map((registration) => registration.unregister())),
  );
  void caches?.keys?.().then((keys) => Promise.all(keys.map((key) => caches.delete(key))));
  try {
    indexedDB.deleteDatabase('AppleRepairERP_DB');
  } catch {
    // Browsers without IndexedDB simply have no legacy cache to remove.
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </ThemeProvider>
  </StrictMode>,
);
