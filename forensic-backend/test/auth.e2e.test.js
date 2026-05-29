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
