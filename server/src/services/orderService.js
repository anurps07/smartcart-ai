import { Cart, Product, Address, Vendor, Order, AuditLog } from '../models/index.js';
import { ORDER_STATUS, SUB_ORDER_STATUS, PAYMENT_STATUS, ROLES } from '../constants/index.js';
import { AppError } from '../middleware/errorHandler.js';

export const checkoutFromCart = async (buyerId, shippingAddressId) => {
  // 1. Fetch shipping address
  const address = await Address.findOne({ _id: shippingAddressId, buyerId });
  if (!address) {
    throw new AppError('Shipping address not found or does not belong to your account.', 404);
  }

  // 2. Fetch cart with populated products
  const cart = await Cart.findOne({ buyerId }).populate({
    path: 'items.productId',
    populate: { path: 'vendorId', select: 'storeName slug commissionRate' },
  });

  if (!cart || cart.items.length === 0) {
    throw new AppError('Your cart is empty. Add products before checking out.', 400);
  }

  // 3. Validate product availability and active status
  for (const item of cart.items) {
    const product = item.productId;
    if (!product || !product.isActive) {
      throw new AppError(`A product in your cart is no longer available.`, 400);
    }
    if (product.stock < item.quantity) {
      throw new AppError(
        `Insufficient stock for "${product.name}". Only ${product.stock} available, but you requested ${item.quantity}.`,
        400
      );
    }
  }

  // 4. Atomic Inventory Reservation with Compensation Strategy
  const reservedItems = [];
  try {
    for (const item of cart.items) {
      const product = item.productId;
      const reserved = await Product.findOneAndUpdate(
        {
          _id: product._id,
          stock: { $gte: item.quantity },
          isActive: true,
        },
        { $inc: { stock: -item.quantity } },
        { new: true }
      );

      if (!reserved) {
        throw new Error(
          `Inventory conflict: Insufficient stock for "${product.name}" during checkout.`
        );
      }

      reservedItems.push({
        productId: product._id,
        quantity: item.quantity,
      });
    }
  } catch (reservationError) {
    // Compensation loop: Roll back already decremented products
    for (const resItem of reservedItems) {
      await Product.findByIdAndUpdate(resItem.productId, {
        $inc: { stock: resItem.quantity },
      });
    }
    throw new AppError(reservationError.message || 'Failed to reserve inventory for checkout.', 400);
  }

  // 5. Segregate Items by Vendor and create Sub-Orders
  const vendorGroups = {};
  let overallSubtotal = 0;

  for (const item of cart.items) {
    const product = item.productId;
    const vendor = product.vendorId;
    const vendorIdStr = vendor._id.toString();

    const itemTotal = product.price * item.quantity;
    overallSubtotal += itemTotal;

    const itemSnapshot = {
      productId: product._id,
      name: product.name,
      slug: product.slug,
      image: product.images[0] || '',
      price: product.price,
      quantity: item.quantity,
      itemTotal,
    };

    if (!vendorGroups[vendorIdStr]) {
      vendorGroups[vendorIdStr] = {
        vendorId: vendor._id,
        commissionRate: vendor.commissionRate || 10,
        items: [],
        subtotal: 0,
      };
    }

    vendorGroups[vendorIdStr].items.push(itemSnapshot);
    vendorGroups[vendorIdStr].subtotal += itemTotal;
  }

  // Generate unique order numbers
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const orderNumber = `ORD-${dateStr}-${randomSuffix}`;

  const vendorSubOrders = [];
  let subOrderIndex = 1;

  for (const vId in vendorGroups) {
    const group = vendorGroups[vId];
    const commissionAmount = Math.round((group.subtotal * group.commissionRate) / 100);
    const vendorPayout = group.subtotal - commissionAmount;

    vendorSubOrders.push({
      subOrderNumber: `${orderNumber}-V${subOrderIndex++}`,
      vendorId: group.vendorId,
      items: group.items,
      subtotal: group.subtotal,
      commissionRate: group.commissionRate,
      commissionAmount,
      vendorPayout,
      fulfillmentStatus: SUB_ORDER_STATUS.PENDING,
      carrier: '',
      trackingNumber: '',
      statusHistory: [
        {
          status: SUB_ORDER_STATUS.PENDING,
          timestamp: new Date(),
          note: 'Sub-order created on multi-vendor checkout.',
        },
      ],
    });
  }

  // 6. Create Parent Order
  const taxAmount = 0; // Tax configuration
  const shippingFee = 0; // Free shipping
  const totalAmount = overallSubtotal + taxAmount + shippingFee;

  const order = await Order.create({
    orderNumber,
    buyerId,
    shippingAddress: {
      recipientName: address.recipientName,
      phone: address.phone,
      street: address.street,
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      country: address.country,
    },
    currency: 'INR',
    subtotal: overallSubtotal,
    taxAmount,
    shippingFee,
    totalAmount,
    paymentStatus: PAYMENT_STATUS.PENDING,
    overallFulfillmentStatus: ORDER_STATUS.PENDING,
    vendorSubOrders,
    statusHistory: [
      {
        status: ORDER_STATUS.PENDING,
        timestamp: new Date(),
        note: 'Order placed by buyer. Awaiting payment.',
      },
    ],
  });

  // 7. Clear buyer's cart after safe order creation
  await Cart.findOneAndUpdate({ buyerId }, { items: [] });

  return order;
};

// Release reserved stock if order or sub-order is cancelled
export const releaseReservedStock = async (items) => {
  for (const item of items) {
    await Product.findByIdAndUpdate(item.productId, {
      $inc: { stock: item.quantity },
    });
  }
};
