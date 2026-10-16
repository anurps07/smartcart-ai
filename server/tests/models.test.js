import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { 
  User, 
  Product, 
  Category, 
  Vendor, 
  Order, 
  Payment, 
  Review, 
  Notification, 
  PriceAlert, 
  AuditLog 
} from '../src/models/index.js';
import { ROLES, VENDOR_STATUS, ORDER_STATUS, PAYMENT_STATUS } from '../src/constants/index.js';
import { connectDB, disconnectDB } from '../src/config/db.js';

describe('Phase 2 - Mongoose Models & Precision Validation', () => {
  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await disconnectDB();
  });

  describe('User Model', () => {
    it('should validate and normalize lowercase email', async () => {
      const user = new User({
        name: 'Test Validation User',
        email: '   TEST.USER@Example.COM   ',
        passwordHash: 'dummy_hash_123',
        role: ROLES.BUYER,
      });

      expect(user.email).toBe('test.user@example.com');
      const validationError = user.validateSync();
      expect(validationError).toBeUndefined();
    });

    it('should reject invalid role', async () => {
      const user = new User({
        name: 'Invalid Role User',
        email: 'invalid@example.com',
        passwordHash: 'dummy_hash',
        role: 'super_hacker',
      });

      const error = user.validateSync();
      expect(error.errors['role']).toBeDefined();
    });
  });

  describe('Product Model & Integer Paise Financial Safety', () => {
    it('should accept integer paise for price and stock', async () => {
      const product = new Product({
        vendorId: new mongoose.Types.ObjectId(),
        categoryId: new mongoose.Types.ObjectId(),
        name: 'Test Gaming Laptop',
        slug: 'test-gaming-laptop',
        description: 'High performance laptop with NVMe SSD.',
        price: 8999900, // ₹89,999.00 in integer paise
        originalPrice: 9999900,
        stock: 10,
        images: ['https://example.com/laptop.jpg'],
      });

      const error = product.validateSync();
      expect(error).toBeUndefined();
    });

    it('should reject floating-point decimals for price (paise safety)', async () => {
      const product = new Product({
        vendorId: new mongoose.Types.ObjectId(),
        categoryId: new mongoose.Types.ObjectId(),
        name: 'Invalid Decimal Product',
        slug: 'invalid-decimal-product',
        description: 'Product with floating point price.',
        price: 499.99, // INVALID: Must be integer paise (49999)
        stock: 5,
        images: ['https://example.com/test.jpg'],
      });

      const error = product.validateSync();
      expect(error).toBeDefined();
      expect(error.errors['price']).toBeDefined();
      expect(error.errors['price'].message).toContain('paise');
    });

    it('should reject negative stock count', async () => {
      const product = new Product({
        vendorId: new mongoose.Types.ObjectId(),
        categoryId: new mongoose.Types.ObjectId(),
        name: 'Negative Stock Product',
        slug: 'negative-stock-product',
        description: 'Negative inventory is prohibited.',
        price: 19900,
        stock: -5,
        images: ['https://example.com/test.jpg'],
      });

      const error = product.validateSync();
      expect(error).toBeDefined();
      expect(error.errors['stock']).toBeDefined();
    });
  });

  describe('Multi-Vendor Order Model', () => {
    it('should validate parent order and sub-orders with item snapshots', async () => {
      const order = new Order({
        orderNumber: 'ORD-TEST-001',
        buyerId: new mongoose.Types.ObjectId(),
        shippingAddress: {
          recipientName: 'Rahul Sharma',
          phone: '+91 9876543210',
          street: '123 Tech Park',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400001',
          country: 'India',
        },
        subtotal: 500000, // ₹5,000.00
        taxAmount: 90000,   // ₹900.00
        shippingFee: 0,
        totalAmount: 590000,
        paymentStatus: PAYMENT_STATUS.PENDING,
        overallFulfillmentStatus: ORDER_STATUS.PENDING,
        vendorSubOrders: [
          {
            subOrderNumber: 'ORD-TEST-001-V1',
            vendorId: new mongoose.Types.ObjectId(),
            items: [
              {
                productId: new mongoose.Types.ObjectId(),
                name: 'Snapshot Product A',
                slug: 'snapshot-product-a',
                image: 'https://example.com/a.jpg',
                price: 250000,
                quantity: 2,
                itemTotal: 500000,
              },
            ],
            subtotal: 500000,
            commissionRate: 10,
            commissionAmount: 50000,
            vendorPayout: 450000,
          },
        ],
      });

      const error = order.validateSync();
      expect(error).toBeUndefined();
      expect(order.vendorSubOrders[0].vendorPayout).toBe(450000);
    });
  });
});
