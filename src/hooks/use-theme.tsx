"use client";

/**
 * @fileoverview Theme management hook and provider for dark/light mode.
 * 
 * This module provides a React context-based theme system with:
 * - Persistent storage in localStorage
 * - SSR-safe implementation using useSyncExternalStore
 * - Cross-tab synchronization via storage events
 * - CSS custom property updates for theming
 * 
 * @module hooks/use-theme
 */

import { createContext, useContext, useEffect, useSyncExternalStore, type ReactNode } from "react";

/**
 * Available theme options.
 * @typedef {'dark' | 'light'} Theme
 */
type Theme = "dark" | "light";

/**
 * Shape of the theme context value.
 * @interface ThemeContextType
 */
interface ThemeContextType {
  /** Current active theme */
  theme: Theme;
  /** Function to toggle between dark and light themes */
  toggleTheme: () => void;
}

/**
 * React context for theme state.
 * Undefined when accessed outside of ThemeProvider.
 */
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * Retrieves the stored theme preference from localStorage.
 * Returns 'dark' as default if no preference is stored or during SSR.
 * 
 * @returns {Theme} The stored theme or 'dark' as fallback
 */
function getStoredTheme(): Theme {
  // Return default during server-side rendering
  if (typeof window === "undefined") return "dark";
  const stored = localStorage.getItem("theme");
  return stored === "light" ? "light" : "dark";
}

/**
 * Subscription function for useSyncExternalStore.
 * Listens to storage events for cross-tab theme synchronization.
 * 
 * @param {() => void} callback - Function to call when storage changes
 * @returns {() => void} Cleanup function to remove event listener
 */
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

/**
 * Theme provider component that manages theme state and persistence.
 * 
 * Uses useSyncExternalStore for optimal SSR hydration and
 * cross-tab synchronization of theme preferences.
 * 
 * @param {Object} props - Component props
 * @param {ReactNode} props.children - Child components to receive theme context
 * @returns {JSX.Element} Provider component wrapping children
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  // Subscribe to external localStorage state with SSR-safe fallback
  const theme = useSyncExternalStore(subscribe, getStoredTheme, () => "dark" as Theme);

  // Sync theme to document root for CSS custom property updates
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  /**
   * Toggles between dark and light themes.
   * Updates localStorage and dispatches storage event for cross-tab sync.
   */
  const toggleTheme = () => {
    const newTheme: Theme = theme === "dark" ? "light" : "dark";
    localStorage.setItem("theme", newTheme);
    // Dispatch storage event to trigger re-render via useSyncExternalStore
    window.dispatchEvent(new StorageEvent("storage"));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook to access theme state and toggle function.
 * Must be used within a ThemeProvider.
 * 
 * @returns {ThemeContextType} Object containing theme and toggleTheme
 * @throws {Error} If used outside of ThemeProvider
 * 
 * @example
 * const { theme, toggleTheme } = useTheme();
 * // theme: 'dark' | 'light'
 * // toggleTheme: () => void
 */
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
