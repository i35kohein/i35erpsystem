import React, { createContext, useContext, useState, useEffect } from 'react';

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
    description: 'Ultra-clean, high-contrast workspace with sleek obsidian accents (#0F172A), crisp zinc borders (#E4E4E7), and pure white cards on neutral slate-50 (#FAFAFA).',
    fontName: 'Plus Jakarta Sans / System',
    colors: {
      primary: '#0F172A',
      secondary: '#2563EB',
      orange: '#F97316',
      darkBlue: '#09090B',
      bg: '#FAFAFA',
      cardBg: '#FFFFFF',
      muted: '#71717A',
    },
  },
  {
    id: 'nunito-navy',
    name: 'Nunito Ocean & Turquoise',
    description: 'Fresh clean palette with Nunito typography, ocean blue (#136F9A), turquoise (#27B1AE), and orange (#ED7132) accents.',
    fontName: 'Nunito',
    colors: {
      primary: '#136F9A',
      secondary: '#27B1AE',
      orange: '#ED7132',
      darkBlue: '#2C3E50',
      bg: '#F8FBFD',
      cardBg: '#FFFFFF',
      muted: '#7F7F7F',
    },
  },
  {
    id: 'apple-clean',
    name: 'Apple ERP Classic',
    description: 'Minimalist clean Apple iOS style with bright blue (#0071E3) accents and neutral gray canvas.',
    fontName: 'SF Pro / System',
    colors: {
      primary: '#0071E3',
      secondary: '#34C759',
      orange: '#FF9500',
      darkBlue: '#1D1D1F',
      bg: '#F5F5F7',
      cardBg: '#FFFFFF',
      muted: '#86868B',
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

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('app_theme');
    return (saved as ThemeMode) || 'minimalist-clean';
  });

  const [geometry, setGeometryState] = useState<ComponentGeometry>(() => {
    const saved = localStorage.getItem('app_geometry');
    return (saved as ComponentGeometry) || 'square';
  });

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    localStorage.setItem('app_theme', newTheme);
  };

  const setGeometry = (newGeometry: ComponentGeometry) => {
    setGeometryState(newGeometry);
    localStorage.setItem('app_geometry', newGeometry);
  };

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
