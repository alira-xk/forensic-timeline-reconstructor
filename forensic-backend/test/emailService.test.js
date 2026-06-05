jest.mock('dns', () => ({
  promises: {
    resolve4: jest.fn(),
  },
}));

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(),
}));

const dns = require('dns').promises;
const nodemailer = require('nodemailer');

const resetEmailEnv = () => {
  delete process.env.DEV_EMAIL_LOG;
  delete process.env.SMTP_HOST;
  delete process.env.SMTP_PORT;
  delete process.env.SMTP_SECURE;
  delete process.env.SMTP_USER;
  delete process.env.SMTP_PASS;
  delete process.env.SMTP_FORCE_IPV4;
};

describe('emailService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetEmailEnv();

    process.env.SMTP_HOST = 'smtp.gmail.com';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_USER = 'sender@gmail.com';
    process.env.SMTP_PASS = 'app-password';
    dns.resolve4.mockResolvedValue(['192.0.2.10']);
    delete require.cache[require.resolve('../src/utils/emailService')];
  });

  afterEach(() => {
    resetEmailEnv();
  });

  test('retries Gmail OTP delivery on alternate SMTP targets after timeout', async () => {
    const sendMail = jest
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error('Connection timeout'), { code: 'ETIMEDOUT' }))
      .mockResolvedValueOnce({ accepted: ['recipient@example.com'] });

    nodemailer.createTransport.mockReturnValue({ sendMail });

    const { sendOtpEmail } = require('../src/utils/emailService');
    await sendOtpEmail('recipient@example.com', '123456');

    expect(nodemailer.createTransport).toHaveBeenCalledTimes(2);
    expect(nodemailer.createTransport).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ host: '192.0.2.10', port: 587, secure: false })
    );
    expect(nodemailer.createTransport).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ host: '192.0.2.10', port: 465, secure: true })
    );
    expect(sendMail).toHaveBeenCalledTimes(2);
  });
});
