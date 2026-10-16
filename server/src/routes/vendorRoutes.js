import { Router } from 'express';
import { 
  applyForVendor, 
  getMyStore, 
  updateMyStore, 
  getPublicStore, 
  getPublicVendors 
} from '../controllers/vendorController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { applyVendorSchema, updateStoreProfileSchema } from '../validations/vendorValidation.js';
import { ROLES } from '../constants/index.js';

const router = Router();

// Public vendor store browsing
router.get('/', getPublicVendors);
router.get('/store/:slug', getPublicStore);

// Authenticated vendor endpoints
router.post('/apply', requireAuth, validate(applyVendorSchema), applyForVendor);
router.get('/my-store', requireAuth, requireRole(ROLES.VENDOR), getMyStore);
router.put('/my-store', requireAuth, requireRole(ROLES.VENDOR), validate(updateStoreProfileSchema), updateMyStore);

export default router;
