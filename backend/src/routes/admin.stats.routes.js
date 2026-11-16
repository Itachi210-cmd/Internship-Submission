import { Router } from 'express';
import { authenticate, authorizeRoles } from '../middleware/auth.js';
import Vendor from '../models/vendor.model.js';

const router = Router();

// Protect all admin stats routes
router.use(authenticate, authorizeRoles('admin'));

/**
 * GET /api/admin/stats/pending
 * Returns pending vendor applications count
 */
router.get('/pending', async (req, res, next) => {
  try {
    const pendingVendors = await Vendor.countDocuments({ status: 'pending' });
    res.status(200).json({
      success: true,
      pendingVendors,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
