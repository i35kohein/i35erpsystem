import React, { createContext, useContext, useState, useEffect } from 'react';
import { scopedSettingsKey, ACCOUNT_CHANGED_EVENT } from '../utils/accountSettings';

export type ThemeMode = 'minimalist-clean' | 'nunito-navy' | 'apple-clean' | 'dark-slate';
export type ComponentGeometry = 'square' | 'curved';

export interface ThemeConfig {
  id: ThemeMode;
  name: string;
  description: string;
  fontName: string;
  colors: {
    primary: string;
    secondary: string;
    orange: string;
    darkBlue: string;
    bg: string;
    cardBg: string;
    muted: string;
  };
}

export const THEME_PRESETS: ThemeConfig[] = [
  {
    id: 'minimalist-clean',
    name: 'Minimalist Clean Studio',
    description: 'Carbon light — IBM Design palette (brand #0F62FE, ink #161616, surface #F4F4F4). Default.',
    fontName: 'Plus Jakarta Sans / System',
    colors: {
      primary: '#0F62FE',
      secondary: '#24A148',
      orange: '#FF9500',
      darkBlue: '#161616',
      bg: '#F4F4F4',
      cardBg: '#FFFFFF',
      muted: '#6F6F6F',
    },
  },
  {
    id: 'dark-slate',
    name: 'Midnight Dark Slate',
    description: 'Enhanced high-contrast dark theme for repair technicians with vibrant blue (#38BDF8) accents and bright white typography.',
    fontName: 'Plus Jakarta Sans / System',
    colors: {
      primary: '#38BDF8',
      secondary: '#2DD4BF',
      orange: '#FB923C',
      darkBlue: '#F8FAFC',
      bg: '#0B1120',
      cardBg: '#151F32',
      muted: '#A1A1AA',
    },
  },
];

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  geometry: ComponentGeometry;
  setGeometry: (geometry: ComponentGeometry) => void;
  activePreset: ThemeConfig;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const DEFAULT_THEME: ThemeMode = 'minimalist-clean';

const loadTheme = (): ThemeMode => {
  const key = scopedSettingsKey('app_theme');
  const saved = localStorage.getItem(key);
  if (saved) return saved as ThemeMode;
  // Migration: first per-account read falls back to the legacy global value.
  if (key !== 'app_theme') {
    const legacy = localStorage.getItem('app_theme');
    if (legacy) return legacy as ThemeMode;
  }
  return DEFAULT_THEME;
};

const loadGeometry = (): ComponentGeometry => {
  const key = scopedSettingsKey('app_geometry');
  const saved = localStorage.getItem(key);
  if (saved) return saved as ComponentGeometry;
  if (key !== 'app_geometry') {
    const legacy = localStorage.getItem('app_geometry');
    if (legacy) return legacy as ComponentGeometry;
  }
  return 'square';
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(loadTheme);

  const [geometry, setGeometryState] = useState<ComponentGeometry>(loadGeometry);

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    localStorage.setItem(scopedSettingsKey('app_theme'), newTheme);
  };

  const setGeometry = (newGeometry: ComponentGeometry) => {
    setGeometryState(newGeometry);
    localStorage.setItem(scopedSettingsKey('app_geometry'), newGeometry);
  };

  // Re-hydrate when the active account changes (login / profile switch / logout).
  useEffect(() => {
    const onAccountChanged = () => {
      setThemeState(loadTheme());
      setGeometryState(loadGeometry());
    };
    window.addEventListener(ACCOUNT_CHANGED_EVENT, onAccountChanged);
    return () => window.removeEventListener(ACCOUNT_CHANGED_EVENT, onAccountChanged);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-geometry', geometry);
  }, [geometry]);

  const activePreset = THEME_PRESETS.find(t => t.id === theme) || THEME_PRESETS[0];

  return (
    <ThemeContext.Provider value={{ theme, setTheme, geometry, setGeometry, activePreset }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
