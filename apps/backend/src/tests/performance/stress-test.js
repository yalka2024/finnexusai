/**
 * FinAI Nexus - Stress Testing Suite
 *
 * Stress testing to find system breaking points and resource limits
 */

const axios = require('axios');
const { performance } = require('perf_hooks');
const os = require('os');

class StressTester {
  constructor(baseURL = 'http://localhost:3001') {
    this.baseURL = baseURL;
    this.results = {
      phases: [],
      breakingPoint: null,
      systemMetrics: [],
      recommendations: []
    };
  }

  /**
   * Run stress test with increasing load
   */
  async runStressTest(endpoint, options = {}) {
    const {
      method = 'GET',
      data = null,
      headers = {},
      startUsers = 1,
      maxUsers = 1000,
      stepSize = 10,
      stepDuration = 30, // seconds per step
      breakThreshold = 10 // % error rate to consider breaking point
    } = options;

    logger.info(`🔥 Starting stress test for ${method} ${endpoint}`);
    logger.info(`📈 Load pattern: ${startUsers} → ${maxUsers} users (step: ${stepSize}, duration: ${stepDuration}s)`);

    let currentUsers = startUsers;
    let breakingPointFound = false;

    while (currentUsers <= maxUsers && !breakingPointFound) {
      logger.info(`\n🚀 Testing with ${currentUsers} concurrent users...`);

      const phaseStartTime = new Date();
      const systemMetricsBefore = this.getSystemMetrics();

      // Run load test for this phase
      const phaseResult = await this.runPhase(endpoint, {
        method,
        data,
        headers,
        concurrent: currentUsers,
        duration: stepDuration
      });

      const systemMetricsAfter = this.getSystemMetrics();

      phaseResult.systemMetrics = {
        before: systemMetricsBefore,
        after: systemMetricsAfter,
        delta: this.calculateMetricsDelta(systemMetricsBefore, systemMetricsAfter)
      };

      this.results.phases.push(phaseResult);
      this.results.systemMetrics.push({
        users: currentUsers,
        timestamp: phaseStartTime,
        metrics: systemMetricsAfter
      });

      // Check if breaking point reached
      if (phaseResult.metrics.errorRate >= breakThreshold) {
        this.results.breakingPoint = {
          users: currentUsers,
          errorRate: phaseResult.metrics.errorRate,
          responseTime: phaseResult.metrics.averageResponseTime,
          timestamp: phaseStartTime
        };
        breakingPointFound = true;
        logger.info(`💥 Breaking point found at ${currentUsers} users (${phaseResult.metrics.errorRate.toFixed(2)}% error rate)`);
      }

      // Check system resource limits
      const cpuUsage = systemMetricsAfter.cpu.usage;
      const memoryUsage = systemMetricsAfter.memory.usagePercent;

      if (cpuUsage > 90 || memoryUsage > 90) {
        logger.info(`⚠️  System resource limit reached (CPU: ${cpuUsage.toFixed(1)}%, Memory: ${memoryUsage.toFixed(1)}%)`);
        if (!breakingPointFound) {
          this.results.breakingPoint = {
            users: currentUsers,
            errorRate: phaseResult.metrics.errorRate,
            responseTime: phaseResult.metrics.averageResponseTime,
            timestamp: phaseStartTime,
            reason: 'system-resources'
          };
          breakingPointFound = true;
        }
      }

      currentUsers += stepSize;

      // Cool down period between phases
      if (!breakingPointFound) {
        logger.info('⏳ Cooling down...');
        await this.sleep(5000);
      }
    }

    this.generateStressTestReport();
    return this.results;
  }

  /**
   * Run a single stress test phase
   */
  async runPhase(endpoint, options) {
    const { method, data, headers, concurrent, duration } = options;

    const responses = [];
    const errors = [];
    const workers = [];

    // Create concurrent workers
    for (let i = 0; i < concurrent; i++) {
      const worker = this.createStressWorker(endpoint, {
        method,
        data,
        headers,
        duration,
        workerId: i
      });
      workers.push(worker);
    }

    // Start all workers simultaneously (no ramp-up in stress testing)
    const workerResults = await Promise.all(workers);

    // Aggregate results
    workerResults.forEach(workerResult => {
      responses.push(...workerResult.responses);
      errors.push(...workerResult.errors);
    });

    // Calculate metrics
    const metrics = this.calculateStressMetrics(responses, errors, duration);

    return {
      concurrent,
      duration,
      responses: responses.length,
      errors: errors.length,
      metrics,
      timestamp: new Date()
    };
  }

