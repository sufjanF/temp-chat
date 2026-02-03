/**
 * @fileoverview Type-safe API client using Eden Treaty.
 * 
 * This module creates a fully typed API client that mirrors the Elysia
 * backend routes, providing end-to-end type safety from server to client.
 * 
 * Eden Treaty generates a client that matches the exact shape of the
 * server API, enabling autocomplete and compile-time type checking.
 * 
 * @module lib/client
 * @requires @elysiajs/eden
 * @see {@link https://elysiajs.com/eden/treaty.html}
 */

import { treaty } from "@elysiajs/eden";

import type { App } from "@/app/api/[[...slugs]]/route";

/**
 * Determines the appropriate base URL for API requests.
 * 
 * Handles three environments:
 * 1. Browser: Uses current window origin
 * 2. Vercel deployment: Uses VERCEL_URL environment variable
 * 3. Local development: Falls back to localhost:3000
 * 
 * @returns {string} The base URL for API requests
 */
function getBaseUrl(): string {
  // Client-side: use current origin
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  // Server-side: use Vercel URL or localhost
  return process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";
}

/**
 * Type-safe API client instance.
 * 
 * Provides fully typed methods matching the Elysia API routes:
 * - client.room.create.post({ duration }) - Create a new room
 * - client.room.ttl.get({ query: { roomId } }) - Get room TTL
 * - client.room.delete(null, { query: { roomId } }) - Destroy room
 * - client.messages.post({ sender, text }, { query: { roomId } }) - Send message
 * - client.messages.get({ query: { roomId } }) - Get messages
 * - client.typing.post({ username, isTyping }, { query: { roomId } }) - Typing indicator
 * - client.read.post({ messageId, readBy }, { query: { roomId } }) - Read receipt
 * 
 * @example
 * // Create a new room
 * const res = await client.room.create.post({ duration: 10 });
 * if (res.status === 200) {
 *   console.log(res.data.roomId);
 * }
 */
export const client = treaty<App>(getBaseUrl()).api;