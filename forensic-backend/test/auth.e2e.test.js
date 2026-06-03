const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const request = require('supertest');
const User = require('../src/models/User');

jest.setTimeout(60000);

let mongoServer;
let app;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri();
  process.env.DEV_EMAIL_LOG = 'true';
  process.env.ENFORCE_EMAIL_DOMAIN_CHECKS = 'false';
  process.env.ALLOWED_EMAIL_ADDRESSES = '';
  process.env.ALLOWED_EMAIL_DOMAINS = '';
  process.env.REQUIRE_EMAIL_ADDRESS_ALLOWLIST = 'false';
  process.env.REQUIRE_PUBLIC_EMAIL_ALLOWLIST = 'false';
  process.env.REQUIRE_MAILBOX_VERIFICATION = 'false';
  process.env.EMAIL_VERIFICATION_PROVIDER = '';
  process.env.ABSTRACT_EMAIL_VALIDATION_API_KEY = '';
  process.env.RESET_PASSWORD_URL = 'http://localhost/reset';

  await mongoose.connect(process.env.MONGODB_URI);
  app = require('../server').app;
});

afterAll(async () => {
  await mongoose.disconnect();
  try {
    await mongoServer.stop();
  } catch (e) {
    // ignore
  }
  // Give server a moment to close
  await new Promise((r) => setTimeout(r, 500));
});

