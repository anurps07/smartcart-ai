import bcrypt from 'bcryptjs';
import { User, Vendor, AuditLog } from '../models/index.js';
import { ROLES, VENDOR_STATUS } from '../constants/index.js';
import { signToken, setAuthCookie, clearAuthCookie } from '../utils/token.js';
import { AppError } from '../middleware/errorHandler.js';
import { env } from '../config/env.js';

export const register = async (req, res, next) => {
  try {
    const { name, email, password, role, storeName, storeDescription } = req.body;

    // Check for existing user with normalized email
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(new AppError('An account with this email address already exists.', 409));
    }

    // Hash password
    const salt = await bcrypt.genSalt(env.BCRYPT_SALT_ROUNDS);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user record
    const newUser = await User.create({
      name,
      email,
      passwordHash,
      role: role || ROLES.BUYER,
      isActive: true,
      lastLogin: new Date(),
    });

    let vendorRecord = null;

    // If registering as vendor, create linked vendor profile in 'pending' status
    if (role === ROLES.VENDOR) {
      const generatedStoreName = storeName || `${name}'s Store`;
      const baseSlug = generatedStoreName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
      const uniqueSlug = `${baseSlug}-${Date.now().toString().slice(-4)}`;

      vendorRecord = await Vendor.create({
        userId: newUser._id,
        storeName: generatedStoreName,
        slug: uniqueSlug,
        description: storeDescription || 'New vendor store awaiting product setup.',
        approvalStatus: VENDOR_STATUS.PENDING,
      });

      // Audit log
      await AuditLog.create({
        actorId: newUser._id,
        actorEmail: newUser.email,
        actorRole: newUser.role,
        action: 'VENDOR_APPLICATION_SUBMITTED',
        targetResource: {
          resourceType: 'Vendor',
          resourceId: vendorRecord._id.toString(),
        },
        details: { storeName: generatedStoreName },
      });
    }

    // Sign JWT
    const token = signToken({ id: newUser._id, role: newUser.role });
    setAuthCookie(res, token);

    res.status(201).json({
      success: true,
      message: role === ROLES.VENDOR 
        ? 'Vendor account registered successfully. Your store application is under review.'
        : 'Account registered successfully.',
      token,
      user: newUser.toSafeObject(),
      vendor: vendorRecord,
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return next(new AppError('Invalid email or password.', 401));
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return next(new AppError('Invalid email or password.', 401));
    }

    if (!user.isActive) {
      return next(new AppError('Your account has been deactivated. Please contact support.', 403));
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    let vendorRecord = null;
    if (user.role === ROLES.VENDOR) {
      vendorRecord = await Vendor.findOne({ userId: user._id });
    }

    const token = signToken({ id: user._id, role: user.role });
    setAuthCookie(res, token);

    res.status(200).json({
      success: true,
      message: 'Logged in successfully.',
      token,
      user: user.toSafeObject(),
      vendor: vendorRecord,
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      user: req.user.toSafeObject(),
      vendor: req.vendor || null,
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    clearAuthCookie(res);
    res.status(200).json({
      success: true,
      message: 'Logged out successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const { name, currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    if (name) {
      user.name = name;
    }

    if (newPassword) {
      if (!currentPassword) {
        return next(new AppError('Current password is required to set a new password.', 400));
      }
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return next(new AppError('Current password does not match.', 400));
      }
      const salt = await bcrypt.genSalt(env.BCRYPT_SALT_ROUNDS);
      user.passwordHash = await bcrypt.hash(newPassword, salt);
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      user: user.toSafeObject(),
    });
  } catch (error) {
    next(error);
  }
};
