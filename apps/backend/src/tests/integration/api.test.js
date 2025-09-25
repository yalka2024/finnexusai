/**
 * API Integration Tests
 *
 * Tests for API endpoints and service integration
 */

const request = require('supertest');
const app = require('../../index');

describe('API Integration Tests', () => {
  describe('Health Checks', () => {
    test('should return health status for main health endpoint', async() => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
    });

    test('should return GraphQL health status', async() => {
      const response = await request(app)
        .post('/graphql')
        .send({
          query: '{ health }'
        })
        .expect(200);

      expect(response.body.data).toHaveProperty('health');
    });
  });

  describe('Educational Services', () => {
    test('should return educational platform health', async() => {
      const response = await request(app)
        .get('/api/license-free-launch/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.health.service).toBe('license-free-launch');
      expect(response.body.health.readyToLaunch).toBe(true);
    });

    test('should return immediate launch configuration', async() => {
      const response = await request(app)
        .get('/api/license-free-launch/immediate-config')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.launch).toHaveProperty('readyToLaunch');
      expect(response.body.launch).toHaveProperty('minimumInvestment');
      expect(response.body.launch).toHaveProperty('timeToLaunch');
    });

    test('should generate educational launch plan', async() => {
      const response = await request(app)
        .post('/api/license-free-launch/plan')
        .send({ launchType: 'educational_platform' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.launchPlan).toHaveProperty('phase1');
      expect(response.body.launchPlan).toHaveProperty('phase2');
      expect(response.body.launchPlan).toHaveProperty('phase3');
    });
  });

  describe('Core Platform Services', () => {
    test('should return tokenomics health status', async() => {
      const response = await request(app)
        .get('/api/tokenomics/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.health.service).toBe('nexus-tokenomics');
      expect(response.body.health.metrics).toHaveProperty('totalSupply');
    });

    test('should return marketing analytics', async() => {
      const response = await request(app)
        .get('/api/marketing/analytics')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.analytics).toHaveProperty('campaigns');
      expect(response.body.analytics).toHaveProperty('channels');
    });

    test('should return self-healing status', async() => {
      const response = await request(app)
        .get('/api/self-healing/status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.status).toHaveProperty('healingEnabled');
      expect(response.body.status).toHaveProperty('learningEnabled');
    });
  });

  describe('Enterprise Services', () => {
    test('should return partnership analytics', async() => {
      const response = await request(app)
        .get('/api/partnerships/analytics')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.analytics).toHaveProperty('partnerships');
      expect(response.body.analytics).toHaveProperty('revenue');
    });

    test('should return white-label analytics', async() => {
      const response = await request(app)
        .get('/api/whitelabel/analytics')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.analytics).toHaveProperty('instances');
      expect(response.body.analytics).toHaveProperty('users');
    });

    test('should return institutional trading analytics', async() => {
      const response = await request(app)
        .get('/api/institutional-trading/analytics')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.analytics).toHaveProperty('clients');
      expect(response.body.analytics).toHaveProperty('aum');
    });
  });

  describe('Advanced Features', () => {
    test('should return portfolio algorithms health', async() => {
      const response = await request(app)
        .get('/api/portfolio-algorithms/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.health.service).toBe('advanced-portfolio-algorithms');
      expect(response.body.health).toHaveProperty('algorithms');
    });

    test('should return infrastructure scaling status', async() => {
      const response = await request(app)
        .get('/api/infrastructure-scaling/status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.infrastructure).toHaveProperty('scalingGroups');
      expect(response.body.infrastructure).toHaveProperty('loadBalancers');
    });

    test('should return mobile app status', async() => {
      const response = await request(app)
        .get('/api/mobile-app/status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.status).toHaveProperty('apps');
      expect(response.body.status).toHaveProperty('readiness');
    });
  });

  describe('Banking and Financial Services', () => {
    test('should return banking API health', async() => {
      const response = await request(app)
        .get('/api/banking-api/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.health.service).toBe('banking-api');
      expect(response.body.health).toHaveProperty('providers');
    });

    test('should return supported financial institutions', async() => {
      const response = await request(app)
        .get('/api/banking-api/institutions')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('institutions');
      expect(response.body).toHaveProperty('totalInstitutions');
    });
  });

  describe('Error Handling', () => {
    test('should handle 404 for non-existent endpoints', async() => {
      const response = await request(app)
        .get('/api/non-existent-endpoint')
        .expect(404);

      // Should return 404 or proper error response
    });

    test('should handle malformed JSON requests', async() => {
      const response = await request(app)
        .post('/api/auth/login')
        .send('invalid-json')
        .set('Content-Type', 'application/json')
        .expect(400);

      // Should handle malformed JSON gracefully
    });

    test('should handle missing authorization headers', async() => {
      const response = await request(app)
        .get('/api/auth/verify')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('token');
    });
  });

  describe('Rate Limiting', () => {
    test('should apply rate limiting to authentication endpoints', async() => {
      const loginData = {
        email: 'test@example.com',
        password: 'password'
      };

      // Make multiple rapid requests to test rate limiting
      const requests = Array.from({ length: 10 }, () =>
        request(app).post('/api/auth/login').send(loginData)
      );

      const responses = await Promise.all(requests);

      // At least some requests should be rate limited
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('CORS and Security Headers', () => {
    test('should include proper security headers', async() => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      // Check for security headers (added by Helmet)
      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
    });

    test('should handle CORS properly', async() => {
      const response = await request(app)
        .options('/api/auth/login')
        .set('Origin', 'http://localhost:3000')
        .expect(204);

      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });
  });
});
