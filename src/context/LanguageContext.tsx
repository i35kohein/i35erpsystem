import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, translations } from '../data/translations';
import { scopedSettingsKey, ACCOUNT_CHANGED_EVENT } from '../utils/accountSettings';
import { startDomTranslation, stopDomTranslation } from '../lib/domTranslate';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, fallback?: string) => string;
  isMM: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const loadLanguage = (): Language => {
  const key = scopedSettingsKey('app_language');
  const saved = localStorage.getItem(key);
  if (saved === 'mm' || saved === 'en') return saved;
  // Migration: first per-account read falls back to the legacy global value.
  if (key !== 'app_language') {
    const legacy = localStorage.getItem('app_language');
    if (legacy === 'mm' || legacy === 'en') return legacy;
  }
  // i18n policy (2026-08-04): UI defaults to English; Burmese is used only in
  // customer-facing messages (SMS / notifications / AI assistant). Staff can
  // still opt into Burmese via Settings → System Language & Localization.
  return 'en';
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(loadLanguage);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.setAttribute('data-lang', language);
    if (language === 'mm') {
      document.body.classList.add('lang-mm');
      // Full-UI auto-translation for hardcoded English strings (tech terms stay EN).
      startDomTranslation();
    } else {
      document.body.classList.remove('lang-mm');
      stopDomTranslation();
    }
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(scopedSettingsKey('app_language'), lang);
  };

  // Re-hydrate when the active account changes (login / profile switch / logout).
  useEffect(() => {
    const onAccountChanged = () => setLanguageState(loadLanguage());
    window.addEventListener(ACCOUNT_CHANGED_EVENT, onAccountChanged);
    return () => window.removeEventListener(ACCOUNT_CHANGED_EVENT, onAccountChanged);
  }, []);

  const t = (key: string, fallback?: string): string => {
    const item = translations[key];
    if (item) {
      return item[language] || item.en || fallback || key;
    }
    return fallback || key;
  };

  const isMM = language === 'mm';

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isMM }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
