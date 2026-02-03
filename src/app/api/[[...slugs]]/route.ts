/**
 * @fileoverview Main API route handler for the temp_chat application.
 * 
 * This module defines all REST API endpoints using the Elysia framework,
 * providing functionality for:
 * - Room creation and management
 * - Message sending and retrieval
 * - Typing indicators
 * - Read receipts
 * 
 * All endpoints (except room creation) require authentication via the auth middleware.
 * 
 * @module api/route
 * @requires elysia
 * @requires nanoid
 * @requires @/lib/realtime
 * @requires @/lib/redis
 */

import { Elysia, t } from "elysia";
import { nanoid } from "nanoid";

import { type Message, realtime } from "@/lib/realtime";
import { redis } from "@/lib/redis";

import { authMiddleware } from "./auth";

/**
 * Allowed room duration options in minutes.
 * These values map to the UI duration selector.
 * @constant {readonly number[]}
 */
const VALID_DURATIONS = [5, 10, 30, 60] as const;

/**
 * Default room duration when no valid duration is provided.
 * @constant {number}
 */
const DEFAULT_DURATION = 10;

/**
 * Room management endpoints.
 * Handles room creation, TTL queries, and room destruction.
 */
const rooms = new Elysia({ prefix: "/room" })
  /**
   * POST /api/room/create - Creates a new ephemeral chat room.
   * 
   * @param {Object} body - Request body
   * @param {number} [body.duration] - Room lifetime in minutes (5, 10, 30, or 60)
   * @returns {{ roomId: string }} The unique identifier for the created room
   */
  .post(
    "/create",
    async ({ body }) => {
      // Generate a unique room identifier using nanoid
      const roomId = nanoid();
      
      // Validate and sanitize duration, falling back to default if invalid
      const duration = body.duration && VALID_DURATIONS.includes(body.duration as (typeof VALID_DURATIONS)[number])
        ? body.duration
        : DEFAULT_DURATION;
      
      // Convert duration from minutes to seconds for Redis TTL
      const ttl = duration * 60;

      // Initialize room metadata in Redis hash
      await redis.hset(`meta:${roomId}`, {
        connected: [],       // Array of authenticated user tokens
        createdAt: Date.now(), // Timestamp for room creation
        duration,            // Configured duration for reference
      });
      
      // Set automatic expiration on the room metadata
      await redis.expire(`meta:${roomId}`, ttl);

      return { roomId };
    },
    { body: t.Object({ duration: t.Optional(t.Number()) }) }
  )
  // Apply authentication middleware to all subsequent endpoints
  .use(authMiddleware)
  /**
   * GET /api/room/ttl - Retrieves remaining time-to-live for a room.
   * 
   * @param {Object} query - Query parameters
   * @param {string} query.roomId - The room identifier
   * @returns {{ ttl: number }} Remaining seconds until room expires (minimum 0)
   */
  .get(
    "/ttl",
    async ({ auth }) => {
      // Query Redis for remaining TTL in seconds
      const ttl = await redis.ttl(`meta:${auth.roomId}`);
      // Ensure non-negative value (Redis returns -2 if key doesn't exist)
      return { ttl: Math.max(0, ttl) };
    },
    { query: t.Object({ roomId: t.String() }) }
  )
  /**
   * DELETE /api/room - Immediately destroys a room and all associated data.
   * 
   * This endpoint:
   * 1. Broadcasts a destroy event to all connected clients
   * 2. Removes all room data from Redis (metadata, messages, etc.)
   * 
   * @param {Object} query - Query parameters
   * @param {string} query.roomId - The room identifier to destroy
   */
  .delete(
    "/",
    async ({ auth }) => {
      // Notify all connected clients that the room is being destroyed
      await realtime.channel(auth.roomId).emit("chat.destroy", { isDestroyed: true });
      
      // Clean up all Redis keys associated with this room in parallel
      await Promise.all([
        redis.del(auth.roomId),              // Room data (if any)
        redis.del(`meta:${auth.roomId}`),    // Room metadata
        redis.del(`messages:${auth.roomId}`), // Message history
      ]);
    },
    { query: t.Object({ roomId: t.String() }) }
  );

/**
 * Message endpoints.
 * Handles sending new messages and retrieving message history.
 */
