/**
 * Load Testing Framework
 * Comprehensive load testing and stress testing capabilities
 */

const axios = require('axios');
const { performance } = require('perf_hooks');
const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../../utils/logger');

class LoadTestFramework extends EventEmitter {
  constructor() {
    super();
    this.config = {
      baseUrl: process.env.LOAD_TEST_BASE_URL || 'http://localhost:4000',
      concurrency: parseInt(process.env.LOAD_TEST_CONCURRENCY || '10'),
      duration: parseInt(process.env.LOAD_TEST_DURATION || '60'), // seconds
      rampUp: parseInt(process.env.LOAD_TEST_RAMP_UP || '10'), // seconds
      rampDown: parseInt(process.env.LOAD_TEST_RAMP_DOWN || '10'), // seconds
      timeout: parseInt(process.env.LOAD_TEST_TIMEOUT || '30000'), // milliseconds
      maxRetries: parseInt(process.env.LOAD_TEST_MAX_RETRIES || '3'),
      outputDir: process.env.LOAD_TEST_OUTPUT_DIR || './test-results',
      enableMetrics: process.env.ENABLE_LOAD_TEST_METRICS !== 'false'
    };

    this.results = {
      startTime: null,
      endTime: null,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      responseTimes: [],
      errors: [],
      throughput: 0,
      latency: {
        min: Infinity,
        max: 0,
        mean: 0,
        p50: 0,
        p90: 0,
        p95: 0,
        p99: 0
      }
    };

    this.activeWorkers = 0;
    this.isRunning = false;
    this.testScenarios = new Map();
  }

  /**
   * Initialize the load testing framework
   */
  async initialize() {
    try {
      logger.info('🔄 Initializing load testing framework...');

      // Create output directory
      await fs.mkdir(this.config.outputDir, { recursive: true });

      // Initialize default test scenarios
      this.initializeDefaultScenarios();

      logger.info('✅ Load testing framework initialized successfully');

      return {
        success: true,
        message: 'Load testing framework initialized successfully',
        config: this.config,
        scenarios: Array.from(this.testScenarios.keys())
      };
    } catch (error) {
      logger.error('❌ Failed to initialize load testing framework:', error);
      throw new Error(`Load testing initialization failed: ${error.message}`);
    }
  }

  /**
   * Initialize default test scenarios
   */
  initializeDefaultScenarios() {
    // Health check scenario
    this.addScenario('health-check', {
      name: 'Health Check',
      description: 'Test health check endpoint',
      requests: [
        {
          method: 'GET',
          path: '/api/v1/health',
          expectedStatus: 200
        }
      ],
      weight: 10
    });

    // Authentication scenario
    this.addScenario('auth-login', {
      name: 'Authentication Login',
      description: 'Test user login flow',
      requests: [
        {
          method: 'POST',
          path: '/api/v1/auth/login',
          body: {
            email: 'test@example.com',
            password: 'testpassword123'
          },
          expectedStatus: 200
        }
      ],
      weight: 20
    });

    // Portfolio scenario
    this.addScenario('portfolio-read', {
      name: 'Portfolio Read',
      description: 'Test portfolio reading operations',
      requests: [
        {
          method: 'GET',
          path: '/api/v1/portfolio',
          headers: {
            'Authorization': 'Bearer test-token'
          },
          expectedStatus: 200
        }
      ],
      weight: 30
    });

    // Trading scenario
    this.addScenario('trading-operations', {
      name: 'Trading Operations',
      description: 'Test trading operations',
      requests: [
        {
          method: 'GET',
          path: '/api/v1/trading/markets',
          expectedStatus: 200
        },
        {
          method: 'POST',
          path: '/api/v1/trading/orders',
          headers: {
            'Authorization': 'Bearer test-token'
          },
          body: {
            symbol: 'BTC/USD',
            side: 'buy',
            amount: 0.001,
            type: 'market'
          },
          expectedStatus: 201
        }
      ],
      weight: 25
    });

    // Compliance scenario
    this.addScenario('compliance-checks', {
      name: 'Compliance Checks',
      description: 'Test compliance operations',
      requests: [
        {
          method: 'GET',
          path: '/api/v1/compliance/status',
          headers: {
            'Authorization': 'Bearer test-token'
          },
          expectedStatus: 200
        }
      ],
      weight: 15
    });
  }

