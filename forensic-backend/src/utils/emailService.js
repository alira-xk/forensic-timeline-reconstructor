const nodemailer = require('nodemailer');

const buildTransporter = () => {
  const host = process.env.EMAIL_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.EMAIL_PORT || '465');
  const secure = (process.env.EMAIL_SECURE || 'true') === 'true';

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

const getFromAddress = () => {
  if (process.env.EMAIL_FROM && process.env.EMAIL_FROM.includes('@')) {
    return process.env.EMAIL_FROM;
  }
  return process.env.EMAIL_USER || 'no-reply@forensic.local';
};

const getFromName = () => {
  return process.env.EMAIL_FROM_NAME || process.env.EMAIL_FROM || 'Forensic Timeline';
};

const sendPasswordResetEmail = async (to, token) => {
  // Development helper: when DEV_EMAIL_LOG is set, do not send an email —
  // instead log the token to console so local development can proceed
  // without valid SMTP credentials.
  if ((process.env.DEV_EMAIL_LOG || 'false') === 'true') {
    console.info('DEV_EMAIL_LOG=true — password reset code for', to, ':', token);
    return;
  }

  const transporter = buildTransporter();

  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2>Password Reset Request</h2>
      <p>We received a request to reset your password.</p>
      <p><strong>Reset code:</strong> ${token}</p>
      <p>This code will expire in 30 minutes.</p>
      <p>If you did not request this, please ignore this email.</p>
    </div>
  `;

  await transporter.sendMail({
    from: `${getFromName()} <${getFromAddress()}>`,
    to,
    subject: 'Reset your password',
    html,
  });
};

const sendOtpEmail = async (to, otpCode) => {
  if ((process.env.DEV_EMAIL_LOG || 'false') === 'true') {
    console.info('DEV_EMAIL_LOG=true — OTP code for', to, ':', otpCode);
    return;
  }

  const transporter = buildTransporter();

  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2>Email Verification</h2>
      <p>Your OTP verification code is:</p>
      <h1 style="letter-spacing: 4px;">${otpCode}</h1>
      <p>This code will expire in 10 minutes.</p>
      <p>If you did not request this, please ignore this email.</p>
    </div>
  `;

  await transporter.sendMail({
    from: `${getFromName()} <${getFromAddress()}>`,
    to,
    subject: 'Your verification code',
    html,
  });
};

module.exports = { sendPasswordResetEmail, sendOtpEmail };
