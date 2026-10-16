import { Cart, Product, Vendor } from '../models/index.js';
import { AppError } from '../middleware/errorHandler.js';

// Helper to calculate fresh cart breakdown from live database records
export const calculateCartTotals = async (buyerId) => {
  let cart = await Cart.findOne({ buyerId }).populate({
    path: 'items.productId',
    populate: { path: 'vendorId', select: 'storeName slug logoUrl' },
  });

  if (!cart) {
    cart = await Cart.create({ buyerId, items: [] });
    return {
      cart,
      items: [],
      vendorGroups: [],
      subtotal: 0,
      itemCount: 0,
      hasStockIssues: false,
    };
  }

  const validItems = [];
  const vendorGroupsMap = {};
  let subtotal = 0;
  let itemCount = 0;
  let hasStockIssues = false;

  for (const item of cart.items) {
    const product = item.productId;
    // Skip if product was deleted
    if (!product) continue;

    const isAvailable = product.isActive && product.stock >= item.quantity;
    if (!isAvailable) {
      hasStockIssues = true;
    }

    const itemTotal = product.price * item.quantity;
    subtotal += itemTotal;
    itemCount += item.quantity;

    const formattedItem = {
      productId: product._id,
      name: product.name,
      slug: product.slug,
      image: product.images[0] || '',
      price: product.price,
      stock: product.stock,
      quantity: item.quantity,
      itemTotal,
      isAvailable,
      isActive: product.isActive,
      vendor: product.vendorId ? {
        _id: product.vendorId._id,
        storeName: product.vendorId.storeName,
        slug: product.vendorId.slug,
      } : null,
    };

    validItems.push(formattedItem);

    // Group by vendor for multi-vendor checkout
    if (product.vendorId) {
      const vId = product.vendorId._id.toString();
      if (!vendorGroupsMap[vId]) {
        vendorGroupsMap[vId] = {
          vendorId: product.vendorId._id,
          storeName: product.vendorId.storeName,
          slug: product.vendorId.slug,
          items: [],
          subtotal: 0,
        };
      }
      vendorGroupsMap[vId].items.push(formattedItem);
      vendorGroupsMap[vId].subtotal += itemTotal;
    }
  }

  return {
    cartId: cart._id,
    items: validItems,
    vendorGroups: Object.values(vendorGroupsMap),
    subtotal,
    subtotalINR: subtotal / 100,
    itemCount,
    hasStockIssues,
  };
};

export const getCart = async (req, res, next) => {
  try {
    const cartData = await calculateCartTotals(req.user._id);
    res.status(200).json({
      success: true,
      ...cartData,
    });
  } catch (error) {
    next(error);
  }
};

export const addToCart = async (req, res, next) => {
  try {
    const { productId, quantity = 1 } = req.body;
    const buyerId = req.user._id;

    // Verify product exists and is active
    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return next(new AppError('Product is unavailable or does not exist.', 404));
    }

    // Check available stock
    if (product.stock < quantity) {
      return next(
        new AppError(
          `Insufficient stock. Only ${product.stock} units available in inventory.`,
          400
        )
      );
    }

    let cart = await Cart.findOne({ buyerId });
    if (!cart) {
      cart = new Cart({ buyerId, items: [] });
    }

    const itemIndex = cart.items.findIndex((item) => item.productId.equals(productId));

    if (itemIndex > -1) {
      const newQuantity = cart.items[itemIndex].quantity + quantity;
      if (newQuantity > product.stock) {
        return next(
          new AppError(
            `Cannot add more. You have ${cart.items[itemIndex].quantity} in cart and total stock is ${product.stock}.`,
            400
          )
        );
      }
      cart.items[itemIndex].quantity = newQuantity;
    } else {
      cart.items.push({ productId, quantity });
    }

    await cart.save();
    const updatedCart = await calculateCartTotals(buyerId);

    res.status(200).json({
      success: true,
      message: 'Item added to cart successfully.',
      ...updatedCart,
    });
  } catch (error) {
    next(error);
  }
};

export const updateCartItem = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;
    const buyerId = req.user._id;

    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return next(new AppError('Product is unavailable.', 404));
    }

    if (quantity > product.stock) {
      return next(
        new AppError(
          `Requested quantity (${quantity}) exceeds available stock (${product.stock}).`,
          400
        )
      );
    }

    const cart = await Cart.findOne({ buyerId });
    if (!cart) {
      return next(new AppError('Cart not found.', 404));
    }

    const itemIndex = cart.items.findIndex((item) => item.productId.equals(productId));
    if (itemIndex === -1) {
      return next(new AppError('Item is not in your cart.', 404));
    }

    if (quantity <= 0) {
      cart.items.splice(itemIndex, 1);
    } else {
      cart.items[itemIndex].quantity = quantity;
    }

    await cart.save();
    const updatedCart = await calculateCartTotals(buyerId);

    res.status(200).json({
      success: true,
      message: 'Cart updated successfully.',
      ...updatedCart,
    });
  } catch (error) {
    next(error);
  }
};

export const removeFromCart = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const buyerId = req.user._id;

    const cart = await Cart.findOne({ buyerId });
    if (!cart) {
      return next(new AppError('Cart not found.', 404));
    }

    cart.items = cart.items.filter((item) => !item.productId.equals(productId));
    await cart.save();

    const updatedCart = await calculateCartTotals(buyerId);

    res.status(200).json({
      success: true,
      message: 'Item removed from cart.',
      ...updatedCart,
    });
  } catch (error) {
    next(error);
  }
};

export const clearCart = async (req, res, next) => {
  try {
    const buyerId = req.user._id;
    await Cart.findOneAndUpdate({ buyerId }, { items: [] }, { upsert: true });

    res.status(200).json({
      success: true,
      message: 'Cart cleared successfully.',
      items: [],
      vendorGroups: [],
      subtotal: 0,
      itemCount: 0,
    });
  } catch (error) {
    next(error);
  }
};
