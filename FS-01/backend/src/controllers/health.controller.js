import { getHealthStatus } from '../services/health.service.js';

/**
 * Controller for GET /api/health/live
 * Liveness probe: returns HTTP 200 if the Node.js HTTP server process is running.
 * Strictly performs no external database or network calls.
 */
export const getLiveness = (req, res) => {
  return res.status(200).json({
    status: 'alive',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
};

/**
 * Controller for GET /api/health/ready
 * Readiness probe: returns HTTP 200 when required dependencies (MongoDB & Redis) are ready.
 * Returns HTTP 503 if required dependencies are unavailable.
 * Optional Elasticsearch failure does NOT block readiness.
 */
export const getReadiness = async (req, res, next) => {
  try {
    const health = await getHealthStatus();
    const httpStatus = health.isReady ? 200 : 503;
    return res.status(httpStatus).json(health);
  } catch (error) {
    next(error);
  }
};

/**
 * Controller for GET /api/health
 * Comprehensive health report endpoint.
 * Returns HTTP 200 if ok or degraded, 503 if primary database is down.
 */
export const getHealth = async (req, res, next) => {
  try {
    const health = await getHealthStatus();
    const httpStatus = health.status === 'down' ? 503 : 200;
    return res.status(httpStatus).json(health);
  } catch (error) {
    next(error);
  }
};