  /**
   * Create stress test worker
   */
  async createStressWorker(endpoint, options) {
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
          timeout: 10000 // Shorter timeout for stress testing
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

      // No delay in stress testing - maximum pressure
    }

    return { responses, errors };
  }

  /**
   * Calculate stress test metrics
   */
  calculateStressMetrics(responses, errors, duration) {
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
        percentiles: {},
        throughput: 0
      };
    }

    const successfulResponses = responses.filter(r => r.success);
    const responseTimes = responses.map(r => r.responseTime);

    return {
      totalRequests: responses.length,
      successfulRequests: successfulResponses.length,
      failedRequests: errors.length,
      averageResponseTime: responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length,
      minResponseTime: Math.min(...responseTimes),
      maxResponseTime: Math.max(...responseTimes),
      requestsPerSecond: responses.length / duration,
      errorRate: (errors.length / responses.length) * 100,
      percentiles: this.calculatePercentiles(responseTimes),
      throughput: successfulResponses.length / duration // Successful requests per second
    };
  }

  /**
   * Calculate response time percentiles
   */
  calculatePercentiles(responseTimes) {
    const sorted = responseTimes.sort((a, b) => a - b);
    const length = sorted.length;

    return {
      p50: sorted[Math.floor(length * 0.5)] || 0,
      p75: sorted[Math.floor(length * 0.75)] || 0,
      p90: sorted[Math.floor(length * 0.9)] || 0,
      p95: sorted[Math.floor(length * 0.95)] || 0,
      p99: sorted[Math.floor(length * 0.99)] || 0
    };
  }

  /**
   * Get system metrics
   */
  getSystemMetrics() {
    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    return {
      timestamp: new Date(),
      cpu: {
        count: cpus.length,
        usage: process.cpuUsage(),
        loadAverage: os.loadavg()
      },
      memory: {
        total: totalMem,
        used: usedMem,
        free: freeMem,
        usagePercent: (usedMem / totalMem) * 100,
        processMemory: process.memoryUsage()
      },
      system: {
        platform: os.platform(),
        arch: os.arch(),
        uptime: os.uptime(),
        hostname: os.hostname()
      }
    };
  }

  /**
   * Calculate metrics delta
   */
  calculateMetricsDelta(before, after) {
    return {
      cpu: {
        usageDelta: after.cpu.usage.user - before.cpu.usage.user,
        systemDelta: after.cpu.usage.system - before.cpu.usage.system
      },
      memory: {
        usedDelta: after.memory.used - before.memory.used,
        processHeapDelta: after.memory.processMemory.heapUsed - before.memory.processMemory.heapUsed
      }
    };
  }

  /**
   * Generate stress test report
   */
  generateStressTestReport() {
    logger.info('\n🔥 Stress Test Results Summary:');
    logger.info('=====================================');

    if (this.results.breakingPoint) {
      logger.info(`💥 Breaking Point: ${this.results.breakingPoint.users} concurrent users`);
      logger.info(`   Error Rate: ${this.results.breakingPoint.errorRate.toFixed(2)}%`);
      logger.info(`   Response Time: ${this.results.breakingPoint.responseTime.toFixed(2)}ms`);
      if (this.results.breakingPoint.reason) {
        logger.info(`   Reason: ${this.results.breakingPoint.reason}`);
      }
    } else {
      logger.info('💪 No breaking point found within test limits');
    }

    // Best performance phase
    const bestPhase = this.results.phases.reduce((best, phase) => {
      return phase.metrics.throughput > best.metrics.throughput ? phase : best;
    });

    logger.info('\n🏆 Peak Performance:');
    logger.info(`   Users: ${bestPhase.concurrent}`);
    logger.info(`   Throughput: ${bestPhase.metrics.throughput.toFixed(2)} req/s`);
    logger.info(`   Error Rate: ${bestPhase.metrics.errorRate.toFixed(2)}%`);
    logger.info(`   Avg Response Time: ${bestPhase.metrics.averageResponseTime.toFixed(2)}ms`);

    // Generate recommendations
    this.generateStressRecommendations();

    logger.info('\n💡 Recommendations:');
    this.results.recommendations.forEach(rec => {
      logger.info(`   ${rec.priority.toUpperCase()}: ${rec.message}`);
    });
  }

  /**
   * Generate stress test recommendations
   */
  generateStressRecommendations() {
    const recommendations = [];

    if (this.results.breakingPoint) {
      if (this.results.breakingPoint.users < 100) {
        recommendations.push({
          type: 'capacity',
          priority: 'high',
          message: 'Low capacity detected. Consider scaling infrastructure and optimizing application performance.'
        });
      } else if (this.results.breakingPoint.users < 500) {
        recommendations.push({
          type: 'capacity',
          priority: 'medium',
          message: 'Moderate capacity. Consider horizontal scaling for production workloads.'
        });
      }

      if (this.results.breakingPoint.reason === 'system-resources') {
        recommendations.push({
          type: 'resources',
          priority: 'high',
          message: 'System resource limits reached. Increase CPU and memory allocation.'
        });
      }
    }

    // Analyze response time degradation
    const phases = this.results.phases;
    if (phases.length > 2) {
      const firstPhase = phases[0];
      const lastPhase = phases[phases.length - 1];
      const responseTimeIncrease = (lastPhase.metrics.averageResponseTime / firstPhase.metrics.averageResponseTime) - 1;

      if (responseTimeIncrease > 2) { // 200% increase
        recommendations.push({
          type: 'performance',
          priority: 'high',
          message: 'Significant response time degradation under load. Review application bottlenecks.'
        });
      }
    }

    // Check for memory leaks
    const lastMetrics = this.results.systemMetrics[this.results.systemMetrics.length - 1];
    if (lastMetrics && lastMetrics.metrics.memory.usagePercent > 80) {
      recommendations.push({
        type: 'memory',
        priority: 'medium',
        message: 'High memory usage detected. Check for memory leaks and optimize memory allocation.'
      });
    }

    this.results.recommendations = recommendations;
  }

  /**
   * Run comprehensive stress test suite
   */
  async runStressTestSuite() {
    logger.info('🔥 Starting Comprehensive Stress Test Suite\n');

    const tests = [
      {
        name: 'API Health Check Stress Test',
        endpoint: '/api/v1/health',
        options: { maxUsers: 500, stepSize: 25 }
      },
      {
        name: 'Authentication Stress Test',
        endpoint: '/api/auth/login',
        options: {
          method: 'POST',
          data: { email: 'stress@test.com', password: 'password123' },
          maxUsers: 200,
          stepSize: 10
        }
      },
      {
        name: 'Portfolio API Stress Test',
        endpoint: '/api/v1/portfolio',
        options: {
          headers: { 'Authorization': 'Bearer stress-test-token' },
          maxUsers: 300,
          stepSize: 15
        }
      }
    ];

    const allResults = [];

    for (const test of tests) {
      logger.info(`\n🎯 Running: ${test.name}`);
      const result = await this.runStressTest(test.endpoint, test.options);
      allResults.push({ name: test.name, result });

      // Recovery time between tests
      logger.info('⏳ System recovery period...');
      await this.sleep(30000); // 30 seconds
    }

    return allResults;
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate comprehensive report
   */
  generateComprehensiveReport() {
    return {
      timestamp: new Date().toISOString(),
      testType: 'stress',
      summary: {
        breakingPoint: this.results.breakingPoint,
        totalPhases: this.results.phases.length,
        peakThroughput: Math.max(...this.results.phases.map(p => p.metrics.throughput)),
        recommendations: this.results.recommendations
      },
      phases: this.results.phases,
      systemMetrics: this.results.systemMetrics,
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        cpuCount: os.cpus().length,
        totalMemory: os.totalmem()
      }
    };
  }
}

module.exports = StressTester;

// CLI execution
if (require.main === module) {
  const stressTester = new StressTester();

  stressTester.runStressTestSuite()
    .then(results => {
      logger.info('\n📄 Generating comprehensive stress test report...');
      const report = stressTester.generateComprehensiveReport();

      // Save report to file
      const fs = require('fs');
      const logger = require('../../utils/logger');
      const reportPath = `./stress-test-report-${Date.now()}.json`;
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      logger.info(`📁 Report saved to: ${reportPath}`);

      process.exit(0);
    })
    .catch(error => {
      logger.error('❌ Stress test failed:', error);
      process.exit(1);
    });
}
