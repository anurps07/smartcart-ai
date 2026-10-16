import { Router } from 'express';
import { 
  getVendors, 
  getVendorById, 
  approveVendor, 
  rejectVendor, 
  suspendVendor, 
  updateVendorCommission, 
  getAuditLogs, 
  getPlatformOverview 
} from '../controllers/adminController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { updateCommissionSchema, rejectVendorSchema } from '../validations/vendorValidation.js';
import { ROLES } from '../constants/index.js';

const router = Router();

// Protect all admin routes with requireAuth & requireRole('admin')
router.use(requireAuth, requireRole(ROLES.ADMIN));

router.get('/overview', getPlatformOverview);
router.get('/vendors', getVendors);
router.get('/vendors/:id', getVendorById);
router.patch('/vendors/:id/approve', approveVendor);
router.patch('/vendors/:id/reject', validate(rejectVendorSchema), rejectVendor);
router.patch('/vendors/:id/suspend', suspendVendor);
router.patch('/vendors/:id/commission', validate(updateCommissionSchema), updateVendorCommission);
router.get('/audit-logs', getAuditLogs);

export default router;
