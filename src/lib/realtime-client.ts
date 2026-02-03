"use client";

/**
 * @fileoverview Client-side Upstash Realtime hook factory.
 * 
 * This module creates a typed React hook for subscribing to real-time
 * events from the Upstash Realtime service. The hook provides automatic
 * connection management and type-safe event handling.
 * 
 * @module lib/realtime-client
 * @requires @upstash/realtime/client
 */

import { createRealtime } from "@upstash/realtime/client";

import type { RealtimeEvents } from "./realtime";

/**
 * Type-safe React hook for subscribing to real-time events.
 * 
 * Created with the RealtimeEvents type from the server schema,
 * ensuring type safety for all event subscriptions.
 * 
 * @example
 * useRealtime({
 *   channels: [roomId],
 *   events: ["chat.message", "chat.typing"],
 *   onData: ({ event, data }) => {
 *     if (event === "chat.message") {
 *       // data is typed as Message
 *     }
 *   }
 * });
 */
export const { useRealtime } = createRealtime<RealtimeEvents>();