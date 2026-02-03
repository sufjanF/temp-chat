/**
 * @fileoverview Root layout component for the temp_chat application.
 * 
 * This module defines the top-level HTML structure, global metadata,
 * viewport configuration, and provider hierarchy for the entire application.
 * 
 * @module app/layout
 */

import type { Metadata, Viewport } from "next";
import { JetBrains_Mono } from "next/font/google";

import { Providers } from "@/components/providers";

import "./globals.css";

/**
 * JetBrains Mono font configuration.
 * Used as the primary monospace font throughout the application
 * to maintain the terminal/hacker aesthetic.
 */
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

/**
 * Application-wide metadata for SEO and social sharing.
 * @see https://nextjs.org/docs/app/api-reference/functions/generate-metadata
 */
export const metadata: Metadata = {
  title: "temp_chat",
  description: "Encrypted. Ephemeral. Gone.",
};

/**
 * Viewport configuration for responsive design and mobile optimization.
 * - maximumScale: 1 prevents zoom on input focus (improves mobile UX)
 * - viewportFit: cover enables full-screen on notched devices
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

/**
 * Root layout component that wraps all pages in the application.
 * 
 * Establishes the HTML document structure and provides:
 * - Global font configuration via CSS custom properties
 * - Application-wide context providers (theme, query client, realtime)
 * - Antialiased text rendering for crisp typography
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child page components to render
 * @returns {JSX.Element} The root HTML structure with providers
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${jetbrainsMono.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
