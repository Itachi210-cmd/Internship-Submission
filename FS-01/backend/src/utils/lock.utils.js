import crypto from 'crypto';
import { env } from '../config/env.js';
import redisClient from '../config/redis.js';

// Process-local fallback map strictly for development / test environments when Redis is unavailable
// resourceKey -> { token, expiresAt }
const inMemoryLocks = new Map();

/**
 * Acquire an atomic lock for a resource with bounded TTL.
 * In production (multi-instance), strictly uses Redis to prevent split-brain concurrency.
 * In dev/test, safely falls back to process-local memory if Redis is unconfigured.
 *
 * @param {string} resourceKey - identifier for the resource to lock (e.g. "order:6717...")
 * @param {number} ttlSeconds - lock expiration time in seconds (default: 30s)
 * @returns {Promise<string|null>} - lock token string if successfully acquired, null if already locked
 */
export const acquireLock = async (resourceKey, ttlSeconds = 30) => {
  const token = crypto.randomUUID();
  const redisKey = `lock:${resourceKey}`;

  // 1. Primary distributed lock via Redis
  if (redisClient && redisClient.status === 'ready') {
    try {
      const res = await redisClient.set(redisKey, token, 'EX', ttlSeconds, 'NX');
      if (res === 'OK') {
        return token;
      }
      return null;
    } catch (err) {
      // In production, Redis command failure must not silently degrade to process-local locking
      if (env.nodeEnv === 'production') {
        const error = new Error('Distributed lock service unavailable: Redis command failed');
        error.statusCode = 503;
        throw error;
      }
    }
  }

  // 2. Multi-instance safety check: fail safely in production rather than silently degrading
  if (env.nodeEnv === 'production') {
    const error = new Error('Payment locking service unavailable: Redis connection required for multi-instance production');
    error.statusCode = 503;
    throw error;
  }

  // 3. Process-local in-memory fallback strictly for development and tests
  const now = Date.now();
  const existing = inMemoryLocks.get(resourceKey);
  if (existing && existing.expiresAt > now) {
    return null; // Lock is currently held in this process
  }

  inMemoryLocks.set(resourceKey, {
    token,
    expiresAt: now + ttlSeconds * 1000,
  });
  return token;
};

/**
 * Atomically extend a lock's TTL (lease renewal) only if the token matches.
 *
 * @param {string} resourceKey
 * @param {string} token
 * @param {number} ttlSeconds
 * @returns {Promise<boolean>}
 */
export const extendLock = async (resourceKey, token, ttlSeconds = 30) => {
  if (!token) return false;
  const redisKey = `lock:${resourceKey}`;

  if (redisClient && redisClient.status === 'ready') {
    try {
      const luaScript = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("expire", KEYS[1], ARGV[2])
        else
          return 0
        end
      `;
      const res = await redisClient.eval(luaScript, 1, redisKey, token, ttlSeconds);
      return res === 1;
    } catch {
      return false;
    }
  }

  const existing = inMemoryLocks.get(resourceKey);
  if (existing && existing.token === token) {
    existing.expiresAt = Date.now() + ttlSeconds * 1000;
    return true;
  }
  return false;
};

/**
 * Starts a background lease renewal heartbeat for long-running operations.
 * Automatically refreshes the lock lease periodically until stopped.
 *
 * @param {string} resourceKey
 * @param {string} token
 * @param {number} ttlSeconds
 * @param {number} intervalMs
 * @returns {{ stop: () => void }}
 */
export const startLockHeartbeat = (resourceKey, token, ttlSeconds = 30, intervalMs = 10000) => {
  const timer = setInterval(() => {
    extendLock(resourceKey, token, ttlSeconds).catch(() => {});
  }, intervalMs);

  return {
    stop: () => clearInterval(timer),
  };
};

/**
 * Release an atomic lock only if the token matches ownership.
 *
 * @param {string} resourceKey - identifier for the resource
 * @param {string} token - token returned by acquireLock
 */
export const releaseLock = async (resourceKey, token) => {
  if (!token) return;
  const redisKey = `lock:${resourceKey}`;

  // 1. Atomic release in Redis via Lua script
  if (redisClient && redisClient.status === 'ready') {
    try {
      const luaScript = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;
      await redisClient.eval(luaScript, 1, redisKey, token);
    } catch {
      // In-memory cleanup follows
    }
  }

  // 2. Clean up in-memory lock if token matches ownership
  const existing = inMemoryLocks.get(resourceKey);
  if (existing && existing.token === token) {
    inMemoryLocks.delete(resourceKey);
  }
};
