import { Vendor, User, Product, AuditLog } from '../models/index.js';
import { ROLES, VENDOR_STATUS } from '../constants/index.js';
import { AppError } from '../middleware/errorHandler.js';

export const applyForVendor = async (req, res, next) => {
  try {
    const { storeName, description, contactEmail, contactPhone, address } = req.body;
    const userId = req.user._id;

    // Check if user already has a vendor record
    const existingVendor = await Vendor.findOne({ userId });
    if (existingVendor) {
      return next(new AppError('You have already submitted a vendor application.', 400));
    }

    // Check store name uniqueness
    const nameTaken = await Vendor.findOne({ storeName: new RegExp(`^${storeName}$`, 'i') });
    if (nameTaken) {
      return next(new AppError('A store with this name already exists. Please choose a different name.', 409));
    }

    const baseSlug = storeName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
    const slug = `${baseSlug}-${Date.now().toString().slice(-4)}`;

    const vendor = await Vendor.create({
      userId,
      storeName,
      slug,
      description,
      contactEmail: contactEmail || req.user.email,
      contactPhone: contactPhone || '',
      address: address || '',
      approvalStatus: VENDOR_STATUS.PENDING,
    });

    // Upgrade user role to vendor
    await User.findByIdAndUpdate(userId, { role: ROLES.VENDOR });

    await AuditLog.create({
      actorId: userId,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'VENDOR_APPLICATION_SUBMITTED',
      targetResource: {
        resourceType: 'Vendor',
        resourceId: vendor._id.toString(),
      },
      details: { storeName },
    });

    res.status(201).json({
      success: true,
      message: 'Vendor application submitted successfully. It is now awaiting admin review.',
      vendor,
    });
  } catch (error) {
    next(error);
  }
};

export const getMyStore = async (req, res, next) => {
  try {
    const vendor = await Vendor.findOne({ userId: req.user._id });
    if (!vendor) {
      return next(new AppError('No vendor profile found for this account.', 404));
    }

    const productCount = await Product.countDocuments({ vendorId: vendor._id });
    const activeProductCount = await Product.countDocuments({ vendorId: vendor._id, isActive: true });

    res.status(200).json({
      success: true,
      vendor,
      stats: {
        totalProducts: productCount,
        activeProducts: activeProductCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateMyStore = async (req, res, next) => {
  try {
    const vendor = await Vendor.findOne({ userId: req.user._id });
    if (!vendor) {
      return next(new AppError('No vendor profile found for this account.', 404));
    }

    const { storeName, description, logoUrl, bannerUrl, contactEmail, contactPhone, address } = req.body;

    if (storeName && storeName !== vendor.storeName) {
      const nameTaken = await Vendor.findOne({
        storeName: new RegExp(`^${storeName}$`, 'i'),
        _id: { $ne: vendor._id },
      });
      if (nameTaken) {
        return next(new AppError('Store name is already taken by another merchant.', 409));
      }
      vendor.storeName = storeName;
    }

    if (description !== undefined) vendor.description = description;
    if (logoUrl !== undefined) vendor.logoUrl = logoUrl;
    if (bannerUrl !== undefined) vendor.bannerUrl = bannerUrl;
    if (contactEmail !== undefined) vendor.contactEmail = contactEmail;
    if (contactPhone !== undefined) vendor.contactPhone = contactPhone;
    if (address !== undefined) vendor.address = address;

    await vendor.save();

    res.status(200).json({
      success: true,
      message: 'Store profile updated successfully.',
      vendor,
    });
  } catch (error) {
    next(error);
  }
};

export const getPublicStore = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const vendor = await Vendor.findOne({ slug, approvalStatus: VENDOR_STATUS.APPROVED });
    if (!vendor) {
      return next(new AppError('Store not found or is currently inactive.', 404));
    }

    const products = await Product.find({ vendorId: vendor._id, isActive: true })
      .populate('categoryId', 'name slug')
      .sort({ createdAt: -1 })
      .limit(24);

    res.status(200).json({
      success: true,
      vendor: {
        _id: vendor._id,
        storeName: vendor.storeName,
        slug: vendor.slug,
        description: vendor.description,
        logoUrl: vendor.logoUrl,
        bannerUrl: vendor.bannerUrl,
        contactEmail: vendor.contactEmail,
        createdAt: vendor.createdAt,
      },
      products,
    });
  } catch (error) {
    next(error);
  }
};

export const getPublicVendors = async (req, res, next) => {
  try {
    const vendors = await Vendor.find({ approvalStatus: VENDOR_STATUS.APPROVED })
      .select('storeName slug description logoUrl bannerUrl createdAt')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: vendors.length,
      vendors,
    });
  } catch (error) {
    next(error);
  }
};
