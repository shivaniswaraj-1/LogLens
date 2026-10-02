import request from 'supertest';
import { createApp } from '../../app';
import { prisma } from '../../config/prisma';

export const app = createApp();

export async function registerAndLogin(
  overrides: Partial<{ email: string; password: string; name: string }> = {},
) {
  const email = overrides.email ?? `user-${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`;
  const password = overrides.password ?? 'password123';
  const name = overrides.name ?? 'Test User';

  const res = await request(app).post('/api/auth/register').send({ email, password, name });
  return { token: res.body.token as string, user: res.body.user as { id: string; email: string; name: string } };
}

// Registration always yields an ENGINEER, so promote in the DB and log in
// again to get a token whose role claim says ADMIN.
export async function registerAdmin() {
  const password = 'password123';
  const { user } = await registerAndLogin({ password, name: 'Admin User' });
  await prisma.user.update({ where: { id: user.id }, data: { role: 'ADMIN' } });
  const res = await request(app).post('/api/auth/login').send({ email: user.email, password });
  return { token: res.body.token as string, user };
}
