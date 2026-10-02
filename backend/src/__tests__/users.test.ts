import request from 'supertest';
import { app, registerAdmin, registerAndLogin } from './helpers/testApp';
import { resetDatabase } from './helpers/testDb';
import { prisma } from '../config/prisma';

beforeEach(resetDatabase);
afterAll(async () => {
  await prisma.$disconnect();
});

describe('GET /api/users', () => {
  it('hides email addresses from engineers', async () => {
    const { token } = await registerAndLogin();
    await registerAndLogin();

    const res = await request(app).get('/api/users').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.users).toHaveLength(2);
    for (const user of res.body.users) {
      expect(user).toHaveProperty('name');
      expect(user).not.toHaveProperty('email');
    }
  });

  it('shows email addresses to admins', async () => {
    const { token } = await registerAdmin();
    const { user: engineer } = await registerAndLogin();

    const res = await request(app).get('/api/users').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.users.map((u: { email: string }) => u.email)).toContain(engineer.email);
  });

  it('requires authentication', async () => {
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(401);
  });
});
