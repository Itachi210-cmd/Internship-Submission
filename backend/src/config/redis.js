import Redis from 'ioredis';
import { env } from './env.js';

/**
 * Sanitize Redis URL for logging so credentials are never leaked
 */
const sanitizeRedisUrl = (urlStr) => {
  if (!urlStr) return '';
  try {
    const parsed = new URL(urlStr);
    if (parsed.password) {
      parsed.password = '***';
    }
    return parsed.toString();
  } catch {
    return 'redis://[sanitized]';
  }
};

const redisOptions = {
  lazyConnect: true,
  maxRetriesPerRequest: 20,
  keepAlive: 30000,      // Send TCP keep-alive packets every 30s to prevent idle connection drops
  connectTimeout: 10000, // 10s connection timeout
  commandTimeout: 5000,  // Bound individual commands to 5s to avoid long queues during outages
  retryStrategy(times) {
    // Exponential backoff reconnect: 150ms, 300ms... capped at 3000ms
    return Math.min(times * 150, 3000);
  },
  reconnectOnError(err) {
    const targetError = 'READONLY';
    if (err && err.message && err.message.includes(targetError)) {
      return true; // Reconnect when receiving READONLY error
    }
    return false;
  },
};

// Enable TLS for secure rediss:// protocol with proper SNI servername and valid certificate verification
if (env.redisUrl && env.redisUrl.startsWith('rediss://')) {
  try {
    const parsed = new URL(env.redisUrl);
    redisOptions.tls = {
      servername: parsed.hostname,
    };
  } catch {
    redisOptions.tls = {};
  }
}

/**
 * ioredis client instance
 */
export const redisClient = new Redis(env.redisUrl, redisOptions);

redisClient.on('connect', () => {
  console.log(`[Redis] Connected to server (${sanitizeRedisUrl(env.redisUrl)})`);
});

redisClient.on('ready', () => {
  console.log('[Redis] Client ready to process commands');
});

redisClient.on('reconnecting', (delay) => {
  console.log(`[Redis] Reconnecting in ${delay}ms...`);
});

redisClient.on('close', () => {
  // Connection closed
});

redisClient.on('error', (err) => {
  // Catch all errors so background reconnect drops never crash the Node process
  console.warn(`[Redis] Connection warning: ${err.message || 'Transient error'}`);
});

let redisRetryTimeout = null;
let isConnecting = false;

/**
 * Clear any active retry timer for Redis
 */
export const clearRedisRetryTimer = () => {
  if (redisRetryTimeout) {
    clearTimeout(redisRetryTimeout);
    redisRetryTimeout = null;
  }
};

/**
 * Connect to Redis during app startup with timeout and exponential backoff.
 * Prevents multiple concurrent connection attempts.
 * Does not throw fatal error to avoid crashing the server if Redis is degraded.
 */
export const connectRedis = async (retryAttempt = 0) => {
  if (redisClient.status === 'ready' || redisClient.status === 'connect') {
    return;
  }

  if (isConnecting) {
    return;
  }

  clearRedisRetryTimer();
  isConnecting = true;

  try {
    if (redisClient.status === 'wait' || redisClient.status === 'close') {
      // Race initial connection with 5000ms timeout so startup is never blocked indefinitely
      const connectPromise = redisClient.connect();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Initial connect timeout (5000ms exceeded)')), 5000)
      );
      await Promise.race([connectPromise, timeoutPromise]);
    }
  } catch (error) {
    const delay = Math.min(1000 * Math.pow(2, retryAttempt), 15000);
    console.warn(
      `[Redis] Initial connection deferred: ${error.message}. Background reconnect in ${delay / 1000}s (attempt ${retryAttempt + 1})...`
    );

    redisRetryTimeout = setTimeout(() => {
      connectRedis(retryAttempt + 1).catch(() => {});
    }, delay);
  } finally {
    isConnecting = false;
  }
};

/**
 * Health check helper for Redis.
 * Non-blocking: returns immediately if client is not ready.
 * Ping bounded to a maximum 2-second timeout.
 *
 * @returns {Promise<{ status: string, latencyMs?: number, clientStatus?: string, error?: string }>}
 */
export const checkRedisHealth = async () => {
  try {
    // If client is not ready, report current status immediately without queueing or blocking
    if (redisClient.status !== 'ready') {
      return {
        status: redisClient.status === 'connecting' || redisClient.status === 'connect' ? 'connecting' : 'disconnected',
        clientStatus: redisClient.status,
      };
    }

    const start = Date.now();
    const pingPromise = redisClient.ping();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Redis ping timeout (2000ms exceeded)')), 2000)
    );
    const pong = await Promise.race([pingPromise, timeoutPromise]);
    const latencyMs = Date.now() - start;

    return {
      status: pong === 'PONG' ? 'connected' : 'error',
      latencyMs,
    };
  } catch (error) {
    return {
      status: 'disconnected',
      error: error.message,
    };
  }
};

/**
 * Gracefully close Redis connection and clear any active timers
 */
export const closeRedis = async () => {
  clearRedisRetryTimer();
  isConnecting = false;

  try {
    if (redisClient.status !== 'end' && redisClient.status !== 'close') {
      await redisClient.quit();
      console.log('[Redis] Connection closed gracefully.');
    }
  } catch (err) {
    redisClient.disconnect();
    console.warn(`[Redis] Force disconnected: ${err.message}`);
  }
};

export default redisClient;
