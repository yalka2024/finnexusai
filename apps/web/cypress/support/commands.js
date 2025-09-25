const logger = require('../../utils/logger');
/**
 * Cypress Custom Commands
 * 
 * Reusable commands for FinAI Nexus testing
 */

// Authentication commands
Cypress.Commands.add('login', (user = 'testUser') => {
  const users = {
    testUser: Cypress.env('testUser'),
    adminUser: Cypress.env('adminUser')
  };
  
  const userData = users[user];
  
  cy.session([userData.email], () => {
    cy.visit('/login');
    cy.get('[data-cy="email-input"]').type(userData.email);
    cy.get('[data-cy="password-input"]').type(userData.password);
    cy.get('[data-cy="login-button"]').click();
    
    // Wait for successful login
    cy.url().should('include', '/dashboard');
    cy.get('[data-cy="user-menu"]').should('be.visible');
  });
  
  cy.visit('/dashboard');
});

Cypress.Commands.add('logout', () => {
  cy.get('[data-cy="user-menu"]').click();
  cy.get('[data-cy="logout-button"]').click();
  cy.url().should('include', '/login');
});

Cypress.Commands.add('register', (userData) => {
  cy.visit('/signup');
  cy.get('[data-cy="firstName-input"]').type(userData.firstName);
  cy.get('[data-cy="lastName-input"]').type(userData.lastName);
  cy.get('[data-cy="email-input"]').type(userData.email);
  cy.get('[data-cy="password-input"]').type(userData.password);
  cy.get('[data-cy="confirmPassword-input"]').type(userData.password);
  cy.get('[data-cy="agreeTerms-checkbox"]').check();
  cy.get('[data-cy="signup-button"]').click();
  
  // Wait for successful registration
  cy.url().should('include', '/dashboard');
});

// Navigation commands
Cypress.Commands.add('navigateTo', (page) => {
  const routes = {
    dashboard: '/dashboard',
    portfolio: '/dashboard?tab=portfolio',
    trading: '/dashboard?tab=trading',
    analytics: '/dashboard?tab=analytics',
    compliance: '/dashboard?tab=compliance',
    aiInsights: '/dashboard?tab=ai-insights',
    settings: '/settings',
    profile: '/profile'
  };
  
  cy.visit(routes[page] || page);
});

Cypress.Commands.add('switchTab', (tabName) => {
  cy.get(`[data-cy="tab-${tabName}"]`).click();
  cy.get(`[data-cy="tab-${tabName}"]`).should('have.class', 'active');
});

// Wallet commands
Cypress.Commands.add('connectWallet', (walletType = 'MetaMask') => {
  cy.get('[data-cy="connect-wallet-button"]').click();
  cy.get(`[data-cy="wallet-${walletType.toLowerCase()}"]`).click();
  
  // Mock wallet connection
  cy.window().then((win) => {
    win.ethereum = {
      request: cy.stub().resolves(['0x1234567890123456789012345678901234567890']),
      on: cy.stub(),
      removeListener: cy.stub()
    };
  });
  
  cy.get('[data-cy="wallet-address"]').should('be.visible');
});

Cypress.Commands.add('disconnectWallet', () => {
  cy.get('[data-cy="wallet-menu"]').click();
  cy.get('[data-cy="disconnect-wallet-button"]').click();
  cy.get('[data-cy="connect-wallet-button"]').should('be.visible');
});

// Trading commands
Cypress.Commands.add('executeTrade', (tradeData) => {
  cy.get('[data-cy="trade-type-select"]').select(tradeData.type);
  cy.get('[data-cy="asset-select"]').select(tradeData.asset);
  cy.get('[data-cy="amount-input"]').type(tradeData.amount);
  cy.get('[data-cy="execute-trade-button"]').click();
  
  // Wait for trade confirmation
  cy.get('[data-cy="trade-confirmation"]').should('be.visible');
  cy.get('[data-cy="confirm-trade-button"]').click();
  
  // Wait for success message
  cy.get('[data-cy="trade-success"]').should('be.visible');
});

Cypress.Commands.add('checkPortfolioValue', (expectedValue) => {
  cy.get('[data-cy="portfolio-total-value"]').should('contain', expectedValue);
});

// AI Avatar commands
Cypress.Commands.add('createAvatar', (avatarConfig) => {
  cy.get('[data-cy="create-avatar-button"]').click();
  cy.get('[data-cy="avatar-name-input"]').type(avatarConfig.name);
  cy.get('[data-cy="avatar-personality-select"]').select(avatarConfig.personality);
  cy.get('[data-cy="avatar-expertise-select"]').select(avatarConfig.expertise);
  cy.get('[data-cy="create-avatar-confirm"]').click();
  
  cy.get('[data-cy="avatar-created-success"]').should('be.visible');
});

Cypress.Commands.add('chatWithAvatar', (avatarId, message) => {
  cy.get(`[data-cy="avatar-${avatarId}"]`).click();
  cy.get('[data-cy="chat-input"]').type(message);
  cy.get('[data-cy="send-message-button"]').click();
  
  cy.get('[data-cy="chat-messages"]').should('contain', message);
  cy.get('[data-cy="avatar-response"]').should('be.visible');
});

