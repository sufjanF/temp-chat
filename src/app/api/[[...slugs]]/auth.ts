/**
 * @fileoverview Authentication middleware for API route protection.
 * 
 * This module provides token-based authentication for the chat API,
 * validating that users have proper access to the rooms they're trying to interact with.
 * 
 * @module api/auth
 * @requires elysia
 * @requires @/lib/redis
 */

import Elysia from "elysia";

import { redis } from "@/lib/redis";

/**
 * Custom error class for authentication failures.
 * Extends the native Error class to provide specific error handling
 * for unauthorized access attempts.
 * 
 * @class AuthError
 * @extends {Error}
 */
class AuthError extends Error {
  /**
   * Creates an instance of AuthError.
   * @param {string} message - Description of the authentication failure
   */
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

/**
 * Elysia middleware plugin for validating room access via authentication tokens.
 * 
 * This middleware:
 * 1. Extracts roomId from query parameters
 * 2. Reads the authentication token from cookies
 * 3. Validates the token against the room's connected users in Redis
 * 4. Provides authenticated context for downstream handlers
 * 
 * @constant {Elysia}
 * @example
 * // Usage in route definition
 * new Elysia()
 *   .use(authMiddleware)
 *   .get("/protected", ({ auth }) => {
 *     // auth.roomId, auth.token, auth.connected are available
 *   });
 */
export const authMiddleware = new Elysia({ name: "auth" })
  // Register custom AuthError type for proper error handling
  .error({ AuthError })
  // Global error handler for authentication failures
  .onError(({ code, set }) => {
    if (code === "AuthError") {
      set.status = 401; // HTTP 401 Unauthorized
      return { error: "Unauthorized" };
    }
  })
  // Derive authentication context for all downstream handlers
  .derive({ as: "scoped" }, async ({ query, cookie }) => {
    // Extract required authentication parameters
    const roomId = query.roomId;
    const token = cookie["x-auth-token"].value as string | undefined;

    // Validate presence of required credentials
    if (!roomId || !token) {
      throw new AuthError("Missing roomId or token");
    }

    // Fetch list of authorized tokens for this room from Redis
    const connected = await redis.hget<string[]>(`meta:${roomId}`, "connected");

    // Verify the provided token is in the authorized list
    if (!connected?.includes(token)) {
      throw new AuthError("Invalid token");
    }

    // Return authenticated context for use in route handlers
    return { auth: { roomId, token, connected } };
  });