import { Address } from '../models/index.js';
import { AppError } from '../middleware/errorHandler.js';

export const getAddresses = async (req, res, next) => {
  try {
    const addresses = await Address.find({ buyerId: req.user._id }).sort({ isDefault: -1, createdAt: -1 });

    res.status(200).json({
      success: true,
      count: addresses.length,
      addresses,
    });
  } catch (error) {
    next(error);
  }
};

export const addAddress = async (req, res, next) => {
  try {
    const { recipientName, phone, street, city, state, postalCode, country, isDefault } = req.body;
    const buyerId = req.user._id;

    // Check if this is user's first address
    const existingCount = await Address.countDocuments({ buyerId });
    const shouldBeDefault = isDefault || existingCount === 0;

    // If new address is set as default, reset other addresses
    if (shouldBeDefault) {
      await Address.updateMany({ buyerId }, { isDefault: false });
    }

    const address = await Address.create({
      buyerId,
      recipientName,
      phone,
      street,
      city,
      state,
      postalCode,
      country: country || 'India',
      isDefault: shouldBeDefault,
    });

    res.status(201).json({
      success: true,
      message: 'Address added successfully.',
      address,
    });
  } catch (error) {
    next(error);
  }
};

export const updateAddress = async (req, res, next) => {
  try {
    const { id } = req.params;
    const buyerId = req.user._id;

    const address = await Address.findById(id);
    if (!address) {
      return next(new AppError('Address not found.', 404));
    }

    // Ownership check: user can only edit their own addresses
    if (!address.buyerId.equals(buyerId)) {
      return next(new AppError('Access forbidden: You do not own this address.', 403));
    }

    const { recipientName, phone, street, city, state, postalCode, country, isDefault } = req.body;

    if (isDefault) {
      await Address.updateMany({ buyerId, _id: { $ne: address._id } }, { isDefault: false });
      address.isDefault = true;
    }

    if (recipientName) address.recipientName = recipientName;
    if (phone) address.phone = phone;
    if (street) address.street = street;
    if (city) address.city = city;
    if (state) address.state = state;
    if (postalCode) address.postalCode = postalCode;
    if (country) address.country = country;

    await address.save();

    res.status(200).json({
      success: true,
      message: 'Address updated successfully.',
      address,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAddress = async (req, res, next) => {
  try {
    const { id } = req.params;
    const buyerId = req.user._id;

    const address = await Address.findById(id);
    if (!address) {
      return next(new AppError('Address not found.', 404));
    }

    if (!address.buyerId.equals(buyerId)) {
      return next(new AppError('Access forbidden: You do not own this address.', 403));
    }

    const wasDefault = address.isDefault;
    await Address.deleteOne({ _id: address._id });

    // If deleted address was default, promote another address to default if available
    if (wasDefault) {
      const remaining = await Address.findOne({ buyerId });
      if (remaining) {
        remaining.isDefault = true;
        await remaining.save();
      }
    }

    res.status(200).json({
      success: true,
      message: 'Address removed successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const setDefaultAddress = async (req, res, next) => {
  try {
    const { id } = req.params;
    const buyerId = req.user._id;

    const address = await Address.findById(id);
    if (!address) {
      return next(new AppError('Address not found.', 404));
    }

    if (!address.buyerId.equals(buyerId)) {
      return next(new AppError('Access forbidden: You do not own this address.', 403));
    }

    await Address.updateMany({ buyerId }, { isDefault: false });
    address.isDefault = true;
    await address.save();

    res.status(200).json({
      success: true,
      message: 'Default address updated.',
      address,
    });
  } catch (error) {
    next(error);
  }
};
