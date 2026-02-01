import { Elysia, t } from "elysia";
import { nanoid } from "nanoid";

import { type Message, realtime } from "@/lib/realtime";
import { redis } from "@/lib/redis";

import { authMiddleware } from "./auth";

const VALID_DURATIONS = [5, 10, 30, 60] as const;
const DEFAULT_DURATION = 10;

/** Room management endpoints */
const rooms = new Elysia({ prefix: "/room" })
  .post(
    "/create",
    async ({ body }) => {
      const roomId = nanoid();
      const duration = body.duration && VALID_DURATIONS.includes(body.duration as (typeof VALID_DURATIONS)[number])
        ? body.duration
        : DEFAULT_DURATION;
      const ttl = duration * 60;

      await redis.hset(`meta:${roomId}`, {
        connected: [],
        createdAt: Date.now(),
        duration,
      });
      await redis.expire(`meta:${roomId}`, ttl);

      return { roomId };
    },
    { body: t.Object({ duration: t.Optional(t.Number()) }) }
  )
  .use(authMiddleware)
  .get(
    "/ttl",
    async ({ auth }) => {
      const ttl = await redis.ttl(`meta:${auth.roomId}`);
      return { ttl: Math.max(0, ttl) };
    },
    { query: t.Object({ roomId: t.String() }) }
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
    { query: t.Object({ roomId: t.String() }) }
  );

/** Message endpoints */
const messages = new Elysia({ prefix: "/messages" })
  .use(authMiddleware)
  .post(
    "/",
    async ({ body, auth }) => {
      const { roomId, token } = auth;

      if (!(await redis.exists(`meta:${roomId}`))) {
        throw new Error("Room does not exist");
      }

      const message: Message = {
        id: nanoid(),
        sender: body.sender,
        text: body.text,
        timestamp: Date.now(),
        roomId,
      };

      await redis.rpush(`messages:${roomId}`, { ...message, token });
      await realtime.channel(roomId).emit("chat.message", message);

      const remaining = await redis.ttl(`meta:${roomId}`);
      await Promise.all([
        redis.expire(`messages:${roomId}`, remaining),
        redis.expire(roomId, remaining),
      ]);
    },
    {
      query: t.Object({ roomId: t.String() }),
      body: t.Object({
        sender: t.String({ maxLength: 100 }),
        text: t.String({ maxLength: 1000 }),
      }),
    }
  )
  .get(
    "/",
    async ({ auth }) => {
      const msgs = await redis.lrange<Message>(`messages:${auth.roomId}`, 0, -1);
      return {
        messages: msgs.map((m) => ({
          ...m,
          token: m.token === auth.token ? auth.token : undefined,
        })),
      };
    },
    { query: t.Object({ roomId: t.String() }) }
  );

/** Typing indicator endpoint */
const typing = new Elysia({ prefix: "/typing" })
  .use(authMiddleware)
  .post(
    "/",
    async ({ body, auth }) => {
      await realtime.channel(auth.roomId).emit("chat.typing", body);
    },
    {
      query: t.Object({ roomId: t.String() }),
      body: t.Object({ username: t.String(), isTyping: t.Boolean() }),
    }
  );

/** Read receipt endpoint */
const readReceipts = new Elysia({ prefix: "/read" })
  .use(authMiddleware)
  .post(
    "/",
    async ({ body, auth }) => {
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

const app = new Elysia({ prefix: "/api" })
  .use(rooms)
  .use(messages)
  .use(typing)
  .use(readReceipts);

export const GET = app.fetch;
export const POST = app.fetch;
export const DELETE = app.fetch;

export type App = typeof app;