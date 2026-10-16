import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { User, Vendor } from '../src/models/index.js';
import { ROLES, VENDOR_STATUS } from '../src/constants/index.js';
import { connectDB, disconnectDB } from '../src/config/db.js';

describe('Phase 3 - Authentication & RBAC API', () => {
  const testBuyer = {
    name: 'Test Buyer Alpha',
    email: 'buyer.alpha@smartcart.test',
    password: 'Password@123',
    role: 'buyer',
  };

  const testVendor = {
    name: 'Test Vendor Beta',
    email: 'vendor.beta@smartcart.test',
    password: 'Password@123',
    role: 'vendor',
    storeName: 'Beta Tech Store',
    storeDescription: 'Electronics and gadgets store.',
  };

  beforeAll(async () => {
    await connectDB();
    // Clean up test emails if existing
    await User.deleteMany({ email: { $in: [testBuyer.email, testVendor.email, 'hacker@smartcart.test'] } });
    await Vendor.deleteMany({ storeName: 'Beta Tech Store' });
  });

  afterAll(async () => {
    await User.deleteMany({ email: { $in: [testBuyer.email, testVendor.email, 'hacker@smartcart.test'] } });
    await Vendor.deleteMany({ storeName: 'Beta Tech Store' });
    await disconnectDB();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new buyer and return a JWT token', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(testBuyer);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toHaveProperty('email', testBuyer.email);
      expect(res.body.user).toHaveProperty('role', ROLES.BUYER);
      expect(res.body.user).not.toHaveProperty('passwordHash');
    });

    it('should reject registration with a duplicate email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(testBuyer);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already exists');
    });

    it('should strictly reject public registration attempting to assign the admin role', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Fake Admin',
          email: 'hacker@smartcart.test',
          password: 'Password@123',
          role: 'admin', // FORBIDDEN: Only buyer or vendor permitted
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should register a vendor and create a pending vendor profile', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(testVendor);

      expect(res.status).toBe(201);
      expect(res.body.user.role).toBe(ROLES.VENDOR);
      expect(res.body).toHaveProperty('vendor');
      expect(res.body.vendor.storeName).toBe('Beta Tech Store');
      expect(res.body.vendor.approvalStatus).toBe(VENDOR_STATUS.PENDING);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should log in with valid credentials and return JWT token', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testBuyer.email,
          password: testBuyer.password,
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user.email).toBe(testBuyer.email);
    });

    it('should reject login with invalid password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testBuyer.email,
          password: 'WrongPassword@999',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid email or password');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user profile when authorized with Bearer token', async () => {
      // First login to get token
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: testBuyer.email, password: testBuyer.password });
      const token = loginRes.body.token;

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe(testBuyer.email);
      expect(res.body.user.role).toBe(ROLES.BUYER);
    });

    it('should reject access without authentication token', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Authentication required');
    });
  });
});
