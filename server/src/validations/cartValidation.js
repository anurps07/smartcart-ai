import { z } from 'zod';

export const addToCartSchema = z.object({
  body: z.object({
    productId: z.string({ required_error: 'Product ID is required' })
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid Product ObjectId'),
    quantity: z.number({ required_error: 'Quantity is required' })
      .int('Quantity must be an integer')
      .min(1, 'Quantity must be at least 1')
      .default(1),
  }),
});

export const updateCartItemSchema = z.object({
  body: z.object({
    quantity: z.number({ required_error: 'Quantity is required' })
      .int('Quantity must be an integer')
      .min(1, 'Quantity must be at least 1'),
  }),
});

export const addressSchema = z.object({
  body: z.object({
    recipientName: z.string({ required_error: 'Recipient name is required' })
      .trim()
      .min(2, 'Recipient name must be at least 2 characters')
      .max(100, 'Recipient name cannot exceed 100 characters'),
    phone: z.string({ required_error: 'Phone number is required' })
      .trim()
      .min(10, 'Phone number must be at least 10 digits'),
    street: z.string({ required_error: 'Street address is required' })
      .trim()
      .min(5, 'Street address must be at least 5 characters')
      .max(250, 'Street address cannot exceed 250 characters'),
    city: z.string({ required_error: 'City is required' }).trim(),
    state: z.string({ required_error: 'State is required' }).trim(),
    postalCode: z.string({ required_error: 'Postal code is required' }).trim().min(3),
    country: z.string().trim().default('India'),
    isDefault: z.boolean().optional().default(false),
  }),
});
