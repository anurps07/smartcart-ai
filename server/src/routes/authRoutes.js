import { Router } from 'express';
import { 
  register, 
  login, 
  getMe, 
  logout, 
  updateProfile 
} from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { 
  registerSchema, 
  loginSchema, 
  updateProfileSchema 
} from '../validations/authValidation.js';

const router = Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.get('/me', requireAuth, getMe);
router.post('/logout', requireAuth, logout);
router.patch('/profile', requireAuth, validate(updateProfileSchema), updateProfile);

export default router;
