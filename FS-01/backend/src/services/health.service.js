import { checkMongoHealth } from '../config/db.js';
import { checkRedisHealth } from '../config/redis.js';
import { checkElasticsearchHealth } from '../config/es.js';

/**
 * Service to aggregate health statuses of MongoDB, Redis, and Elasticsearch concurrently.
 * All checks are strictly bounded with timeouts.
 *
 * Dependency Policy:
 * - MongoDB: REQUIRED (Core database for authentication, products, orders, users)
 * - Redis: REQUIRED (Core storage for shopping carts and JWT refresh token whitelisting)
 * - Elasticsearch: OPTIONAL (Search fallback to MongoDB is fully supported)
 *
 * Status Definitions:
 * - 'ok': MongoDB and Redis are connected, and Elasticsearch is connected or disabled.
 * - 'degraded': MongoDB is connected, but Redis or Elasticsearch is disconnected/connecting.
 * - 'down': MongoDB is disconnected (the primary database is down; core operations cannot proceed).
 *
 * @returns {Promise<{
 *   status: 'ok' | 'degraded' | 'down',
 *   isReady: boolean,
 *   timestamp: string,
 *   uptimeSeconds: number,
 *   services: {
 *     mongodb: object,
 *     redis: object,
 *     elasticsearch: object
 *   }
 * }>}
 */
export const getHealthStatus = async () => {
  // Execute all checks concurrently with an overall 3-second safety net
  const healthChecksPromise = Promise.all([
    checkMongoHealth(),
    checkRedisHealth(),
    checkElasticsearchHealth(),
  ]);

  const fallbackTimeoutPromise = new Promise((resolve) =>
    setTimeout(
      () =>
        resolve([
          { status: 'error', error: 'Health check timed out (3000ms)' },
          { status: 'error', error: 'Health check timed out (3000ms)' },
          { status: 'disabled', message: 'Health check timed out' },
        ]),
      3000
    )
  );

  const [mongo, redis, elasticsearch] = await Promise.race([
    healthChecksPromise,
    fallbackTimeoutPromise,
  ]);

  const mongoConnected = mongo.status === 'connected';
  const redisConnected = redis.status === 'connected';
  const esHealthy = elasticsearch.status === 'connected' || elasticsearch.status === 'disabled';

  // Application readiness requires both core dependencies (MongoDB and Redis)
  // Optional Elasticsearch does NOT block readiness
  const isReady = mongoConnected && redisConnected;

  let overallStatus = 'down';
  if (isReady && esHealthy) {
    overallStatus = 'ok';
  } else if (mongoConnected) {
    overallStatus = 'degraded';
  } else {
    overallStatus = 'down';
  }

  return {
    status: overallStatus,
    isReady,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    services: {
      mongodb: { ...mongo, required: true },
      redis: { ...redis, required: true },
      elasticsearch: { ...elasticsearch, required: false },
    },
  };
};
