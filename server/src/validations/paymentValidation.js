import { z } from 'zod';

export const createPaymentOrderSchema = z.object({
  body: z.object({
    orderId: z.string({ required_error: 'Order ID is required' })
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid Order ObjectId'),
  }),
});

export const verifyPaymentSchema = z.object({
  body: z.object({
    orderId: z.string({ required_error: 'Order ID is required' })
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid Order ObjectId'),
    razorpayOrderId: z.string({ required_error: 'Razorpay order ID is required' }).trim().min(1),
    razorpayPaymentId: z.string({ required_error: 'Razorpay payment ID is required' }).trim().min(1),
    razorpaySignature: z.string({ required_error: 'Razorpay signature is required' }).trim().min(1),
  }),
});
