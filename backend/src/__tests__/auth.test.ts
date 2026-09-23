import request from 'supertest';
import { app, registerAndLogin } from './helpers/testApp';
import { resetDatabase } from './helpers/testDb';
import { prisma } from '../config/prisma';

beforeEach(resetDatabase);
afterAll(async () => {
  await prisma.$disconnect();
});

describe('POST /api/auth/register', () => {
  it('creates a new user and returns a token', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'alice@test.com', password: 'password123', name: 'Alice' });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('alice@test.com');
    expect(res.body.user).not.toHaveProperty('passwordHash');
    expect(typeof res.body.token).toBe('string');
  });

  it('rejects a duplicate email with 409', async () => {
    await request(app).post('/api/auth/register').send({ email: 'bob@test.com', password: 'password123', name: 'Bob' });
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'bob@test.com', password: 'password123', name: 'Bob 2' });

    expect(res.status).toBe(409);
  });

  it('rejects a short password with 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'short@test.com', password: '123', name: 'Short' });

    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  it('logs in with correct credentials', async () => {
    await request(app).post('/api/auth/register').send({ email: 'carol@test.com', password: 'password123', name: 'Carol' });
    const res = await request(app).post('/api/auth/login').send({ email: 'carol@test.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe('string');
  });

  it('rejects an incorrect password with 401', async () => {
    await request(app).post('/api/auth/register').send({ email: 'dave@test.com', password: 'password123', name: 'Dave' });
    const res = await request(app).post('/api/auth/login').send({ email: 'dave@test.com', password: 'wrongpassword' });

    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  it('returns the authenticated user', async () => {
    const { token, user } = await registerAndLogin();
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(user.id);
  });

  it('rejects requests without a token with 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});
