import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './carbon-coat.css';
import { ThemeProvider } from './context/ThemeContext.tsx';
import { LanguageProvider } from './context/LanguageContext.tsx';
import { ErrorBoundary } from './components/common/ErrorBoundary.tsx';

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
  // Audit G-P3: await the delete and handle onblocked — the old fire-and-
  // forget call could leave the DB half-open and block re-creation.
  void (async () => {
    try {
      const req = indexedDB.deleteDatabase('AppleRepairERP_DB');
      req.onblocked = () => {
        // Another tab still holds a connection; it will close on its own.
        // Nothing else to do — the app works without the legacy cache.
      };
      await new Promise<void>((resolve) => {
        req.onsuccess = () => resolve();
        req.onerror = () => resolve(); // best-effort cleanup only
      });
    } catch {
      // Browsers without IndexedDB simply have no legacy cache to remove.
    }
  })();
}

// Lightweight client error reporting (bug #9): capture uncaught errors and
// unhandled promise rejections and post them to the server error log.
// Fire-and-forget, batched + debounced to avoid spamming the endpoint.
let errorQueue: unknown[] = [];
let errorFlushTimer: number | null = null;
function queueClientError(entry: unknown) {
  errorQueue.push(entry);
  if (errorQueue.length > 20) errorQueue = errorQueue.slice(-20);
  if (errorFlushTimer != null) return;
  errorFlushTimer = window.setTimeout(() => {
    errorFlushTimer = null;
    const batch = errorQueue;
    errorQueue = [];
    try {
      void fetch('/api/error-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'client', batch }),
      }).catch(() => { /* offline / server down — drop silently */ });
    } catch {
      /* ignore */
    }
  }, 3000);
}
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    queueClientError({
      type: 'uncaught',
      message: event.message || String(event.error || ''),
      file: event.filename,
      line: event.lineno,
      col: event.colno,
      href: window.location.href,
    });
  });
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    queueClientError({
      type: 'unhandledrejection',
      message: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : undefined,
      href: window.location.href,
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <LanguageProvider>
          <App />
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>,
);
