import { Router } from 'express';
import { execSync } from 'child_process';
import { env } from '../config/env.js';

const router = Router();

// Cache commit hash at startup
let commitHash = process.env.RENDER_GIT_COMMIT || process.env.VERCEL_GIT_COMMIT_SHA || process.env.GIT_COMMIT || '';
if (!commitHash) {
  try {
    commitHash = execSync('git rev-parse --short HEAD', {
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 1000,
    })
      .toString()
      .trim();
  } catch {
    commitHash = 'unknown';
  }
}

/**
 * GET /api/version
 * Public version & build metadata endpoint for deployment verification and debugging
 */
router.get('/', (req, res) => {
  res.status(200).json({
    name: '<ShopNest> Multi-Vendor E-Commerce Platform',
    version: '1.0.0',
    commit: commitHash,
    nodeEnv: env.nodeEnv,
    timestamp: new Date().toISOString(),
  });
});

export default router;
