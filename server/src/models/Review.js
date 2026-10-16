import mongoose from 'mongoose';
import { REVIEW_STATUS } from '../constants/index.js';

const reviewSchema = new mongoose.Schema(
  {
    buyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a buyer'],
      index: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Review must be for a Product'],
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: [true, 'Review must reference an Order (verified purchase)'],
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be between 1 and 5'],
      max: [5, 'Rating must be between 1 and 5'],
      validate: {
        validator: Number.isInteger,
        message: 'Rating must be an integer between 1 and 5',
      },
      index: true,
    },
    title: {
      type: String,
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
      default: '',
    },
    comment: {
      type: String,
      required: [true, 'Review comment is required'],
      trim: true,
      minlength: [5, 'Review comment must be at least 5 characters'],
      maxlength: [2000, 'Review comment cannot exceed 2000 characters'],
    },
    moderationStatus: {
      type: String,
      enum: Object.values(REVIEW_STATUS),
      default: REVIEW_STATUS.APPROVED,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// One verified review per buyer per product per order
reviewSchema.index({ buyerId: 1, productId: 1, orderId: 1 }, { unique: true });
reviewSchema.index({ productId: 1, moderationStatus: 1, createdAt: -1 });

export const Review = mongoose.model('Review', reviewSchema);
