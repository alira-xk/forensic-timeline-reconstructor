const nodemailer = require('nodemailer');
const dns = require('dns').promises;

const parsePort = (value, fallback) => {
  const port = Number.parseInt(String(value || '').trim(), 10);
  return Number.isFinite(port) && port > 0 ? port : fallback;
};

const parseSecure = (value, port) => {
  if (value !== undefined && value !== null && String(value).trim() !== '') {
    return String(value).trim().toLowerCase() === 'true';
  }

  return port === 465;
};

const getEmailConfig = () => {
  const port = parsePort(process.env.SMTP_PORT || process.env.EMAIL_PORT, 465);

  return {
    provider: String(process.env.EMAIL_PROVIDER || process.env.MAIL_PROVIDER || 'smtp').trim().toLowerCase(),
    host: String(process.env.SMTP_HOST || process.env.EMAIL_HOST || 'smtp.gmail.com').trim(),
    port,
    secure: parseSecure(process.env.SMTP_SECURE || process.env.EMAIL_SECURE, port),
    user: String(process.env.SMTP_USER || process.env.EMAIL_USER || '').trim(),
    pass: String(process.env.SMTP_PASS || process.env.EMAIL_PASS || '').trim(),
    from: String(process.env.SMTP_FROM || process.env.EMAIL_FROM || '').trim(),
    fromName: String(process.env.EMAIL_FROM_NAME || process.env.SMTP_FROM_NAME || 'Forensic Timeline').trim(),
  };
};

const getSmtpTimeoutMs = () => {
  const timeout = Number(process.env.SMTP_TIMEOUT_MS || 12000);
  return Number.isFinite(timeout) && timeout > 0 ? timeout : 12000;
};

const resolveSmtpHosts = async (host) => {
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    return [host];
  }

  if ((process.env.SMTP_FORCE_IPV4 || 'true') !== 'true') {
    return [host];
  }

  const addresses = await dns.resolve4(host);
  if (!addresses.length) {
    throw new Error(`No IPv4 SMTP address found for ${host}.`);
  }

  return addresses;
};

const getTransportTargets = (config, resolvedHosts) => {
  const targets = [];

  const add = (port, secure) => {
    resolvedHosts.forEach((host) => {
      const key = `${host}:${port}:${secure}`;
      if (!targets.some((target) => target.key === key)) {
        targets.push({ key, host, port, secure });
      }
    });
  };

  add(config.port, config.secure);

  if (config.host === 'smtp.gmail.com' || config.host.endsWith('.gmail.com')) {
    add(465, true);
    add(587, false);
  }

  return targets;
};

const createTransporter = (config, target, timeout) =>
  nodemailer.createTransport({
    host: target.host,
    port: target.port,
    secure: target.secure,
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

const sendWithSmtpFailover = async (mailOptions) => {
  const config = getEmailConfig();
  const timeout = getSmtpTimeoutMs();

  if (!config.user || !config.pass) {
    const error = new Error(
      'Email SMTP credentials are missing. Set DEV_EMAIL_LOG=true for local testing, or configure SMTP_USER and SMTP_PASS in forensic-backend/.env.'
    );
    error.code = 'EMAIL_NOT_CONFIGURED';
    throw error;
  }

  const resolvedHosts = await resolveSmtpHosts(config.host);
  const targets = getTransportTargets(config, resolvedHosts);
  let lastError;

  for (const target of targets) {
    try {
      const transporter = createTransporter(config, target, timeout);
      await transporter.sendMail(mailOptions);
      return;
    } catch (err) {
      lastError = err;

      const retryableCodes = ['ECONNECTION', 'ETIMEDOUT', 'ESOCKET', 'ECONNRESET', 'ENOTFOUND', 'EHOSTUNREACH'];
      if (!retryableCodes.includes(err.code)) {
        break;
      }
    }
  }

  throw lastError || new Error('Failed to send email.');
};

const sendWithResend = async (mailOptions) => {
  const apiKey = String(process.env.RESEND_API_KEY || '').trim();
  if (!apiKey) {
    const error = new Error('Resend API key is missing. Configure RESEND_API_KEY or switch EMAIL_PROVIDER back to smtp.');
    error.code = 'EMAIL_NOT_CONFIGURED';
    throw error;
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: mailOptions.from,
      to: [mailOptions.to],
      subject: mailOptions.subject,
      html: mailOptions.html,
    }),
  });

  if (!response.ok) {
    let message = `Resend email request failed with status ${response.status}.`;
    try {
      const data = await response.json();
      message = data?.message || data?.error?.message || message;
    } catch (e) {
      // Keep the status-only message when the provider returns a non-JSON body.
    }

    const error = new Error(message);
    error.code = 'EMAIL_API_FAILED';
    throw error;
  }
};

const sendEmail = async (mailOptions) => {
  const config = getEmailConfig();

  if (config.provider === 'resend' || process.env.RESEND_API_KEY) {
    await sendWithResend(mailOptions);
    return;
  }

  await sendWithSmtpFailover(mailOptions);
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
  if ((process.env.DEV_EMAIL_LOG || 'false') === 'true') {
    console.info('DEV_EMAIL_LOG=true - password reset code for', to, ':', token);
    return;
  }

  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2>Password Reset Request</h2>
      <p>We received a request to reset your password.</p>
      <p><strong>Reset code:</strong> ${token}</p>
      <p>This code will expire in 30 minutes.</p>
      <p>If you did not request this, please ignore this email.</p>
    </div>
  `;

  await sendEmail({
    from: `${getFromName()} <${getFromAddress()}>`,
    to,
    subject: 'Reset your password',
    html,
  });
};

const sendOtpEmail = async (to, otpCode) => {
  if ((process.env.DEV_EMAIL_LOG || 'false') === 'true') {
    console.info('DEV_EMAIL_LOG=true - OTP code for', to, ':', otpCode);
    return;
  }

  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2>Email Verification</h2>
      <p>Your OTP verification code is:</p>
      <h1 style="letter-spacing: 4px;">${otpCode}</h1>
      <p>This code will expire in 10 minutes.</p>
      <p>If you did not request this, please ignore this email.</p>
    </div>
  `;

  await sendEmail({
    from: `${getFromName()} <${getFromAddress()}>`,
    to,
    subject: 'Your verification code',
    html,
  });
};

module.exports = { sendPasswordResetEmail, sendOtpEmail };
