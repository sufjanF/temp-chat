"use client";

/**
 * @fileoverview Application-wide context providers composition.
 * 
 * This module wraps the application with all necessary context providers,
 * establishing the provider hierarchy in the correct order:
 * 
 * 1. ThemeProvider - Dark/light theme state management
 * 2. RealtimeProvider - Upstash Realtime connection management
 * 3. QueryClientProvider - TanStack Query for server state management
 * 
 * @module components/providers
 */

import { useState, type ReactNode } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RealtimeProvider } from "@upstash/realtime/client";

import { ThemeProvider } from "@/hooks/use-theme";

/**
 * Root provider component that composes all application-wide contexts.
 * 
 * Uses useState for QueryClient to ensure a single instance per client
 * session, preventing hydration mismatches in Next.js.
 * 
 * @param {Object} props - Component props
 * @param {ReactNode} props.children - Child components to wrap with providers
 * @returns {JSX.Element} Nested provider hierarchy wrapping children
 * 
 * @example
 * // Used in root layout
 * <Providers>
 *   <App />
 * </Providers>
 */
export function Providers({ children }: { children: ReactNode }) {
  // Initialize QueryClient once per component lifecycle
  // Using useState ensures the same instance across re-renders
  const [queryClient] = useState(() => new QueryClient());

  return (
    <ThemeProvider>
      <RealtimeProvider>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </RealtimeProvider>
    </ThemeProvider>
  );
}