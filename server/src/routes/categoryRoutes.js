import { Router } from 'express';
import { 
  getCategories, 
  getCategoryBySlug, 
  createCategory, 
  updateCategory 
} from '../controllers/categoryController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createCategorySchema } from '../validations/productValidation.js';
import { ROLES } from '../constants/index.js';

const router = Router();

// Public category listing & details
router.get('/', getCategories);
router.get('/:slug', getCategoryBySlug);

// Admin category management
router.post('/', requireAuth, requireRole(ROLES.ADMIN), validate(createCategorySchema), createCategory);
router.put('/:id', requireAuth, requireRole(ROLES.ADMIN), updateCategory);

export default router;