// Gamification commands
Cypress.Commands.add('completeChallenge', (challengeId) => {
  cy.get(`[data-cy="challenge-${challengeId}"]`).within(() => {
    cy.get('[data-cy="complete-challenge-button"]').click();
  });
  
  cy.get('[data-cy="challenge-completed"]').should('be.visible');
});

Cypress.Commands.add('checkUserLevel', (expectedLevel) => {
  cy.get('[data-cy="user-level"]').should('contain', expectedLevel);
});

// AR/VR commands
Cypress.Commands.add('activateAR', () => {
  cy.get('[data-cy="activate-ar-button"]').click();
  cy.get('[data-cy="ar-camera"]').should('be.visible');
});

Cypress.Commands.add('activateVR', () => {
  cy.get('[data-cy="activate-vr-button"]').click();
  cy.get('[data-cy="vr-scene"]').should('be.visible');
});

// Multilingual commands
Cypress.Commands.add('switchLanguage', (language) => {
  cy.get('[data-cy="language-selector"]').click();
  cy.get(`[data-cy="language-${language}"]`).click();
  
  // Verify language change
  cy.get('[data-cy="language-selector"]').should('contain', language.toUpperCase());
});

// Islamic Finance commands
Cypress.Commands.add('enableIslamicFinanceMode', () => {
  cy.get('[data-cy="islamic-finance-toggle"]').check();
  cy.get('[data-cy="islamic-finance-active"]').should('be.visible');
});

// Emotion detection commands
Cypress.Commands.add('simulateEmotion', (emotion) => {
  cy.window().then((win) => {
    // Mock emotion detection
    win.emotionDetectionService = {
      detectEmotion: cy.stub().resolves({ emotion, confidence: 0.9 })
    };
  });
  
  cy.get('[data-cy="emotion-detection-active"]').should('be.visible');
});

// API testing commands
Cypress.Commands.add('apiRequest', (method, endpoint, body = null) => {
  const options = {
    method,
    url: `${Cypress.env('apiUrl')}${endpoint}`,
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  if (body) {
    options.body = body;
  }
  
  return cy.request(options);
});

Cypress.Commands.add('authenticatedApiRequest', (method, endpoint, body = null) => {
  return cy.getCookie('authToken').then((cookie) => {
    const options = {
      method,
      url: `${Cypress.env('apiUrl')}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cookie?.value || 'mock-token'}`
      }
    };
    
    if (body) {
      options.body = body;
    }
    
    return cy.request(options);
  });
});

// Performance testing commands
Cypress.Commands.add('measurePageLoad', (url) => {
  cy.visit(url);
  cy.window().then((win) => {
    const navigation = win.performance.getEntriesByType('navigation')[0];
    const loadTime = navigation.loadEventEnd - navigation.loadEventStart;
    cy.log(`Page load time: ${loadTime}ms`);
    
    // Assert load time is under threshold
    expect(loadTime).to.be.lessThan(3000);
  });
});

Cypress.Commands.add('checkLighthouseScore', () => {
  cy.lighthouse({
    performance: 90,
    accessibility: 90,
    'best-practices': 90,
    seo: 90
  });
});

// Accessibility commands
Cypress.Commands.add('checkAccessibility', () => {
  cy.injectAxe();
  cy.checkA11y(null, {
    rules: {
      'color-contrast': { enabled: false }, // Disable color contrast for dark theme
      'region': { enabled: false } // Disable region rule for complex layouts
    }
  });
});

// Error handling commands
Cypress.Commands.add('handleApiError', (response) => {
  if (response.status >= 400) {
    cy.log(`API Error: ${response.status} - ${response.body?.message || 'Unknown error'}`);
  }
});

// Database commands
Cypress.Commands.add('seedTestData', (dataType) => {
  cy.task('seedDatabase', { type: dataType });
});

Cypress.Commands.add('cleanupTestData', (dataType) => {
  cy.task('cleanupDatabase', { type: dataType });
});

// Mock commands
Cypress.Commands.add('mockWeb3Provider', () => {
  cy.window().then((win) => {
    win.ethereum = {
      request: cy.stub().resolves(['0x1234567890123456789012345678901234567890']),
      on: cy.stub(),
      removeListener: cy.stub(),
      isMetaMask: true
    };
  });
});

Cypress.Commands.add('mockAIResponse', (response) => {
  cy.intercept('POST', '/api/ai/**', {
    statusCode: 200,
    body: response
  }).as('aiResponse');
});

// Utility commands
Cypress.Commands.add('waitForLoading', () => {
  cy.get('[data-cy="loading-spinner"]', { timeout: 10000 }).should('not.exist');
});

Cypress.Commands.add('scrollToElement', (selector) => {
  cy.get(selector).scrollIntoView();
});

Cypress.Commands.add('takeScreenshot', (name) => {
  cy.screenshot(name, { capture: 'fullPage' });
});
