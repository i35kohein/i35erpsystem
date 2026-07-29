import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ThemeProvider } from './context/ThemeContext.tsx';
import { LanguageProvider } from './context/LanguageContext.tsx';
import { registerServiceWorker } from './lib/registerServiceWorker.ts';
import { initIndexedDB } from './lib/indexedDB.ts';

// Initialize IndexedDB and Service Worker for full Offline Capability
initIndexedDB().catch(console.warn);
registerServiceWorker();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </ThemeProvider>
  </StrictMode>,
);
