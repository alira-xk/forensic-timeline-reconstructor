const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const request = require('supertest');
const Case = require('../src/models/Case');
const User = require('../src/models/User');

jest.setTimeout(60000);

let mongoServer;
let app;
let accessToken;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri();
  process.env.JWT_SECRET = 'case-test-access-secret';
  process.env.JWT_REFRESH_SECRET = 'case-test-refresh-secret';
  process.env.DEV_EMAIL_LOG = 'true';

  await mongoose.connect(process.env.MONGODB_URI);
  app = require('../server').app;

  await User.create({
    name: 'Case Tester',
    email: 'case.tester@example.com',
    password: 'Password123!',
    isVerified: true,
  });

  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'case.tester@example.com', password: 'Password123!' })
    .set('Accept', 'application/json');

  accessToken = loginRes.body.data.accessToken;
});

afterAll(async () => {
  await mongoose.disconnect();
  try {
    await mongoServer.stop();
  } catch (e) {
    // ignore
  }
});

describe('Case E2E', () => {
  test('creates a new case after an older case is deleted', async () => {
    const firstRes = await request(app)
      .post('/api/cases')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'First Case', description: 'Created before deletion' })
      .set('Accept', 'application/json');

    expect(firstRes.status).toBe(201);
    expect(firstRes.body.data.case.caseNumber).toMatch(/^FTR-\d{4}-00001$/);

    const secondRes = await request(app)
      .post('/api/cases')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Second Case', description: 'Still active' })
      .set('Accept', 'application/json');

    expect(secondRes.status).toBe(201);
    expect(secondRes.body.data.case.caseNumber).toMatch(/^FTR-\d{4}-00002$/);

    await Case.findByIdAndDelete(firstRes.body.data.case._id);

    const thirdRes = await request(app)
      .post('/api/cases')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Third Case', description: 'Created after deletion' })
      .set('Accept', 'application/json');

    expect(thirdRes.status).toBe(201);
    expect(thirdRes.body.data.case.caseNumber).toMatch(/^FTR-\d{4}-00003$/);
  });
});
