const request = require('supertest');
const app = require('../src/index');

describe('API Health', () => {
  it('should return health status', async () => {
    const res = await request(app).get('/api/v1/analytics');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('marketSentiment');
  });
});
