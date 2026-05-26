const bcrypt = require("bcryptjs");

const User = require("../models/User");
const { sendOtpEmail } = require("../services/emailService");

const allowedEmailDomains = [
  "gmail.com",
  "yahoo.com",
  "yahoo.co.uk",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "msn.com",
  "icloud.com",
  "protonmail.com",
  "aol.com",
];

const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const isValidEmailFormat = (email) => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}$/;
  return emailRegex.test(email);
};

const isAllowedEmailDomain = (email) => {
  const domain = email.split("@")[1]?.toLowerCase();
  return allowedEmailDomains.includes(domain);
};

const isStrongPassword = (password) => {
  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

  return passwordRegex.test(password);
};

const getSafeUser = (user) => {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    isVerified: user.isVerified,
    createdAt: user.createdAt,
  };
};

const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        code: "missing_fields",
        message: "Name, email and password are required",
      });
    }

    const cleanName = name.trim();
    const cleanEmail = email.toLowerCase().trim();

    if (!cleanName) {
      return res.status(400).json({
        success: false,
        code: "missing_fields",
        message: "Name is required",
      });
    }

    if (!isValidEmailFormat(cleanEmail)) {
      return res.status(400).json({
        success: false,
        code: "invalid_email",
        message: "This is not a valid email address.",
      });
    }

    if (!isAllowedEmailDomain(cleanEmail)) {
      return res.status(400).json({
        success: false,
        code: "invalid_email_domain",
        message:
          "Only Gmail, Yahoo, Outlook, Hotmail, Live, iCloud, ProtonMail, AOL, and MSN emails are allowed.",
      });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({
        success: false,
        code: "weak_password",
        message:
          "Password must be at least 8 characters and include uppercase, lowercase, number, and special character.",
      });
    }

    const existingUser = await User.findOne({ email: cleanEmail });

    if (existingUser && existingUser.isVerified) {
      return res.status(400).json({
        success: false,
        code: "account_exists",
        message: "Account already exists. Please login.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otpCode = generateOtp();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    let user;

    if (existingUser && !existingUser.isVerified) {
      existingUser.name = cleanName;
      existingUser.password = hashedPassword;
      existingUser.otpCode = otpCode;
      existingUser.otpExpiresAt = otpExpiresAt;
      existingUser.isVerified = false;

      user = await existingUser.save();
    } else {
      user = await User.create({
        name: cleanName,
        email: cleanEmail,
        password: hashedPassword,
        role: "Investigator",
        isVerified: false,
        otpCode,
        otpExpiresAt,
      });
    }

    await sendOtpEmail(cleanEmail, otpCode);

    return res.status(201).json({
      success: true,
      code: "otp_sent",
      message: "OTP sent to your email. Please verify your account.",
      data: {
        email: user.email,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      code: "signup_failed",
      message: "Signup failed",
      error: error.message,
    });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { email, otpCode } = req.body;

    if (!email || !otpCode) {
      return res.status(400).json({
        success: false,
        code: "missing_fields",
        message: "Email and OTP code are required",
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanOtp = otpCode.trim();

    if (!isValidEmailFormat(cleanEmail)) {
      return res.status(400).json({
        success: false,
        code: "invalid_email",
        message: "This is not a valid email address.",
      });
    }

    if (!/^\d{6}$/.test(cleanOtp)) {
      return res.status(400).json({
        success: false,
        code: "invalid_otp",
        message: "OTP code must be 6 digits.",
      });
    }

    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      return res.status(404).json({
        success: false,
        code: "account_not_found",
        message: "Account not found. Please sign up first.",
      });
    }

    if (user.isVerified) {
      return res.status(200).json({
        success: true,
        code: "already_verified",
        message: "Account already verified",
        data: getSafeUser(user),
      });
    }

    if (!user.otpCode || !user.otpExpiresAt) {
      return res.status(400).json({
        success: false,
        code: "otp_not_found",
        message: "OTP not found. Please request a new code.",
      });
    }

    if (new Date() > user.otpExpiresAt) {
      return res.status(400).json({
        success: false,
        code: "otp_expired",
        message: "OTP has expired. Please request a new code.",
      });
    }

    if (user.otpCode !== cleanOtp) {
      return res.status(400).json({
        success: false,
        code: "invalid_otp",
        message: "Invalid OTP code",
      });
    }

    user.isVerified = true;
    user.otpCode = null;
    user.otpExpiresAt = null;

    await user.save();

    return res.status(200).json({
      success: true,
      code: "account_verified",
      message: "Account verified successfully",
      data: getSafeUser(user),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      code: "otp_verification_failed",
      message: "OTP verification failed",
      error: error.message,
    });
  }
};

const resendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        code: "missing_email",
        message: "Email is required",
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    if (!isValidEmailFormat(cleanEmail)) {
      return res.status(400).json({
        success: false,
        code: "invalid_email",
        message: "This is not a valid email address.",
      });
    }

    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      return res.status(404).json({
        success: false,
        code: "account_not_found",
        message: "Account not found. Please sign up first.",
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        code: "already_verified",
        message: "Account is already verified. Please login.",
      });
    }

    const otpCode = generateOtp();

    user.otpCode = otpCode;
    user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await user.save();

    await sendOtpEmail(cleanEmail, otpCode);

    return res.status(200).json({
      success: true,
      code: "otp_resent",
      message: "OTP resent successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      code: "resend_failed",
      message: "Failed to resend OTP",
      error: error.message,
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        code: "missing_fields",
        message: "Email and password are required",
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    if (!isValidEmailFormat(cleanEmail)) {
      return res.status(400).json({
        success: false,
        code: "invalid_email",
        message: "This is not a valid email address.",
      });
    }

    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      return res.status(404).json({
        success: false,
        code: "account_not_found",
        message: "Account not found. Please sign up first.",
      });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        code: "account_not_verified",
        message: "Please verify your email before login.",
        data: {
          email: user.email,
        },
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        code: "invalid_password",
        message: "Invalid password",
      });
    }

    return res.status(200).json({
      success: true,
      code: "login_success",
      message: "Login successful",
      data: getSafeUser(user),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      code: "login_failed",
      message: "Login failed",
      error: error.message,
    });
  }
};

module.exports = {
  signup,
  verifyOtp,
  resendOtp,
  login,
};