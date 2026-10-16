import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { User, Product, Cart, Wishlist, Address } from '../src/models/index.js';
import { connectDB, disconnectDB } from '../src/config/db.js';

describe('Phase 6 - Cart, Wishlist & Address Management API', () => {
  let buyerToken = '';
  let buyer2Token = '';
  let testProduct = null;
  let testProduct2 = null;
  let createdAddressId = '';

  beforeAll(async () => {
    await connectDB();

    // Login Buyer 1 (Rahul)
    const buyerRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'buyer@smartcart.com', password: 'Buyer@123456' });
    buyerToken = buyerRes.body.token;

    // Login Buyer 2 (Priya)
    const buyer2Res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'priya@smartcart.com', password: 'Buyer@123456' });
    buyer2Token = buyer2Res.body.token;

    // Fetch two test products from different vendors
    const products = await Product.find({ isActive: true }).limit(2);
    testProduct = products[0];
    testProduct2 = products[1];
  });

  afterAll(async () => {
    await disconnectDB();
  });

  describe('Cart Management & Inventory Checks', () => {
    it('POST /api/cart/add should add item and compute integer paise totals', async () => {
      // Clear cart first
      await request(app).delete('/api/cart/clear').set('Authorization', `Bearer ${buyerToken}`);

      const res = await request(app)
        .post('/api/cart/add')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ productId: testProduct._id.toString(), quantity: 1 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.itemCount).toBe(1);
      expect(res.body.subtotal).toBe(testProduct.price);
      expect(Array.isArray(res.body.vendorGroups)).toBe(true);
      expect(res.body.vendorGroups.length).toBe(1);
    });

    it('POST /api/cart/add should strictly reject quantities exceeding inventory stock', async () => {
      const res = await request(app)
        .post('/api/cart/add')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ productId: testProduct._id.toString(), quantity: 99999 });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Insufficient stock');
    });

    it('PUT /api/cart/item/:productId should update item quantity within stock limits', async () => {
      const res = await request(app)
        .put(`/api/cart/item/${testProduct._id}`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ quantity: 2 });

      expect(res.status).toBe(200);
      expect(res.body.itemCount).toBe(2);
      expect(res.body.subtotal).toBe(testProduct.price * 2);
    });

    it('GET /api/cart should return multi-vendor grouped breakdown', async () => {
      // Add second product from different category/vendor
      await request(app)
        .post('/api/cart/add')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ productId: testProduct2._id.toString(), quantity: 1 });

      const res = await request(app)
        .get('/api/cart')
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.items.length).toBe(2);
      expect(res.body.subtotal).toBe(testProduct.price * 2 + testProduct2.price);
    });

    it('DELETE /api/cart/item/:productId should remove item from cart', async () => {
      const res = await request(app)
        .delete(`/api/cart/item/${testProduct._id}`)
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.items.length).toBe(1);
    });
  });

  describe('Wishlist API', () => {
    it('POST /api/wishlist/toggle should toggle product in buyer wishlist', async () => {
      const res1 = await request(app)
        .post('/api/wishlist/toggle')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ productId: testProduct._id.toString() });

      expect(res1.status).toBe(200);
      expect(res1.body).toHaveProperty('inWishlist');

      // Query wishlist
      const listRes = await request(app)
        .get('/api/wishlist')
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(listRes.status).toBe(200);
      expect(Array.isArray(listRes.body.products)).toBe(true);
    });
  });

  describe('Address Management & Security Isolation', () => {
    it('POST /api/addresses should create a validated shipping address', async () => {
      const res = await request(app)
        .post('/api/addresses')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          recipientName: 'Rahul Sharma Home',
          phone: '+91 98222 33445',
          street: 'Bungalow 7, Juhu Tara Road',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400049',
          country: 'India',
          isDefault: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.address.isDefault).toBe(true);
      createdAddressId = res.body.address._id;
    });

    it('PATCH /api/addresses/:id/default should promote address to default', async () => {
      const res = await request(app)
        .patch(`/api/addresses/${createdAddressId}/default`)
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.address.isDefault).toBe(true);
    });

    it('should strictly reject Buyer 2 trying to update Buyer 1 address (Data Isolation)', async () => {
      const res = await request(app)
        .put(`/api/addresses/${createdAddressId}`)
        .set('Authorization', `Bearer ${buyer2Token}`)
        .send({ recipientName: 'Priya Hacked' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('You do not own this address');
    });

    it('DELETE /api/addresses/:id should delete buyer address', async () => {
      const res = await request(app)
        .delete(`/api/addresses/${createdAddressId}`)
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('removed');
    });
  });
});
