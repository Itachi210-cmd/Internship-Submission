import { Router } from 'express';
import { getHealth, getLiveness, getReadiness } from '../controllers/health.controller.js';

const router = Router();

// GET /api/health/live (Render liveness probe - zero external DB calls)
router.get('/live', getLiveness);

// GET /api/health/ready (Readiness probe - validates required dependencies)
router.get('/ready', getReadiness);

// GET /api/health (Full system diagnostics and health report)
router.get('/', getHealth);

export default router;
