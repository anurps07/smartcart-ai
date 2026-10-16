import mongoose from 'mongoose';
import { PAYMENT_STATUS } from '../constants/index.js';

const paymentSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: [true, 'Payment must be associated with an Order'],
      index: true,
    },
    gateway: {
      type: String,
      default: 'razorpay',
      required: true,
    },
    gatewayOrderId: {
      type: String,
      required: true,
      index: true,
    },
    gatewayPaymentId: {
      type: String,
      sparse: true,
      index: true,
    },
    gatewaySignature: {
      type: String,
      sparse: true,
    },
    amount: {
      type: Number,
      required: true,
      validate: {
        validator: Number.isInteger,
        message: 'Payment amount must be an integer represented in paise',
      },
    },
    currency: {
      type: String,
      default: 'INR',
    },
    status: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.PENDING,
      index: true,
    },
    verificationData: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    refundId: {
      type: String,
      default: null,
    },
    refundAmount: {
      type: Number,
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: 'Refund amount must be an integer represented in paise',
      },
    },
  },
  {
    timestamps: true,
  }
);

export const Payment = mongoose.model('Payment', paymentSchema);
