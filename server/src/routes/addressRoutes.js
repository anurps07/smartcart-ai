import { Router } from 'express';
import { 
  getAddresses, 
  addAddress, 
  updateAddress, 
  deleteAddress, 
  setDefaultAddress 
} from '../controllers/addressController.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { addressSchema } from '../validations/cartValidation.js';

const router = Router();

router.use(requireAuth);

router.get('/', getAddresses);
router.post('/', validate(addressSchema), addAddress);
router.put('/:id', updateAddress);
router.delete('/:id', deleteAddress);
router.patch('/:id/default', setDefaultAddress);

export default router;
