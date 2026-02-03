/**
 * @fileoverview Upstash Realtime WebSocket endpoint handler.
 * 
 * This module exposes a Server-Sent Events (SSE) endpoint that the
 * Upstash Realtime client connects to for receiving real-time updates.
 * 
 * Events handled:
 * - chat.message: New message received
 * - chat.destroy: Room destruction notification
 * - chat.typing: Typing indicator updates
 * - chat.read: Read receipt notifications
 * 
 * @module api/realtime
 * @requires @upstash/realtime
 * @requires @/lib/realtime
 */

import { handle } from "@upstash/realtime";

import { realtime } from "@/lib/realtime";

/**
 * GET handler for the realtime SSE endpoint.
 * Upstash Realtime client connects here to receive push notifications.
 */
export const GET = handle({ realtime });