  /**
   * Add a test scenario
   */
  addScenario(id, scenario) {
    this.testScenarios.set(id, {
      id,
      ...scenario,
      requests: scenario.requests || [],
      weight: scenario.weight || 1
    });
  }

  /**
   * Remove a test scenario
   */
  removeScenario(id) {
    this.testScenarios.delete(id);
  }

  /**
   * Run load test with specified scenarios
   */
  async runLoadTest(scenarioIds = null, options = {}) {
    try {
      if (this.isRunning) {
        throw new Error('Load test is already running');
      }

      logger.info('🚀 Starting load test...');

      // Merge options with config
      const testConfig = { ...this.config, ...options };
      const scenarios = scenarioIds ?
        scenarioIds.map(id => this.testScenarios.get(id)).filter(Boolean) :
        Array.from(this.testScenarios.values());

      if (scenarios.length === 0) {
        throw new Error('No test scenarios found');
      }

      this.isRunning = true;
      this.resetResults();

      // Emit start event
      this.emit('testStart', { scenarios, config: testConfig });

      // Start the load test
      await this.executeLoadTest(scenarios, testConfig);

      // Emit completion event
      this.emit('testComplete', this.results);

      logger.info('✅ Load test completed successfully');
      return this.results;

    } catch (error) {
      this.isRunning = false;
      this.emit('testError', error);
      logger.error('❌ Load test failed:', error);
      throw error;
    }
  }

  /**
   * Execute the actual load test
   */
  async executeLoadTest(scenarios, config) {
    const startTime = Date.now();
    const endTime = startTime + (config.duration * 1000);
    const rampUpEndTime = startTime + (config.rampUp * 1000);
    const rampDownStartTime = endTime - (config.rampDown * 1000);

    this.results.startTime = new Date(startTime);

    // Create workers based on concurrency
    const workers = [];
    for (let i = 0; i < config.concurrency; i++) {
      workers.push(this.createWorker(scenarios, config, i));
    }

    // Start workers with ramp-up
    await this.startWorkersWithRampUp(workers, config, rampUpEndTime);

    // Run at full load
    await this.runAtFullLoad(workers, rampUpEndTime, rampDownStartTime);

    // Ramp down
    await this.rampDownWorkers(workers, config, rampDownStartTime, endTime);

    // Wait for all workers to complete
    await Promise.all(workers.map(worker => worker.promise));

    this.results.endTime = new Date();
    this.calculateMetrics();
  }

  /**
   * Create a worker for load testing
   */
  createWorker(scenarios, config, workerId) {
    const worker = {
      id: workerId,
      isActive: false,
      requestCount: 0,
      errorCount: 0,
      responseTimes: [],
      errors: []
    };

    worker.promise = this.runWorker(worker, scenarios, config);
    return worker;
  }

  /**
   * Run a worker
   */
  async runWorker(worker, scenarios, config) {
    while (worker.isActive) {
      try {
        // Select scenario based on weights
        const scenario = this.selectScenario(scenarios);
        if (!scenario) continue;

        // Execute scenario requests
        await this.executeScenario(worker, scenario, config);

        // Small delay between requests
        await this.delay(Math.random() * 100);

      } catch (error) {
        worker.errorCount++;
        worker.errors.push({
          timestamp: Date.now(),
          error: error.message,
          workerId: worker.id
        });
      }
    }
  }

