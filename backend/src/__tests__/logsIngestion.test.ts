import request from 'supertest';
import { app, registerAndLogin } from './helpers/testApp';
import { resetDatabase } from './helpers/testDb';
import { prisma } from '../config/prisma';

beforeEach(resetDatabase);
afterAll(async () => {
  await prisma.$disconnect();
});

describe('POST /api/logs/ingest (paste)', () => {
  it('rejects requests without authentication', async () => {
    const res = await request(app).post('/api/logs/ingest').send({ content: 'irrelevant' });
    expect(res.status).toBe(401);
  });

  it('parses valid lines and reports skipped malformed lines', async () => {
    const { token } = await registerAndLogin();
    const content = [
      '2026-09-23 10:00:00 INFO api-gateway Request received',
      '2026-09-23 10:00:01 ERROR payment-service Connection timeout for user 123',
      '2026-09-23 10:00:02 ERROR payment-service Connection timeout for user 456',
      'not a valid log line',
    ].join('\n');

    const res = await request(app).post('/api/logs/ingest').set('Authorization', `Bearer ${token}`).send({ content });

    expect(res.status).toBe(201);
    expect(res.body.totalLines).toBe(4);
    expect(res.body.parsedCount).toBe(3);
    expect(res.body.skippedCount).toBe(1);
    expect(res.body.newErrorPatterns).toBe(1);
  });

  it('groups repeated ERROR messages into a single error pattern', async () => {
    const { token } = await registerAndLogin();
    const content = [
      '2026-09-23 10:00:00 ERROR payment-service Connection timeout for user 123',
      '2026-09-23 10:00:01 ERROR payment-service Connection timeout for user 456',
      '2026-09-23 10:00:02 ERROR payment-service Connection timeout for user 789',
    ].join('\n');

    await request(app).post('/api/logs/ingest').set('Authorization', `Bearer ${token}`).send({ content });

    const patterns = await prisma.errorPattern.findMany();
    expect(patterns).toHaveLength(1);
    expect(patterns[0].occurrenceCount).toBe(3);
  });

  it('rejects empty content with 400', async () => {
    const { token } = await registerAndLogin();
    const res = await request(app).post('/api/logs/ingest').set('Authorization', `Bearer ${token}`).send({ content: '' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/logs/ingest (file upload)', () => {
  it('accepts a .log file and parses it', async () => {
    const { token } = await registerAndLogin();
    const content = '2026-09-23 10:00:00 ERROR payment-service Connection timeout for user 123';

    const res = await request(app)
      .post('/api/logs/ingest')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from(content), 'sample.log');

    expect(res.status).toBe(201);
    expect(res.body.parsedCount).toBe(1);
  });

  it('rejects a file with a disallowed extension with 400', async () => {
    const { token } = await registerAndLogin();

    const res = await request(app)
      .post('/api/logs/ingest')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('irrelevant binary content'), 'malware.exe');

    expect(res.status).toBe(400);
  });

  it('rejects an empty uploaded file with 400', async () => {
    const { token } = await registerAndLogin();

    const res = await request(app)
      .post('/api/logs/ingest')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from(''), 'empty.log');

    expect(res.status).toBe(400);
  });
});

describe('GET /api/logs', () => {
  async function seedLogs(token: string) {
    const content = [
      '2026-09-23 10:00:00 INFO api-gateway Request received',
      '2026-09-23 10:00:01 ERROR payment-service Connection timeout for user 123',
      '2026-09-23 10:00:02 WARN auth-service Token expiring soon',
    ].join('\n');
    await request(app).post('/api/logs/ingest').set('Authorization', `Bearer ${token}`).send({ content });
  }

  it('lists logs with pagination metadata', async () => {
    const { token } = await registerAndLogin();
    await seedLogs(token);

    const res = await request(app).get('/api/logs').set('Authorization', `Bearer ${token}`).query({ page: 1, pageSize: 2 });

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(2);
    expect(res.body.pagination.total).toBe(3);
    expect(res.body.pagination.totalPages).toBe(2);
  });

  it('filters by level', async () => {
    const { token } = await registerAndLogin();
    await seedLogs(token);

    const res = await request(app).get('/api/logs').set('Authorization', `Bearer ${token}`).query({ level: 'ERROR' });

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].level).toBe('ERROR');
  });

  it('filters by service', async () => {
    const { token } = await registerAndLogin();
    await seedLogs(token);

    const res = await request(app).get('/api/logs').set('Authorization', `Bearer ${token}`).query({ service: 'auth-service' });

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].service).toBe('auth-service');
  });

  it('filters by search text', async () => {
    const { token } = await registerAndLogin();
    await seedLogs(token);

    const res = await request(app).get('/api/logs').set('Authorization', `Bearer ${token}`).query({ search: 'timeout' });

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
  });
});
