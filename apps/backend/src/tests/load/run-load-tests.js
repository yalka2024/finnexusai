#!/usr/bin/env node

/**
 * Load Test Runner
 * Executes comprehensive load testing scenarios
 */

const LoadTestFramework = require('./LoadTestFramework');
const path = require('path');
const fs = require('fs').promises;
const logger = require('../../utils/logger');

async function runLoadTests() {
  try {
    logger.info('🚀 Starting FinNexusAI Load Testing...');
    logger.info('=====================================');

    // Initialize the framework
    const framework = new LoadTestFramework();
    await framework.initialize();

    // Set up event listeners
    framework.on('testStart', (data) => {
      logger.info('\n📊 Test Configuration:');
      logger.info(`   Concurrency: ${data.config.concurrency}`);
      logger.info(`   Duration: ${data.config.duration}s`);
      logger.info(`   Ramp Up: ${data.config.rampUp}s`);
      logger.info(`   Ramp Down: ${data.config.rampDown}s`);
      logger.info(`   Base URL: ${data.config.baseUrl}`);
      logger.info(`   Scenarios: ${data.scenarios.map(s => s.name).join(', ')}`);
    });

    framework.on('testComplete', (results) => {
      logger.info('\n✅ Load Test Completed!');
      logger.info('========================');
      logger.info('📈 Results Summary:');
      logger.info(`   Total Requests: ${results.totalRequests}`);
      logger.info(`   Successful: ${results.successfulRequests} (${((results.successfulRequests / results.totalRequests) * 100).toFixed(1)}%)`);
      logger.info(`   Failed: ${results.failedRequests} (${((results.failedRequests / results.totalRequests) * 100).toFixed(1)}%)`);
      logger.info(`   Throughput: ${results.throughput.toFixed(2)} req/s`);
      logger.info(`   Test Duration: ${((results.endTime - results.startTime) / 1000).toFixed(1)}s`);

      logger.info('\n⏱️  Latency Metrics:');
      logger.info(`   Min: ${results.latency.min.toFixed(2)}ms`);
      logger.info(`   Mean: ${results.latency.mean.toFixed(2)}ms`);
      logger.info(`   P50: ${results.latency.p50.toFixed(2)}ms`);
      logger.info(`   P90: ${results.latency.p90.toFixed(2)}ms`);
      logger.info(`   P95: ${results.latency.p95.toFixed(2)}ms`);
      logger.info(`   P99: ${results.latency.p99.toFixed(2)}ms`);
      logger.info(`   Max: ${results.latency.max.toFixed(2)}ms`);

      if (results.errors.length > 0) {
        logger.info(`\n❌ Errors (${results.errors.length}):`);
        const errorSummary = {};
        results.errors.forEach(error => {
          const key = error.error || 'Unknown error';
          errorSummary[key] = (errorSummary[key] || 0) + 1;
        });

        Object.entries(errorSummary).forEach(([error, count]) => {
          logger.info(`   ${error}: ${count} occurrences`);
        });
      }
    });

    framework.on('requestComplete', (data) => {
      if (data.response.status >= 400) {
        logger.info(`⚠️  ${data.scenario}: ${data.response.status} (${data.response.responseTime.toFixed(2)}ms)`);
      }
    });

    framework.on('requestError', (data) => {
      logger.info(`❌ ${data.scenario}: ${data.error}`);
    });

    // Run load test with default scenarios
    const results = await framework.runLoadTest();

    // Generate and save report
    const report = await framework.generateReport();

    logger.info(`\n📊 Detailed report saved to: ${path.join(framework.config.outputDir, `load-test-report-${Date.now()}.json`)}`);

    // Performance analysis
    logger.info('\n🔍 Performance Analysis:');
    if (results.throughput < 10) {
      logger.info('   ⚠️  Low throughput detected - consider performance optimization');
    }
    if (results.latency.p95 > 1000) {
      logger.info('   ⚠️  High latency detected - 95th percentile > 1s');
    }
    if (results.failedRequests > results.totalRequests * 0.05) {
      logger.info('   ⚠️  High error rate detected - >5% failures');
    }
    if (results.throughput >= 100 && results.latency.p95 < 500 && results.failedRequests < results.totalRequests * 0.01) {
      logger.info('   ✅ Excellent performance metrics');
    }

    logger.info('\n🎯 Load Testing Complete!');
    process.exit(0);

  } catch (error) {
    logger.error('\n❌ Load testing failed:', error.message);
    logger.error(error.stack);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('\n🛑 Load testing interrupted by user');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('\n🛑 Load testing terminated');
  process.exit(0);
});

// Run the tests
if (require.main === module) {
  runLoadTests();
}
