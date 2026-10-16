import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { User, Vendor, AuditLog } from '../src/models/index.js';
import { ROLES, VENDOR_STATUS } from '../src/constants/index.js';
import { connectDB, disconnectDB } from '../src/config/db.js';

describe('Phase 4 - Vendor Applications & Admin Approval API', () => {
  let adminToken = '';
  let vendorToken = '';
  let buyerToken = '';
  let pendingVendorId = '';

  beforeAll(async () => {
    await connectDB();

    // Clean up test data
    await User.deleteMany({ email: { $in: ['applicant@test.com'] } });
    await Vendor.deleteMany({ storeName: 'Applicant Store' });

    // Login Admin
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@smartcart.com', password: 'Admin@123456' });
    adminToken = adminRes.body.token;

    // Login Approved Vendor (TechWorld)
    const vendorRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'techworld@smartcart.com', password: 'Vendor@123456' });
    vendorToken = vendorRes.body.token;

    // Login Buyer (Rahul)
    const buyerRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'buyer@smartcart.com', password: 'Buyer@123456' });
    buyerToken = buyerRes.body.token;

    // Register a new user who will apply as vendor
    const applicantRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Applicant User',
        email: 'applicant@test.com',
        password: 'Password@123',
        role: 'buyer',
      });
    const applicantToken = applicantRes.body.token;

    // Submit vendor application
    const applyRes = await request(app)
      .post('/api/vendors/apply')
      .set('Authorization', `Bearer ${applicantToken}`)
      .send({
        storeName: 'Applicant Store',
        description: 'Quality accessories and hardware products for testing.',
        contactEmail: 'applicant@test.com',
        contactPhone: '+91 99999 88888',
        address: 'Test Street, New Delhi',
      });
    pendingVendorId = applyRes.body.vendor._id;
  });

  afterAll(async () => {
    await User.deleteMany({ email: { $in: ['applicant@test.com'] } });
    await Vendor.deleteMany({ storeName: 'Applicant Store' });
    await disconnectDB();
  });

  describe('Public Vendor Catalog', () => {
    it('GET /api/vendors should return list of approved vendors', async () => {
      const res = await request(app).get('/api/vendors');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.vendors)).toBe(true);
      expect(res.body.count).toBeGreaterThan(0);
    });

    it('GET /api/vendors/store/:slug should return store profile and products', async () => {
      const res = await request(app).get('/api/vendors/store/techworld-electronics');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.vendor.storeName).toBe('TechWorld Electronics');
      expect(Array.isArray(res.body.products)).toBe(true);
    });
  });

  describe('Vendor Store Management', () => {
    it('GET /api/vendors/my-store should return vendor profile and product stats', async () => {
      const res = await request(app)
        .get('/api/vendors/my-store')
        .set('Authorization', `Bearer ${vendorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.vendor.storeName).toBe('TechWorld Electronics');
      expect(res.body.stats).toHaveProperty('totalProducts');
    });

    it('PUT /api/vendors/my-store should update store description and contact info', async () => {
      const res = await request(app)
        .put('/api/vendors/my-store')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
          description: 'Updated store description for TechWorld Electronics.',
          contactPhone: '+91 98765 00000',
        });

      expect(res.status).toBe(200);
      expect(res.body.vendor.description).toBe('Updated store description for TechWorld Electronics.');
    });
  });

  describe('Admin Vendor Approval Queue & RBAC', () => {
    it('should reject non-admin access to admin routes with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/admin/vendors')
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Access forbidden');
    });

    it('GET /api/admin/vendors should allow admin to view vendors with filtering', async () => {
      const res = await request(app)
        .get('/api/admin/vendors?status=pending')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.vendors)).toBe(true);
    });

    it('PATCH /api/admin/vendors/:id/approve should approve the pending vendor', async () => {
      const res = await request(app)
        .patch(`/api/admin/vendors/${pendingVendorId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.vendor.approvalStatus).toBe(VENDOR_STATUS.APPROVED);
      expect(res.body.vendor.approvalDate).toBeDefined();
    });

    it('PATCH /api/admin/vendors/:id/commission should update the vendor commission rate', async () => {
      const res = await request(app)
        .patch(`/api/admin/vendors/${pendingVendorId}/commission`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ commissionRate: 15 });

      expect(res.status).toBe(200);
      expect(res.body.vendor.commissionRate).toBe(15);
    });

    it('GET /api/admin/audit-logs should return recorded admin actions', async () => {
      const res = await request(app)
        .get('/api/admin/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.logs)).toBe(true);
      expect(res.body.logs.length).toBeGreaterThan(0);
    });
  });
});
