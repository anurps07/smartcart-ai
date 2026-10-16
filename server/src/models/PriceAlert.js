import mongoose from 'mongoose';

const priceAlertSchema = new mongoose.Schema(
  {
    buyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Price alert must belong to a buyer'],
      index: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Price alert must target a product'],
      index: true,
    },
    targetPrice: {
      type: Number,
      required: [true, 'Target price is required'],
      min: [1, 'Target price must be greater than zero'],
      validate: {
        validator: Number.isInteger,
        message: 'Target price must be an integer represented in paise',
      },
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    triggeredAt: {
      type: Date,
      default: null,
    },
    notificationHistory: [
      {
        notifiedPrice: { type: Number, required: true },
        date: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// One price alert per buyer per product
priceAlertSchema.index({ buyerId: 1, productId: 1 }, { unique: true });
priceAlertSchema.index({ productId: 1, isActive: 1, targetPrice: 1 });

export const PriceAlert = mongoose.model('PriceAlert', priceAlertSchema);
