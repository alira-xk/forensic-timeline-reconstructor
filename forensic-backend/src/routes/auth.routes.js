const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const authController = require('../controllers/auth.controller');

const router = express.Router();
const strongPasswordMessage = 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character';
const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

// Public routes
router.post(
  '/register',
  [
    body('name').notEmpty().withMessage('Name is required').trim(),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').matches(strongPasswordRegex).withMessage(strongPasswordMessage),
    body('role')
      .optional()
      .isIn(['investigator', 'analyst', 'admin', 'student'])
      .withMessage('Invalid role'),
  ],
  validate,
  authController.register
);

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  authController.login
);

router.post('/refresh-token', authController.refreshToken);
router.post(
  '/forgot-password',
  [body('email').isEmail().withMessage('Valid email is required')],
  validate,
  authController.forgotPassword
);
router.post(
  '/reset-password',
  [
    body('token').notEmpty().withMessage('Reset token is required'),
    body('token').isLength({ min: 6, max: 6 }).withMessage('Reset code must be 6 digits'),
    body('newPassword').matches(strongPasswordRegex).withMessage(strongPasswordMessage),
  ],
  validate,
  authController.resetPassword
);

router.post(
  '/verify-otp',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('otpCode').isLength({ min: 6, max: 6 }).withMessage('OTP code must be 6 digits'),
  ],
  validate,
  authController.verifyOtp
);

router.post(
  '/resend-otp',
  [body('email').isEmail().withMessage('Valid email is required')],
  validate,
  authController.resendOtp
);

// Protected routes
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.getMe);
router.put('/profile', authenticate, authController.updateProfile);
router.put(
  '/change-password',
  authenticate,
  [body('newPassword').matches(strongPasswordRegex).withMessage(strongPasswordMessage)],
  validate,
  authController.changePassword
);

module.exports = router;
