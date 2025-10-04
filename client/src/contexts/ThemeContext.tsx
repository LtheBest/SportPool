import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  systemTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  isSystemThemeMode: boolean;
  isDarkMode: boolean;
  isLightMode: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'TeamMove_theme_v2';

function getInitialTheme(): Theme {
  // Check localStorage first
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
    if (stored && ['light', 'dark', 'system'].includes(stored)) {
      return stored;
    }
    
    // Migration from old theme key
    const oldStored = localStorage.getItem('TeamMove_theme') as Theme | null;
    if (oldStored && ['light', 'dark', 'system'].includes(oldStored)) {
      localStorage.setItem(THEME_STORAGE_KEY, oldStored);
      localStorage.removeItem('TeamMove_theme');
      return oldStored;
    }
  }
  
  // Default to system
  return 'system';
}

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') {
    return getSystemTheme();
  }
  return theme;
}

function applyThemeToDocument(resolvedTheme: 'light' | 'dark') {
  const root = document.documentElement;
  
  // Remove existing theme classes
  root.classList.remove('light', 'dark');
  
  // Add new theme class
  root.classList.add(resolvedTheme);
  
  // Update CSS custom properties for smooth transitions
  root.style.colorScheme = resolvedTheme;
  
  // Update meta theme-color for mobile browsers
  updateMetaThemeColor(resolvedTheme);
}

function updateMetaThemeColor(theme: 'light' | 'dark') {
  const metaThemeColor = document.querySelector("meta[name=theme-color]") || 
                        document.createElement("meta");
  
  if (!metaThemeColor.hasAttribute("name")) {
    metaThemeColor.setAttribute("name", "theme-color");
    document.head.appendChild(metaThemeColor);
  }
  
  // Colors from your design system
  const themeColors = {
    light: '#ffffff',
    dark: '#020817'
  };
  
  metaThemeColor.setAttribute("content", themeColors[theme]);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => resolveTheme(getInitialTheme()));
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(() => getSystemTheme());

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    
    const resolved = resolveTheme(newTheme);
    setResolvedTheme(resolved);
    
    // Apply theme with enhanced document styling
    applyThemeToDocument(resolved);
  };

  const toggleTheme = () => {
    // Improved cycling: light -> dark -> system -> light
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('system');
    } else {
      setTheme('light');
    }
  };

  useEffect(() => {
    // Initial theme application with enhanced styling
    const resolved = resolveTheme(theme);
    setResolvedTheme(resolved);
    applyThemeToDocument(resolved);

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      const newSystemTheme = e.matches ? 'dark' : 'light';
      setSystemTheme(newSystemTheme);
      
      if (theme === 'system') {
        setResolvedTheme(newSystemTheme);
        applyThemeToDocument(newSystemTheme);
      }
    };

    // Set initial system theme
    setSystemTheme(mediaQuery.matches ? 'dark' : 'light');
    
    // Add event listener
    mediaQuery.addEventListener('change', handleSystemThemeChange);

    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, [theme]);

  // Prevent flash of unstyled content
  useEffect(() => {
    // Add transition class after initial render for smooth theme changes
    const timer = setTimeout(() => {
      document.documentElement.classList.add('theme-transition');
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  const value: ThemeContextType = {
    theme,
    resolvedTheme,
    systemTheme,
    setTheme,
    toggleTheme,
    isSystemThemeMode: theme === 'system',
    isDarkMode: resolvedTheme === 'dark',
    isLightMode: resolvedTheme === 'light',
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}