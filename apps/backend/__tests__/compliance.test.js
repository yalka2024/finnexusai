const request = require('supertest');
const app = require('../src/index');

describe('Compliance API', () => {
  it('should get compliance status', async() => {
    const res = await request(app).get('/api/v1/compliance');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('complianceStatus');
  });
});
