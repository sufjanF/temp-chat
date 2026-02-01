import { type InferRealtimeEvents, Realtime } from "@upstash/realtime";
import { z } from "zod";

import { redis } from "@/lib/redis";

const messageSchema = z.object({
  id: z.string(),
  sender: z.string(),
  text: z.string(),
  timestamp: z.number(),
  roomId: z.string(),
  token: z.string().optional(),
});

const schema = {
  chat: {
    message: messageSchema,
    destroy: z.object({ isDestroyed: z.literal(true) }),
    typing: z.object({ username: z.string(), isTyping: z.boolean() }),
    read: z.object({ messageId: z.string(), readBy: z.string(), timestamp: z.number() }),
  },
};

export const realtime = new Realtime({ schema, redis });

export type RealtimeEvents = InferRealtimeEvents<typeof realtime>;
export type Message = z.infer<typeof messageSchema>;