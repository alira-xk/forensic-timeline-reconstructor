const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const dns = require('dns').promises;
const User = require('../models/User');
const { successResponse, errorResponse } = require('../utils/response');
const { logAudit, AUDIT_ACTIONS } = require('../utils/auditLogger');
const { sendPasswordResetEmail, sendOtpEmail } = require('../utils/emailService');
const { verifyMailboxExists } = require('../utils/emailVerifier');

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

const generateSixDigitCode = () => crypto.randomInt(100000, 1000000).toString();
const generateResetToken = generateSixDigitCode;
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
const generateOtp = generateSixDigitCode;

const BLOCKED_EMAIL_DOMAINS = [
  'example.com',
  'example.org',
  'example.net',
  'test.com',
  'invalid.com',
  'fake.com',
  'mailinator.com',
  'guerrillamail.com',
  '10minutemail.com',
  'tempmail.com',
  'temp-mail.org',
  'yopmail.com',
  'trashmail.com',
  'sharklasers.com',
];

const PUBLIC_EMAIL_DOMAINS = [
  'gmail.com',
  'googlemail.com',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'msn.com',
  'yahoo.com',
  'ymail.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'proton.me',
  'protonmail.com',
  'aol.com',
  'zoho.com',
  'mail.com',
  'gmx.com',
  'gmx.net',
  'yandex.com',
];

const BLOCKED_EMAIL_LOCAL_PARTS = [
  'a',
  'aa',
  'aaa',
  'abc',
  'abcd',
  'admin',
  'demo',
  'dummy',
  'email',
  'fake',
  'foo',
  'mail',
  'noemail',
  'none',
  'null',
  'sample',
  'test',
  'testing',
  'user',
  'username',
];

const PLACEHOLDER_LOCAL_PATTERNS = [
  /^a+b+c*$/i,
  /^test[0-9._-]*$/i,
  /^fake[0-9._-]*$/i,
  /^dummy[0-9._-]*$/i,
  /^user[0-9._-]*$/i,
  /^example[0-9._-]*$/i,
  /^(.)\1{2,}$/i,
  /^(123|1234|12345|123456|qwerty|asdf|asdfgh)$/i,
];

const getAllowedDomains = () => {
  const configured = (process.env.ALLOWED_EMAIL_DOMAINS || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  return configured;
};

const getAllowedEmailAddresses = () => {
  return (process.env.ALLOWED_EMAIL_ADDRESSES || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
};

const shouldEnforceEmailChecks = () => {
  return (process.env.ENFORCE_EMAIL_DOMAIN_CHECKS || 'true') === 'true';
};

const shouldRequireEmailAddressAllowlist = () => {
  return (process.env.REQUIRE_EMAIL_ADDRESS_ALLOWLIST || 'false') === 'true';
};

const shouldRequirePublicEmailAllowlist = () => {
  return (process.env.REQUIRE_PUBLIC_EMAIL_ALLOWLIST || 'false') === 'true';
};

const hasDnsMailTarget = async (domain) => {
  try {
    const mx = await dns.resolveMx(domain);
    if (mx.some((record) => record.exchange && record.exchange.trim())) {
      return true;
    }
  } catch (err) {
    // Fall through to A/AAAA checks. Some domains accept mail at their host.
  }

  try {
    const [ipv4, ipv6] = await Promise.allSettled([dns.resolve4(domain), dns.resolve6(domain)]);
    return (
      (ipv4.status === 'fulfilled' && ipv4.value.length > 0) ||
      (ipv6.status === 'fulfilled' && ipv6.value.length > 0)
    );
  } catch (err) {
    return false;
  }
};

const validateEmailForDelivery = async (email) => {
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cleanEmail)) {
    return { ok: false, email: cleanEmail, message: 'Enter a valid email address.' };
  }

  const allowedEmailAddresses = getAllowedEmailAddresses();
  if (allowedEmailAddresses.includes(cleanEmail)) {
    return { ok: true, email: cleanEmail };
  }

  if (shouldRequireEmailAddressAllowlist() && allowedEmailAddresses.length) {
    return { ok: false, email: cleanEmail, message: 'This email address is not approved for registration.' };
  }

  const [localPart, domain] = cleanEmail.split('@');
  const normalizedLocalPart = localPart.replace(/[._-]/g, '');

  if (shouldRequirePublicEmailAllowlist() && PUBLIC_EMAIL_DOMAINS.includes(domain)) {
    return {
      ok: false,
      email: cleanEmail,
      message: `Public email addresses from "${domain}" must be approved by an investigator before registration.`,
    };
  }

  if (
    localPart.length < 4 ||
    BLOCKED_EMAIL_LOCAL_PARTS.includes(localPart) ||
    BLOCKED_EMAIL_LOCAL_PARTS.includes(normalizedLocalPart) ||
    PLACEHOLDER_LOCAL_PATTERNS.some((pattern) => pattern.test(localPart) || pattern.test(normalizedLocalPart))
  ) {
    return { ok: false, email: cleanEmail, message: 'Use your real personal or work email address.' };
  }

  const allowedDomains = getAllowedDomains();
  if (allowedDomains.length && !allowedDomains.includes(domain)) {
    return {
      ok: false,
      email: cleanEmail,
      message: `The email domain "${domain}" is not approved for registration.`,
    };
  }

  if (BLOCKED_EMAIL_DOMAINS.includes(domain)) {
    return { ok: false, email: cleanEmail, message: 'Use a real, deliverable email address.' };
  }

  if (shouldEnforceEmailChecks()) {
    const hasMailTarget = await hasDnsMailTarget(domain);
    if (!hasMailTarget) {
      return { ok: false, email: cleanEmail, message: 'Email domain cannot receive mail.' };
    }
  }

  const mailboxValidation = await verifyMailboxExists(cleanEmail);
  if (!mailboxValidation.ok) {
    return {
      ok: false,
      email: cleanEmail,
      message: mailboxValidation.message || 'This email inbox could not be verified.',
    };
  }

  return { ok: true, email: cleanEmail };
};

exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role, organization } = req.body;
    const emailValidation = await validateEmailForDelivery(email);
    if (!emailValidation.ok) {
      return errorResponse(res, emailValidation.message, 400, 'invalid_email');
    }
    const cleanEmail = emailValidation.email;

    const existing = await User.findOne({ email: cleanEmail });
    if (existing && existing.isVerified !== false) {
      return errorResponse(res, 'Account already exists. Please login.', 409, 'account_exists');
    }

    const otpCode = generateOtp();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    let user;
    if (existing && existing.isVerified === false) {
      existing.name = name;
      existing.email = cleanEmail;
      existing.password = password;
      existing.role = role || existing.role;
      existing.organization = organization || existing.organization;
      existing.otpCode = otpCode;
      existing.otpExpiresAt = otpExpiresAt;
      existing.isVerified = false;
      user = await existing.save();
    } else {
      user = await User.create({
        name,
        email: cleanEmail,
        password,
        role,
        organization,
        isVerified: false,
        otpCode,
        otpExpiresAt,
      });
    }

    try {
      await sendOtpEmail(cleanEmail, otpCode);
    } catch (emailErr) {
      if (!existing) {
        await User.findByIdAndDelete(user._id);
      }

      const isProd = (process.env.NODE_ENV || '').toLowerCase() === 'production';
      const baseMessage =
        emailErr.code === 'EMAIL_NOT_CONFIGURED'
          ? 'Email is not configured. Set DEV_EMAIL_LOG=true to print OTP codes in the backend terminal, or configure SMTP_USER and SMTP_PASS in .env.'
          : 'Failed to send verification code. Please try again later.';

      const debugMessage = !isProd
        ? `${baseMessage}${emailErr && emailErr.message ? ` — ${emailErr.message}` : ''}${emailErr && emailErr.code ? ` (code: ${emailErr.code})` : ''}`
        : baseMessage;

      return errorResponse(res, debugMessage, 502, 'email_send_failed');
    }


    logAudit(user._id, AUDIT_ACTIONS.REGISTER, 'User', user._id.toString(), { email }, req.ip);

    return res.status(201).json({
      success: true,
      code: 'otp_sent',
      message: 'OTP sent to your email. Please verify your account.',
      data: { email: user.email },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = String(password || '').trim();

    const user = await User.findOne({ email: cleanEmail }).select('+password');
    if (!user) {
      logAudit(null, AUDIT_ACTIONS.LOGIN, 'User', '', { email, reason: 'User not found' }, req.ip, false);
      return errorResponse(res, 'Invalid email or password.', 401);
    }

    if (!user.isActive) {
      return errorResponse(res, 'Account is deactivated.', 401);
    }

    if (user.isVerified === false) {
      return errorResponse(res, 'Please verify your email before login.', 403, 'account_not_verified');
    }

    const isMatch = await user.comparePassword(cleanPassword);
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

exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return errorResponse(res, 'Email is required.', 400);
    }

    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cleanEmail)) {
      return errorResponse(res, 'Enter a valid email address.', 400, 'invalid_email');
    }

    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      return errorResponse(res, 'No account exists with this email address.', 404, 'account_not_found');
    }

    if (!user.isActive) {
      return errorResponse(res, 'This account is deactivated.', 403, 'account_deactivated');
    }

    if (user.isVerified === false) {
      return errorResponse(res, 'Please verify your account before resetting your password.', 403, 'account_not_verified');
    }

    const resetToken = generateResetToken();
    user.resetPasswordTokenHash = hashToken(resetToken);
    user.resetPasswordExpiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await user.save();

    try {
      await sendPasswordResetEmail(cleanEmail, resetToken);
    } catch (error) {
      return errorResponse(
        res,
        error.code === 'EMAIL_NOT_CONFIGURED'
          ? 'Email is not configured. Set DEV_EMAIL_LOG=true to print reset codes in the backend terminal, or configure SMTP_USER and SMTP_PASS in .env.'
          : 'Failed to send reset code. Please try again later.',
        502,
        'email_send_failed'
      );
    }

    logAudit(user._id, AUDIT_ACTIONS.PASSWORD_RESET_REQUESTED, 'User', user._id.toString(), {}, req.ip);

    const isDevLog = (process.env.DEV_EMAIL_LOG || 'false') === 'true';

    return successResponse(res, 'Password reset email sent.', isDevLog ? { resetToken } : null);
  } catch (err) {
    next(err);
  }
};

