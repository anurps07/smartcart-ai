import { Order, Product, AuditLog } from '../models/index.js';
import { ORDER_STATUS, SUB_ORDER_STATUS, PAYMENT_STATUS, ROLES } from '../constants/index.js';
import { checkoutFromCart, releaseReservedStock } from '../services/orderService.js';
import { AppError } from '../middleware/errorHandler.js';

export const checkout = async (req, res, next) => {
  try {
    const { shippingAddressId } = req.body;
    const buyerId = req.user._id;

    const order = await checkoutFromCart(buyerId, shippingAddressId);

    res.status(201).json({
      success: true,
      message: 'Order created successfully. Please complete payment to confirm.',
      order,
    });
  } catch (error) {
    next(error);
  }
};

export const getBuyerOrders = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const query = { buyerId: req.user._id };

    if (status) {
      query.overallFulfillmentStatus = status;
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .populate('vendorSubOrders.vendorId', 'storeName slug logoUrl')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    res.status(200).json({
      success: true,
      total,
      page: parseInt(page, 10),
      pages: Math.ceil(total / parseInt(limit, 10)),
      orders,
    });
  } catch (error) {
    next(error);
  }
};

export const getBuyerOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id).populate('vendorSubOrders.vendorId', 'storeName slug logoUrl contactPhone');

    if (!order) {
      return next(new AppError('Order not found.', 404));
    }

    // Strict ownership guard: Buyer can only access their own orders
    if (!order.buyerId.equals(req.user._id) && req.user.role !== ROLES.ADMIN) {
      return next(new AppError('Access forbidden: You do not own this order.', 403));
    }

    res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    next(error);
  }
};

export const cancelBuyerOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const order = await Order.findById(id);

    if (!order) {
      return next(new AppError('Order not found.', 404));
    }

    if (!order.buyerId.equals(req.user._id)) {
      return next(new AppError('Access forbidden: You do not own this order.', 403));
    }

    if (
      order.overallFulfillmentStatus === ORDER_STATUS.SHIPPED ||
      order.overallFulfillmentStatus === ORDER_STATUS.DELIVERED
    ) {
      return next(new AppError('Order cannot be cancelled as it has already been shipped or delivered.', 400));
    }

    if (order.overallFulfillmentStatus === ORDER_STATUS.CANCELLED) {
      return next(new AppError('Order is already cancelled.', 400));
    }

    // Release reserved inventory for all items in order
    for (const subOrder of order.vendorSubOrders) {
      if (subOrder.fulfillmentStatus !== SUB_ORDER_STATUS.CANCELLED) {
        await releaseReservedStock(subOrder.items);
        subOrder.fulfillmentStatus = SUB_ORDER_STATUS.CANCELLED;
        subOrder.statusHistory.push({
          status: SUB_ORDER_STATUS.CANCELLED,
          timestamp: new Date(),
          note: reason || 'Cancelled by buyer.',
          updatedBy: req.user._id,
        });
      }
    }

    order.overallFulfillmentStatus = ORDER_STATUS.CANCELLED;
    order.statusHistory.push({
      status: ORDER_STATUS.CANCELLED,
      timestamp: new Date(),
      note: reason || 'Cancelled by buyer.',
    });

    await order.save();

    res.status(200).json({
      success: true,
      message: 'Order cancelled successfully and inventory released.',
      order,
    });
  } catch (error) {
    next(error);
  }
};

