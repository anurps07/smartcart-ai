import { Vendor, User, Product, Order, AuditLog } from '../models/index.js';
import { VENDOR_STATUS, ROLES, ORDER_STATUS, PAYMENT_STATUS } from '../constants/index.js';
import { AppError } from '../middleware/errorHandler.js';

export const getVendors = async (req, res, next) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const query = {};

    if (status && Object.values(VENDOR_STATUS).includes(status)) {
      query.approvalStatus = status;
    }

    if (search) {
      query.storeName = { $regex: search, $options: 'i' };
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await Vendor.countDocuments(query);
    const vendors = await Vendor.find(query)
      .populate('userId', 'name email isActive createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    res.status(200).json({
      success: true,
      total,
      page: parseInt(page, 10),
      pages: Math.ceil(total / parseInt(limit, 10)),
      vendors,
    });
  } catch (error) {
    next(error);
  }
};

export const getVendorById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const vendor = await Vendor.findById(id).populate('userId', 'name email isActive createdAt lastLogin');
    if (!vendor) {
      return next(new AppError('Vendor not found.', 404));
    }

    const productCount = await Product.countDocuments({ vendorId: vendor._id });

    res.status(200).json({
      success: true,
      vendor,
      productCount,
    });
  } catch (error) {
    next(error);
  }
};

export const approveVendor = async (req, res, next) => {
  try {
    const { id } = req.params;
    const vendor = await Vendor.findById(id);
    if (!vendor) {
      return next(new AppError('Vendor not found.', 404));
    }

    vendor.approvalStatus = VENDOR_STATUS.APPROVED;
    vendor.approvalDate = new Date();
    vendor.rejectionReason = '';
    await vendor.save();

    await AuditLog.create({
      actorId: req.user._id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'ADMIN_APPROVED_VENDOR',
      targetResource: {
        resourceType: 'Vendor',
        resourceId: vendor._id.toString(),
      },
      details: { storeName: vendor.storeName },
    });

    res.status(200).json({
      success: true,
      message: `Store '${vendor.storeName}' has been approved successfully.`,
      vendor,
    });
  } catch (error) {
    next(error);
  }
};

export const rejectVendor = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const vendor = await Vendor.findById(id);
    if (!vendor) {
      return next(new AppError('Vendor not found.', 404));
    }

    vendor.approvalStatus = VENDOR_STATUS.REJECTED;
    vendor.rejectionReason = reason;
    await vendor.save();

    await AuditLog.create({
      actorId: req.user._id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'ADMIN_REJECTED_VENDOR',
      targetResource: {
        resourceType: 'Vendor',
        resourceId: vendor._id.toString(),
      },
      details: { storeName: vendor.storeName, reason },
    });

    res.status(200).json({
      success: true,
      message: `Store '${vendor.storeName}' has been rejected.`,
      vendor,
    });
  } catch (error) {
    next(error);
  }
};

export const suspendVendor = async (req, res, next) => {
  try {
    const { id } = req.params;
    const vendor = await Vendor.findById(id);
    if (!vendor) {
      return next(new AppError('Vendor not found.', 404));
    }

    vendor.approvalStatus = VENDOR_STATUS.SUSPENDED;
    await vendor.save();

    // Deactivate vendor's active products
    await Product.updateMany({ vendorId: vendor._id }, { isActive: false });

    await AuditLog.create({
      actorId: req.user._id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'ADMIN_SUSPENDED_VENDOR',
      targetResource: {
        resourceType: 'Vendor',
        resourceId: vendor._id.toString(),
      },
      details: { storeName: vendor.storeName },
    });

    res.status(200).json({
      success: true,
      message: `Store '${vendor.storeName}' has been suspended and products deactivated.`,
      vendor,
    });
  } catch (error) {
    next(error);
  }
};

export const updateVendorCommission = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { commissionRate } = req.body;

    const vendor = await Vendor.findById(id);
    if (!vendor) {
      return next(new AppError('Vendor not found.', 404));
    }

    const previousRate = vendor.commissionRate;
    vendor.commissionRate = commissionRate;
    await vendor.save();

    await AuditLog.create({
      actorId: req.user._id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'ADMIN_UPDATED_COMMISSION',
      targetResource: {
        resourceType: 'Vendor',
        resourceId: vendor._id.toString(),
      },
      details: { storeName: vendor.storeName, previousRate, newRate: commissionRate },
    });

    res.status(200).json({
      success: true,
      message: `Commission rate for '${vendor.storeName}' updated to ${commissionRate}%.`,
      vendor,
    });
  } catch (error) {
    next(error);
  }
};

export const getAuditLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await AuditLog.countDocuments({});
    const logs = await AuditLog.find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    res.status(200).json({
      success: true,
      total,
      page: parseInt(page, 10),
      pages: Math.ceil(total / parseInt(limit, 10)),
      logs,
    });
  } catch (error) {
    next(error);
  }
};

export const getPlatformOverview = async (req, res, next) => {
  try {
    const [
      totalVendors,
      activeVendors,
      pendingVendors,
      totalCustomers,
      totalProducts,
      totalOrders,
      ordersAggregate,
    ] = await Promise.all([
      Vendor.countDocuments({}),
      Vendor.countDocuments({ approvalStatus: VENDOR_STATUS.APPROVED }),
      Vendor.countDocuments({ approvalStatus: VENDOR_STATUS.PENDING }),
      User.countDocuments({ role: ROLES.BUYER }),
      Product.countDocuments({ isActive: true }),
      Order.countDocuments({}),
      Order.aggregate([
        { $match: { paymentStatus: PAYMENT_STATUS.PAID } },
        { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } },
      ]),
    ]);

    const totalRevenuePaise = ordersAggregate[0]?.totalRevenue || 0;

    res.status(200).json({
      success: true,
      metrics: {
        totalRevenuePaise,
        totalRevenueINR: totalRevenuePaise / 100,
        totalOrders,
        totalVendors,
        activeVendors,
        pendingVendors,
        totalCustomers,
        totalProducts,
      },
    });
  } catch (error) {
    next(error);
  }
};