exports.verifyOtp = async (req, res, next) => {
  try {
    const { email, otpCode } = req.body;

    if (!email || !otpCode) {
      return errorResponse(res, 'Email and OTP code are required.', 400, 'missing_fields');
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otpCode.trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cleanEmail)) {
      return errorResponse(res, 'This is not a valid email address.', 400, 'invalid_email');
    }

    const emailValidation = await validateEmailForDelivery(cleanEmail);
    if (!emailValidation.ok) {
      return errorResponse(res, emailValidation.message, 400, 'invalid_email');
    }

    if (!/^\d{6}$/.test(cleanOtp)) {
      return errorResponse(res, 'OTP code must be 6 digits.', 400, 'invalid_otp');
    }

    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return errorResponse(res, 'Account not found. Please sign up first.', 404, 'account_not_found');
    }

    if (user.isVerified) {
      return successResponse(res, 'Account already verified.', { user: user.toJSON() });
    }

    if (!user.otpCode || !user.otpExpiresAt) {
      return errorResponse(res, 'OTP not found. Please request a new code.', 400, 'otp_not_found');
    }

    if (new Date() > user.otpExpiresAt) {
      return errorResponse(res, 'OTP has expired. Please request a new code.', 400, 'otp_expired');
    }

    if (user.otpCode !== cleanOtp) {
      return errorResponse(res, 'Invalid OTP code.', 400, 'invalid_otp');
    }

    user.isVerified = true;
    user.otpCode = null;
    user.otpExpiresAt = null;
    await user.save();

    return successResponse(res, 'Account verified successfully.', { user: user.toJSON() });
  } catch (err) {
    next(err);
  }
};

exports.resendOtp = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return errorResponse(res, 'Email is required.', 400, 'missing_email');
    }

    const emailValidation = await validateEmailForDelivery(email);
    if (!emailValidation.ok) {
      return errorResponse(res, emailValidation.message, 400, 'invalid_email');
    }
    const cleanEmail = emailValidation.email;

    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return errorResponse(res, 'Account not found. Please sign up first.', 404, 'account_not_found');
    }

    if (user.isVerified) {
      return errorResponse(res, 'Account is already verified. Please login.', 400, 'already_verified');
    }

    const otpCode = generateOtp();
    user.otpCode = otpCode;
    user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    try {
      await sendOtpEmail(cleanEmail, otpCode);
    } catch (emailErr) {
      return errorResponse(
        res,
        emailErr.code === 'EMAIL_NOT_CONFIGURED'
          ? 'Email is not configured. Set DEV_EMAIL_LOG=true to print OTP codes in the backend terminal, or configure SMTP_USER and SMTP_PASS in .env.'
          : 'Failed to send verification code. Please try again later.',
        502,
        'email_send_failed'
      );
    }

    return successResponse(res, 'OTP resent successfully.');
  } catch (err) {
    next(err);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { email, token, newPassword } = req.body;
    const cleanNewPassword = String(newPassword || '').trim();

    if (!token || !cleanNewPassword) {
      return errorResponse(res, 'Token and new password are required.', 400);
    }

    if (!/^\d{6}$/.test(token.trim())) {
      return errorResponse(res, 'Reset code must be 6 digits.', 400, 'invalid_reset_code');
    }

    if (cleanNewPassword.length < 8) {
      return errorResponse(res, 'New password must be at least 8 characters.', 400);
    }

    const tokenHash = hashToken(token.trim());
    const query = {
      resetPasswordTokenHash: tokenHash,
      resetPasswordExpiresAt: { $gt: new Date() },
    };

    if (email) {
      query.email = String(email).trim().toLowerCase();
    }

    const user = await User.findOne(query).select('+password');

    if (!user) {
      return errorResponse(res, 'Invalid or expired reset code. Please request a new reset code and try again.', 400, 'INVALID_TOKEN');
    }

    user.password = cleanNewPassword;
    user.resetPasswordTokenHash = null;
    user.resetPasswordExpiresAt = null;
    user.refreshTokens = [];
    await user.save();

    logAudit(user._id, AUDIT_ACTIONS.PASSWORD_RESET_COMPLETED, 'User', user._id.toString(), {}, req.ip);

    return successResponse(res, 'Password has been reset successfully.');
  } catch (err) {
    next(err);
  }
};
