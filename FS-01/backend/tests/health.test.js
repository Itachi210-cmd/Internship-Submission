import { jest } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { checkMongoHealth, connectDB } from '../src/config/db.js';
import { checkRedisHealth, redisClient } from '../src/config/redis.js';
import { checkElasticsearchHealth, esClient } from '../src/config/es.js';
import { getHealthStatus } from '../src/services/health.service.js';

describe('Health Check Endpoints & Backing Services', () => {
  beforeAll(async () => {
    // If not already connected in test environment, mock or connect
    if (mongoose.connection.readyState !== 1) {
      try {
        await connectDB(1);
      } catch {
        // Mongo memory server might be handled elsewhere
      }
    }
  });

  describe('GET /api/health/live (Liveness Probe)', () => {
    it('always returns HTTP 200 with alive status without calling databases', async () => {
      const res = await request(app).get('/api/health/live');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('alive');
      expect(typeof res.body.uptimeSeconds).toBe('number');
      expect(typeof res.body.timestamp).toBe('string');
    });
  });

  describe('GET /api/health/ready (Readiness Probe)', () => {
    it('returns HTTP 200 when required dependencies (MongoDB & Redis) are ready', async () => {
      const originalReadyState = mongoose.connection.readyState;
      Object.defineProperty(mongoose.connection, 'readyState', { value: 1, configurable: true });
      jest.spyOn(mongoose.connection.db.admin(), 'ping').mockResolvedValue({ ok: 1 });
      jest.spyOn(redisClient, 'ping').mockResolvedValue('PONG');
      Object.defineProperty(redisClient, 'status', { value: 'ready', configurable: true });

      const res = await request(app).get('/api/health/ready');
      expect(res.status).toBe(200);
      expect(res.body.isReady).toBe(true);
      expect(res.body.services.mongodb.status).toBe('connected');
      expect(res.body.services.redis.status).toBe('connected');

      Object.defineProperty(mongoose.connection, 'readyState', { value: originalReadyState, configurable: true });
      jest.restoreAllMocks();
    });

    it('returns HTTP 503 when MongoDB is disconnected', async () => {
      const originalReadyState = mongoose.connection.readyState;
      Object.defineProperty(mongoose.connection, 'readyState', { value: 0, configurable: true }); // disconnected
      jest.spyOn(redisClient, 'ping').mockResolvedValue('PONG');
      Object.defineProperty(redisClient, 'status', { value: 'ready', configurable: true });

      const res = await request(app).get('/api/health/ready');
      expect(res.status).toBe(503);
      expect(res.body.isReady).toBe(false);
      expect(res.body.services.mongodb.status).toBe('disconnected');
      expect(res.body.status).toBe('down');

      Object.defineProperty(mongoose.connection, 'readyState', { value: originalReadyState, configurable: true });
      jest.restoreAllMocks();
    });

    it('returns HTTP 503 when Redis is disconnected', async () => {
      const originalReadyState = mongoose.connection.readyState;
      Object.defineProperty(mongoose.connection, 'readyState', { value: 1, configurable: true });
      jest.spyOn(mongoose.connection.db.admin(), 'ping').mockResolvedValue({ ok: 1 });
      Object.defineProperty(redisClient, 'status', { value: 'close', configurable: true });

      const res = await request(app).get('/api/health/ready');
      expect(res.status).toBe(503);
      expect(res.body.isReady).toBe(false);
      expect(res.body.services.redis.status).toBe('disconnected');
      expect(res.body.status).toBe('degraded');

      Object.defineProperty(mongoose.connection, 'readyState', { value: originalReadyState, configurable: true });
      jest.restoreAllMocks();
    });

    it('does NOT fail readiness when optional Elasticsearch is disabled or disconnected', async () => {
      const originalReadyState = mongoose.connection.readyState;
      Object.defineProperty(mongoose.connection, 'readyState', { value: 1, configurable: true });
      jest.spyOn(mongoose.connection.db.admin(), 'ping').mockResolvedValue({ ok: 1 });
      jest.spyOn(redisClient, 'ping').mockResolvedValue('PONG');
      Object.defineProperty(redisClient, 'status', { value: 'ready', configurable: true });

      const res = await request(app).get('/api/health/ready');
      expect(res.status).toBe(200);
      expect(res.body.isReady).toBe(true);
      expect(res.body.services.elasticsearch.required).toBe(false);

      Object.defineProperty(mongoose.connection, 'readyState', { value: originalReadyState, configurable: true });
      jest.restoreAllMocks();
    });
  });

  describe('GET /api/health (Full Diagnostics)', () => {
    it('returns comprehensive diagnostics with service details', async () => {
      const res = await request(app).get('/api/health');
      expect([200, 503]).toContain(res.status);
      expect(res.body).toHaveProperty('status');
      expect(res.body).toHaveProperty('isReady');
      expect(res.body).toHaveProperty('services');
      expect(res.body.services).toHaveProperty('mongodb');
      expect(res.body.services).toHaveProperty('redis');
      expect(res.body.services).toHaveProperty('elasticsearch');
    });
  });

  describe('Bounded Health Check Timeouts', () => {
    it('checkMongoHealth handles ping timeouts within 2 seconds without reconnecting', async () => {
      const originalReadyState = mongoose.connection.readyState;
      Object.defineProperty(mongoose.connection, 'readyState', { value: 1, configurable: true });
      // Simulate hanging ping that exceeds 2 seconds
      jest.spyOn(mongoose.connection.db, 'admin').mockReturnValue({
        ping: () => new Promise((resolve) => setTimeout(resolve, 3000)),
      });

      const health = await checkMongoHealth();
      expect(health.status).toBe('error');
      expect(health.error).toContain('timeout');

      Object.defineProperty(mongoose.connection, 'readyState', { value: originalReadyState, configurable: true });
      jest.restoreAllMocks();
    });

    it('checkRedisHealth returns immediately without queueing when client is not ready', async () => {
      Object.defineProperty(redisClient, 'status', { value: 'connecting', configurable: true });

      const start = Date.now();
      const health = await checkRedisHealth();
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(100); // 0ms immediate response
      expect(health.status).toBe('connecting');
      expect(health.clientStatus).toBe('connecting');

      jest.restoreAllMocks();
    });

    it('checkElasticsearchHealth returns disabled when unconfigured without making network calls', async () => {
      const health = await checkElasticsearchHealth();
      if (!esClient) {
        expect(health.status).toBe('disabled');
      } else {
        expect(['connected', 'disconnected']).toContain(health.status);
      }
    });
  });
});
