// apps/backend/src/tests/trade.test.js
const request = require('supertest');
const app = require('../../app');
const { sequelize } = require('../config/database');

beforeAll(async() => {
  await sequelize.sync({ force: true });
});

describe('Trade API', () => {
  it('should execute a trade', async() => {
    const res = await request(app)
      .post('/api/trade')
      .set('Authorization', 'Bearer YOUR_TEST_TOKEN')
      .send({
        portfolioId: 'uuid-here',
        asset: 'BTC',
        amount: 0.1,
        tradeType: 'buy'
      });
    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('status', 'completed');
  });
});

afterAll(async() => {
  await sequelize.close();
});
