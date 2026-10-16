import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { User, Product, Vendor, Address, Cart, Order } from '../src/models/index.js';
import { SUB_ORDER_STATUS, ORDER_STATUS } from '../src/constants/index.js';
import { connectDB, disconnectDB } from '../src/config/db.js';

describe('Phase 7 - Inventory-Safe Checkout & Multi-Vendor Orders API', () => {
  let buyerToken = '';
  let buyer2Token = '';
  let vendorTechToken = '';
  let vendorFashionToken = '';
  let shippingAddressId = '';
  let productTech = null;
  let productFashion = null;
  let initialTechStock = 0;
  let createdOrderId = '';
  let techSubOrderId = '';
  let fashionSubOrderId = '';

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

    // Login Vendor 1 (TechWorld)
    const techRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'techworld@smartcart.com', password: 'Vendor@123456' });
    vendorTechToken = techRes.body.token;

    // Login Vendor 2 (FashionHub)
    const fashionRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'fashionhub@smartcart.com', password: 'Vendor@123456' });
    vendorFashionToken = fashionRes.body.token;

    // Get an address for Buyer 1
    const addrRes = await request(app)
      .get('/api/addresses')
      .set('Authorization', `Bearer ${buyerToken}`);
    shippingAddressId = addrRes.body.addresses[0]._id;

    // Fetch two products from different vendors
    const vendorTechDoc = await Vendor.findOne({ slug: 'techworld-electronics' });
    const vendorFashionDoc = await Vendor.findOne({ slug: 'fashionhub-apparel' });

    productTech = await Product.findOne({ vendorId: vendorTechDoc._id, isActive: true });
    productFashion = await Product.findOne({ vendorId: vendorFashionDoc._id, isActive: true });
    initialTechStock = productTech.stock;
  });

  afterAll(async () => {
    await disconnectDB();
  });

  describe('Multi-Vendor Checkout & Stock Decrement', () => {
    it('POST /api/orders/checkout should create parent order and separate vendor sub-orders', async () => {
      // 1. Populate cart with items from 2 vendors
      await request(app).delete('/api/cart/clear').set('Authorization', `Bearer ${buyerToken}`);
      await request(app)
        .post('/api/cart/add')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ productId: productTech._id.toString(), quantity: 1 });
      await request(app)
        .post('/api/cart/add')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ productId: productFashion._id.toString(), quantity: 2 });

      // 2. Perform checkout
      const res = await request(app)
        .post('/api/orders/checkout')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ shippingAddressId });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.order).toHaveProperty('orderNumber');
      expect(res.body.order.vendorSubOrders.length).toBe(2);

      createdOrderId = res.body.order._id;
      techSubOrderId = res.body.order.vendorSubOrders[0]._id;
      fashionSubOrderId = res.body.order.vendorSubOrders[1]._id;

      // Check item snapshots
      expect(res.body.order.vendorSubOrders[0].items[0].price).toBe(productTech.price);

      // Check stock decremented
      const updatedProductTech = await Product.findById(productTech._id);
      expect(updatedProductTech.stock).toBe(initialTechStock - 1);

      // Check buyer cart was cleared
      const cartRes = await request(app)
        .get('/api/cart')
        .set('Authorization', `Bearer ${buyerToken}`);
      expect(cartRes.body.items.length).toBe(0);
    });
  });

  describe('Buyer Order Tracking & Security Isolation', () => {
    it('GET /api/orders should return buyer orders', async () => {
      const res = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.orders.length).toBeGreaterThan(0);
      expect(res.body.orders[0]._id).toBe(createdOrderId);
    });

    it('GET /api/orders/:id should strictly block Buyer 2 from accessing Buyer 1 order', async () => {
      const res = await request(app)
        .get(`/api/orders/${createdOrderId}`)
        .set('Authorization', `Bearer ${buyer2Token}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('You do not own this order');
    });
  });

  describe('Vendor Sub-Order Fulfillment & Access Scoping', () => {
    it('Vendor should only view their assigned sub-orders', async () => {
      const res = await request(app)
        .get('/api/orders/vendor/sub-orders')
        .set('Authorization', `Bearer ${vendorTechToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.subOrders)).toBe(true);
      // All items in returned sub-orders must belong to VendorTech
      for (const sub of res.body.subOrders) {
        expect(sub.items.every((it) => it.productId.toString() === productTech._id.toString())).toBe(true);
      }
    });

    it('Vendor should strictly be blocked from modifying another vendor sub-order', async () => {
      // VendorTech attempts to modify FashionHub's sub-order
      const res = await request(app)
        .patch(`/api/orders/vendor/sub-orders/${fashionSubOrderId}/status`)
        .set('Authorization', `Bearer ${vendorTechToken}`)
        .send({ status: SUB_ORDER_STATUS.SHIPPED, carrier: 'FedEx', trackingNumber: 'TRK123' });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('You do not own this sub-order');
    });

    it('Owning Vendor can advance status to confirmed and shipped with tracking info', async () => {
      const res = await request(app)
        .patch(`/api/orders/vendor/sub-orders/${techSubOrderId}/status`)
        .set('Authorization', `Bearer ${vendorTechToken}`)
        .send({
          status: SUB_ORDER_STATUS.SHIPPED,
          carrier: 'BlueDart Express',
          trackingNumber: 'BLUEDART-882200',
          note: 'Package handed over to BlueDart courier.',
        });

      expect(res.status).toBe(200);
      expect(res.body.subOrder.fulfillmentStatus).toBe(SUB_ORDER_STATUS.SHIPPED);
      expect(res.body.subOrder.trackingNumber).toBe('BLUEDART-882200');
    });
  });
});
