import { z } from 'zod';
import { SUB_ORDER_STATUS } from '../constants/index.js';

export const checkoutSchema = z.object({
  body: z.object({
    shippingAddressId: z.string({ required_error: 'Shipping address ID is required' })
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid Shipping Address ObjectId'),
  }),
});

export const updateSubOrderStatusSchema = z.object({
  body: z.object({
    status: z.enum(Object.values(SUB_ORDER_STATUS), {
      errorMap: () => ({ message: 'Invalid fulfillment status transition' }),
    }),
    carrier: z.string().trim().max(100).optional(),
    trackingNumber: z.string().trim().max(100).optional(),
    note: z.string().trim().max(500).optional().default(''),
  }),
});

export const cancelOrderSchema = z.object({
  body: z.object({
    reason: z.string().trim().min(5, 'Cancellation reason must be at least 5 characters').max(500).optional(),
  }),
});
