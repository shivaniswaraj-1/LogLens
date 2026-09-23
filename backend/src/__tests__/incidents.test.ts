import request from 'supertest';
import { app, registerAndLogin } from './helpers/testApp';
import { resetDatabase } from './helpers/testDb';
import { prisma } from '../config/prisma';

beforeEach(resetDatabase);
afterAll(async () => {
  await prisma.$disconnect();
});

async function createTestIncident(token: string, overrides: Record<string, unknown> = {}) {
  const res = await request(app)
    .post('/api/incidents')
    .set('Authorization', `Bearer ${token}`)
    .send({ title: 'Test incident', description: 'Something broke', severity: 'HIGH', ...overrides });
  return res.body.incident;
}

describe('POST /api/incidents', () => {
  it('creates an incident with a CREATED event', async () => {
    const { token } = await registerAndLogin();
    const incident = await createTestIncident(token);

    expect(incident.status).toBe('OPEN');
    expect(incident.severity).toBe('HIGH');

    const events = await prisma.incidentEvent.findMany({ where: { incidentId: incident.id } });
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('CREATED');
  });

  it('rejects a missing title with 400', async () => {
    const { token } = await registerAndLogin();
    const res = await request(app)
      .post('/api/incidents')
      .set('Authorization', `Bearer ${token}`)
      .send({ description: 'no title' });
    expect(res.status).toBe(400);
  });

  it('rejects a non-existent assigneeId with 400, not a raw 500', async () => {
    // Regression test: a foreign-key violation (P2003) previously fell
    // through the error handler to a generic 500 instead of a clear 400.
    const { token } = await registerAndLogin();
    const res = await request(app)
      .post('/api/incidents')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Bad assignee', description: 'x', assigneeId: 'does-not-exist' });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/incidents', () => {
  it('filters by status', async () => {
    const { token } = await registerAndLogin();
    const incident = await createTestIncident(token);
    await request(app)
      .patch(`/api/incidents/${incident.id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'INVESTIGATING' });
    await createTestIncident(token, { title: 'Another one' });

    const res = await request(app).get('/api/incidents').set('Authorization', `Bearer ${token}`).query({ status: 'OPEN' });

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].title).toBe('Another one');
  });
});

describe('PATCH /api/incidents/:id/status', () => {
  it('transitions status and records a STATUS_CHANGED event', async () => {
    const { token } = await registerAndLogin();
    const incident = await createTestIncident(token);

    const res = await request(app)
      .patch(`/api/incidents/${incident.id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'INVESTIGATING' });

    expect(res.status).toBe(200);
    expect(res.body.incident.status).toBe('INVESTIGATING');

    const events = await prisma.incidentEvent.findMany({ where: { incidentId: incident.id } });
    expect(events.some((e) => e.type === 'STATUS_CHANGED')).toBe(true);
  });

  it('rejects transitioning to the same status with 400', async () => {
    const { token } = await registerAndLogin();
    const incident = await createTestIncident(token);

    const res = await request(app)
      .patch(`/api/incidents/${incident.id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'OPEN' });

    expect(res.status).toBe(400);
  });

  it('returns 404 for an unknown incident', async () => {
    const { token } = await registerAndLogin();
    const res = await request(app)
      .patch('/api/incidents/does-not-exist/status')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'INVESTIGATING' });
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/incidents/:id/assign', () => {
  it('assigns an incident to a user', async () => {
    const { token, user } = await registerAndLogin();
    const incident = await createTestIncident(token);

    const res = await request(app)
      .patch(`/api/incidents/${incident.id}/assign`)
      .set('Authorization', `Bearer ${token}`)
      .send({ assigneeId: user.id });

    expect(res.status).toBe(200);
    expect(res.body.incident.assigneeId).toBe(user.id);
  });
});

describe('POST /api/incidents/:id/notes', () => {
  it('appends an investigation note and records a NOTE_ADDED event', async () => {
    const { token } = await registerAndLogin();
    const incident = await createTestIncident(token);

    const res = await request(app)
      .post(`/api/incidents/${incident.id}/notes`)
      .set('Authorization', `Bearer ${token}`)
      .send({ note: 'Looked at the logs', type: 'investigation' });

    expect(res.status).toBe(200);
    expect(res.body.incident.investigationNotes).toContain('Looked at the logs');
  });
});

describe('GET /api/incidents/:id/events', () => {
  it('returns the full activity timeline in chronological order', async () => {
    const { token } = await registerAndLogin();
    const incident = await createTestIncident(token);
    await request(app)
      .patch(`/api/incidents/${incident.id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'INVESTIGATING' });
    await request(app)
      .patch(`/api/incidents/${incident.id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'RESOLVED' });

    const res = await request(app).get(`/api/incidents/${incident.id}/events`).set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.items.map((e: { type: string }) => e.type)).toEqual([
      'CREATED',
      'STATUS_CHANGED',
      'STATUS_CHANGED',
    ]);
  });
});
