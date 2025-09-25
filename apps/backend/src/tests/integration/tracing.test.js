/**
 * Integration test for distributed tracing service
 */

const tracingService = require('../../services/monitoring/TracingService');

describe('Distributed Tracing Service', () => {
  beforeAll(async() => {
    // Mock environment variables for testing
    process.env.SERVICE_NAME = 'finnexus-backend-test';
    process.env.SERVICE_VERSION = '1.0.0-test';
    process.env.NODE_ENV = 'test';
    process.env.ENABLE_AUTO_INSTRUMENTATION = 'false';
  });

  afterAll(async() => {
    await tracingService.shutdown();
  });

  test('should initialize tracing service', async() => {
    const result = await tracingService.initialize();
    expect(result.success).toBe(true);
    expect(result.message).toContain('initialized successfully');
  });

  test('should create custom spans', () => {
    const span = tracingService.createSpan('test-operation', {
      attributes: { 'test.operation': 'custom-span-test' }
    });

    expect(span).toBeDefined();
    if (span) {
      span.end();
    }
  });

  test('should execute function with tracing', async() => {
    const testFunction = async() => {
      return 'test result';
    };

    const result = await tracingService.executeWithTracing('test-execution', testFunction);
    expect(result).toBe('test result');
  });

  test('should create database span', () => {
    const span = tracingService.createDatabaseSpan('SELECT', 'users', 'SELECT * FROM users');

    expect(span).toBeDefined();
    if (span) {
      span.end();
    }
  });

  test('should create HTTP span', () => {
    const span = tracingService.createHttpSpan('GET', 'https://api.example.com/users', 200);

    expect(span).toBeDefined();
    if (span) {
      span.end();
    }
  });

  test('should create authentication span', () => {
    const span = tracingService.createAuthSpan('login', 'user123');

    expect(span).toBeDefined();
    if (span) {
      span.end();
    }
  });

  test('should create trading span', () => {
    const span = tracingService.createTradingSpan('buy', 'BTC/USD', 0.001);

    expect(span).toBeDefined();
    if (span) {
      span.end();
    }
  });

  test('should create portfolio span', () => {
    const span = tracingService.createPortfolioSpan('get-balance', 'user123');

    expect(span).toBeDefined();
    if (span) {
      span.end();
    }
  });

  test('should create compliance span', () => {
    const span = tracingService.createComplianceSpan('kyc-check', 'identity-verification');

    expect(span).toBeDefined();
    if (span) {
      span.end();
    }
  });

  test('should create external API span', () => {
    const span = tracingService.createExternalApiSpan('coinbase', '/api/v2/accounts', 'GET');

    expect(span).toBeDefined();
    if (span) {
      span.end();
    }
  });

  test('should create blockchain span', () => {
    const span = tracingService.createBlockchainSpan('transfer', 'ethereum', '0x123...');

    expect(span).toBeDefined();
    if (span) {
      span.end();
    }
  });

  test('should create error span', () => {
    const error = new Error('Test error');
    const span = tracingService.createErrorSpan(error, { context: 'test' });

    expect(span).toBeDefined();
  });

  test('should get tracing status', () => {
    const status = tracingService.getStatus();

    expect(status.success).toBe(true);
    expect(status.initialized).toBe(true);
    expect(status.config).toBeDefined();
    expect(status.config.serviceName).toBe('finnexus-backend-test');
  });

  test('should generate correlation ID', () => {
    const correlationId = tracingService.generateCorrelationId();

    expect(correlationId).toBeDefined();
    expect(correlationId).toMatch(/^req_\d+_[a-z0-9]+$/);
  });

  test('should extract trace context from headers', () => {
    const headers = {
      'traceparent': '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
      'tracestate': 'rojo=00f067aa0ba902b7'
    };

    const context = tracingService.extractTraceContext(headers);

    expect(context).toBeDefined();
    expect(context.traceParent).toBe(headers.traceparent);
    expect(context.traceState).toBe(headers.tracestate);
  });

  test('should inject trace context into headers', () => {
    const headers = tracingService.injectTraceContext();

    expect(headers).toBeDefined();
    expect(typeof headers).toBe('object');
  });
});
