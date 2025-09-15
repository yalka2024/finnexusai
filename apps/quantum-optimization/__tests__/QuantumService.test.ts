import request from 'supertest';
import express from 'express';
import quantumRouter from '../QuantumService';

describe('Quantum Service API', () => {
  const app = express();
  app.use(express.json());
  app.use('/api', quantumRouter);

  it('should optimize portfolio', async () => {
    const res = await request(app)
      .post('/api/optimize-portfolio')
      .send({ assets: ['BTC', 'ETH', 'SOL'] });
    expect(res.status).toBe(200);
    expect(res.body.optimized).toBe(true);
    expect(res.body.sharpeRatio).toBeDefined();
  });

  it('should return quantum visualization', async () => {
    const res = await request(app).get('/api/quantum-visualization');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.states)).toBe(true);
  });
});
