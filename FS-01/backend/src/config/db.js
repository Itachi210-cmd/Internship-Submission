import mongoose from 'mongoose';
import { env } from './env.js';

let retryTimeoutId = null;
let isConnecting = false;

/**
 * Clear any active retry timers for MongoDB
 */
export const clearMongoRetryTimer = () => {
  if (retryTimeoutId) {
    clearTimeout(retryTimeoutId);
    retryTimeoutId = null;
  }
};

/**
 * Connect to MongoDB using Mongoose with bounded retries and exponential backoff.
 * Throws if connection cannot be established after maxRetries.
 * Prevents multiple concurrent connection attempts.
 *
 * @param {number} maxRetries Number of retry attempts before throwing
 * @returns {Promise<typeof mongoose>}
 */
export const connectDB = async (maxRetries = 3) => {
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  if (isConnecting) {
    console.log('[MongoDB] Connection attempt already in progress, awaiting...');
    while (mongoose.connection.readyState === 2) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (mongoose.connection.readyState === 1) {
      return mongoose;
    }
  }

  isConnecting = true;
  clearMongoRetryTimer();

  let attempt = 0;
  while (attempt <= maxRetries) {
    try {
      const conn = await mongoose.connect(env.mongoUri, {
        serverSelectionTimeoutMS: 5000,
      });
      console.log(`[MongoDB] Connected: ${conn.connection.host}`);
      isConnecting = false;
      return conn;
    } catch (error) {
      attempt++;
      if (attempt > maxRetries) {
        isConnecting = false;
        console.error(`[MongoDB] Fatal: Failed to connect after ${maxRetries + 1} attempts: ${error.message}`);
        throw error;
      }
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      console.warn(
        `[MongoDB] Connection attempt ${attempt} failed: ${error.message}. Retrying in ${delay / 1000}s...`
      );
      await new Promise((resolve) => {
        retryTimeoutId = setTimeout(resolve, delay);
      });
      retryTimeoutId = null;
    }
  }
};

/**
 * Health check helper for MongoDB.
 * Strictly inspects current connection status without attempting to establish a new connection.
 * Bounds ping to a maximum 2-second timeout.
 *
 * @returns {Promise<{ status: string, latencyMs?: number, error?: string }>}
 */
export const checkMongoHealth = async () => {
  const readyStates = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  const state = readyStates[mongoose.connection.readyState] || 'disconnected';

  if (state !== 'connected') {
    return {
      status: state,
      error: state === 'connecting' ? 'MongoDB connection in progress' : 'MongoDB is not connected',
    };
  }

  try {
    const start = Date.now();
    const pingPromise = mongoose.connection.db.admin().ping();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('MongoDB ping timeout (2000ms exceeded)')), 2000)
    );
    await Promise.race([pingPromise, timeoutPromise]);
    const latencyMs = Date.now() - start;

    return { status: 'connected', latencyMs };
  } catch (err) {
    return { status: 'error', error: err.message };
  }
};

/**
 * Gracefully close MongoDB connection and clear any pending timers
 */
export const closeDB = async () => {
  clearMongoRetryTimer();
  isConnecting = false;
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close(false);
    console.log('[MongoDB] Connection closed.');
  }
};

export default mongoose;
