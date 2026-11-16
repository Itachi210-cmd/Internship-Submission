import app from './app.js';
import { env } from './config/env.js';
import { connectDB, closeDB } from './config/db.js';
import { connectRedis, closeRedis } from './config/redis.js';
import { isEsConfigured, closeElasticsearch } from './config/es.js';
import { ensureIndex } from './services/search.service.js';

/**
 * Bootstrap and start Express HTTP server
 */
const startServer = async () => {
  try {
    // 1. MongoDB is strictly required for application startup
    console.log('[Startup] Connecting to MongoDB...');
    await connectDB(3);

    // 2. Connect Redis (Required service, non-blocking initial connect so server starts predictably)
    console.log('[Startup] Connecting to Redis...');
    try {
      await connectRedis();
    } catch (redisErr) {
      console.warn(`[Startup] Initial Redis connect warning: ${redisErr.message}. Background reconnect in progress.`);
    }

    // 3. Elasticsearch (Optional, non-blocking)
    if (isEsConfigured) {
      ensureIndex().catch((err) => {
        console.warn(`[Elasticsearch] Notice: Index initialization deferred (${err.message}).`);
      });
    }

    // 4. Start HTTP Server
    const server = app.listen(env.port, () => {
      console.log('----------------------------------------------------');
      console.log(`[Backend] Server listening on port ${env.port} (${env.nodeEnv})`);
      console.log(`[Backend] Allowed CORS origin: ${env.clientUrl}`);
      console.log(`[Backend] Liveness check:  http://localhost:${env.port}/api/health/live`);
      console.log(`[Backend] Readiness check: http://localhost:${env.port}/api/health/ready`);
      console.log(`[Backend] Full Diagnostics: http://localhost:${env.port}/api/health`);
      console.log('----------------------------------------------------');
    });

    // 5. Graceful shutdown handling
    let isShuttingDown = false;
    const shutdown = (signal) => {
      if (isShuttingDown) return;
      isShuttingDown = true;

      console.log(`\n[Backend] ${signal} signal received. Closing resources...`);

      // Force close if graceful close hangs (unref ensures timer doesn't keep event loop alive)
      const forceExitTimer = setTimeout(() => {
        console.error('[Backend] Forcing shutdown after timeout.');
        process.exit(1);
      }, 10000);
      forceExitTimer.unref();

      server.close(async () => {
        console.log('[Backend] HTTP server closed.');
        try {
          await Promise.allSettled([
            closeDB(),
            closeRedis(),
            closeElasticsearch(),
          ]);
        } catch (err) {
          console.error('[Backend] Error during resource cleanup:', err.message);
        }

        clearTimeout(forceExitTimer);
        console.log('[Backend] Graceful shutdown complete.');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    console.error(`[Backend] Fatal startup error: ${error.message}`);
    process.exit(1);
  }
};

startServer();
