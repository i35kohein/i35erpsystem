import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './carbon-coat.css';
import { ThemeProvider } from './context/ThemeContext.tsx';
import { LanguageProvider } from './context/LanguageContext.tsx';

// ERP is deliberately online-only. Remove the legacy offline worker and its
// cache once so previous browser data cannot be shown or uploaded later.
// NOTE: use window.caches (not bare `caches`) — CacheStorage only exists in
// secure contexts (HTTPS/localhost), and a bare identifier throws ReferenceError
// on plain HTTP origins like the VPS IP.
if (typeof window !== 'undefined') {
  void navigator.serviceWorker?.getRegistrations?.().then((registrations) =>
    Promise.all(registrations.map((registration) => registration.unregister())),
  );
  const cachesApi = window.caches;
  void cachesApi?.keys?.().then((keys) => Promise.all(keys.map((key) => cachesApi.delete(key))));
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
