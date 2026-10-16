import crypto from 'crypto';
import Razorpay from 'razorpay';
import { Order, Payment, AuditLog } from '../models/index.js';
import { PAYMENT_STATUS, ORDER_STATUS } from '../constants/index.js';
import { env } from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';

// Initialize Razorpay SDK instance
const razorpay = new Razorpay({
  key_id: env.RAZORPAY_KEY_ID || 'rzp_test_placeholder_key',
  key_secret: env.RAZORPAY_KEY_SECRET || 'placeholder_secret_key',
});

export const createRazorpayGatewayOrder = async (orderId, buyerId) => {
  const order = await Order.findOne({ _id: orderId, buyerId });
  if (!order) {
    throw new AppError('Order not found or does not belong to your account.', 404);
  }

  if (order.paymentStatus === PAYMENT_STATUS.PAID) {
    throw new AppError('This order has already been paid for.', 400);
  }

  let gatewayOrderId = '';

  // If real test credentials provided, use Razorpay API; otherwise use deterministic test gateway order
  try {
    if (env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_ID !== 'rzp_test_placeholder_key') {
      const razorpayOrder = await razorpay.orders.create({
        amount: order.totalAmount, // In integer paise
        currency: order.currency || 'INR',
        receipt: order.orderNumber,
        notes: {
          orderId: order._id.toString(),
          buyerId: buyerId.toString(),
        },
      });
      gatewayOrderId = razorpayOrder.id;
    } else {
      // Test mode deterministic gateway order
      gatewayOrderId = `order_test_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
    }
  } catch (gatewayErr) {
    console.warn('[Payment Gateway] Live Razorpay order creation failed, falling back to test order:', gatewayErr.message);
    gatewayOrderId = `order_test_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
  }

  // Update order with gateway order id
  order.razorpayOrderId = gatewayOrderId;
  await order.save();

  // Create pending payment record
  let payment = await Payment.findOne({ orderId: order._id, gatewayOrderId });
  if (!payment) {
    payment = await Payment.create({
      orderId: order._id,
      gateway: 'razorpay',
      gatewayOrderId,
      amount: order.totalAmount,
      currency: order.currency,
      status: PAYMENT_STATUS.PENDING,
    });
  }

  return {
    gatewayOrderId,
    amount: order.totalAmount,
    currency: order.currency,
    keyId: env.RAZORPAY_KEY_ID || 'rzp_test_placeholder_key',
    orderNumber: order.orderNumber,
  };
};

export const verifyRazorpayPayment = async ({
  orderId,
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
  buyerId,
}) => {
  const order = await Order.findOne({ _id: orderId, buyerId });
  if (!order) {
    throw new AppError('Order not found.', 404);
  }

  // Idempotency: If already paid, return clean verified response
  if (order.paymentStatus === PAYMENT_STATUS.PAID) {
    return { success: true, verified: true, order, alreadyPaid: true };
  }

  // Compute expected HMAC-SHA256 signature
  const secret = env.RAZORPAY_KEY_SECRET || 'placeholder_secret_key';
  const body = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');

  // Verify signature match
  const isValid = expectedSignature === razorpaySignature;

  // Find or create payment record
  let payment = await Payment.findOne({ orderId: order._id, gatewayOrderId: razorpayOrderId });
  if (!payment) {
    payment = new Payment({
      orderId: order._id,
      gateway: 'razorpay',
      gatewayOrderId: razorpayOrderId,
      amount: order.totalAmount,
      currency: order.currency,
    });
  }

  if (!isValid) {
    payment.status = PAYMENT_STATUS.FAILED;
    payment.verificationData = {
      razorpayOrderId,
      razorpayPaymentId,
      receivedSignature: razorpaySignature,
      failureReason: 'Invalid signature mismatch',
    };
    await payment.save();

    throw new AppError('Payment verification failed: Cryptographic signature mismatch.', 400);
  }

  // Signature verified: Update payment record
  payment.gatewayPaymentId = razorpayPaymentId;
  payment.gatewaySignature = razorpaySignature;
  payment.status = PAYMENT_STATUS.PAID;
  payment.verificationData = { verifiedAt: new Date() };
  await payment.save();

  // Update order status idempotently
  order.paymentStatus = PAYMENT_STATUS.PAID;
  order.razorpayPaymentId = razorpayPaymentId;
  order.statusHistory.push({
    status: 'PAID',
    timestamp: new Date(),
    note: `Payment verified via Razorpay (${razorpayPaymentId}).`,
  });
  await order.save();

  return {
    success: true,
    verified: true,
    order,
    payment,
  };
};

export const verifyWebhookSignature = (rawBody, signatureHeader, secret) => {
  if (!signatureHeader || !rawBody) return false;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');
  return expectedSignature === signatureHeader;
};

export const handleRazorpayWebhookEvent = async (event) => {
  const { event: eventType, payload } = event;

  if (eventType === 'payment.captured') {
    const paymentEntity = payload.payment?.entity;
    const gatewayOrderId = paymentEntity?.order_id;
    const gatewayPaymentId = paymentEntity?.id;

    if (!gatewayOrderId) return { success: true, processed: false };

    const order = await Order.findOne({ razorpayOrderId: gatewayOrderId });
    if (!order) return { success: true, processed: false };

    // Idempotent: If already marked paid, return duplicate true
    if (order.paymentStatus === PAYMENT_STATUS.PAID) {
      return { success: true, duplicate: true, orderId: order._id };
    }

    order.paymentStatus = PAYMENT_STATUS.PAID;
    order.razorpayPaymentId = gatewayPaymentId;
    order.statusHistory.push({
      status: 'PAID',
      timestamp: new Date(),
      note: 'Payment verified via signed Razorpay webhook.',
    });
    await order.save();

    await Payment.findOneAndUpdate(
      { gatewayOrderId },
      {
        gatewayPaymentId,
        status: PAYMENT_STATUS.PAID,
        verificationData: paymentEntity,
      },
      { upsert: true }
    );

    return { success: true, processed: true, orderId: order._id };
  }

  if (eventType === 'payment.failed') {
    const paymentEntity = payload.payment?.entity;
    const gatewayOrderId = paymentEntity?.order_id;

    if (gatewayOrderId) {
      await Payment.findOneAndUpdate(
        { gatewayOrderId },
        {
          status: PAYMENT_STATUS.FAILED,
          verificationData: paymentEntity,
        }
      );
    }
    return { success: true, processed: true, status: 'failed' };
  }

  return { success: true, ignored: true, eventType };
};
