import { z } from 'zod';

export const createProductSchema = z.object({
  body: z.object({
    name: z.string({ required_error: 'Product name is required' })
      .trim()
      .min(3, 'Product name must be at least 3 characters')
      .max(200, 'Product name cannot exceed 200 characters'),
    categoryId: z.string({ required_error: 'Category ID is required' })
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid Category ObjectId'),
    description: z.string({ required_error: 'Description is required' })
      .trim()
      .min(10, 'Description must be at least 10 characters')
      .max(5000, 'Description cannot exceed 5000 characters'),
    // Price must be an integer represented in paise (1 INR = 100 paise)
    price: z.number({ required_error: 'Price in paise is required' })
      .int('Price must be an integer represented in paise')
      .min(0, 'Price cannot be negative'),
    originalPrice: z.number().int('Original price must be an integer represented in paise').min(0).optional(),
    stock: z.number({ required_error: 'Stock count is required' })
      .int('Stock must be an integer')
      .min(0, 'Stock cannot be negative')
      .default(0),
    images: z.array(z.string().url('Image must be a valid URL'))
      .min(1, 'Product must contain at least one image'),
    specifications: z.array(
      z.object({
        key: z.string().trim().min(1, 'Specification key cannot be empty'),
        value: z.string().trim().min(1, 'Specification value cannot be empty'),
      })
    ).optional().default([]),
    tags: z.array(z.string().trim()).optional().default([]),
    isFeatured: z.boolean().optional().default(false),
  }),
});

export const updateProductSchema = z.object({
  body: z.object({
    name: z.string().trim().min(3).max(200).optional(),
    categoryId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Category ObjectId').optional(),
    description: z.string().trim().min(10).max(5000).optional(),
    price: z.number().int('Price must be an integer represented in paise').min(0).optional(),
    originalPrice: z.number().int().min(0).optional(),
    stock: z.number().int().min(0).optional(),
    images: z.array(z.string().url()).min(1).optional(),
    specifications: z.array(
      z.object({
        key: z.string().trim().min(1),
        value: z.string().trim().min(1),
      })
    ).optional(),
    tags: z.array(z.string().trim()).optional(),
    isActive: z.boolean().optional(),
    isFeatured: z.boolean().optional(),
  }),
});

export const createCategorySchema = z.object({
  body: z.object({
    name: z.string({ required_error: 'Category name is required' })
      .trim()
      .min(2, 'Name must be at least 2 characters')
      .max(80, 'Name cannot exceed 80 characters'),
    description: z.string().trim().max(500).optional().default(''),
    icon: z.string().trim().optional().default('Layers'),
    imageUrl: z.string().url().or(z.literal('')).optional().default(''),
    displayOrder: z.number().int().optional().default(0),
  }),
});
