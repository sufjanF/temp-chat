import { type NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";

import { redis } from "./lib/redis";

interface RoomMeta extends Record<string, unknown> {
  connected: string[];
  createdAt: number;
}

const MAX_USERS = 2;

/** Handles room access control and token assignment */
export async function proxy(req: NextRequest): Promise<NextResponse> {
  const roomMatch = req.nextUrl.pathname.match(/^\/room\/([^/]+)$/);

  if (!roomMatch) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  const roomId = roomMatch[1];
  const meta = await redis.hgetall<RoomMeta>(`meta:${roomId}`);

  if (!meta) {
    return NextResponse.redirect(new URL("/?error=room-not-found", req.url));
  }

  const existingToken = req.cookies.get("x-auth-token")?.value;

  if (existingToken && meta.connected.includes(existingToken)) {
    return NextResponse.next();
  }

  if (meta.connected.length >= MAX_USERS) {
    return NextResponse.redirect(new URL("/?error=room-full", req.url));
  }

  const token = nanoid();
  const response = NextResponse.next();

  response.cookies.set("x-auth-token", token, {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });

  await redis.hset(`meta:${roomId}`, {
    connected: [...meta.connected, token],
  });

  return response;
}

export const config = {
  matcher: "/room/:path*",
};