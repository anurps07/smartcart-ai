import mongoose from 'mongoose';
import { ORDER_STATUS, SUB_ORDER_STATUS, PAYMENT_STATUS } from '../constants/index.js';

const orderItemSnapshotSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    slug: {
      type: String,
    },
    image: {
      type: String,
      default: '',
    },
    price: {
      type: Number,
      required: true,
      validate: {
        validator: Number.isInteger,
        message: 'Item price must be an integer represented in paise',
      },
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: 'Item quantity must be an integer',
      },
    },
    itemTotal: {
      type: Number,
      required: true,
      validate: {
        validator: Number.isInteger,
        message: 'Item total must be an integer represented in paise',
      },
    },
  },
  { _id: false }
);

const vendorSubOrderSchema = new mongoose.Schema(
  {
    subOrderNumber: {
      type: String,
      required: true,
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: true,
      index: true,
    },
    items: [orderItemSnapshotSchema],
    subtotal: {
      type: Number,
      required: true,
      validate: {
        validator: Number.isInteger,
        message: 'Subtotal must be an integer represented in paise',
      },
    },
    commissionRate: {
      type: Number,
      required: true,
      default: 10,
    },
    commissionAmount: {
      type: Number,
      required: true,
      validate: {
        validator: Number.isInteger,
        message: 'Commission amount must be an integer represented in paise',
      },
    },
    vendorPayout: {
      type: Number,
      required: true,
      validate: {
        validator: Number.isInteger,
        message: 'Vendor payout must be an integer represented in paise',
      },
    },
    fulfillmentStatus: {
      type: String,
      enum: Object.values(SUB_ORDER_STATUS),
      default: SUB_ORDER_STATUS.PENDING,
      index: true,
    },
    carrier: {
      type: String,
      default: '',
    },
    trackingNumber: {
      type: String,
      default: '',
    },
    statusHistory: [
      {
        status: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        note: { type: String, default: '' },
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      },
    ],
  },
  { _id: true, timestamps: true }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    buyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Order must belong to a buyer'],
      index: true,
    },
    shippingAddress: {
      recipientName: { type: String, required: true },
      phone: { type: String, required: true },
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      postalCode: { type: String, required: true },
      country: { type: String, default: 'India' },
    },
    currency: {
      type: String,
      default: 'INR',
    },
    subtotal: {
      type: Number,
      required: true,
      validate: {
        validator: Number.isInteger,
        message: 'Order subtotal must be an integer represented in paise',
      },
    },
    taxAmount: {
      type: Number,
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: 'Tax amount must be an integer represented in paise',
      },
    },
    shippingFee: {
      type: Number,
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: 'Shipping fee must be an integer represented in paise',
      },
    },
    totalAmount: {
      type: Number,
      required: true,
      validate: {
        validator: Number.isInteger,
        message: 'Total amount must be an integer represented in paise',
      },
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.PENDING,
      index: true,
    },
    overallFulfillmentStatus: {
      type: String,
      enum: Object.values(ORDER_STATUS),
      default: ORDER_STATUS.PENDING,
      index: true,
    },
    razorpayOrderId: {
      type: String,
      sparse: true,
      index: true,
    },
    razorpayPaymentId: {
      type: String,
      sparse: true,
    },
    vendorSubOrders: [vendorSubOrderSchema],
    statusHistory: [
      {
        status: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        note: { type: String, default: '' },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Compound indexes for user order queries and vendor fulfillment queries
orderSchema.index({ buyerId: 1, createdAt: -1 });
orderSchema.index({ 'vendorSubOrders.vendorId': 1, 'vendorSubOrders.fulfillmentStatus': 1 });

export const Order = mongoose.model('Order', orderSchema);