const messages = new Elysia({ prefix: "/messages" })
  .use(authMiddleware)
  /**
   * POST /api/messages - Sends a new message to a chat room.
   * 
   * The message is:
   * 1. Validated and stored in Redis with sender's token (for ownership)
   * 2. Broadcast to all connected clients via realtime
   * 3. Automatically expired with the room's TTL
   * 
   * @param {Object} body - Request body
   * @param {string} body.sender - Display name of the message sender
   * @param {string} body.text - Message content (max 1000 characters)
   * @throws {Error} If the room no longer exists
   */
  .post(
    "/",
    async ({ body, auth }) => {
      const { roomId, token } = auth;

      // Verify room still exists before accepting message
      if (!(await redis.exists(`meta:${roomId}`))) {
        throw new Error("Room does not exist");
      }

      // Construct message object with unique ID and timestamp
      const message: Message = {
        id: nanoid(),
        sender: body.sender,
        text: body.text,
        timestamp: Date.now(),
        roomId,
      };

      // Store message with token for ownership identification
      await redis.rpush(`messages:${roomId}`, { ...message, token });
      
      // Broadcast message to all connected clients in real-time
      await realtime.channel(roomId).emit("chat.message", message);

      // Sync message expiration with room TTL to ensure cleanup
      const remaining = await redis.ttl(`meta:${roomId}`);
      await Promise.all([
        redis.expire(`messages:${roomId}`, remaining),
        redis.expire(roomId, remaining),
      ]);
    },
    {
      query: t.Object({ roomId: t.String() }),
      body: t.Object({
        sender: t.String({ maxLength: 100 }), // Prevent excessively long usernames
        text: t.String({ maxLength: 1000 }),  // Prevent message spam/abuse
      }),
    }
  )
  /**
   * GET /api/messages - Retrieves all messages for a room.
   * 
   * Returns messages with ownership information (token only visible for own messages)
   * to enable UI differentiation between sent and received messages.
   * 
   * @param {Object} query - Query parameters
   * @param {string} query.roomId - The room identifier
   * @returns {{ messages: Message[] }} Array of messages with ownership tokens
   */
  .get(
    "/",
    async ({ auth }) => {
      // Fetch all messages from the Redis list
      const msgs = await redis.lrange<Message>(`messages:${auth.roomId}`, 0, -1);
      return {
        // Map messages, only exposing token for messages sent by the current user
        messages: msgs.map((m) => ({
          ...m,
          // Only include token if this message belongs to the requesting user
          token: m.token === auth.token ? auth.token : undefined,
        })),
      };
    },
    { query: t.Object({ roomId: t.String() }) }
  );

/**
 * Typing indicator endpoints.
 * Enables real-time "user is typing..." functionality.
 */
const typing = new Elysia({ prefix: "/typing" })
  .use(authMiddleware)
  /**
   * POST /api/typing - Broadcasts typing status to room participants.
   * 
   * @param {Object} body - Request body
   * @param {string} body.username - The username of the typing user
   * @param {boolean} body.isTyping - Whether the user is currently typing
   */
  .post(
    "/",
    async ({ body, auth }) => {
      // Broadcast typing indicator to all clients in the room
      await realtime.channel(auth.roomId).emit("chat.typing", body);
    },
    {
      query: t.Object({ roomId: t.String() }),
      body: t.Object({ username: t.String(), isTyping: t.Boolean() }),
    }
  );

/**
 * Read receipt endpoints.
 * Enables message read status tracking.
 */
const readReceipts = new Elysia({ prefix: "/read" })
  .use(authMiddleware)
  /**
   * POST /api/read - Broadcasts a read receipt for a specific message.
   * 
   * @param {Object} body - Request body
   * @param {string} body.messageId - ID of the message that was read
   * @param {string} body.readBy - Username of the reader
   */
  .post(
    "/",
    async ({ body, auth }) => {
      // Broadcast read receipt with server timestamp for consistency
      await realtime.channel(auth.roomId).emit("chat.read", {
        ...body,
        timestamp: Date.now(),
      });
    },
    {
      query: t.Object({ roomId: t.String() }),
      body: t.Object({ messageId: t.String(), readBy: t.String() }),
    }
  );

/**
 * Main Elysia application instance.
 * Composes all route modules under the /api prefix.
 */
const app = new Elysia({ prefix: "/api" })
  .use(rooms)        // Room management routes
  .use(messages)     // Message handling routes
  .use(typing)       // Typing indicator routes
  .use(readReceipts); // Read receipt routes

/**
 * Next.js App Router HTTP method handlers.
 * These exports allow Next.js to route requests to the Elysia app.
 */
export const GET = app.fetch;
export const POST = app.fetch;
export const DELETE = app.fetch;

/**
 * Type export for client-side type inference.
 * Used by Eden treaty client for end-to-end type safety.
 */
export type App = typeof app;