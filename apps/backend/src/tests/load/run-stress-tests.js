#!/usr/bin/env node

/**
 * Stress Test Runner
 * Executes high-load stress testing scenarios
 */

const LoadTestFramework = require('./LoadTestFramework');
const logger = require('../../utils/logger');

async function runStressTests() {
  try {
    logger.info('💥 Starting FinNexusAI Stress Testing...');
    logger.info('=======================================');

    // Initialize the framework
    const framework = new LoadTestFramework();
    await framework.initialize();

    // Set up event listeners
    framework.on('testStart', (data) => {
      logger.info('\n💥 Stress Test Configuration:');
      logger.info(`   Concurrency: ${data.config.concurrency}`);
      logger.info(`   Duration: ${data.config.duration}s`);
      logger.info(`   Ramp Up: ${data.config.rampUp}s`);
      logger.info(`   Base URL: ${data.config.baseUrl}`);
      logger.info(`   Scenarios: ${data.scenarios.map(s => s.name).join(', ')}`);
    });

    framework.on('testComplete', (results) => {
      logger.info('\n✅ Stress Test Completed!');
      logger.info('=========================');
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

    // Run stress test with high concurrency
    const stressConfig = {
      concurrency: 100,
      duration: 300, // 5 minutes
      rampUp: 30,
      rampDown: 30
    };

    const results = await framework.runStressTest(null, stressConfig);

    // Generate and save report
    const report = await framework.generateReport();

    logger.info(`\n📊 Stress test report saved to: ${framework.config.outputDir}`);

    // Stress test analysis
    logger.info('\n🔍 Stress Test Analysis:');
    if (results.failedRequests > results.totalRequests * 0.1) {
      logger.info('   ❌ High failure rate under stress (>10%)');
    } else if (results.failedRequests > results.totalRequests * 0.05) {
      logger.info('   ⚠️  Moderate failure rate under stress (>5%)');
    } else {
      logger.info('   ✅ System handles stress well (<5% failures)');
    }

    if (results.throughput < 50) {
      logger.info('   ⚠️  Low throughput under stress (<50 req/s)');
    } else if (results.throughput < 100) {
      logger.info('   ⚠️  Moderate throughput under stress (<100 req/s)');
    } else {
      logger.info('   ✅ Good throughput under stress (≥100 req/s)');
    }

    if (results.latency.p95 > 5000) {
      logger.info('   ❌ Very high latency under stress (P95 > 5s)');
    } else if (results.latency.p95 > 2000) {
      logger.info('   ⚠️  High latency under stress (P95 > 2s)');
    } else {
      logger.info('   ✅ Acceptable latency under stress (P95 ≤ 2s)');
    }

    logger.info('\n🎯 Stress Testing Complete!');
    process.exit(0);

  } catch (error) {
    logger.error('\n❌ Stress testing failed:', error.message);
    logger.error(error.stack);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('\n🛑 Stress testing interrupted by user');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('\n🛑 Stress testing terminated');
  process.exit(0);
});

// Run the tests
if (require.main === module) {
  runStressTests();
}
