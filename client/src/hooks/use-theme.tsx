import React, { createContext, useContext, useState, useEffect } from "react";

// Define the available preset themes
export type ThemePreset = 'default' | 'ocean' | 'sunset' | 'forest' | 'midnight' | 'custom';

// Define the theme color types
export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  muted: string;
  mutedForeground: string;
  success: string;
  warning: string;
  error: string;
  info: string;
}

// Define theme context type
interface ThemeContextType {
  colors: ThemeColors;
  preset: ThemePreset;
  setPreset: (preset: ThemePreset) => void;
  updateColor: (key: keyof ThemeColors, value: string) => void;
  resetToPreset: () => void;
  applyTheme: () => void;
}

// Define default theme colors
const defaultTheme: ThemeColors = {
  primary: '#6366f1', // Indigo
  secondary: '#8b5cf6', // Violet
  accent: '#f43f5e', // Rose
  background: '#0f172a', // Slate 900
  foreground: '#f8fafc', // Slate 50
  card: '#1e293b', // Slate 800
  cardForeground: '#f1f5f9', // Slate 100
  muted: '#334155', // Slate 700
  mutedForeground: '#94a3b8', // Slate 400
  success: '#10b981', // Emerald
  warning: '#f59e0b', // Amber
  error: '#ef4444', // Red
  info: '#3b82f6', // Blue
};

// Preset themes
const presetThemes: Record<ThemePreset, ThemeColors> = {
  default: defaultTheme,
  ocean: {
    ...defaultTheme,
    primary: '#0ea5e9', // Sky
    secondary: '#06b6d4', // Cyan
    accent: '#0284c7', // Sky darker
    background: '#0c4a6e', // Sky darker bg
    foreground: '#f0f9ff', // Sky lightest
    card: '#075985', // Sky dark
    cardForeground: '#e0f2fe', // Sky lightest
    muted: '#0369a1', // Sky medium
    mutedForeground: '#bae6fd', // Sky light
    success: '#10b981', // Emerald
    warning: '#f59e0b', // Amber
    error: '#ef4444', // Red
    info: '#3b82f6', // Blue
  },
  sunset: {
    ...defaultTheme,
    primary: '#f97316', // Orange
    secondary: '#f43f5e', // Rose
    accent: '#fbbf24', // Amber
    background: '#450a0a', // Red dark bg
    foreground: '#fff7ed', // Orange lightest
    card: '#7f1d1d', // Red dark
    cardForeground: '#ffedd5', // Orange lightest
    muted: '#9a3412', // Orange dark
    mutedForeground: '#fed7aa', // Orange light
    success: '#10b981', // Emerald
    warning: '#fbbf24', // Amber
    error: '#ef4444', // Red
    info: '#3b82f6', // Blue
  },
  forest: {
    ...defaultTheme,
    primary: '#10b981', // Emerald
    secondary: '#059669', // Emerald dark
    accent: '#84cc16', // Lime
    background: '#14532d', // Green dark bg
    foreground: '#f0fdf4', // Green lightest
    card: '#166534', // Green dark
    cardForeground: '#dcfce7', // Green lightest
    muted: '#15803d', // Green medium
    mutedForeground: '#bbf7d0', // Green light
    success: '#10b981', // Emerald
    warning: '#f59e0b', // Amber
    error: '#ef4444', // Red
    info: '#3b82f6', // Blue
  },
  midnight: {
    ...defaultTheme,
    primary: '#8b5cf6', // Violet
    secondary: '#a855f7', // Purple
    accent: '#6366f1', // Indigo
    background: '#020617', // Slate 950
    foreground: '#f8fafc', // Slate 50
    card: '#0f172a', // Slate 900
    cardForeground: '#f1f5f9', // Slate 100
    muted: '#1e293b', // Slate 800
    mutedForeground: '#94a3b8', // Slate 400
    success: '#10b981', // Emerald
    warning: '#f59e0b', // Amber
    error: '#ef4444', // Red
    info: '#3b82f6', // Blue
  },
  custom: defaultTheme, // Custom starts as default, will be modified by user
};

// Create context
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Theme provider component
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Store theme preference in local storage
  const [storedPreset, setStoredPreset] = useLocalStorage<ThemePreset>(
    'nautilus-theme-preset', 
    'default'
  );
  
  const [storedCustomTheme, setStoredCustomTheme] = useLocalStorage<ThemeColors | undefined>(
    'nautilus-custom-theme',
    undefined
  );
  
  // Set preset state from stored value
  const [preset, setPresetState] = useState<ThemePreset>(storedPreset);
  
  // Initialize colors from the preset
  const [colors, setColors] = useState<ThemeColors>(
    preset === 'custom' && storedCustomTheme 
      ? storedCustomTheme 
      : presetThemes[preset]
  );

  // Update preset, save to local storage
  const setPreset = (newPreset: ThemePreset) => {
    setPresetState(newPreset);
    setStoredPreset(newPreset);
    
    // Update colors based on the preset
    if (newPreset === 'custom') {
      // Initialize custom with current colors or stored custom theme
      const customColors = storedCustomTheme || colors;
      setColors(customColors);
    } else {
      // Use preset theme
      setColors(presetThemes[newPreset]);
    }
  };

  // Update a single color in the theme
  const updateColor = (key: keyof ThemeColors, value: string) => {
    const updatedColors = { ...colors, [key]: value };
    setColors(updatedColors);
    
    // If we're in custom mode, update the stored custom theme
    if (preset === 'custom') {
      setStoredCustomTheme(updatedColors);
    } else {
      // Automatically switch to custom mode when modifying colors
      setPresetState('custom');
      setStoredPreset('custom');
      setStoredCustomTheme(updatedColors);
    }
  };

  // Reset to the currently selected preset
  const resetToPreset = () => {
    if (preset === 'custom' && storedCustomTheme) {
      setColors(storedCustomTheme);
    } else {
      setColors(presetThemes[preset]);
    }
  };

  // Apply theme to document
  const applyTheme = () => {
    // Create a CSS variables string
    const themeVariables = Object.entries(colors).map(
      ([key, value]) => `--color-${kebabCase(key)}: ${value};`
    ).join('\n');

    // Apply to document
    const styleTag = document.getElementById('theme-colors') || document.createElement('style');
    styleTag.id = 'theme-colors';
    styleTag.innerHTML = `:root {\n${themeVariables}\n}`;
    
    if (!document.getElementById('theme-colors')) {
      document.head.appendChild(styleTag);
    }
  };

  // Apply theme when colors change
  useEffect(() => {
    applyTheme();
  }, [colors]);

  return (
    <ThemeContext.Provider 
      value={{ 
        colors, 
        preset, 
        setPreset, 
        updateColor, 
        resetToPreset, 
        applyTheme 
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

// Helper function to convert camelCase to kebab-case
function kebabCase(str: string): string {
  return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
}

// Custom hook to use theme context
export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Custom hook for local storage
export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  // State to store our value
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    
    try {
      // Get from local storage by key
      const item = window.localStorage.getItem(key);
      // Parse stored json or if none return initialValue
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      // If error also return initialValue
      console.log(error);
      return initialValue;
    }
  });
  
  // Return a wrapped version of useState's setter function that
  // persists the new value to localStorage.
  const setValue = (value: T) => {
    try {
      // Allow value to be a function so we have same API as useState
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;
      // Save state
      setStoredValue(valueToStore);
      // Save to local storage
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      // A more advanced implementation would handle the error case
      console.log(error);
    }
  };
  
  return [storedValue, setValue];
}