export const getVendorSubOrders = async (req, res, next) => {
  try {
    const vendorId = req.vendor._id;
    const { status, page = 1, limit = 20 } = req.query;

    const matchQuery = { 'vendorSubOrders.vendorId': vendorId };

    const orders = await Order.find(matchQuery)
      .populate('buyerId', 'name email')
      .sort({ createdAt: -1 });

    // Extract only the vendor's own sub-orders
    let subOrders = [];
    for (const order of orders) {
      for (const sub of order.vendorSubOrders) {
        if (sub.vendorId.equals(vendorId)) {
          if (!status || sub.fulfillmentStatus === status) {
            subOrders.push({
              parentOrderId: order._id,
              orderNumber: order.orderNumber,
              subOrderId: sub._id,
              subOrderNumber: sub.subOrderNumber,
              buyer: order.buyerId,
              shippingAddress: order.shippingAddress,
              paymentStatus: order.paymentStatus,
              items: sub.items,
              subtotal: sub.subtotal,
              commissionRate: sub.commissionRate,
              commissionAmount: sub.commissionAmount,
              vendorPayout: sub.vendorPayout,
              fulfillmentStatus: sub.fulfillmentStatus,
              carrier: sub.carrier,
              trackingNumber: sub.trackingNumber,
              statusHistory: sub.statusHistory,
              createdAt: order.createdAt,
            });
          }
        }
      }
    }

    const total = subOrders.length;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const paginatedSubOrders = subOrders.slice(skip, skip + parseInt(limit, 10));

    res.status(200).json({
      success: true,
      total,
      page: parseInt(page, 10),
      pages: Math.ceil(total / parseInt(limit, 10)),
      subOrders: paginatedSubOrders,
    });
  } catch (error) {
    next(error);
  }
};

export const updateVendorSubOrderStatus = async (req, res, next) => {
  try {
    const { subOrderId } = req.params;
    const { status, carrier, trackingNumber, note } = req.body;
    const vendorId = req.vendor._id;

    const order = await Order.findOne({ 'vendorSubOrders._id': subOrderId });
    if (!order) {
      return next(new AppError('Sub-order not found.', 404));
    }

    const subOrder = order.vendorSubOrders.id(subOrderId);
    if (!subOrder) {
      return next(new AppError('Sub-order not found.', 404));
    }

    // Strict vendor isolation: vendor can only update their own sub-orders!
    if (!subOrder.vendorId.equals(vendorId) && req.user.role !== ROLES.ADMIN) {
      return next(new AppError('Access forbidden: You do not own this sub-order.', 403));
    }

    // If cancelling, release reserved stock
    if (status === SUB_ORDER_STATUS.CANCELLED && subOrder.fulfillmentStatus !== SUB_ORDER_STATUS.CANCELLED) {
      await releaseReservedStock(subOrder.items);
    }

    subOrder.fulfillmentStatus = status;
    if (carrier) subOrder.carrier = carrier;
    if (trackingNumber) subOrder.trackingNumber = trackingNumber;

    subOrder.statusHistory.push({
      status,
      timestamp: new Date(),
      note: note || `Status updated to ${status} by vendor.`,
      updatedBy: req.user._id,
    });

    // Update parent order overall status
    const allStatuses = order.vendorSubOrders.map((s) => s.fulfillmentStatus);
    if (allStatuses.every((s) => s === SUB_ORDER_STATUS.DELIVERED)) {
      order.overallFulfillmentStatus = ORDER_STATUS.DELIVERED;
    } else if (allStatuses.every((s) => s === SUB_ORDER_STATUS.CANCELLED)) {
      order.overallFulfillmentStatus = ORDER_STATUS.CANCELLED;
    } else if (allStatuses.some((s) => s === SUB_ORDER_STATUS.SHIPPED || s === SUB_ORDER_STATUS.DELIVERED)) {
      order.overallFulfillmentStatus = ORDER_STATUS.PARTIALLY_SHIPPED;
    } else if (allStatuses.some((s) => s === SUB_ORDER_STATUS.PROCESSING || s === SUB_ORDER_STATUS.CONFIRMED)) {
      order.overallFulfillmentStatus = ORDER_STATUS.PROCESSING;
    }

    await order.save();

    res.status(200).json({
      success: true,
      message: `Sub-order status updated to '${status}'.`,
      subOrder,
      overallFulfillmentStatus: order.overallFulfillmentStatus,
    });
  } catch (error) {
    next(error);
  }
};

export const getAdminOrders = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, paymentStatus } = req.query;
    const query = {};

    if (status) query.overallFulfillmentStatus = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .populate('buyerId', 'name email')
      .populate('vendorSubOrders.vendorId', 'storeName slug')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    res.status(200).json({
      success: true,
      total,
      page: parseInt(page, 10),
      pages: Math.ceil(total / parseInt(limit, 10)),
      orders,
    });
  } catch (error) {
    next(error);
  }
};
