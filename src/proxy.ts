/**
 * @fileoverview Middleware proxy for room access control and authentication.
 * 
 * This module handles the critical security layer for chat room access,
 * managing user authentication tokens and enforcing room capacity limits.
 * 
 * @module proxy
 * @requires next/server
 * @requires nanoid
 * @requires ./lib/redis
 */

import { type NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";

import { redis } from "./lib/redis";

/**
 * Metadata structure stored in Redis for each active chat room.
 * 
 * @interface RoomMeta
 * @extends {Record<string, unknown>}
 */
interface RoomMeta extends Record<string, unknown> {
  /** Array of authentication tokens for connected users */
  connected: string[];
  /** Unix timestamp (ms) when the room was created */
  createdAt: number;
}

/**
 * Maximum number of users allowed per chat room.
 * This limit ensures intimate, private conversations.
 * @constant {number}
 */
const MAX_USERS = 2;

/**
 * Handles room access control and token-based authentication.
 * 
 * This middleware function performs the following operations:
 * 1. Validates that the request is for a valid room URL
 * 2. Checks if the room exists in Redis
 * 3. Validates existing authentication tokens
 * 4. Enforces room capacity limits
 * 5. Issues new authentication tokens for valid access attempts
 * 
 * @async
 * @function proxy
 * @param {NextRequest} req - The incoming Next.js request object
 * @returns {Promise<NextResponse>} Response with appropriate redirect or continuation
 * 
 * @example
 * // Middleware automatically handles requests to /room/[roomId]
 * // Users without valid tokens receive new ones if room has capacity
 * // Users with valid tokens are allowed to proceed
 */
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

  // Detect non-browser requests (iMessage link preview bots, crawlers, etc.)
  // Real browsers always send the Sec-Fetch-Dest header; bots/unfurlers do not.
  // Without this check, iMessage's URL preview fetcher creates an auth token
  // when the room link is texted, consuming a slot and causing "room full."
  const secFetchDest = req.headers.get("sec-fetch-dest");
  if (!secFetchDest) {
    return NextResponse.next();
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
    sameSite: "lax",
  });

  await redis.hset(`meta:${roomId}`, {
    connected: [...meta.connected, token],
  });

  return response;
}

/**
 * Next.js middleware configuration.
 * Specifies which routes this middleware should intercept.
 * 
 * @constant {Object}
 * @property {string} matcher - URL pattern for room routes
 */
export const config = {
  matcher: "/room/:path*",
};