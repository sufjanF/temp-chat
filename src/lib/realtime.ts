/**
 * @fileoverview Upstash Realtime configuration and event schema definitions.
 * 
 * This module defines the real-time event schema using Zod for runtime
 * validation and TypeScript type inference. All real-time events in the
 * application are defined here to ensure type safety across the codebase.
 * 
 * Event namespacing follows the pattern: {domain}.{action}
 * - chat.message: New chat message
 * - chat.destroy: Room destruction notification
 * - chat.typing: Typing indicator update
 * - chat.read: Message read receipt
 * 
 * @module lib/realtime
 * @requires @upstash/realtime
 * @requires zod
 */

import { type InferRealtimeEvents, Realtime } from "@upstash/realtime";
import { z } from "zod";

import { redis } from "@/lib/redis";

/**
 * Zod schema for chat message validation.
 * Defines the structure of messages sent and received in chat rooms.
 */
const messageSchema = z.object({
  /** Unique message identifier (nanoid) */
  id: z.string(),
  /** Display name of the message sender */
  sender: z.string(),
  /** Message content */
  text: z.string(),
  /** Unix timestamp (ms) when message was sent */
  timestamp: z.number(),
  /** Room identifier the message belongs to */
  roomId: z.string(),
  /** Authentication token (only present for own messages) */
  token: z.string().optional(),
});

/**
 * Complete real-time event schema definition.
 * Organizes events by domain (chat) and action (message, destroy, etc.).
 */
const schema = {
  chat: {
    /** New message event - broadcast when a user sends a message */
    message: messageSchema,
    /** Room destruction event - broadcast when room is terminated */
    destroy: z.object({ isDestroyed: z.literal(true) }),
    /** Typing indicator event - broadcast when user starts/stops typing */
    typing: z.object({ username: z.string(), isTyping: z.boolean() }),
    /** Read receipt event - broadcast when a message is read */
    read: z.object({ messageId: z.string(), readBy: z.string(), timestamp: z.number() }),
  },
};

/**
 * Configured Upstash Realtime instance.
 * Uses the defined schema for type-safe event emission and subscription.
 */
export const realtime = new Realtime({ schema, redis });

/**
 * Inferred type for all real-time events.
 * Used by the client-side hook for type-safe event handling.
 */
export type RealtimeEvents = InferRealtimeEvents<typeof realtime>;

/**
 * Inferred Message type from the Zod schema.
 * Used throughout the application for type-safe message handling.
 */
export type Message = z.infer<typeof messageSchema>;