import request from 'supertest';
import { createApp } from '../../app';

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
