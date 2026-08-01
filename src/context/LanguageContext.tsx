import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, translations } from '../data/translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, fallback?: string) => string;
  isMM: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('app_language');
    return saved === 'mm' || saved === 'en' ? saved : 'mm';
  });

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.setAttribute('data-lang', language);
    if (language === 'mm') {
      document.body.classList.add('lang-mm');
    } else {
      document.body.classList.remove('lang-mm');
    }
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('app_language', lang);
  };

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
