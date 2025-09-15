import request from 'supertest';
import express from 'express';
import oracleRouter from '../OracleService';

describe('Oracle Service API', () => {
  const app = express();
  app.use(express.json());
  app.use('/api', oracleRouter);

  it('should return oracle stats', async () => {
    const res = await request(app).get('/api/oracle-stats');
    expect(res.status).toBe(200);
    expect(res.body.staking).toBeDefined();
    expect(res.body.rewards).toBeDefined();
    expect(res.body.chains).toBeDefined();
  });

  it('should validate a transaction', async () => {
    const res = await request(app)
      .post('/api/validate-tx')
      .send({ tx: 'sample-tx' });
    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
    expect(res.body.details).toBeDefined();
  });
});
