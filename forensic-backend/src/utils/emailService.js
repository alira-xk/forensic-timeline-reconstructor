const nodemailer = require('nodemailer');
const dns = require('dns').promises;

const getEmailConfig = () => ({
  host: String(process.env.SMTP_HOST || process.env.EMAIL_HOST || 'smtp.gmail.com').trim(),
  port: parseInt(String(process.env.SMTP_PORT || process.env.EMAIL_PORT || '465').trim(), 10),
  secure: String(process.env.SMTP_SECURE || process.env.EMAIL_SECURE || 'true').trim() === 'true',
  user: String(process.env.SMTP_USER || process.env.EMAIL_USER || '').trim(),
  pass: String(process.env.SMTP_PASS || process.env.EMAIL_PASS || '').trim(),
  from: String(process.env.SMTP_FROM || process.env.EMAIL_FROM || '').trim(),
  fromName: String(process.env.EMAIL_FROM_NAME || process.env.SMTP_FROM_NAME || 'Forensic Timeline').trim(),
});

const getSmtpTimeoutMs = () => {
  const timeout = Number(process.env.SMTP_TIMEOUT_MS || 12000);
  return Number.isFinite(timeout) && timeout > 0 ? timeout : 12000;
};

const resolveSmtpHost = async (host) => {
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    return host;
  }

  if ((process.env.SMTP_FORCE_IPV4 || 'true') !== 'true') {
    return host;
  }

  const addresses = await dns.resolve4(host);
  if (!addresses.length) {
    throw new Error(`No IPv4 SMTP address found for ${host}.`);
  }

  return addresses[0];
};

const buildTransporter = async () => {
  const config = getEmailConfig();
  const timeout = getSmtpTimeoutMs();

  if (!config.user || !config.pass) {
    const error = new Error(
      'Email SMTP credentials are missing. Set DEV_EMAIL_LOG=true for local testing, or configure SMTP_USER and SMTP_PASS in forensic-backend/.env.'
    );
    error.code = 'EMAIL_NOT_CONFIGURED';
    throw error;
  }

  const resolvedHost = await resolveSmtpHost(config.host);

  return nodemailer.createTransport({
    host: resolvedHost,
    port: config.port,
    secure: config.secure,
    name: config.host,
    family: 4,
    auth: {
      user: config.user,
      pass: config.pass,
    },
    tls: {
      servername: config.host,
    },
    connectionTimeout: timeout,
    greetingTimeout: timeout,
    socketTimeout: timeout,
  });
};

const getFromAddress = () => {
  const config = getEmailConfig();
  if (config.from && config.from.includes('@')) {
    return config.from;
  }
  return config.user || 'no-reply@forensic.local';
};

const getFromName = () => {
  const config = getEmailConfig();
  return config.fromName || config.from || 'Forensic Timeline';
};

const sendPasswordResetEmail = async (to, token) => {
  // Development helper: when DEV_EMAIL_LOG is set, do not send an email —
  // instead log the token to console so local development can proceed
  // without valid SMTP credentials.
  if ((process.env.DEV_EMAIL_LOG || 'false') === 'true') {
    console.info('DEV_EMAIL_LOG=true — password reset code for', to, ':', token);
    return;
  }

  const transporter = await buildTransporter();

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

  const transporter = await buildTransporter();

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
