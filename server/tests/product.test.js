import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { User, Vendor, Category, Product } from '../src/models/index.js';
import { ROLES, VENDOR_STATUS } from '../src/constants/index.js';
import { connectDB, disconnectDB } from '../src/config/db.js';

describe('Phase 5 - Product Catalog, Faceted Search & Ownership API', () => {
  let adminToken = '';
  let vendorTechToken = '';
  let vendorFashionToken = '';
  let buyerToken = '';
  let categoryId = '';
  let createdProductId = '';

  beforeAll(async () => {
    await connectDB();

    // Clean up test products if existing
    await Product.deleteMany({ name: 'Integration Test Gaming Headset' });

    // Login Admin
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@smartcart.com', password: 'Admin@123456' });
    adminToken = adminRes.body.token;

    // Login TechWorld Vendor
    const techRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'techworld@smartcart.com', password: 'Vendor@123456' });
    vendorTechToken = techRes.body.token;

    // Login FashionHub Vendor
    const fashionRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'fashionhub@smartcart.com', password: 'Vendor@123456' });
    vendorFashionToken = fashionRes.body.token;

    // Login Buyer
    const buyerRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'buyer@smartcart.com', password: 'Buyer@123456' });
    buyerToken = buyerRes.body.token;

    // Grab Audio Category ID
    const catDoc = await Category.findOne({ slug: 'audio-headphones' });
    categoryId = catDoc._id.toString();
  });

  afterAll(async () => {
    await Product.deleteMany({ name: 'Integration Test Gaming Headset' });
    await disconnectDB();
  });

  describe('Public Category API', () => {
    it('GET /api/categories should return active categories with product counts', async () => {
      const res = await request(app).get('/api/categories');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.categories)).toBe(true);
      expect(res.body.categories.length).toBeGreaterThan(0);
      expect(res.body.categories[0]).toHaveProperty('productCount');
    });

    it('POST /api/categories should allow admin to create a category and reject non-admin', async () => {
      // Non-admin reject
      const failRes = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ name: 'Wearables' });
      expect(failRes.status).toBe(403);

      // Admin create
      const successRes = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Wearables & Smartwatches',
          description: 'Smart bands, watches, and health monitors.',
          icon: 'Watch',
        });
      expect(successRes.status).toBe(201);
      expect(successRes.body.category.slug).toBe('wearables-smartwatches');

      // Clean up
      await Category.deleteOne({ _id: successRes.body.category._id });
    });
  });

  describe('Public Product Catalog & Faceted Search', () => {
    it('GET /api/products should return paginated list of active products', async () => {
      const res = await request(app).get('/api/products?page=1&limit=6');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.products)).toBe(true);
      expect(res.body.count).toBeLessThanOrEqual(6);
      expect(res.body.total).toBeGreaterThan(0);
    });

    it('GET /api/products?search=laptop should filter products by keyword', async () => {
      const res = await request(app).get('/api/products?search=laptop');

      expect(res.status).toBe(200);
      expect(res.body.products.length).toBeGreaterThan(0);
      expect(res.body.products.some((p) => p.name.toLowerCase().includes('laptop'))).toBe(true);
    });

    it('GET /api/products?maxPrice=5000000 should filter products below ₹50,000 (in paise)', async () => {
      const res = await request(app).get('/api/products?maxPrice=5000000');

      expect(res.status).toBe(200);
      expect(res.body.products.length).toBeGreaterThan(0);
      expect(res.body.products.every((p) => p.price <= 5000000)).toBe(true);
    });

    it('GET /api/products?sort=price-asc should return products in ascending price order', async () => {
      const res = await request(app).get('/api/products?sort=price-asc');

      expect(res.status).toBe(200);
      const prices = res.body.products.map((p) => p.price);
      for (let i = 0; i < prices.length - 1; i++) {
        expect(prices[i]).toBeLessThanOrEqual(prices[i + 1]);
      }
    });

    it('GET /api/products/slug/:slug should return product details and related products', async () => {
      const res = await request(app).get('/api/products/slug/acoustimax-studio-wireless-anc-headphones');

      expect(res.status).toBe(200);
      expect(res.body.product.name).toContain('AcoustiMax');
      expect(res.body.product.vendorId).toHaveProperty('storeName');
      expect(res.body.product.categoryId).toHaveProperty('name');
      expect(Array.isArray(res.body.relatedProducts)).toBe(true);
    });
  });

  describe('Vendor Product CRUD & Ownership Enforcement', () => {
    it('should allow approved vendor to create a new product', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${vendorTechToken}`)
        .send({
          name: 'Integration Test Gaming Headset',
          categoryId,
          description: 'Custom 7.1 virtual surround sound headset for esports.',
          price: 699900, // ₹6,999.00 in integer paise
          originalPrice: 899900,
          stock: 30,
          images: ['https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800'],
          specifications: [{ key: 'Surround Sound', value: '7.1 Virtual' }],
          tags: ['gaming', 'audio', 'headset'],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.product.price).toBe(699900);
      createdProductId = res.body.product._id;
    });

    it('should strictly reject unauthorized updates from another vendor (Ownership Guard)', async () => {
      // VendorFashion attempts to edit VendorTech's product
      const res = await request(app)
        .put(`/api/products/${createdProductId}`)
        .set('Authorization', `Bearer ${vendorFashionToken}`)
        .send({ price: 100000 }); // Malicious price tampering attempt

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('You do not own this product');
    });

    it('should allow the owning vendor to update the product', async () => {
      const res = await request(app)
        .put(`/api/products/${createdProductId}`)
        .set('Authorization', `Bearer ${vendorTechToken}`)
        .send({ stock: 45, price: 649900 });

      expect(res.status).toBe(200);
      expect(res.body.product.stock).toBe(45);
      expect(res.body.product.price).toBe(649900);
    });

    it('should allow the owning vendor to retrieve their store inventory list', async () => {
      const res = await request(app)
        .get('/api/products/my-products')
        .set('Authorization', `Bearer ${vendorTechToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.products)).toBe(true);
      expect(res.body.products.some((p) => p._id === createdProductId)).toBe(true);
    });
  });
});
