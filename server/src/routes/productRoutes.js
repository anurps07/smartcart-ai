import { Router } from 'express';
import { 
  getProducts, 
  getProductBySlug, 
  createProduct, 
  updateProduct, 
  deleteProduct, 
  getMyProducts, 
  uploadProductImage 
} from '../controllers/productController.js';
import { requireAuth, requireRole, requireVendorApproved } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createProductSchema, updateProductSchema } from '../validations/productValidation.js';
import { upload } from '../services/storageService.js';
import { ROLES } from '../constants/index.js';

const router = Router();

// Public Catalog Queries
router.get('/', getProducts);
router.get('/slug/:slug', getProductBySlug);

// Vendor Product Management (Requires authenticated & approved vendor)
router.get('/my-products', requireAuth, requireRole(ROLES.VENDOR), requireVendorApproved, getMyProducts);
router.post('/', requireAuth, requireRole(ROLES.VENDOR), requireVendorApproved, validate(createProductSchema), createProduct);
router.put('/:id', requireAuth, requireRole(ROLES.VENDOR), requireVendorApproved, validate(updateProductSchema), updateProduct);
router.delete('/:id', requireAuth, requireRole(ROLES.VENDOR), requireVendorApproved, deleteProduct);
router.post('/upload', requireAuth, requireRole(ROLES.VENDOR), requireVendorApproved, upload.single('image'), uploadProductImage);

export default router;
