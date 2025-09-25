#!/usr/bin/env node

/**
 * Security Test Runner
 * Executes comprehensive security testing scenarios
 */

const SecurityTestFramework = require('./SecurityTestFramework');
const path = require('path');
const logger = require('../../utils/logger');

async function runSecurityTests() {
  try {
    logger.info('🔒 Starting FinNexusAI Security Testing...');
    logger.info('==========================================');

    // Initialize the framework
    const framework = new SecurityTestFramework();
    await framework.initialize();

    // Set up event listeners
    framework.on('testStart', (data) => {
      logger.info('\n🛡️  Security Test Configuration:');
      logger.info(`   Base URL: ${data.config.baseUrl}`);
      logger.info(`   Timeout: ${data.config.timeout}ms`);
      logger.info(`   Max Concurrency: ${data.config.maxConcurrency}`);
      logger.info(`   Test Suites: ${data.suites.map(s => s.name).join(', ')}`);
      logger.info(`   OWASP Tests: ${data.config.enableOWASP ? 'Enabled' : 'Disabled'}`);
      logger.info(`   SQL Injection: ${data.config.enableSQLInjection ? 'Enabled' : 'Disabled'}`);
      logger.info(`   XSS Tests: ${data.config.enableXSS ? 'Enabled' : 'Disabled'}`);
      logger.info(`   CSRF Tests: ${data.config.enableCSRF ? 'Enabled' : 'Disabled'}`);
      logger.info(`   Auth Bypass: ${data.config.enableAuthBypass ? 'Enabled' : 'Disabled'}`);
      logger.info(`   Rate Limiting: ${data.config.enableRateLimit ? 'Enabled' : 'Disabled'}`);
    });

    framework.on('testComplete', (results) => {
      logger.info('\n✅ Security Testing Completed!');
      logger.info('==============================');
      logger.info('📊 Test Summary:');
      logger.info(`   Total Tests: ${results.totalTests}`);
      logger.info(`   Passed: ${results.passedTests} (${((results.passedTests / results.totalTests) * 100).toFixed(1)}%)`);
      logger.info(`   Failed: ${results.failedTests} (${((results.failedTests / results.totalTests) * 100).toFixed(1)}%)`);

      logger.info('\n🚨 Vulnerability Summary:');
      logger.info(`   Critical: ${results.criticalIssues}`);
      logger.info(`   High: ${results.highIssues}`);
      logger.info(`   Medium: ${results.mediumIssues}`);
      logger.info(`   Low: ${results.lowIssues}`);

      const securityScore = framework.calculateSecurityScore();
      logger.info(`\n🎯 Security Score: ${securityScore}/100`);

      if (securityScore >= 90) {
        logger.info('   ✅ Excellent security posture');
      } else if (securityScore >= 75) {
        logger.info('   ⚠️  Good security, room for improvement');
      } else if (securityScore >= 50) {
        logger.info('   ⚠️  Moderate security concerns');
      } else {
        logger.info('   ❌ Critical security issues detected');
      }

      if (results.recommendations.length > 0) {
        logger.info('\n💡 Recommendations:');
        results.recommendations.forEach((rec, index) => {
          logger.info(`   ${index + 1}. ${rec}`);
        });
      }
    });

    framework.on('testResult', (data) => {
      const status = data.result.passed ? '✅' : '❌';
      const severity = data.result.severity.toUpperCase();
      logger.info(`   ${status} ${data.test}: ${severITY} (${data.result.vulnerabilities.length} issues)`);
    });

    framework.on('testError', (data) => {
      logger.info(`❌ ${data.test}: ${data.error}`);
    });

    // Run security tests with all available suites
    const results = await framework.runSecurityTests();

    // Generate and save report
    const report = await framework.generateReport();

    logger.info(`\n📊 Detailed security report saved to: ${path.join(framework.config.outputDir, `security-test-report-${Date.now()}.json`)}`);

    // Security analysis
    logger.info('\n🔍 Security Analysis:');
    if (results.criticalIssues > 0) {
      logger.info('   🚨 CRITICAL: Immediate action required for critical vulnerabilities');
    }
    if (results.highIssues > 0) {
      logger.info('   ⚠️  HIGH: Address high-severity issues before production deployment');
    }
    if (results.mediumIssues > 0) {
      logger.info('   ⚠️  MEDIUM: Plan to address medium-severity issues in next release');
    }
    if (results.lowIssues > 0) {
      logger.info('   ℹ️  LOW: Consider addressing low-severity issues when possible');
    }

    // Show top vulnerabilities
    if (results.vulnerabilities.length > 0) {
      logger.info('\n🔍 Top Vulnerabilities:');
      const topVulns = results.vulnerabilities
        .sort((a, b) => {
          const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
          return severityOrder[b.severity] - severityOrder[a.severity];
        })
        .slice(0, 5);

      topVulns.forEach((vuln, index) => {
        logger.info(`   ${index + 1}. [${vuln.severity.toUpperCase()}] ${vuln.testName || vuln.test}`);
        if (vuln.endpoint) {
          logger.info(`      Endpoint: ${vuln.endpoint}`);
        }
        if (vuln.payload) {
          logger.info(`      Payload: ${vuln.payload}`);
        }
      });
    }

    logger.info('\n🎯 Security Testing Complete!');

    // Exit with appropriate code based on security score
    const securityScore = framework.calculateSecurityScore();
    if (securityScore < 50) {
      process.exit(1); // Critical security issues
    } else if (securityScore < 75) {
      process.exit(2); // Security concerns
    } else {
      process.exit(0); // Acceptable security
    }

  } catch (error) {
    logger.error('\n❌ Security testing failed:', error.message);
    logger.error(error.stack);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('\n🛑 Security testing interrupted by user');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('\n🛑 Security testing terminated');
  process.exit(0);
});

// Run the tests
if (require.main === module) {
  runSecurityTests();
}