  /**
   * Execute a scenario
   */
  async executeScenario(worker, scenario, config) {
    for (const request of scenario.requests) {
      const startTime = performance.now();

      try {
        const response = await this.makeRequest(request, config);
        const endTime = performance.now();
        const responseTime = endTime - startTime;

        worker.requestCount++;
        worker.responseTimes.push(responseTime);

        // Validate response
        if (request.expectedStatus && response.status !== request.expectedStatus) {
          throw new Error(`Expected status ${request.expectedStatus}, got ${response.status}`);
        }

        // Update global results
        this.results.totalRequests++;
        this.results.successfulRequests++;
        this.results.responseTimes.push(responseTime);

        // Emit request event
        this.emit('requestComplete', {
          workerId: worker.id,
          scenario: scenario.id,
          request,
          response: {
            status: response.status,
            responseTime
          }
        });

      } catch (error) {
        worker.errorCount++;
        this.results.failedRequests++;
        this.results.errors.push({
          timestamp: Date.now(),
          workerId: worker.id,
          scenario: scenario.id,
          request,
          error: error.message
        });

        // Emit error event
        this.emit('requestError', {
          workerId: worker.id,
          scenario: scenario.id,
          request,
          error: error.message
        });
      }
    }
  }

  /**
   * Make HTTP request
   */
  async makeRequest(request, config) {
    const axiosConfig = {
      method: request.method,
      url: `${config.baseUrl}${request.path}`,
      timeout: config.timeout,
      headers: {
        'Content-Type': 'application/json',
        ...request.headers
      },
      validateStatus: () => true // Don't throw on HTTP error status
    };

    if (request.body) {
      axiosConfig.data = request.body;
    }

    const response = await axios(axiosConfig);
    return response;
  }

  /**
   * Select scenario based on weights
   */
  selectScenario(scenarios) {
    const totalWeight = scenarios.reduce((sum, scenario) => sum + scenario.weight, 0);
    const random = Math.random() * totalWeight;

    let currentWeight = 0;
    for (const scenario of scenarios) {
      currentWeight += scenario.weight;
      if (random <= currentWeight) {
        return scenario;
      }
    }

    return scenarios[0]; // Fallback
  }

  /**
   * Start workers with ramp-up
   */
  async startWorkersWithRampUp(workers, config, rampUpEndTime) {
    const rampUpInterval = config.rampUp / config.concurrency;

    for (let i = 0; i < workers.length; i++) {
      await this.delay(rampUpInterval * 1000);
      workers[i].isActive = true;
      this.activeWorkers++;

      this.emit('workerStart', {
        workerId: workers[i].id,
        activeWorkers: this.activeWorkers
      });
    }
  }

  /**
   * Run at full load
   */
  async runAtFullLoad(workers, rampUpEndTime, rampDownStartTime) {
    const fullLoadDuration = rampDownStartTime - rampUpEndTime;
    await this.delay(fullLoadDuration);
  }

  /**
   * Ramp down workers
   */
  async rampDownWorkers(workers, config, rampDownStartTime, endTime) {
    const rampDownInterval = config.rampDown / config.concurrency;

    for (let i = workers.length - 1; i >= 0; i--) {
      await this.delay(rampDownInterval * 1000);
      workers[i].isActive = false;
      this.activeWorkers--;

      this.emit('workerStop', {
        workerId: workers[i].id,
        activeWorkers: this.activeWorkers
      });
    }
  }

  /**
   * Calculate test metrics
   */
  calculateMetrics() {
    const duration = (this.results.endTime - this.results.startTime) / 1000; // seconds
    this.results.throughput = this.results.totalRequests / duration;

    if (this.results.responseTimes.length > 0) {
      const sorted = this.results.responseTimes.sort((a, b) => a - b);
      this.results.latency.min = sorted[0];
      this.results.latency.max = sorted[sorted.length - 1];
      this.results.latency.mean = sorted.reduce((sum, time) => sum + time, 0) / sorted.length;
      this.results.latency.p50 = sorted[Math.floor(sorted.length * 0.5)];
      this.results.latency.p90 = sorted[Math.floor(sorted.length * 0.9)];
      this.results.latency.p95 = sorted[Math.floor(sorted.length * 0.95)];
      this.results.latency.p99 = sorted[Math.floor(sorted.length * 0.99)];
    }
  }