describe('Auth E2E', () => {
  const testUser = { name: 'Test User', email: 'test.user@gmail.com', password: 'Password123!' };

  test('strict email allowlist rejects unknown email before OTP', async () => {
    process.env.REQUIRE_EMAIL_ADDRESS_ALLOWLIST = 'true';
    process.env.ALLOWED_EMAIL_ADDRESSES = 'approved.user@gmail.com';

    const regRes = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Fake User', email: 'unknown.user@gmail.com', password: 'Password123!' })
      .set('Accept', 'application/json');

    expect(regRes.status).toBe(400);
    expect(regRes.body.success).toBe(false);
    expect(regRes.body.code).toBe('invalid_email');

    const fakeUser = await User.findOne({ email: 'unknown.user@gmail.com' });
    expect(fakeUser).toBeFalsy();

    process.env.REQUIRE_EMAIL_ADDRESS_ALLOWLIST = 'false';
    process.env.ALLOWED_EMAIL_ADDRESSES = '';
  });

  test('public Gmail address is rejected unless explicitly approved', async () => {
    process.env.REQUIRE_PUBLIC_EMAIL_ALLOWLIST = 'true';
    process.env.REQUIRE_MAILBOX_VERIFICATION = 'false';
    process.env.ALLOWED_EMAIL_ADDRESSES = '';

    const regRes = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Fake Gmail', email: 'random.fake.gmail@gmail.com', password: 'Password123!' })
      .set('Accept', 'application/json');

    expect(regRes.status).toBe(400);
    expect(regRes.body.success).toBe(false);
    expect(regRes.body.code).toBe('invalid_email');

    const fakeUser = await User.findOne({ email: 'random.fake.gmail@gmail.com' });
    expect(fakeUser).toBeFalsy();

    process.env.REQUIRE_PUBLIC_EMAIL_ALLOWLIST = 'false';
  });

  test('public Gmail address can register through mailbox verification without hardcoding', async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        valid: true,
        block: false,
        risk: 5,
        is_disposable: false,
      }),
    });

    process.env.REQUIRE_PUBLIC_EMAIL_ALLOWLIST = 'false';
    process.env.REQUIRE_MAILBOX_VERIFICATION = 'true';
    process.env.EMAIL_VERIFICATION_PROVIDER = 'checkmail';
    process.env.CHECK_MAIL_API_KEY = 'test-key';
    process.env.ALLOWED_EMAIL_ADDRESSES = '';

    const regRes = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Real Gmail', email: 'real.user.gmail@gmail.com', password: 'Password123!' })
      .set('Accept', 'application/json');

    expect(regRes.status).toBe(201);
    expect(regRes.body.success).toBe(true);
    expect(regRes.body.code).toBe('otp_sent');

    const pendingUser = await User.findOne({ email: 'real.user.gmail@gmail.com' });
    expect(pendingUser).toBeTruthy();
    expect(pendingUser.isVerified).toBe(false);

    process.env.REQUIRE_MAILBOX_VERIFICATION = 'false';
    process.env.EMAIL_VERIFICATION_PROVIDER = '';
    process.env.CHECK_MAIL_API_KEY = '';
    global.fetch = originalFetch;
  });

  test('otp verification is blocked when current email policy rejects the address', async () => {
    const blockedUser = await User.create({
      name: 'Old Fake Gmail',
      email: 'old.fake.gmail@gmail.com',
      password: 'Password123!',
      isVerified: false,
      otpCode: '123456',
      otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    process.env.REQUIRE_PUBLIC_EMAIL_ALLOWLIST = 'true';
    process.env.REQUIRE_MAILBOX_VERIFICATION = 'false';
    process.env.ALLOWED_EMAIL_ADDRESSES = '';

    const otpRes = await request(app)
      .post('/api/auth/verify-otp')
      .send({ email: 'old.fake.gmail@gmail.com', otpCode: '123456' })
      .set('Accept', 'application/json');

    expect(otpRes.status).toBe(400);
    expect(otpRes.body.success).toBe(false);
    expect(otpRes.body.code).toBe('invalid_email');

    const userAfterAttempt = await User.findById(blockedUser._id);
    expect(userAfterAttempt.isVerified).toBe(false);

    process.env.REQUIRE_PUBLIC_EMAIL_ALLOWLIST = 'false';
  });

  test('mailbox verification rejects blocked Check-Mail result before OTP', async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        valid: true,
        block: true,
        text: 'Disposable / temporary domain',
        risk: 99,
        is_disposable: true,
      }),
    });

    process.env.REQUIRE_MAILBOX_VERIFICATION = 'true';
    process.env.EMAIL_VERIFICATION_PROVIDER = 'checkmail';
    process.env.CHECK_MAIL_API_KEY = 'test-key';

    const regRes = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Blocked User', email: 'blocked.user@gmail.com', password: 'Password123!' })
      .set('Accept', 'application/json');

    expect(regRes.status).toBe(400);
    expect(regRes.body.success).toBe(false);
    expect(regRes.body.code).toBe('invalid_email');

    const blockedUser = await User.findOne({ email: 'blocked.user@gmail.com' });
    expect(blockedUser).toBeFalsy();

    process.env.REQUIRE_MAILBOX_VERIFICATION = 'false';
    process.env.EMAIL_VERIFICATION_PROVIDER = '';
    process.env.CHECK_MAIL_API_KEY = '';
    global.fetch = originalFetch;
  });

  test('forgot password rejects unknown emails without sending reset code', async () => {
    const forgotRes = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'missing.account@gmail.com' })
      .set('Accept', 'application/json');

    expect(forgotRes.status).toBe(404);
    expect(forgotRes.body.success).toBe(false);
    expect(forgotRes.body.code).toBe('account_not_found');
  });

  test('forgot password rejects unverified accounts', async () => {
    await User.create({
      name: 'Pending User',
      email: 'pending.reset@gmail.com',
      password: 'Password123!',
      isVerified: false,
      otpCode: '123456',
      otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    const forgotRes = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'pending.reset@gmail.com' })
      .set('Accept', 'application/json');

    expect(forgotRes.status).toBe(403);
    expect(forgotRes.body.success).toBe(false);
    expect(forgotRes.body.code).toBe('account_not_verified');

    const pendingUser = await User.findOne({ email: 'pending.reset@gmail.com' });
    expect(pendingUser.resetPasswordTokenHash).toBeFalsy();
  });

  test('register -> login -> forgot/reset flow', async () => {
    // Register
    const regRes = await request(app)
      .post('/api/auth/register')
      .send(testUser)
      .set('Accept', 'application/json');

    expect(regRes.status).toBe(201);
    expect(regRes.body.success).toBe(true);
    expect(regRes.body.code).toBe('otp_sent');

    const registeredEmail = regRes.body.data.email;
    const pendingUser = await User.findOne({ email: registeredEmail });
    expect(pendingUser).toBeTruthy();

    const otpRes = await request(app)
      .post('/api/auth/verify-otp')
      .send({ email: registeredEmail, otpCode: pendingUser.otpCode })
      .set('Accept', 'application/json');

    expect(otpRes.status).toBe(200);
    expect(otpRes.body.success).toBe(true);

    // Login
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: registeredEmail, password: testUser.password })
      .set('Accept', 'application/json');

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.success).toBe(true);
    expect(loginRes.body.data).toHaveProperty('accessToken');

    // Forgot password (DEV_EMAIL_LOG will prevent real email)
    const forgotRes = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: registeredEmail })
      .set('Accept', 'application/json');

    expect(forgotRes.status).toBe(200);
    expect(forgotRes.body.success).toBe(true);

    const resetCode = forgotRes.body.data.resetToken;
    const resetRes = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: resetCode, newPassword: 'Password123!!' })
      .set('Accept', 'application/json');

    expect(resetRes.status).toBe(200);
    expect(resetRes.body.success).toBe(true);
  });
});
