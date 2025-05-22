const jwt = require('jsonwebtoken');
const { AppError } = require('./errorHandler');
require('dotenv').config();

/**
 * Authentication middleware to protect routes
 * Verifies JWT token from Authorization header
 */
exports.protect = async (req, res, next) => {
  try {
    // 1) Check if token exists
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(new AppError('You are not logged in. Please log in to get access.', 401));
    }

    // 2) Verify token
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // 3) Check if token is expired
      const currentTime = Math.floor(Date.now() / 1000);
      if (decoded.exp && decoded.exp < currentTime) {
        return next(new AppError('Your session has expired. Please log in again.', 401));
      }
      
      // 4) Check if 2FA is pending (should not allow access to protected routes)
      if (decoded.twoFactorPending) {
        return next(new AppError('Two-factor authentication is required.', 401));
      }

      // 5) Add user info to request
      req.user = {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role || 'user'
      };

      next();
    } catch (error) {
      return next(new AppError('Invalid token. Please log in again.', 401));
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Authorization middleware to restrict access based on user role
 * @param {string[]} roles - Array of roles allowed to access the route
 */
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('You must be logged in to access this resource.', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action.', 403));
    }

    next();
  };
};