  /**
   * Reset test results
   */
  resetResults() {
    this.results = {
      startTime: null,
      endTime: null,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      responseTimes: [],
      errors: [],
      throughput: 0,
      latency: {
        min: Infinity,
        max: 0,
        mean: 0,
        p50: 0,
        p90: 0,
        p95: 0,
        p99: 0
      }
    };
  }

  /**
   * Generate test report
   */
  async generateReport() {
    try {
      const report = {
        summary: {
          testDuration: this.results.endTime - this.results.startTime,
          totalRequests: this.results.totalRequests,
          successfulRequests: this.results.successfulRequests,
          failedRequests: this.results.failedRequests,
          successRate: (this.results.successfulRequests / this.results.totalRequests) * 100,
          throughput: this.results.throughput
        },
        latency: this.results.latency,
        errors: this.results.errors,
        config: this.config,
        timestamp: new Date().toISOString()
      };

      // Save report to file
      const reportPath = path.join(this.config.outputDir, `load-test-report-${Date.now()}.json`);
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

      logger.info(`📊 Test report generated: ${reportPath}`);
      return report;

    } catch (error) {
      logger.error('❌ Failed to generate test report:', error);
      throw error;
    }
  }

  /**
   * Run stress test
   */
  async runStressTest(scenarioIds = null, options = {}) {
    const stressConfig = {
      ...options,
      concurrency: options.concurrency || 100,
      duration: options.duration || 300, // 5 minutes
      rampUp: options.rampUp || 30
    };

    logger.info('💥 Starting stress test...');
    return await this.runLoadTest(scenarioIds, stressConfig);
  }

  /**
   * Run spike test
   */
  async runSpikeTest(scenarioIds = null, options = {}) {
    logger.info('⚡ Starting spike test...');

    // Run baseline
    logger.info('📊 Running baseline test...');
    const baseline = await this.runLoadTest(scenarioIds, {
      concurrency: 10,
      duration: 60
    });

    // Run spike
    logger.info('⚡ Running spike test...');
    const spike = await this.runLoadTest(scenarioIds, {
      concurrency: 100,
      duration: 30
    });

    // Run recovery
    logger.info('🔄 Running recovery test...');
    const recovery = await this.runLoadTest(scenarioIds, {
      concurrency: 10,
      duration: 60
    });

    return {
      baseline,
      spike,
      recovery,
      analysis: this.analyzeSpikeTest(baseline, spike, recovery)
    };
  }

  /**
   * Analyze spike test results
   */
  analyzeSpikeTest(baseline, spike, recovery) {
    return {
      spikeImpact: {
        throughputChange: ((spike.throughput - baseline.throughput) / baseline.throughput) * 100,
        latencyChange: ((spike.latency.mean - baseline.latency.mean) / baseline.latency.mean) * 100,
        errorRateChange: ((spike.failedRequests / spike.totalRequests) - (baseline.failedRequests / baseline.totalRequests)) * 100
      },
      recoveryAnalysis: {
        throughputRecovery: ((recovery.throughput - baseline.throughput) / baseline.throughput) * 100,
        latencyRecovery: ((recovery.latency.mean - baseline.latency.mean) / baseline.latency.mean) * 100,
        stabilityRecovery: recovery.failedRequests / recovery.totalRequests
      }
    };
  }

  /**
   * Get framework status
   */
  getStatus() {
    return {
      success: true,
      isRunning: this.isRunning,
      activeWorkers: this.activeWorkers,
      config: this.config,
      scenarios: Array.from(this.testScenarios.keys()),
      lastResults: this.results.totalRequests > 0 ? this.results : null
    };
  }

  /**
   * Stop running test
   */
  stop() {
    if (this.isRunning) {
      this.isRunning = false;
      this.emit('testStop');
      logger.info('🛑 Load test stopped');
    }
  }

  /**
   * Utility delay function
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = LoadTestFramework;
