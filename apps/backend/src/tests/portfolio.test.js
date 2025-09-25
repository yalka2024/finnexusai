// apps/backend/src/tests/portfolio.test.js
const request = require('supertest');
const app = require('../../app');
const { sequelize } = require('../config/database');

beforeAll(async() => {
  await sequelize.sync({ force: true });
});

describe('Portfolio API', () => {
  it('should create a portfolio', async() => {
    const res = await request(app)
      .post('/api/portfolio')
      .set('Authorization', 'Bearer YOUR_TEST_TOKEN')
      .send({
        name: 'Test Portfolio',
        assets: { BTC: 1.5, ETH: 10 }
      });
    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('name', 'Test Portfolio');
  });
});

afterAll(async() => {
  await sequelize.close();
});
