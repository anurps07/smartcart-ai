import { Router } from 'express';
import { 
  getCart, 
  addToCart, 
  updateCartItem, 
  removeFromCart, 
  clearCart 
} from '../controllers/cartController.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { addToCartSchema, updateCartItemSchema } from '../validations/cartValidation.js';

const router = Router();

router.use(requireAuth);

router.get('/', getCart);
router.post('/add', validate(addToCartSchema), addToCart);
router.put('/item/:productId', validate(updateCartItemSchema), updateCartItem);
router.delete('/item/:productId', removeFromCart);
router.delete('/clear', clearCart);

export default router;
