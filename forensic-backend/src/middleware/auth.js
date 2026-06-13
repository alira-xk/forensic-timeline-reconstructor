const jwt = require('jsonwebtoken');
const { createClerkClient, verifyToken } = require('@clerk/backend');
const User = require('../models/User');
const { errorResponse } = require('../utils/response');

const getBearerToken = (req) => {
  const authHeader = req.headers.authorization;
  const queryToken = typeof req.query.token === 'string' ? req.query.token : '';

  if (queryToken) {
    return queryToken;
  }

  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }

  return '';
};

const getClerkClient = () => {
  if (!process.env.CLERK_SECRET_KEY) {
    return null;
  }

  return createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
};

const getPrimaryEmail = (clerkUser) => {
  const primaryEmailId = clerkUser.primaryEmailAddressId;
  const primaryEmail =
    clerkUser.emailAddresses?.find((email) => email.id === primaryEmailId) ||
    clerkUser.emailAddresses?.[0];

  return primaryEmail?.emailAddress?.toLowerCase() || '';
};

const getDisplayName = (clerkUser, email) => {
  const fullName = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ');
  return fullName || clerkUser.username || email.split('@')[0] || 'Investigator';
};

const syncClerkUser = async (clerkUserId) => {
  const clerkClient = getClerkClient();
  if (!clerkClient) {
    throw new Error('CLERK_SECRET_KEY is not configured.');
  }

  const clerkUser = await clerkClient.users.getUser(clerkUserId);
  const email = getPrimaryEmail(clerkUser);

  if (!email) {
    throw new Error('Clerk user does not have a primary email address.');
  }

  const updates = {
    clerkId: clerkUserId,
    name: getDisplayName(clerkUser, email),
    email,
    isActive: true,
    isVerified: true,
    lastLogin: new Date(),
  };

  const existingUser = await User.findOne({
    $or: [{ clerkId: clerkUserId }, { email }],
  });

  if (existingUser) {
    Object.assign(existingUser, updates);
    await existingUser.save();
    return existingUser;
  }

  return User.create({
    ...updates,
    role: 'investigator',
  });
};

const authenticateWithLocalJwt = async (token) => {
  const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
  const user = await User.findById(decoded.userId).select('-password');

  if (!user) {
    const error = new Error('User not found.');
    error.code = 'INVALID_TOKEN';
    throw error;
  }

  return user;
};

const authenticateWithClerk = async (token) => {
  if (!process.env.CLERK_SECRET_KEY) {
    const error = new Error('Clerk authentication is not configured.');
    error.code = 'INVALID_TOKEN';
    throw error;
  }

  const verifiedToken = await verifyToken(token, {
    secretKey: process.env.CLERK_SECRET_KEY,
  });
  const clerkUserId = verifiedToken?.sub;

  if (!clerkUserId) {
    const error = new Error('Clerk token is missing a user subject.');
    error.code = 'INVALID_TOKEN';
    throw error;
  }

  return syncClerkUser(clerkUserId);
};

const authenticate = async (req, res, next) => {
  try {
    const token = getBearerToken(req);

    if (!token) {
      return errorResponse(res, 'Access denied. No token provided.', 401, 'INVALID_TOKEN');
    }

    let localJwtError = null;

    try {
      const user = await authenticateWithLocalJwt(token);

      if (!user.isActive) {
        return errorResponse(res, 'Account is deactivated.', 401, 'INVALID_TOKEN');
      }

      req.user = user;
      return next();
    } catch (err) {
      localJwtError = err;
    }

    try {
      const user = await authenticateWithClerk(token);

      if (!user.isActive) {
        return errorResponse(res, 'Account is deactivated.', 401, 'INVALID_TOKEN');
      }

      req.user = user;
      return next();
    } catch (clerkErr) {
      if (localJwtError?.name === 'TokenExpiredError') {
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
