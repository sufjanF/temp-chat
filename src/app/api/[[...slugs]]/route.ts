import { Elysia } from "elysia";
import { nanoid } from "nanoid";
import { z } from "zod";

import { Message, realtime } from "@/lib/realtime";
import { redis } from "@/lib/redis";

import { authMiddleware } from "./auth";

// Duration options in minutes
const VALID_DURATIONS = [5, 10, 30, 60] as const;
const DEFAULT_DURATION_MINUTES = 10;

const rooms = new Elysia({ prefix: "/room" })
  .post(
    "/create",
    async ({ body }) => {
      const roomId = nanoid();
      
      // Validate and use duration, fallback to default
      const durationMinutes = body.duration !== undefined && VALID_DURATIONS.includes(body.duration as typeof VALID_DURATIONS[number])
        ? body.duration
        : DEFAULT_DURATION_MINUTES;
      
      const ttlSeconds = durationMinutes * 60;

      await redis.hset(`meta:${roomId}`, {
        connected: [],
        createdAt: Date.now(),
        duration: durationMinutes,
      });

      await redis.expire(`meta:${roomId}`, ttlSeconds);

      return { roomId };
    },
    {
      body: z.object({
        duration: z.number().optional(),
      }),
    }
  )
  .use(authMiddleware)
  .get(
    "/ttl",
    async ({ auth }) => {
      const ttl = await redis.ttl(`meta:${auth.roomId}`);
      return { ttl: ttl > 0 ? ttl : 0 };
    },
    { query: z.object({ roomId: z.string() }) }
  )
  .delete(
    "/",
    async ({ auth }) => {
      await realtime.channel(auth.roomId).emit("chat.destroy", { isDestroyed: true });

      await Promise.all([
        redis.del(auth.roomId),
        redis.del(`meta:${auth.roomId}`),
        redis.del(`messages:${auth.roomId}`),
      ]);
    },
    { query: z.object({ roomId: z.string() }) }
  );

const messages = new Elysia({ prefix: "/messages" })
  .use(authMiddleware)
  .post(
    "/",
    async ({ body, auth }) => {
      const { sender, text } = body;
      const { roomId } = auth;

      const roomExists = await redis.exists(`meta:${roomId}`);

      if (!roomExists) {
        throw new Error("Room does not exist");
      }

      const message: Message = {
        id: nanoid(),
        sender,
        text,
        timestamp: Date.now(),
        roomId,
      };

      await redis.rpush(`messages:${roomId}`, { ...message, token: auth.token });
      await realtime.channel(roomId).emit("chat.message", message);

      const remaining = await redis.ttl(`meta:${roomId}`);

      await redis.expire(`messages:${roomId}`, remaining);
      await redis.expire(`history:${roomId}`, remaining);
      await redis.expire(roomId, remaining);
    },
    {
      query: z.object({ roomId: z.string() }),
      body: z.object({
        sender: z.string().max(100),
        text: z.string().max(1000),
      }),
    }
  )
  .get(
    "/",
    async ({ auth }) => {
      const messages = await redis.lrange<Message>(
        `messages:${auth.roomId}`,
        0,
        -1
      );

      return {
        messages: messages.map((m) => ({
          ...m,
          token: m.token === auth.token ? auth.token : undefined,
        })),
      };
    },
    { query: z.object({ roomId: z.string() }) }
  );

const typing = new Elysia({ prefix: "/typing" })
  .use(authMiddleware)
  .post(
    "/",
    async ({ body, auth }) => {
      const { username, isTyping } = body;
      await realtime.channel(auth.roomId).emit("chat.typing", { username, isTyping });
    },
    {
      query: z.object({ roomId: z.string() }),
      body: z.object({
        username: z.string(),
        isTyping: z.boolean(),
      }),
    }
  );

const readReceipts = new Elysia({ prefix: "/read" })
  .use(authMiddleware)
  .post(
    "/",
    async ({ body, auth }) => {
      const { messageId, readBy } = body;
      await realtime.channel(auth.roomId).emit("chat.read", {
        messageId,
        readBy,
        timestamp: Date.now(),
      });
    },
    {
      query: z.object({ roomId: z.string() }),
      body: z.object({
        messageId: z.string(),
        readBy: z.string(),
      }),
    }
  );

const app = new Elysia({ prefix: "/api" }).use(rooms).use(messages).use(typing).use(readReceipts);

export const GET = app.fetch;
export const POST = app.fetch;
export const DELETE = app.fetch;

export type App = typeof app;