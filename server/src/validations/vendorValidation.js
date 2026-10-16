import { z } from 'zod';
import { VENDOR_STATUS } from '../constants/index.js';

export const applyVendorSchema = z.object({
  body: z.object({
    storeName: z.string({ required_error: 'Store name is required' })
      .trim()
      .min(3, 'Store name must be at least 3 characters')
      .max(100, 'Store name cannot exceed 100 characters'),
    description: z.string({ required_error: 'Description is required' })
      .trim()
      .min(10, 'Description must be at least 10 characters')
      .max(1000, 'Description cannot exceed 1000 characters'),
    contactEmail: z.string().email('Invalid contact email').optional(),
    contactPhone: z.string().trim().optional(),
    address: z.string().trim().optional(),
  }),
});

export const updateStoreProfileSchema = z.object({
  body: z.object({
    storeName: z.string().trim().min(3).max(100).optional(),
    description: z.string().trim().max(1000).optional(),
    logoUrl: z.string().url('Invalid logo URL').or(z.literal('')).optional(),
    bannerUrl: z.string().url('Invalid banner URL').or(z.literal('')).optional(),
    contactEmail: z.string().email('Invalid contact email').or(z.literal('')).optional(),
    contactPhone: z.string().trim().optional(),
    address: z.string().trim().optional(),
  }),
});

export const updateCommissionSchema = z.object({
  body: z.object({
    commissionRate: z.number({ required_error: 'Commission rate is required' })
      .min(0, 'Commission cannot be negative')
      .max(100, 'Commission cannot exceed 100%'),
  }),
});

export const rejectVendorSchema = z.object({
  body: z.object({
    reason: z.string({ required_error: 'Rejection reason is required' })
      .trim()
      .min(5, 'Rejection reason must be at least 5 characters')
      .max(500, 'Rejection reason cannot exceed 500 characters'),
  }),
});
