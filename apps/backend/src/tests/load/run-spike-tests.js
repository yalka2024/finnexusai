#!/usr/bin/env node

/**
 * Spike Test Runner
 * Executes spike testing scenarios to test system recovery
 */

const LoadTestFramework = require('./LoadTestFramework');
const logger = require('../../utils/logger');

async function runSpikeTests() {
  try {
    logger.info('⚡ Starting FinNexusAI Spike Testing...');
    logger.info('======================================');

    // Initialize the framework
    const framework = new LoadTestFramework();
    await framework.initialize();

    // Set up event listeners
    framework.on('testStart', (data) => {
      logger.info('\n⚡ Spike Test Configuration:');
      logger.info(`   Concurrency: ${data.config.concurrency}`);
      logger.info(`   Duration: ${data.config.duration}s`);
      logger.info(`   Ramp Up: ${data.config.rampUp}s`);
      logger.info(`   Base URL: ${data.config.baseUrl}`);
      logger.info(`   Scenarios: ${data.scenarios.map(s => s.name).join(', ')}`);
    });

    framework.on('testComplete', (results) => {
      logger.info('\n✅ Spike Test Phase Completed!');
      logger.info(`   Total Requests: ${results.totalRequests}`);
      logger.info(`   Successful: ${results.successfulRequests} (${((results.successfulRequests / results.totalRequests) * 100).toFixed(1)}%)`);
      logger.info(`   Failed: ${results.failedRequests} (${((results.failedRequests / results.totalRequests) * 100).toFixed(1)}%)`);
      logger.info(`   Throughput: ${results.throughput.toFixed(2)} req/s`);
      logger.info(`   P95 Latency: ${results.latency.p95.toFixed(2)}ms`);
    });

    framework.on('requestComplete', (data) => {
      if (data.response.status >= 400) {
        logger.info(`⚠️  ${data.scenario}: ${data.response.status} (${data.response.responseTime.toFixed(2)}ms)`);
      }
    });

    framework.on('requestError', (data) => {
      logger.info(`❌ ${data.scenario}: ${data.error}`);
    });

    // Run spike test (baseline -> spike -> recovery)
    const spikeConfig = {
      baselineConcurrency: 10,
      spikeConcurrency: 100,
      recoveryConcurrency: 10,
      duration: 60
    };

    logger.info('\n📊 Running Baseline Test...');
    const results = await framework.runSpikeTest(null, spikeConfig);

    // Generate and save report
    const report = await framework.generateReport();

    logger.info(`\n📊 Spike test report saved to: ${framework.config.outputDir}`);

    // Spike test analysis
    logger.info('\n🔍 Spike Test Analysis:');
    logger.info('========================');

    logger.info('\n📈 Baseline Performance:');
    logger.info(`   Throughput: ${results.baseline.throughput.toFixed(2)} req/s`);
    logger.info(`   P95 Latency: ${results.baseline.latency.p95.toFixed(2)}ms`);
    logger.info(`   Error Rate: ${((results.baseline.failedRequests / results.baseline.totalRequests) * 100).toFixed(1)}%`);

    logger.info('\n⚡ Spike Performance:');
    logger.info(`   Throughput: ${results.spike.throughput.toFixed(2)} req/s`);
    logger.info(`   P95 Latency: ${results.spike.latency.p95.toFixed(2)}ms`);
    logger.info(`   Error Rate: ${((results.spike.failedRequests / results.spike.totalRequests) * 100).toFixed(1)}%`);

    logger.info('\n🔄 Recovery Performance:');
    logger.info(`   Throughput: ${results.recovery.throughput.toFixed(2)} req/s`);
    logger.info(`   P95 Latency: ${results.recovery.latency.p95.toFixed(2)}ms`);
    logger.info(`   Error Rate: ${((results.recovery.failedRequests / results.recovery.totalRequests) * 100).toFixed(1)}%`);

    logger.info('\n📊 Impact Analysis:');
    const analysis = results.analysis;
    logger.info(`   Throughput Change: ${analysis.spikeImpact.throughputChange.toFixed(1)}%`);
    logger.info(`   Latency Change: ${analysis.spikeImpact.latencyChange.toFixed(1)}%`);
    logger.info(`   Error Rate Change: ${analysis.spikeImpact.errorRateChange.toFixed(1)}%`);

    logger.info(`   Throughput Recovery: ${analysis.recoveryAnalysis.throughputRecovery.toFixed(1)}%`);
    logger.info(`   Latency Recovery: ${analysis.recoveryAnalysis.latencyRecovery.toFixed(1)}%`);
    logger.info(`   Stability Recovery: ${(analysis.recoveryAnalysis.stabilityRecovery * 100).toFixed(1)}%`);

    // System resilience assessment
    logger.info('\n🛡️  System Resilience Assessment:');
    if (analysis.spikeImpact.throughputChange > 50) {
      logger.info('   ⚠️  Significant throughput degradation during spike');
    } else if (analysis.spikeImpact.throughputChange > 20) {
      logger.info('   ⚠️  Moderate throughput degradation during spike');
    } else {
      logger.info('   ✅ System maintains throughput during spike');
    }

    if (analysis.spikeImpact.latencyChange > 100) {
      logger.info('   ⚠️  Significant latency increase during spike');
    } else if (analysis.spikeImpact.latencyChange > 50) {
      logger.info('   ⚠️  Moderate latency increase during spike');
    } else {
      logger.info('   ✅ System maintains latency during spike');
    }

    if (analysis.recoveryAnalysis.throughputRecovery > 90) {
      logger.info('   ✅ Excellent recovery - throughput returns to baseline');
    } else if (analysis.recoveryAnalysis.throughputRecovery > 80) {
      logger.info('   ⚠️  Good recovery - throughput mostly returns to baseline');
    } else {
      logger.info('   ❌ Poor recovery - throughput does not return to baseline');
    }

    if (analysis.recoveryAnalysis.stabilityRecovery < 0.05) {
      logger.info('   ✅ Excellent stability recovery - low error rate');
    } else if (analysis.recoveryAnalysis.stabilityRecovery < 0.1) {
      logger.info('   ⚠️  Good stability recovery - moderate error rate');
    } else {
      logger.info('   ❌ Poor stability recovery - high error rate');
    }

    logger.info('\n🎯 Spike Testing Complete!');
    process.exit(0);

  } catch (error) {
    logger.error('\n❌ Spike testing failed:', error.message);
    logger.error(error.stack);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('\n🛑 Spike testing interrupted by user');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('\n🛑 Spike testing terminated');
  process.exit(0);
});

// Run the tests
if (require.main === module) {
  runSpikeTests();
}
