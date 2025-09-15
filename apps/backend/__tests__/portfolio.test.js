const request = require('supertest');
const app = require('../src/index');

describe('Portfolio API', () => {
  it('should get portfolio data', async () => {
    const res = await request(app).get('/api/v1/portfolio');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('assets');
  });

  it('should execute a trade', async () => {
    const trade = { symbol: 'ETH', amount: 1, action: 'buy' };
    const res = await request(app)
      .post('/api/v1/trade')
      .send(trade);
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('tradeId');
  });
});
