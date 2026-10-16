import { Router } from 'express';
import { 
  checkout, 
  getBuyerOrders, 
  getBuyerOrderById, 
  cancelBuyerOrder, 
  getVendorSubOrders, 
  updateVendorSubOrderStatus, 
  getAdminOrders 
} from '../controllers/orderController.js';
import { requireAuth, requireRole, requireVendorApproved } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { 
  checkoutSchema, 
  updateSubOrderStatusSchema, 
  cancelOrderSchema 
} from '../validations/orderValidation.js';
import { ROLES } from '../constants/index.js';

const router = Router();

router.use(requireAuth);

// Buyer Order Endpoints
router.post('/checkout', validate(checkoutSchema), checkout);
router.get('/', getBuyerOrders);
router.get('/:id', getBuyerOrderById);
router.patch('/:id/cancel', validate(cancelOrderSchema), cancelBuyerOrder);

// Vendor Fulfillment Endpoints
router.get('/vendor/sub-orders', requireRole(ROLES.VENDOR), requireVendorApproved, getVendorSubOrders);
router.patch('/vendor/sub-orders/:subOrderId/status', requireRole(ROLES.VENDOR), requireVendorApproved, validate(updateSubOrderStatusSchema), updateVendorSubOrderStatus);

// Admin Orders
router.get('/admin/all', requireRole(ROLES.ADMIN), getAdminOrders);

export default router;
