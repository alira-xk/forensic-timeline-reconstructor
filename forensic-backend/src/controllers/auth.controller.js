const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { successResponse, errorResponse } = require('../utils/response');
const { logAudit, AUDIT_ACTIONS } = require('../utils/auditLogger');

const generateAccessToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRY || '7d',
  });
};

const generateRefreshToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRY || '30d',
  });
};

exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role, organization } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return errorResponse(res, 'Email already registered.', 409);
    }

    const user = await User.create({ name, email, password, role, organization });

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    const refreshExpiry = new Date();
    refreshExpiry.setDate(refreshExpiry.getDate() + 30);

    user.refreshTokens.push({
      token: refreshToken,
      expiresAt: refreshExpiry,
    });
    user.lastLogin = new Date();
    await user.save();

    logAudit(user._id, AUDIT_ACTIONS.REGISTER, 'User', user._id.toString(), { email }, req.ip);

    return successResponse(res, 'Registration successful.', {
      user: user.toJSON(),
      accessToken,
      refreshToken,
    }, 201);
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      logAudit(null, AUDIT_ACTIONS.LOGIN, 'User', '', { email, reason: 'User not found' }, req.ip, false);
      return errorResponse(res, 'Invalid email or password.', 401);
    }

    if (!user.isActive) {
      return errorResponse(res, 'Account is deactivated.', 401);
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      logAudit(user._id, AUDIT_ACTIONS.LOGIN, 'User', user._id.toString(), { reason: 'Wrong password' }, req.ip, false);
      return errorResponse(res, 'Invalid email or password.', 401);
    }

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    const refreshExpiry = new Date();
    refreshExpiry.setDate(refreshExpiry.getDate() + 30);

    // Clean expired tokens
    user.refreshTokens = user.refreshTokens.filter(
      (rt) => rt.expiresAt > new Date()
    );

    user.refreshTokens.push({
      token: refreshToken,
      expiresAt: refreshExpiry,
    });
    user.lastLogin = new Date();
    await user.save();

    logAudit(user._id, AUDIT_ACTIONS.LOGIN, 'User', user._id.toString(), {}, req.ip);

    return successResponse(res, 'Login successful.', {
      user: user.toJSON(),
      accessToken,
      refreshToken,
    });
  } catch (err) {
    next(err);
  }
};

exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return errorResponse(res, 'Refresh token is required.', 400);
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (err) {
      return errorResponse(res, 'Invalid or expired refresh token.', 401, 'INVALID_TOKEN');
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      return errorResponse(res, 'User not found.', 401, 'INVALID_TOKEN');
    }

    const tokenIndex = user.refreshTokens.findIndex(
      (rt) => rt.token === refreshToken && rt.expiresAt > new Date()
    );

    if (tokenIndex === -1) {
      return errorResponse(res, 'Refresh token not found or expired.', 401, 'INVALID_TOKEN');
    }

    // Remove old refresh token
    user.refreshTokens.splice(tokenIndex, 1);

    // Generate new pair
    const newAccessToken = generateAccessToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    const refreshExpiry = new Date();
    refreshExpiry.setDate(refreshExpiry.getDate() + 30);

    user.refreshTokens.push({
      token: newRefreshToken,
      expiresAt: refreshExpiry,
    });
    await user.save();

    logAudit(user._id, AUDIT_ACTIONS.TOKEN_REFRESH, 'User', user._id.toString(), {}, req.ip);

    return successResponse(res, 'Token refreshed.', {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (err) {
    next(err);
  }
};

exports.logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    const user = req.user;

    if (refreshToken) {
      await User.findByIdAndUpdate(user._id, {
        $pull: { refreshTokens: { token: refreshToken } },
      });
    }

    logAudit(user._id, AUDIT_ACTIONS.LOGOUT, 'User', user._id.toString(), {}, req.ip);

    return successResponse(res, 'Logged out successfully.');
  } catch (err) {
    next(err);
  }
};

exports.getMe = async (req, res, next) => {
  try {
    return successResponse(res, 'User profile retrieved.', { user: req.user });
  } catch (err) {
    next(err);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const { name, organization } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (organization !== undefined) updates.organization = organization;

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true });

    logAudit(user._id, AUDIT_ACTIONS.PROFILE_UPDATED, 'User', user._id.toString(), updates, req.ip);

    return successResponse(res, 'Profile updated.', { user });
  } catch (err) {
    next(err);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return errorResponse(res, 'Current and new password are required.', 400);
    }

    if (newPassword.length < 8) {
      return errorResponse(res, 'New password must be at least 8 characters.', 400);
    }

    const user = await User.findById(req.user._id).select('+password');
    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      return errorResponse(res, 'Current password is incorrect.', 400);
    }

    user.password = newPassword;
    // Invalidate all refresh tokens on password change
    user.refreshTokens = [];
    await user.save();

    logAudit(user._id, AUDIT_ACTIONS.PASSWORD_CHANGED, 'User', user._id.toString(), {}, req.ip);

    return successResponse(res, 'Password changed successfully.');
  } catch (err) {
    next(err);
  }
};
