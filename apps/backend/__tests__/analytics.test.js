const request = require('supertest');
const app = require('../src/index');

describe('Advanced Analytics API', () => {
  it('should return forecasts, volatility, and risk scores', async() => {
    const res = await request(app).get('/api/v1/advanced-analytics');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('forecasts');
    expect(res.body).toHaveProperty('volatility');
    expect(res.body).toHaveProperty('riskScores');
  });
});

describe('Leaderboard API', () => {
  it('should return leaderboard data', async() => {
    const res = await request(app).get('/api/v1/leaderboard');
    expect(res.statusCode).toBe(200);
    expect(res.body.leaderboard.length).toBeGreaterThan(0);
    expect(res.body.leaderboard[0]).toHaveProperty('username');
    expect(res.body.leaderboard[0]).toHaveProperty('value');
  });
});
