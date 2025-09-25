const logger = require('../../utils/logger');
/**
 * Cypress Configuration
 * 
 * End-to-end testing configuration for FinAI Nexus
 */

const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    supportFile: 'cypress/support/e2e.js',
    specPattern: 'cypress/e2e/**/*.cy.js',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: true,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000,
    pageLoadTimeout: 30000,
    env: {
      apiUrl: 'http://localhost:3001',
      testUser: {
        email: 'test@finnexusai.com',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User'
      },
      adminUser: {
        email: 'admin@finnexusai.com',
        password: 'AdminPassword123!',
        role: 'admin'
      }
    },
    setupNodeEvents(on, config) {
      // Custom tasks for testing
      on('task', {
        log(message) {
          logger.info(message);
          return null;
        },
        // Database seeding task
        seedDatabase() {
          // In a real implementation, this would seed test data
          return null;
        },
        // Clean up test data
        cleanupDatabase() {
          // In a real implementation, this would clean up test data
          return null;
        }
      });
    }
  },
  
  component: {
    devServer: {
      framework: 'next',
      bundler: 'webpack'
    },
    specPattern: 'cypress/component/**/*.cy.js',
    supportFile: 'cypress/support/component.js'
  }
});
