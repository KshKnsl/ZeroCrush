"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type ThemeMode = 'light' | 'dark';

type ThemeContextValue = {
  theme: ThemeMode;
  toggleTheme: () => void;
  ready: boolean;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [ready, setReady] = useState(false);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  useEffect(() => {
    const storedTheme = window.localStorage.getItem('theme');
    if (storedTheme === 'dark' || storedTheme === 'light') {
      setTheme(storedTheme);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.classList.toggle('dark', theme === 'dark');
    window.localStorage.setItem('theme', theme);
  }, [ready, theme]);

  return <ThemeContext.Provider value={{ theme, toggleTheme, ready }}>{children}</ThemeContext.Provider>;
}

export function useThemeContext() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeContext must be used within ThemeProvider');
  }
  return context;
}
