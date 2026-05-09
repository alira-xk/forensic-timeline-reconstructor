const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { errorResponse } = require('../utils/response');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse(res, 'Access denied. No token provided.', 401, 'INVALID_TOKEN');
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      const user = await User.findById(decoded.userId).select('-password');
      if (!user) {
        return errorResponse(res, 'User not found.', 401, 'INVALID_TOKEN');
      }
      if (!user.isActive) {
        return errorResponse(res, 'Account is deactivated.', 401, 'INVALID_TOKEN');
      }
      req.user = user;
      next();
    } catch (jwtErr) {
      if (jwtErr.name === 'TokenExpiredError') {
        return errorResponse(res, 'Token has expired.', 401, 'TOKEN_EXPIRED');
      }
      return errorResponse(res, 'Invalid token.', 401, 'INVALID_TOKEN');
    }
  } catch (err) {
    return errorResponse(res, 'Authentication error.', 500);
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 'Not authenticated.', 401, 'INVALID_TOKEN');
    }
    if (roles.length && !roles.includes(req.user.role)) {
      return errorResponse(res, 'Insufficient permissions.', 403);
    }
    next();
  };
};

module.exports = { authenticate, authorize };
