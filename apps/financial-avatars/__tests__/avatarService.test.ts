import request from 'supertest';
import express from 'express';
import avatarRouter from '../avatarService';

describe('Avatar Service API', () => {
  const app = express();
  app.use(express.json());
  app.use('/api', avatarRouter);

  it('should create an avatar', async () => {
    const res = await request(app)
      .post('/api/avatars')
      .send({ personality: 'Aggressive', tokens: 200 });
    expect(res.status).toBe(201);
    expect(res.body.personality).toBe('Aggressive');
    expect(res.body.tokens).toBe(200);
    expect(res.body.id).toBeDefined();
  });

  it('should list avatars', async () => {
    await request(app)
      .post('/api/avatars')
      .send({ personality: 'Balanced', tokens: 150 });
    const res = await request(app).get('/api/avatars');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });
});
