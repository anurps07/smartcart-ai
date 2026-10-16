import { verifyToken } from '../utils/token.js';
import { User, Vendor } from '../models/index.js';
import { AppError } from './errorHandler.js';
import { ROLES, VENDOR_STATUS } from '../constants/index.js';

export const requireAuth = async (req, res, next) => {
  try {
    let token = null;

    // Check Authorization header (Bearer token)
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } 
    // Fallback to HttpOnly cookie
    else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return next(new AppError('Authentication required. Please log in to access this resource.', 401));
    }

    // Verify token
    const decoded = verifyToken(token);

    // Fetch user
    const user = await User.findById(decoded.id);
    if (!user) {
      return next(new AppError('User account associated with this token no longer exists.', 401));
    }

    if (!user.isActive) {
      return next(new AppError('Your account has been deactivated. Please contact support.', 403));
    }

    // If user is a vendor, optionally attach vendor record
    let vendor = null;
    if (user.role === ROLES.VENDOR) {
      vendor = await Vendor.findOne({ userId: user._id });
    }

    req.user = user;
    req.vendor = vendor;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return next(error); // Handled by centralized error middleware
    }
    next(error);
  }
};

export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          `Access forbidden: Requires one of [${allowedRoles.join(', ')}] permissions. Current role: ${req.user.role}`,
          403
        )
      );
    }

    next();
  };
};

export const requireVendorApproved = (req, res, next) => {
  if (!req.user || req.user.role !== ROLES.VENDOR) {
    return next(new AppError('Access restricted to vendor accounts.', 403));
  }

  if (!req.vendor) {
    return next(new AppError('Vendor store profile not found. Please submit your seller application.', 404));
  }

  if (req.vendor.approvalStatus !== VENDOR_STATUS.APPROVED) {
    return next(
      new AppError(
        `Your vendor store is currently in '${req.vendor.approvalStatus}' status. Only approved vendors can perform this action.`,
        403
      )
    );
  }

  next();
};

export const optionalAuth = async (req, res, next) => {
  try {
    let token = null;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (token) {
      const decoded = verifyToken(token);
      const user = await User.findById(decoded.id);
      if (user && user.isActive) {
        req.user = user;
        if (user.role === ROLES.VENDOR) {
          req.vendor = await Vendor.findOne({ userId: user._id });
        }
      }
    }
    next();
  } catch (error) {
    // Fail silently for optional auth
    next();
  }
};
