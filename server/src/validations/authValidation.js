import { z } from 'zod';
import { ROLES } from '../constants/index.js';

export const registerSchema = z.object({
  body: z.object({
    name: z.string({ required_error: 'Name is required' })
      .trim()
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name cannot exceed 100 characters'),
    email: z.string({ required_error: 'Email is required' })
      .trim()
      .email('Please enter a valid email address')
      .toLowerCase(),
    password: z.string({ required_error: 'Password is required' })
      .min(8, 'Password must be at least 8 characters long')
      .max(100, 'Password cannot exceed 100 characters'),
    // Strictly restrict public registration to buyer or vendor - never admin!
    role: z.enum([ROLES.BUYER, ROLES.VENDOR], {
      errorMap: () => ({ message: "Role must be either 'buyer' or 'vendor'" }),
    }).default(ROLES.BUYER),
    storeName: z.string().trim().min(3).max(100).optional(),
    storeDescription: z.string().trim().max(1000).optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string({ required_error: 'Email is required' })
      .trim()
      .email('Please enter a valid email address')
      .toLowerCase(),
    password: z.string({ required_error: 'Password is required' })
      .min(1, 'Password cannot be empty'),
  }),
});

export const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(100).optional(),
    currentPassword: z.string().optional(),
    newPassword: z.string().min(8, 'New password must be at least 8 characters').optional(),
  }),
});
