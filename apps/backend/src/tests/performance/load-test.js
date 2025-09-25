/**
 * FinAI Nexus - Load Testing Suite
 *
 * Comprehensive load testing for API endpoints and system performance
 */

const axios = require('axios');
const { performance } = require('perf_hooks');

class LoadTester {
  constructor(baseURL = 'http://localhost:3001') {
    this.baseURL = baseURL;
    this.results = {
      tests: [],
      summary: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        minResponseTime: Infinity,
        maxResponseTime: 0,
        requestsPerSecond: 0,
        errorRate: 0
      }
    };
  }

  /**
   * Run load test for a specific endpoint
   */
  async runLoadTest(endpoint, options = {}) {
    const {
      method = 'GET',
      data = null,
      headers = {},
      concurrent = 10,
      duration = 30, // seconds
      rampUp = 5 // seconds
    } = options;

    logger.info(`🚀 Starting load test for ${method} ${endpoint}`);
    logger.info(`📊 Concurrent users: ${concurrent}, Duration: ${duration}s, Ramp-up: ${rampUp}s`);

    const testResult = {
      endpoint,
      method,
      concurrent,
      duration,
      startTime: new Date(),
      responses: [],
      errors: [],
      metrics: {}
    };

    const workers = [];
    const rampUpDelay = (rampUp * 1000) / concurrent;

    // Create concurrent workers
    for (let i = 0; i < concurrent; i++) {
      const worker = this.createWorker(endpoint, {
        method,
        data,
        headers,
        duration,
        workerId: i
      });

      // Stagger worker start times for ramp-up
      setTimeout(() => {
        workers.push(worker);
      }, i * rampUpDelay);
    }

    // Wait for all workers to complete
    const workerResults = await Promise.all(workers);

    // Aggregate results
    workerResults.forEach(workerResult => {
      testResult.responses.push(...workerResult.responses);
      testResult.errors.push(...workerResult.errors);
    });

    // Calculate metrics
    testResult.metrics = this.calculateMetrics(testResult.responses, testResult.errors, duration);
    testResult.endTime = new Date();

    this.results.tests.push(testResult);
    this.updateSummary();

    logger.info(`✅ Load test completed for ${endpoint}`);
    this.printTestResults(testResult);

    return testResult;
  }

  /**
   * Create a worker that makes requests for the duration
   */
  async createWorker(endpoint, options) {
    const { method, data, headers, duration, workerId } = options;
    const responses = [];
    const errors = [];
    const endTime = Date.now() + (duration * 1000);

    while (Date.now() < endTime) {
      const startTime = performance.now();

      try {
        const response = await axios({
          method,
          url: `${this.baseURL}${endpoint}`,
          data,
          headers,
          timeout: 30000 // 30 second timeout
        });

        const responseTime = performance.now() - startTime;

        responses.push({
          workerId,
          statusCode: response.status,
          responseTime,
          timestamp: new Date(),
          success: true
        });

      } catch (error) {
        const responseTime = performance.now() - startTime;

        errors.push({
          workerId,
          error: error.message,
          statusCode: error.response?.status || 0,
          responseTime,
          timestamp: new Date()
        });

        responses.push({
          workerId,
          statusCode: error.response?.status || 0,
          responseTime,
          timestamp: new Date(),
          success: false
        });
      }

      // Small delay to prevent overwhelming the server
      await this.sleep(10);
    }

    return { responses, errors };
  }

  /**
   * Calculate performance metrics
   */
  calculateMetrics(responses, errors, duration) {
    if (responses.length === 0) {
      return {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        minResponseTime: 0,
        maxResponseTime: 0,
        requestsPerSecond: 0,
        errorRate: 0,
        percentiles: {}
      };
    }

    const successfulResponses = responses.filter(r => r.success);
    const responseTimes = responses.map(r => r.responseTime);

    const metrics = {
      totalRequests: responses.length,
      successfulRequests: successfulResponses.length,
      failedRequests: errors.length,
      averageResponseTime: responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length,
      minResponseTime: Math.min(...responseTimes),
      maxResponseTime: Math.max(...responseTimes),
      requestsPerSecond: responses.length / duration,
      errorRate: (errors.length / responses.length) * 100,
      percentiles: this.calculatePercentiles(responseTimes)
    };

    return metrics;
  }

  /**
   * Calculate response time percentiles
   */
  calculatePercentiles(responseTimes) {
    const sorted = responseTimes.sort((a, b) => a - b);
    const length = sorted.length;

    return {
      p50: sorted[Math.floor(length * 0.5)],
      p75: sorted[Math.floor(length * 0.75)],
      p90: sorted[Math.floor(length * 0.9)],
      p95: sorted[Math.floor(length * 0.95)],
      p99: sorted[Math.floor(length * 0.99)]
    };
  }

  /**
   * Update overall summary
   */
  updateSummary() {
    let totalRequests = 0;
    let successfulRequests = 0;
    let failedRequests = 0;
    let totalResponseTime = 0;
    let minResponseTime = Infinity;
    let maxResponseTime = 0;

    this.results.tests.forEach(test => {
      totalRequests += test.metrics.totalRequests;
      successfulRequests += test.metrics.successfulRequests;
      failedRequests += test.metrics.failedRequests;
      totalResponseTime += test.metrics.averageResponseTime * test.metrics.totalRequests;
      minResponseTime = Math.min(minResponseTime, test.metrics.minResponseTime);
      maxResponseTime = Math.max(maxResponseTime, test.metrics.maxResponseTime);
    });

    this.results.summary = {
      totalRequests,
      successfulRequests,
      failedRequests,
      averageResponseTime: totalRequests > 0 ? totalResponseTime / totalRequests : 0,
      minResponseTime: minResponseTime === Infinity ? 0 : minResponseTime,
      maxResponseTime,
      requestsPerSecond: this.results.tests.reduce((sum, test) => sum + test.metrics.requestsPerSecond, 0),
      errorRate: totalRequests > 0 ? (failedRequests / totalRequests) * 100 : 0
    };
  }

  /**
   * Print test results
   */
  printTestResults(testResult) {
    const { metrics } = testResult;

    logger.info('\n📊 Load Test Results:');
    logger.info(`   Total Requests: ${metrics.totalRequests}`);
    logger.info(`   Successful: ${metrics.successfulRequests} (${((metrics.successfulRequests / metrics.totalRequests) * 100).toFixed(2)}%)`);
    logger.info(`   Failed: ${metrics.failedRequests} (${metrics.errorRate.toFixed(2)}%)`);
    logger.info(`   Average Response Time: ${metrics.averageResponseTime.toFixed(2)}ms`);
    logger.info(`   Min Response Time: ${metrics.minResponseTime.toFixed(2)}ms`);
    logger.info(`   Max Response Time: ${metrics.maxResponseTime.toFixed(2)}ms`);
    logger.info(`   Requests/Second: ${metrics.requestsPerSecond.toFixed(2)}`);

    logger.info('\n📈 Response Time Percentiles:');
    logger.info(`   50th percentile: ${metrics.percentiles.p50.toFixed(2)}ms`);
    logger.info(`   75th percentile: ${metrics.percentiles.p75.toFixed(2)}ms`);
    logger.info(`   90th percentile: ${metrics.percentiles.p90.toFixed(2)}ms`);
    logger.info(`   95th percentile: ${metrics.percentiles.p95.toFixed(2)}ms`);
    logger.info(`   99th percentile: ${metrics.percentiles.p99.toFixed(2)}ms`);
  }

  /**
   * Run comprehensive load test suite
   */
  async runLoadTestSuite() {
    logger.info('🚀 Starting Comprehensive Load Test Suite\n');

    const tests = [
      // Health check endpoints
      {
        endpoint: '/api/v1/health',
        options: { concurrent: 50, duration: 30 }
      },

      // Authentication endpoints
      {
        endpoint: '/api/auth/login',
        options: {
          method: 'POST',
          data: { email: 'test@example.com', password: 'password123' },
          concurrent: 20,
          duration: 30
        }
      },

      // Portfolio endpoints
      {
        endpoint: '/api/v1/portfolio',
        options: {
          headers: { 'Authorization': 'Bearer mock-token' },
          concurrent: 30,
          duration: 30
        }
      },

      // Trading endpoints
      {
        endpoint: '/api/v1/trade',
        options: {
          method: 'POST',
          data: { asset: 'BTC', amount: 0.1, type: 'buy' },
          headers: { 'Authorization': 'Bearer mock-token' },
          concurrent: 15,
          duration: 30
        }
      },

      // AI services
      {
        endpoint: '/api/ai/insights',
        options: {
          headers: { 'Authorization': 'Bearer mock-token' },
          concurrent: 10,
          duration: 30
        }
      },

      // DeFi services
      {
        endpoint: '/api/defi/strategies',
        options: {
          headers: { 'Authorization': 'Bearer mock-token' },
          concurrent: 25,
          duration: 30
        }
      },

      // Monitoring endpoints
      {
        endpoint: '/api/apm/summary',
        options: { concurrent: 20, duration: 30 }
      }
    ];

    // Run tests sequentially to avoid resource conflicts
    for (const test of tests) {
      await this.runLoadTest(test.endpoint, test.options);
      await this.sleep(2000); // 2 second pause between tests
    }

    this.printOverallSummary();
    return this.results;
  }

  /**
   * Print overall summary
   */
  printOverallSummary() {
    logger.info('\n🎯 Overall Load Test Summary:');
    logger.info('=====================================');
    logger.info(`Total Requests: ${this.results.summary.totalRequests}`);
    logger.info(`Successful Requests: ${this.results.summary.successfulRequests}`);
    logger.info(`Failed Requests: ${this.results.summary.failedRequests}`);
    logger.info(`Overall Error Rate: ${this.results.summary.errorRate.toFixed(2)}%`);
    logger.info(`Average Response Time: ${this.results.summary.averageResponseTime.toFixed(2)}ms`);
    logger.info(`Peak Requests/Second: ${this.results.summary.requestsPerSecond.toFixed(2)}`);

    // Performance assessment
    logger.info('\n🏆 Performance Assessment:');
    if (this.results.summary.errorRate < 1) {
      logger.info('✅ Error Rate: Excellent (< 1%)');
    } else if (this.results.summary.errorRate < 5) {
      logger.info('⚠️  Error Rate: Acceptable (1-5%)');
    } else {
      logger.info('❌ Error Rate: Poor (> 5%)');
    }

    if (this.results.summary.averageResponseTime < 200) {
      logger.info('✅ Response Time: Excellent (< 200ms)');
    } else if (this.results.summary.averageResponseTime < 1000) {
      logger.info('⚠️  Response Time: Acceptable (200-1000ms)');
    } else {
      logger.info('❌ Response Time: Poor (> 1000ms)');
    }
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate load test report
   */
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: this.results.summary,
      tests: this.results.tests.map(test => ({
        endpoint: test.endpoint,
        method: test.method,
        duration: test.duration,
        concurrent: test.concurrent,
        metrics: test.metrics,
        startTime: test.startTime,
        endTime: test.endTime
      })),
      recommendations: this.generateRecommendations()
    };

    return report;
  }

  /**
   * Generate performance recommendations
   */
  generateRecommendations() {
    const recommendations = [];
    const { summary } = this.results;

    if (summary.errorRate > 5) {
      recommendations.push({
        type: 'error-rate',
        priority: 'high',
        message: 'High error rate detected. Review application logs and increase server capacity.'
      });
    }

    if (summary.averageResponseTime > 1000) {
      recommendations.push({
        type: 'response-time',
        priority: 'high',
        message: 'High response times detected. Consider optimizing database queries and adding caching.'
      });
    }

    if (summary.requestsPerSecond < 100) {
      recommendations.push({
        type: 'throughput',
        priority: 'medium',
        message: 'Low throughput detected. Consider horizontal scaling or performance optimization.'
      });
    }

    return recommendations;
  }
}

module.exports = LoadTester;

// CLI execution
if (require.main === module) {
  const loadTester = new LoadTester();

  loadTester.runLoadTestSuite()
    .then(results => {
      logger.info('\n📄 Generating detailed report...');
      const report = loadTester.generateReport();

      // Save report to file
      const fs = require('fs');
      const logger = require('../../utils/logger');
      const reportPath = `./load-test-report-${Date.now()}.json`;
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      logger.info(`📁 Report saved to: ${reportPath}`);

      process.exit(0);
    })
    .catch(error => {
      logger.error('❌ Load test failed:', error);
      process.exit(1);
    });
}
