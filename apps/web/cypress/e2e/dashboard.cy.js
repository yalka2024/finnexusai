const logger = require('../../utils/logger');
/**
 * Dashboard E2E Tests
 * 
 * Tests for the main dashboard functionality
 */

describe('Dashboard', () => {
  beforeEach(() => {
    cy.login();
    cy.visit('/dashboard');
  });

  describe('Dashboard Layout', () => {
    it('should display dashboard correctly', () => {
      cy.get('[data-cy="dashboard-header"]').should('be.visible');
      cy.get('[data-cy="user-menu"]').should('be.visible');
      cy.get('[data-cy="dashboard-content"]').should('be.visible');
      cy.get('[data-cy="navigation-tabs"]').should('be.visible');
      
      cy.checkAccessibility();
    });

    it('should display user information correctly', () => {
      cy.get('[data-cy="welcome-message"]').should('contain', 'Welcome, Test');
      cy.get('[data-cy="user-avatar"]').should('be.visible');
      cy.get('[data-cy="user-level"]').should('be.visible');
      cy.get('[data-cy="user-xp"]').should('be.visible');
    });

    it('should be responsive on mobile', () => {
      cy.setMobileViewport();
      
      cy.get('[data-cy="mobile-menu-toggle"]').should('be.visible');
      cy.get('[data-cy="dashboard-content"]').should('be.visible');
      
      cy.get('[data-cy="mobile-menu-toggle"]').click();
      cy.get('[data-cy="mobile-navigation"]').should('be.visible');
    });

    it('should be responsive on tablet', () => {
      cy.setTabletViewport();
      
      cy.get('[data-cy="dashboard-content"]').should('be.visible');
      cy.get('[data-cy="sidebar"]').should('be.visible');
    });
  });

  describe('Navigation Tabs', () => {
    it('should switch between tabs correctly', () => {
      const tabs = ['overview', 'portfolio', 'trading', 'analytics', 'compliance', 'ai-insights'];
      
      tabs.forEach(tab => {
        cy.switchTab(tab);
        cy.get(`[data-cy="tab-${tab}"]`).should('have.class', 'active');
        cy.get(`[data-cy="content-${tab}"]`).should('be.visible');
      });
    });

    it('should maintain tab state on refresh', () => {
      cy.switchTab('portfolio');
      cy.reload();
      
      cy.get('[data-cy="tab-portfolio"]').should('have.class', 'active');
      cy.get('[data-cy="content-portfolio"]').should('be.visible');
    });

    it('should update URL when switching tabs', () => {
      cy.switchTab('trading');
      cy.url().should('include', 'tab=trading');
      
      cy.switchTab('analytics');
      cy.url().should('include', 'tab=analytics');
    });
  });

  describe('Portfolio Overview', () => {
    it('should display portfolio summary', () => {
      cy.switchTab('overview');
      
      cy.get('[data-cy="portfolio-value"]').should('be.visible');
      cy.get('[data-cy="portfolio-change"]').should('be.visible');
      cy.get('[data-cy="portfolio-chart"]').should('be.visible');
      cy.get('[data-cy="top-assets"]').should('be.visible');
    });

    it('should show recent transactions', () => {
      cy.switchTab('overview');
      
      cy.get('[data-cy="recent-transactions"]').should('be.visible');
      cy.get('[data-cy="transaction-list"]').should('have.length.greaterThan', 0);
      
      // Check transaction details
      cy.get('[data-cy="transaction-item"]').first().within(() => {
        cy.get('[data-cy="transaction-type"]').should('be.visible');
        cy.get('[data-cy="transaction-amount"]').should('be.visible');
        cy.get('[data-cy="transaction-time"]').should('be.visible');
      });
    });

    it('should display performance metrics', () => {
      cy.switchTab('overview');
      
      cy.get('[data-cy="performance-metrics"]').should('be.visible');
      cy.get('[data-cy="roi-metric"]').should('be.visible');
      cy.get('[data-cy="volatility-metric"]').should('be.visible');
      cy.get('[data-cy="sharpe-ratio"]').should('be.visible');
    });
  });

  describe('Wallet Integration', () => {
    it('should display connect wallet button when not connected', () => {
      cy.get('[data-cy="connect-wallet-button"]').should('be.visible');
      cy.get('[data-cy="wallet-status"]').should('contain', 'Not Connected');
    });

    it('should connect MetaMask wallet', () => {
      cy.mockWeb3Provider();
      
      cy.connectWallet('MetaMask');
      
      cy.get('[data-cy="wallet-address"]').should('be.visible');
      cy.get('[data-cy="wallet-balance"]').should('be.visible');
      cy.get('[data-cy="wallet-status"]').should('contain', 'Connected');
    });

    it('should connect Coinbase wallet', () => {
      cy.mockWeb3Provider();
      
      cy.connectWallet('Coinbase');
      
      cy.get('[data-cy="wallet-address"]').should('be.visible');
      cy.get('[data-cy="wallet-status"]').should('contain', 'Connected');
    });

    it('should disconnect wallet', () => {
      cy.mockWeb3Provider();
      cy.connectWallet('MetaMask');
      
      cy.disconnectWallet();
      
      cy.get('[data-cy="connect-wallet-button"]').should('be.visible');
      cy.get('[data-cy="wallet-status"]').should('contain', 'Not Connected');
    });

    it('should handle wallet connection errors', () => {
      // Mock wallet connection error
      cy.window().then((win) => {
        win.ethereum = {
          request: cy.stub().rejects(new Error('User rejected request')),
          on: cy.stub(),
          removeListener: cy.stub()
        };
      });
      
      cy.get('[data-cy="connect-wallet-button"]').click();
      cy.get('[data-cy="wallet-metaMask"]').click();
      
      cy.get('[data-cy="error-message"]').should('contain', 'User rejected request');
    });
  });

  describe('Quick Actions', () => {
    it('should display quick action buttons', () => {
      cy.get('[data-cy="quick-actions"]').should('be.visible');
      cy.get('[data-cy="buy-crypto-button"]').should('be.visible');
      cy.get('[data-cy="sell-crypto-button"]').should('be.visible');
      cy.get('[data-cy="swap-tokens-button"]').should('be.visible');
      cy.get('[data-cy="earn-yield-button"]').should('be.visible');
    });

    it('should open buy crypto modal', () => {
      cy.get('[data-cy="buy-crypto-button"]').click();
      
      cy.get('[data-cy="buy-crypto-modal"]').should('be.visible');
      cy.get('[data-cy="asset-select"]').should('be.visible');
      cy.get('[data-cy="amount-input"]').should('be.visible');
      cy.get('[data-cy="buy-button"]').should('be.visible');
    });

    it('should open sell crypto modal', () => {
      cy.get('[data-cy="sell-crypto-button"]').click();
      
      cy.get('[data-cy="sell-crypto-modal"]').should('be.visible');
      cy.get('[data-cy="asset-select"]').should('be.visible');
      cy.get('[data-cy="amount-input"]').should('be.visible');
      cy.get('[data-cy="sell-button"]').should('be.visible');
    });

    it('should open swap tokens modal', () => {
      cy.get('[data-cy="swap-tokens-button"]').click();
      
      cy.get('[data-cy="swap-tokens-modal"]').should('be.visible');
      cy.get('[data-cy="from-asset"]').should('be.visible');
      cy.get('[data-cy="to-asset"]').should('be.visible');
      cy.get('[data-cy="swap-button"]').should('be.visible');
    });
  });

  describe('AI Insights', () => {
    it('should display AI insights tab', () => {
      cy.switchTab('ai-insights');
      
      cy.get('[data-cy="ai-insights-content"]').should('be.visible');
      cy.get('[data-cy="market-analysis"]').should('be.visible');
      cy.get('[data-cy="recommendations"]').should('be.visible');
      cy.get('[data-cy="risk-assessment"]').should('be.visible');
    });

    it('should generate AI insights', () => {
      cy.mockAIResponse({
        analysis: 'Market shows bullish sentiment with strong technical indicators',
        recommendations: ['Consider increasing BTC allocation', 'Monitor ETH resistance levels'],
        riskFactors: ['High volatility expected', 'Regulatory concerns']
      });
      
      cy.switchTab('ai-insights');
      cy.get('[data-cy="generate-insights-button"]').click();
      
      cy.wait('@aiResponse');
      cy.get('[data-cy="market-analysis"]').should('contain', 'bullish sentiment');
      cy.get('[data-cy="recommendations"]').should('contain', 'BTC allocation');
    });

    it('should display avatar chat interface', () => {
      cy.switchTab('ai-insights');
      
      cy.get('[data-cy="avatar-chat"]').should('be.visible');
      cy.get('[data-cy="avatar-list"]').should('be.visible');
      cy.get('[data-cy="chat-input"]').should('be.visible');
      cy.get('[data-cy="send-message-button"]').should('be.visible');
    });

    it('should chat with AI avatar', () => {
      cy.switchTab('ai-insights');
      
      cy.createAvatar({
        name: 'Test Avatar',
        personality: 'analytical',
        expertise: 'crypto'
      });
      
      cy.chatWithAvatar('avatar-1', 'What do you think about Bitcoin?');
      
      cy.get('[data-cy="avatar-response"]').should('be.visible');
    });
  });

  describe('Gamification', () => {
    it('should display user progress', () => {
      cy.get('[data-cy="user-progress"]').should('be.visible');
      cy.get('[data-cy="user-level"]').should('be.visible');
      cy.get('[data-cy="user-xp"]').should('be.visible');
      cy.get('[data-cy="progress-bar"]').should('be.visible');
    });

    it('should display achievements', () => {
      cy.get('[data-cy="achievements"]').should('be.visible');
      cy.get('[data-cy="achievement-list"]').should('have.length.greaterThan', 0);
    });

    it('should display challenges', () => {
      cy.get('[data-cy="challenges"]').should('be.visible');
      cy.get('[data-cy="challenge-list"]').should('have.length.greaterThan', 0);
    });

    it('should complete a challenge', () => {
      cy.completeChallenge('challenge-1');
      
      cy.get('[data-cy="challenge-completed"]').should('be.visible');
      cy.get('[data-cy="xp-earned"]').should('be.visible');
    });

    it('should display leaderboard', () => {
      cy.get('[data-cy="leaderboard"]').should('be.visible');
      cy.get('[data-cy="leaderboard-entries"]').should('have.length.greaterThan', 0);
      
      // Check leaderboard entry
      cy.get('[data-cy="leaderboard-entry"]').first().within(() => {
        cy.get('[data-cy="username"]').should('be.visible');
        cy.get('[data-cy="score"]').should('be.visible');
        cy.get('[data-cy="rank"]').should('be.visible');
      });
    });
  });

  describe('Real-time Updates', () => {
    it('should update portfolio value in real-time', () => {
      cy.switchTab('overview');
      
      const initialValue = cy.get('[data-cy="portfolio-value"]').invoke('text');
      
      // Simulate real-time update
      cy.window().then((win) => {
        win.dispatchEvent(new CustomEvent('portfolioUpdate', {
          detail: { value: 12500.50 }
        }));
      });
      
      cy.get('[data-cy="portfolio-value"]').should('contain', '12,500.50');
    });

    it('should update market data in real-time', () => {
      cy.switchTab('trading');
      
      // Simulate market data update
      cy.window().then((win) => {
        win.dispatchEvent(new CustomEvent('marketUpdate', {
          detail: {
            BTC: { price: 45000, change: 2.5 },
            ETH: { price: 3200, change: -1.2 }
          }
        }));
      });
      
      cy.get('[data-cy="btc-price"]').should('contain', '45,000');
      cy.get('[data-cy="eth-price"]').should('contain', '3,200');
    });

    it('should show notification for important updates', () => {
      // Simulate notification
      cy.window().then((win) => {
        win.dispatchEvent(new CustomEvent('notification', {
          detail: {
            type: 'price_alert',
            message: 'Bitcoin has reached your target price!'
          }
        }));
      });
      
      cy.get('[data-cy="notification"]').should('be.visible');
      cy.get('[data-cy="notification-message"]').should('contain', 'Bitcoin has reached your target price');
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', () => {
      cy.intercept('GET', '/api/v1/portfolio', {
        statusCode: 500,
        body: { error: 'Internal server error' }
      }).as('portfolioError');
      
      cy.visit('/dashboard');
      cy.wait('@portfolioError');
      
      cy.get('[data-cy="error-message"]').should('contain', 'Unable to load portfolio data');
      cy.get('[data-cy="retry-button"]').should('be.visible');
    });

    it('should retry failed requests', () => {
      cy.intercept('GET', '/api/v1/portfolio', {
        statusCode: 500,
        body: { error: 'Internal server error' }
      }).as('portfolioError');
      
      cy.intercept('GET', '/api/v1/portfolio', {
        statusCode: 200,
        body: { portfolio: { value: 10000 } }
      }).as('portfolioSuccess');
      
      cy.visit('/dashboard');
      cy.wait('@portfolioError');
      
      cy.get('[data-cy="retry-button"]').click();
      cy.wait('@portfolioSuccess');
      
      cy.get('[data-cy="portfolio-value"]').should('contain', '10,000');
    });

    it('should handle network connectivity issues', () => {
      cy.intercept('GET', '/api/v1/portfolio', {
        forceNetworkError: true
      }).as('networkError');
      
      cy.visit('/dashboard');
      cy.wait('@networkError');
      
      cy.get('[data-cy="offline-indicator"]').should('be.visible');
      cy.get('[data-cy="offline-message"]').should('contain', 'You are currently offline');
    });
  });

  describe('Performance', () => {
    it('should load dashboard within acceptable time', () => {
      cy.measurePageLoad('/dashboard');
    });

    it('should handle large datasets efficiently', () => {
      cy.switchTab('portfolio');
      
      // Simulate large portfolio
      cy.window().then((win) => {
        win.dispatchEvent(new CustomEvent('portfolioUpdate', {
          detail: {
            assets: Array.from({ length: 100 }, (_, i) => ({
              symbol: `ASSET${i}`,
              amount: Math.random() * 1000,
              value: Math.random() * 50000
            }))
          }
        }));
      });
      
      cy.get('[data-cy="asset-list"]').should('be.visible');
      cy.get('[data-cy="asset-item"]').should('have.length', 100);
    });

    it('should maintain smooth animations', () => {
      cy.switchTab('analytics');
      
      cy.get('[data-cy="chart-container"]').should('be.visible');
      
      // Check for smooth transitions
      cy.get('[data-cy="chart-animation"]').should('have.css', 'transition-duration');
    });
  });
});
