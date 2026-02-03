/**
 * @fileoverview Upstash Redis client configuration.
 * 
 * This module initializes the Redis client using environment variables.
 * Upstash Redis is used as the primary data store for:
 * - Room metadata (connected users, creation time, duration)
 * - Message history (automatically expired with room TTL)
 * - Session management via TTL-based key expiration
 * 
 * Required environment variables:
 * - UPSTASH_REDIS_REST_URL: Redis REST API endpoint
 * - UPSTASH_REDIS_REST_TOKEN: Authentication token
 * 
 * @module lib/redis
 * @requires @upstash/redis
 * @see {@link https://upstash.com/docs/redis/overall/getstarted}
 */

import { Redis } from "@upstash/redis";

/**
 * Configured Upstash Redis client instance.
 * 
 * Automatically reads connection details from environment variables:
 * - UPSTASH_REDIS_REST_URL
 * - UPSTASH_REDIS_REST_TOKEN
 * 
 * @example
 * // Store room metadata
 * await redis.hset(`meta:${roomId}`, { connected: [], createdAt: Date.now() });
 * 
 * // Set expiration
 * await redis.expire(`meta:${roomId}`, ttlInSeconds);
 * 
 * // Retrieve data
 * const meta = await redis.hgetall(`meta:${roomId}`);
 */
export const redis = Redis.fromEnv();