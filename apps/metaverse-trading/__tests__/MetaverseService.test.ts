import request from 'supertest';
import express from 'express';
import metaverseRouter from '../MetaverseService';

describe('Metaverse Service API', () => {
  const app = express();
  app.use(express.json());
  app.use('/api', metaverseRouter);

  it('should add a user to trading floor', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ name: 'TraderJoe' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('TraderJoe');
    expect(res.body.id).toBeDefined();
  });

  it('should list users', async () => {
    await request(app)
      .post('/api/users')
      .send({ name: 'TraderJane' });
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });
});
