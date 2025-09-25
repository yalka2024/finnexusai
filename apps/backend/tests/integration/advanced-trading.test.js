/**
 * Advanced Trading Strategies Integration Tests
 */

const request = require('supertest');
const app = require('../../src/index');
const { testUtils } = require('../setup');

describe('Advanced Trading Strategies API', () => {
  let authToken;
  let testUser;

  beforeAll(async() => {
    // Setup test user and authentication
    testUser = testUtils.generateTestUser();
    authToken = testUtils.mockJwtToken({ sub: testUser.id, role: testUser.role });
  });

  describe('GET /api/v1/advanced-trading/strategies', () => {
    it('should return available trading strategies', async() => {
      const response = await request(app)
        .get('/api/v1/advanced-trading/strategies')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.strategies).toBeInstanceOf(Array);
      expect(response.body.strategies.length).toBeGreaterThan(0);

      // Check strategy structure
      const strategy = response.body.strategies[0];
      expect(strategy).toHaveProperty('name');
      expect(strategy).toHaveProperty('description');
      expect(strategy).toHaveProperty('algorithm');
      expect(strategy).toHaveProperty('riskLevel');
      expect(strategy).toHaveProperty('expectedReturn');
      expect(strategy).toHaveProperty('maxDrawdown');
      expect(strategy).toHaveProperty('indicators');
      expect(strategy).toHaveProperty('markets');
    });

    it('should require authentication', async() => {
      await request(app)
        .get('/api/v1/advanced-trading/strategies')
        .expect(401);
    });
  });

  describe('POST /api/v1/advanced-trading/execute', () => {
    it('should execute a momentum trading strategy', async() => {
      const executionRequest = {
        strategyType: 'momentum_strategy',
        market: 'crypto',
        symbol: 'BTC/USDT',
        parameters: {
          lookbackPeriod: 20,
          momentumThreshold: 0.02,
          stopLoss: 0.03,
          takeProfit: 0.06
        }
      };

      const response = await request(app)
        .post('/api/v1/advanced-trading/execute')
        .set('Authorization', `Bearer ${authToken}`)
        .send(executionRequest)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.executionId).toBeDefined();
      expect(response.body.execution).toBeDefined();
      expect(response.body.result).toBeDefined();

      // Check execution structure
      const execution = response.body.execution;
      expect(execution.strategyType).toBe('momentum_strategy');
      expect(execution.market).toBe('crypto');
      expect(execution.symbol).toBe('BTC/USDT');
      expect(execution.status).toBe('active');
    });

    it('should execute a mean reversion strategy', async() => {
      const executionRequest = {
        strategyType: 'mean_reversion',
        market: 'crypto',
        symbol: 'ETH/USDT',
        parameters: {
          lookbackPeriod: 50,
          deviationThreshold: 2.0,
          stopLoss: 0.02,
          takeProfit: 0.04
        }
      };

      const response = await request(app)
        .post('/api/v1/advanced-trading/execute')
        .set('Authorization', `Bearer ${authToken}`)
        .send(executionRequest)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.executionId).toBeDefined();
      expect(response.body.execution.strategyType).toBe('mean_reversion');
    });

    it('should execute an arbitrage strategy', async() => {
      const executionRequest = {
        strategyType: 'arbitrage_strategy',
        market: 'crypto',
        symbol: 'BTC/USDT',
        parameters: {
          minProfitMargin: 0.001,
          maxExecutionTime: 5000,
          slippageTolerance: 0.0005
        }
      };

      const response = await request(app)
        .post('/api/v1/advanced-trading/execute')
        .set('Authorization', `Bearer ${authToken}`)
        .send(executionRequest)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.executionId).toBeDefined();
      expect(response.body.execution.strategyType).toBe('arbitrage_strategy');
    });

    it('should validate execution request', async() => {
      const invalidRequest = {
        // Missing required fields
        market: 'crypto'
      };

      const response = await request(app)
        .post('/api/v1/advanced-trading/execute')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should reject invalid strategy type', async() => {
      const invalidRequest = {
        strategyType: 'invalid_strategy',
        market: 'crypto',
        symbol: 'BTC/USDT'
      };

      const response = await request(app)
        .post('/api/v1/advanced-trading/execute')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/advanced-trading/executions/:executionId', () => {
    let executionId;

    beforeAll(async() => {
      // Create a test execution
      const executionRequest = {
        strategyType: 'momentum_strategy',
        market: 'crypto',
        symbol: 'BTC/USDT'
      };

      const response = await request(app)
        .post('/api/v1/advanced-trading/execute')
        .set('Authorization', `Bearer ${authToken}`)
        .send(executionRequest);

      executionId = response.body.executionId;
    });

    it('should return execution details', async() => {
      const response = await request(app)
        .get(`/api/v1/advanced-trading/executions/${executionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.execution).toBeDefined();
      expect(response.body.execution.id).toBe(executionId);
      expect(response.body.execution.strategyType).toBe('momentum_strategy');
    });

    it('should return 404 for non-existent execution', async() => {
      const nonExistentId = 'non-existent-id';

      await request(app)
        .get(`/api/v1/advanced-trading/executions/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('GET /api/v1/advanced-trading/statistics', () => {
    it('should return trading statistics', async() => {
      const response = await request(app)
        .get('/api/v1/advanced-trading/statistics')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.statistics).toBeDefined();
      expect(response.body.statistics).toHaveProperty('totalExecutions');
      expect(response.body.statistics).toHaveProperty('activeExecutions');
      expect(response.body.statistics).toHaveProperty('byStrategy');
      expect(response.body.statistics).toHaveProperty('byMarket');
    });
  });

  describe('POST /api/v1/advanced-trading/risk-metrics', () => {
    it('should calculate risk metrics for portfolio', async() => {
      const riskRequest = {
        portfolio: {
          totalValue: 100000,
          volatility: 0.02,
          returns: 0.12,
          maxDrawdown: 0.08,
          beta: 1.0
        },
        marketData: {
          marketCap: 1000000000,
          volume: 10000000,
          volatility: 0.025
        }
      };

      const response = await request(app)
        .post('/api/v1/advanced-trading/risk-metrics')
        .set('Authorization', `Bearer ${authToken}`)
        .send(riskRequest)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.riskMetrics).toBeDefined();
    });

    it('should validate risk metrics request', async() => {
      const invalidRequest = {
        // Missing portfolio
        marketData: {}
      };

      const response = await request(app)
        .post('/api/v1/advanced-trading/risk-metrics')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/advanced-trading/status', () => {
    it('should return system status', async() => {
      const response = await request(app)
        .get('/api/v1/advanced-trading/status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.status).toBeDefined();
      expect(response.body.status).toHaveProperty('isInitialized');
      expect(response.body.status).toHaveProperty('totalStrategies');
      expect(response.body.status).toHaveProperty('activeExecutions');
      expect(response.body.status).toHaveProperty('riskModels');
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits on trading operations', async() => {
      const executionRequest = {
        strategyType: 'momentum_strategy',
        market: 'crypto',
        symbol: 'BTC/USDT'
      };

      // Make multiple requests quickly to trigger rate limiting
      const promises = Array(15).fill().map(() =>
        request(app)
          .post('/api/v1/advanced-trading/execute')
          .set('Authorization', `Bearer ${authToken}`)
          .send(executionRequest)
      );

      const responses = await Promise.all(promises);

      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle internal server errors gracefully', async() => {
      // Mock a service failure
      const originalService = require('../../src/services/trading/AdvancedTradingStrategies');
      jest.spyOn(originalService, 'executeStrategy').mockRejectedValue(new Error('Service failure'));

      const executionRequest = {
        strategyType: 'momentum_strategy',
        market: 'crypto',
        symbol: 'BTC/USDT'
      };

      const response = await request(app)
        .post('/api/v1/advanced-trading/execute')
        .set('Authorization', `Bearer ${authToken}`)
        .send(executionRequest)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();

      // Restore original service
      originalService.executeStrategy.mockRestore();
    });
  });

  describe('Performance Tests', () => {
    it('should execute strategies within acceptable time limits', async() => {
      const executionRequest = {
        strategyType: 'momentum_strategy',
        market: 'crypto',
        symbol: 'BTC/USDT'
      };

      const startTime = Date.now();

      const response = await request(app)
        .post('/api/v1/advanced-trading/execute')
        .set('Authorization', `Bearer ${authToken}`)
        .send(executionRequest)
        .expect(200);

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      expect(executionTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(response.body.success).toBe(true);
    });
  });

  describe('Security Tests', () => {
    it('should prevent unauthorized access', async() => {
      await request(app)
        .get('/api/v1/advanced-trading/strategies')
        .expect(401);
    });

    it('should validate JWT tokens', async() => {
      const invalidToken = 'invalid.jwt.token';

      await request(app)
        .get('/api/v1/advanced-trading/strategies')
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(401);
    });

    it('should sanitize input data', async() => {
      const maliciousRequest = {
        strategyType: '<script>alert("xss")</script>',
        market: 'crypto',
        symbol: 'BTC/USDT'
      };

      const response = await request(app)
        .post('/api/v1/advanced-trading/execute')
        .set('Authorization', `Bearer ${authToken}`)
        .send(maliciousRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});
