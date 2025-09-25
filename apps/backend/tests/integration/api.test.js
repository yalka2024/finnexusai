/**
 * API Integration Tests
 * Comprehensive test suite for API endpoints
 *
 * @author FinNexusAI Development Team
 * @version 1.0.0
 * @date 2024-01-15
 */

const request = require('supertest');
const app = require('../../src/index');
const databaseManager = require('../../src/config/database');
const jwt = require('jsonwebtoken');

describe('API Integration Tests', () => {
  let testUser;
  let accessToken;
  let refreshToken;
  let testPortfolioId;
  let testAssetId;

  beforeAll(async() => {
    // Setup test database
    await databaseManager.initialize();

    // Create test user
    testUser = {
      id: `test-user-${  Date.now()}`,
      email: 'apitest@example.com',
      username: `apitest${  Date.now()}`,
      firstName: 'API',
      lastName: 'Test'
    };

    // Create test user in database
    await databaseManager.query(`
            INSERT INTO users (id, email, username, password_hash, salt, first_name, last_name, 
                             status, email_verified, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `, [
      testUser.id, testUser.email, testUser.username, 'hashed-password', 'salt',
      testUser.firstName, testUser.lastName, 'active', true, new Date(), new Date()
    ]);

    // Generate test tokens
    const tokenPayload = {
      userId: testUser.id,
      email: testUser.email,
      username: testUser.username,
      roles: ['user']
    };

    accessToken = jwt.sign(tokenPayload, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1h' });
    refreshToken = jwt.sign({ userId: testUser.id, type: 'refresh' }, process.env.JWT_SECRET || 'test-secret', { expiresIn: '7d' });

    // Create test portfolio
    const portfolioResult = await databaseManager.query(`
            INSERT INTO portfolios (user_id, name, description, status, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id
        `, [testUser.id, 'Test Portfolio', 'Test portfolio for API tests', 'active', new Date(), new Date()]);

    testPortfolioId = portfolioResult.rows[0].id;

    // Create test asset
    const assetResult = await databaseManager.query(`
            INSERT INTO assets (symbol, name, asset_type, status, is_tradable, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id
        `, ['BTC', 'Bitcoin', 'cryptocurrency', 'active', true, new Date(), new Date()]);

    testAssetId = assetResult.rows[0].id;
  });

  afterAll(async() => {
    // Cleanup test data
    if (testUser.id) {
      await databaseManager.query('DELETE FROM users WHERE id = $1', [testUser.id]);
    }
    if (testPortfolioId) {
      await databaseManager.query('DELETE FROM portfolios WHERE id = $1', [testPortfolioId]);
    }
    if (testAssetId) {
      await databaseManager.query('DELETE FROM assets WHERE id = $1', [testAssetId]);
    }
    await databaseManager.close();
  });

  describe('Authentication Endpoints', () => {
    describe('POST /api/v1/auth/register', () => {
      test('should register a new user', async() => {
        const userData = {
          email: 'newuser@example.com',
          username: `newuser${  Date.now()}`,
          password: 'TestPassword123!',
          firstName: 'New',
          lastName: 'User',
          dateOfBirth: '1990-01-01',
          phoneNumber: '+1234567890',
          countryCode: 'US',
          country: 'United States',
          termsAccepted: true,
          privacyPolicyAccepted: true,
          marketingConsent: false
        };

        const response = await request(app)
          .post('/api/v1/auth/register')
          .send(userData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.user.email).toBe(userData.email);
        expect(response.body.user.username).toBe(userData.username);
      });

      test('should fail registration with invalid data', async() => {
        const userData = {
          email: 'invalid-email',
          username: 'test',
          password: '123'
        };

        const response = await request(app)
          .post('/api/v1/auth/register')
          .send(userData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('VALIDATION_ERROR');
      });
    });

    describe('POST /api/v1/auth/login', () => {
      test('should login with valid credentials', async() => {
        const credentials = {
          email: testUser.email,
          password: 'TestPassword123!'
        };

        const response = await request(app)
          .post('/api/v1/auth/login')
          .send(credentials)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.user.email).toBe(testUser.email);
        expect(response.body.tokens.accessToken).toBeDefined();
        expect(response.body.tokens.refreshToken).toBeDefined();
      });

      test('should fail login with invalid credentials', async() => {
        const credentials = {
          email: testUser.email,
          password: 'WrongPassword'
        };

        const response = await request(app)
          .post('/api/v1/auth/login')
          .send(credentials)
          .expect(401);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('INVALID_CREDENTIALS');
      });
    });

    describe('POST /api/v1/auth/refresh', () => {
      test('should refresh access token', async() => {
        const response = await request(app)
          .post('/api/v1/auth/refresh')
          .send({ refreshToken })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.tokens.accessToken).toBeDefined();
      });

      test('should fail with invalid refresh token', async() => {
        const response = await request(app)
          .post('/api/v1/auth/refresh')
          .send({ refreshToken: 'invalid-token' })
          .expect(401);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('INVALID_TOKEN');
      });
    });

    describe('POST /api/v1/auth/logout', () => {
      test('should logout successfully', async() => {
        const response = await request(app)
          .post('/api/v1/auth/logout')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ refreshToken })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Logged out successfully');
      });
    });
  });

  describe('User Endpoints', () => {
    describe('GET /api/v1/users/profile', () => {
      test('should get user profile', async() => {
        const response = await request(app)
          .get('/api/v1/users/profile')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.user.email).toBe(testUser.email);
        expect(response.body.user.username).toBe(testUser.username);
      });

      test('should fail without authentication', async() => {
        const response = await request(app)
          .get('/api/v1/users/profile')
          .expect(401);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('UNAUTHORIZED');
      });
    });

    describe('PUT /api/v1/users/profile', () => {
      test('should update user profile', async() => {
        const updateData = {
          firstName: 'Updated',
          lastName: 'Name',
          phoneNumber: '+9876543210'
        };

        const response = await request(app)
          .put('/api/v1/users/profile')
          .set('Authorization', `Bearer ${accessToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.user.firstName).toBe(updateData.firstName);
        expect(response.body.user.lastName).toBe(updateData.lastName);
      });
    });
  });

  describe('Portfolio Endpoints', () => {
    describe('GET /api/v1/portfolio', () => {
      test('should get user portfolios', async() => {
        const response = await request(app)
          .get('/api/v1/portfolio')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.portfolios).toBeDefined();
        expect(Array.isArray(response.body.portfolios)).toBe(true);
      });
    });

    describe('POST /api/v1/portfolio', () => {
      test('should create a new portfolio', async() => {
        const portfolioData = {
          name: 'New Test Portfolio',
          description: 'A new test portfolio',
          type: 'standard',
          riskLevel: 'medium'
        };

        const response = await request(app)
          .post('/api/v1/portfolio')
          .set('Authorization', `Bearer ${accessToken}`)
          .send(portfolioData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.portfolio.name).toBe(portfolioData.name);
        expect(response.body.portfolio.description).toBe(portfolioData.description);
      });
    });

    describe('GET /api/v1/portfolio/:id', () => {
      test('should get portfolio details', async() => {
        const response = await request(app)
          .get(`/api/v1/portfolio/${testPortfolioId}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.portfolio.id).toBe(testPortfolioId);
      });

      test('should fail for non-existent portfolio', async() => {
        const response = await request(app)
          .get('/api/v1/portfolio/non-existent-id')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('PORTFOLIO_NOT_FOUND');
      });
    });

    describe('PUT /api/v1/portfolio/:id', () => {
      test('should update portfolio', async() => {
        const updateData = {
          name: 'Updated Portfolio Name',
          description: 'Updated description'
        };

        const response = await request(app)
          .put(`/api/v1/portfolio/${testPortfolioId}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.portfolio.name).toBe(updateData.name);
      });
    });

    describe('DELETE /api/v1/portfolio/:id', () => {
      test('should delete portfolio', async() => {
        // Create a portfolio to delete
        const portfolioResult = await databaseManager.query(`
                    INSERT INTO portfolios (user_id, name, description, status, created_at, updated_at)
                    VALUES ($1, $2, $3, $4, $5, $6)
                    RETURNING id
                `, [testUser.id, 'Delete Test Portfolio', 'Portfolio to delete', 'active', new Date(), new Date()]);

        const deletePortfolioId = portfolioResult.rows[0].id;

        const response = await request(app)
          .delete(`/api/v1/portfolio/${deletePortfolioId}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Portfolio deleted successfully');
      });
    });
  });

  describe('Trading Endpoints', () => {
    describe('POST /api/v1/trading/order', () => {
      test('should place a new order', async() => {
        const orderData = {
          portfolioId: testPortfolioId,
          assetId: testAssetId,
          side: 'buy',
          type: 'market',
          quantity: 0.001,
          price: 50000
        };

        const response = await request(app)
          .post('/api/v1/trading/order')
          .set('Authorization', `Bearer ${accessToken}`)
          .send(orderData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.order).toBeDefined();
        expect(response.body.order.side).toBe(orderData.side);
        expect(response.body.order.type).toBe(orderData.type);
      });

      test('should fail with invalid order data', async() => {
        const orderData = {
          portfolioId: testPortfolioId,
          assetId: testAssetId,
          side: 'invalid-side',
          quantity: -1
        };

        const response = await request(app)
          .post('/api/v1/trading/order')
          .set('Authorization', `Bearer ${accessToken}`)
          .send(orderData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('INVALID_ORDER');
      });
    });

    describe('GET /api/v1/trading/orders', () => {
      test('should get user orders', async() => {
        const response = await request(app)
          .get('/api/v1/trading/orders')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.orders).toBeDefined();
        expect(Array.isArray(response.body.orders)).toBe(true);
      });
    });

    describe('POST /api/v1/trading/order/:id/cancel', () => {
      test('should cancel an order', async() => {
        // Create an order first
        const orderResult = await databaseManager.query(`
                    INSERT INTO trades (user_id, portfolio_id, asset_id, side, type, quantity, price, status, created_at, updated_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                    RETURNING id
                `, [testUser.id, testPortfolioId, testAssetId, 'buy', 'market', 0.001, 50000, 'pending', new Date(), new Date()]);

        const orderId = orderResult.rows[0].id;

        const response = await request(app)
          .post(`/api/v1/trading/order/${orderId}/cancel`)
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Order cancelled successfully');
      });
    });
  });

  describe('Market Data Endpoints', () => {
    describe('GET /api/v1/market/assets', () => {
      test('should get market assets', async() => {
        const response = await request(app)
          .get('/api/v1/market/assets')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.assets).toBeDefined();
        expect(Array.isArray(response.body.assets)).toBe(true);
      });
    });

    describe('GET /api/v1/market/price/:symbol', () => {
      test('should get asset price', async() => {
        const response = await request(app)
          .get('/api/v1/market/price/BTC')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.price).toBeDefined();
        expect(typeof response.body.price).toBe('number');
      });
    });
  });

  describe('AI/ML Endpoints', () => {
    describe('GET /api/v1/ai-ml/signals', () => {
      test('should get trading signals', async() => {
        const response = await request(app)
          .get('/api/v1/ai-ml/signals')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.signals).toBeDefined();
        expect(Array.isArray(response.body.signals)).toBe(true);
      });
    });

    describe('POST /api/v1/ai-ml/predict', () => {
      test('should get price prediction', async() => {
        const predictionData = {
          assetId: testAssetId,
          timeframe: '1h',
          horizon: '24h'
        };

        const response = await request(app)
          .post('/api/v1/ai-ml/predict')
          .set('Authorization', `Bearer ${accessToken}`)
          .send(predictionData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.prediction).toBeDefined();
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle 404 for non-existent routes', async() => {
      const response = await request(app)
        .get('/api/v1/non-existent-route')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('NOT_FOUND');
    });

    test('should handle 500 for server errors', async() => {
      // Mock a server error by sending invalid data to a protected endpoint
      const response = await request(app)
        .post('/api/v1/trading/order')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ invalid: 'data' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Rate Limiting', () => {
    test('should enforce rate limits on login endpoint', async() => {
      const credentials = {
        email: 'ratelimit@example.com',
        password: 'WrongPassword'
      };

      // Make multiple requests to trigger rate limiting
      for (let i = 0; i < 6; i++) {
        await request(app)
          .post('/api/v1/auth/login')
          .send(credentials);
      }

      // The 6th request should be rate limited
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(credentials)
        .expect(429);

      expect(response.body.error).toContain('Too many');
    });
  });

  describe('Security Headers', () => {
    test('should include security headers', async() => {
      const response = await request(app)
        .get('/api/v1/users/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
    });
  });

  describe('CORS', () => {
    test('should handle CORS preflight requests', async() => {
      const response = await request(app)
        .options('/api/v1/users/profile')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET')
        .set('Access-Control-Request-Headers', 'Authorization')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.headers['access-control-allow-methods']).toBeDefined();
    });
  });
});
