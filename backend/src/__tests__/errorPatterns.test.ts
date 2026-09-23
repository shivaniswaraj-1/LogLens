import request from 'supertest';
import { app, registerAndLogin } from './helpers/testApp';
import { resetDatabase } from './helpers/testDb';
import { prisma } from '../config/prisma';

beforeEach(resetDatabase);
afterAll(async () => {
  await prisma.$disconnect();
});

async function seedErrorPattern(token: string) {
  const content = [
    '2026-09-23 10:00:00 ERROR payment-service Connection timeout for user 123',
    '2026-09-23 10:00:01 ERROR payment-service Connection timeout for user 456',
  ].join('\n');
  await request(app).post('/api/logs/ingest').set('Authorization', `Bearer ${token}`).send({ content });
  const pattern = await prisma.errorPattern.findFirstOrThrow();
  return pattern;
}

describe('GET /api/error-patterns', () => {
  it('lists error patterns sorted by frequency', async () => {
    const { token } = await registerAndLogin();
    await seedErrorPattern(token);

    const res = await request(app).get('/api/error-patterns').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].occurrenceCount).toBe(2);
  });
});

describe('GET /api/error-patterns/:id', () => {
  it('returns pattern detail with related incidents', async () => {
    const { token } = await registerAndLogin();
    const pattern = await seedErrorPattern(token);

    const res = await request(app).get(`/api/error-patterns/${pattern.id}`).set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.errorPattern.id).toBe(pattern.id);
    expect(res.body.errorPattern.incidents).toEqual([]);
  });

  it('returns 404 for an unknown pattern', async () => {
    const { token } = await registerAndLogin();
    const res = await request(app).get('/api/error-patterns/does-not-exist').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});

describe('GET /api/error-patterns/:id/logs', () => {
  it('returns the logs that belong to the pattern', async () => {
    const { token } = await registerAndLogin();
    const pattern = await seedErrorPattern(token);

    const res = await request(app).get(`/api/error-patterns/${pattern.id}/logs`).set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(2);
    expect(res.body.items.every((log: { errorPatternId: string }) => log.errorPatternId === pattern.id)).toBe(true);
  });
});
