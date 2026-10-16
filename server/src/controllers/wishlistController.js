import { Wishlist, Product } from '../models/index.js';
import { AppError } from '../middleware/errorHandler.js';

export const getWishlist = async (req, res, next) => {
  try {
    const buyerId = req.user._id;
    let wishlist = await Wishlist.findOne({ buyerId }).populate({
      path: 'products',
      match: { isActive: true },
      select: 'name slug price originalPrice images stock averageRating totalReviews vendorId',
      populate: { path: 'vendorId', select: 'storeName slug' },
    });

    if (!wishlist) {
      wishlist = await Wishlist.create({ buyerId, products: [] });
    }

    res.status(200).json({
      success: true,
      count: wishlist.products.length,
      products: wishlist.products,
    });
  } catch (error) {
    next(error);
  }
};

export const toggleWishlist = async (req, res, next) => {
  try {
    const { productId } = req.body;
    const buyerId = req.user._id;

    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return next(new AppError('Product not found or is unavailable.', 404));
    }

    let wishlist = await Wishlist.findOne({ buyerId });
    if (!wishlist) {
      wishlist = new Wishlist({ buyerId, products: [] });
    }

    const index = wishlist.products.findIndex((id) => id.toString() === productId);
    let inWishlist = false;

    if (index > -1) {
      wishlist.products.splice(index, 1);
      inWishlist = false;
    } else {
      wishlist.products.push(productId);
      inWishlist = true;
    }

    await wishlist.save();

    res.status(200).json({
      success: true,
      inWishlist,
      message: inWishlist ? 'Product added to wishlist.' : 'Product removed from wishlist.',
      count: wishlist.products.length,
    });
  } catch (error) {
    next(error);
  }
};

export const removeFromWishlist = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const buyerId = req.user._id;

    const wishlist = await Wishlist.findOne({ buyerId });
    if (wishlist) {
      wishlist.products = wishlist.products.filter((id) => id.toString() !== productId);
      await wishlist.save();
    }

    res.status(200).json({
      success: true,
      message: 'Product removed from wishlist.',
    });
  } catch (error) {
    next(error);
  }
};
