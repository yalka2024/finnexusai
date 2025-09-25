// apps/backend/src/tests/user.test.js
const request = require('supertest');
const app = require('../../app'); // Assuming you have an app.js entry point
const { sequelize } = require('../config/database');

beforeAll(async() => {
  await sequelize.sync({ force: true });
});

describe('User API', () => {
  it('should register a new user', async() => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User'
      });
    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('user');
  });
});

afterAll(async() => {
  await sequelize.close();
});
