/**
 * @fileoverview Anonymous username generation and persistence hook.
 * 
 * This module provides automatic anonymous username generation for users,
 * combining a random animal name with a unique identifier for privacy
 * while maintaining recognizability within a session.
 * 
 * Format: anonymous-{animal}-{nanoid(5)}
 * Example: anonymous-wolf-x7k9m
 * 
 * @module hooks/use-username
 */

import { useSyncExternalStore } from "react";

import { nanoid } from "nanoid";

/**
 * Pool of animal names for username generation.
 * Chosen for their neutral, memorable nature.
 * @constant {string[]}
 */
const ANIMALS = ["wolf", "hawk", "bear", "shark"];

/**
 * localStorage key for persisting the username.
 * @constant {string}
 */
const STORAGE_KEY = "chat_username";

/**
 * Generates a new anonymous username.
 * Combines a random animal with a short unique identifier.
 * 
 * @returns {string} Generated username in format "anonymous-{animal}-{id}"
 * @example
 * generateUsername() // => "anonymous-hawk-x7k9m"
 */
function generateUsername(): string {
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  return `anonymous-${animal}-${nanoid(5)}`;
}

/**
 * Retrieves or creates a persistent username from localStorage.
 * Automatically generates a new username if none exists.
 * 
 * @returns {string} The stored or newly generated username
 */
function getStoredUsername(): string {
  // Return empty string during SSR to prevent hydration mismatch
  if (typeof window === "undefined") return "";
  
  let username = localStorage.getItem(STORAGE_KEY);
  
  // Generate and persist new username if none exists
  if (!username) {
    username = generateUsername();
    localStorage.setItem(STORAGE_KEY, username);
  }
  
  return username;
}

/**
 * Subscription function for useSyncExternalStore.
 * Enables cross-tab username synchronization.
 * 
 * @param {() => void} callback - Function to call on storage changes
 * @returns {() => void} Cleanup function
 */
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

/**
 * Hook to access the user's anonymous username.
 * 
 * Automatically generates and persists a username on first use.
 * Uses useSyncExternalStore for SSR compatibility and cross-tab sync.
 * 
 * @returns {{ username: string }} Object containing the username
 * 
 * @example
 * const { username } = useUsername();
 * // username: "anonymous-bear-j2p8q"
 */
export function useUsername() {
  const username = useSyncExternalStore(subscribe, getStoredUsername, () => "");
  return { username };
}
