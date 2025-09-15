const request = require('supertest');
const app = require('../src/index');

describe('Fraud API', () => {
  it('should get fraud alerts', async () => {
    const res = await request(app).get('/api/v1/fraud');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('alerts');
  });
});
