const logger = require('../../utils/logger');
/**
 * Cypress E2E Support File
 * 
 * Global commands and configurations for end-to-end tests
 */

// Import commands.js using ES2015 syntax:
import './commands';

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Global error handling
Cypress.on('uncaught:exception', (err, runnable) => {
  // Prevent Cypress from failing on uncaught exceptions
  // Return false to prevent the error from failing this test
  if (err.message.includes('ResizeObserver loop limit exceeded')) {
    return false;
  }
  if (err.message.includes('Non-Error promise rejection')) {
    return false;
  }
  return true;
});

// Global before hook
before(() => {
  // Seed test database
  cy.task('seedDatabase');
});

// Global after hook
after(() => {
  // Cleanup test database
  cy.task('cleanupDatabase');
});

// Global beforeEach hook
beforeEach(() => {
  // Clear localStorage and cookies
  cy.clearLocalStorage();
  cy.clearCookies();
  
  // Set default viewport
  cy.viewport(1280, 720);
  
  // Intercept and mock API calls if needed
  cy.intercept('GET', '/api/v1/health', { fixture: 'health.json' }).as('healthCheck');
});

// Custom viewport configurations
Cypress.Commands.add('setMobileViewport', () => {
  cy.viewport(375, 667);
});

Cypress.Commands.add('setTabletViewport', () => {
  cy.viewport(768, 1024);
});

Cypress.Commands.add('setDesktopViewport', () => {
  cy.viewport(1280, 720);
});

// Accessibility testing
Cypress.Commands.add('checkA11y', () => {
  cy.injectAxe();
  cy.checkA11y();
});

// Wait for animations to complete
Cypress.Commands.add('waitForAnimations', () => {
  cy.wait(500); // Adjust based on your animation duration
});
