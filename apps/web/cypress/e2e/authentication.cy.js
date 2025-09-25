const logger = require('../../utils/logger');
/**
 * Authentication E2E Tests
 * 
 * Tests for user authentication flows
 */

describe('Authentication', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.clearCookies();
  });

  describe('Login Flow', () => {
    it('should display login page correctly', () => {
      cy.visit('/login');
      
      cy.get('[data-cy="login-form"]').should('be.visible');
      cy.get('[data-cy="email-input"]').should('be.visible');
      cy.get('[data-cy="password-input"]').should('be.visible');
      cy.get('[data-cy="login-button"]').should('be.visible');
      cy.get('[data-cy="forgot-password-link"]').should('be.visible');
      cy.get('[data-cy="signup-link"]').should('be.visible');
      
      // Check accessibility
      cy.checkAccessibility();
    });

    it('should validate required fields', () => {
      cy.visit('/login');
      
      cy.get('[data-cy="login-button"]').click();
      
      cy.get('[data-cy="email-error"]').should('be.visible');
      cy.get('[data-cy="password-error"]').should('be.visible');
    });

    it('should validate email format', () => {
      cy.visit('/login');
      
      cy.get('[data-cy="email-input"]').type('invalid-email');
      cy.get('[data-cy="password-input"]').type('password123');
      cy.get('[data-cy="login-button"]').click();
      
      cy.get('[data-cy="email-error"]').should('contain', 'Invalid email format');
    });

    it('should handle successful login', () => {
      // Mock successful login API response
      cy.intercept('POST', '/api/auth/login', {
        statusCode: 200,
        body: {
          success: true,
          token: 'mock-jwt-token',
          user: {
            id: 'user-123',
            email: 'test@finnexusai.com',
            firstName: 'Test',
            lastName: 'User',
            role: 'user'
          }
        }
      }).as('loginRequest');
      
      cy.visit('/login');
      
      cy.get('[data-cy="email-input"]').type('test@finnexusai.com');
      cy.get('[data-cy="password-input"]').type('TestPassword123!');
      cy.get('[data-cy="login-button"]').click();
      
      cy.wait('@loginRequest');
      cy.url().should('include', '/dashboard');
      cy.get('[data-cy="user-menu"]').should('be.visible');
      cy.get('[data-cy="welcome-message"]').should('contain', 'Welcome, Test');
    });

    it('should handle login failure', () => {
      // Mock failed login API response
      cy.intercept('POST', '/api/auth/login', {
        statusCode: 401,
        body: {
          success: false,
          message: 'Invalid credentials'
        }
      }).as('loginRequest');
      
      cy.visit('/login');
      
      cy.get('[data-cy="email-input"]').type('test@finnexusai.com');
      cy.get('[data-cy="password-input"]').type('wrongpassword');
      cy.get('[data-cy="login-button"]').click();
      
      cy.wait('@loginRequest');
      cy.get('[data-cy="error-message"]').should('contain', 'Invalid credentials');
      cy.url().should('include', '/login');
    });

    it('should handle network errors gracefully', () => {
      // Mock network error
      cy.intercept('POST', '/api/auth/login', {
        forceNetworkError: true
      }).as('loginRequest');
      
      cy.visit('/login');
      
      cy.get('[data-cy="email-input"]').type('test@finnexusai.com');
      cy.get('[data-cy="password-input"]').type('TestPassword123!');
      cy.get('[data-cy="login-button"]').click();
      
      cy.wait('@loginRequest');
      cy.get('[data-cy="error-message"]').should('contain', 'Network error');
    });
  });

  describe('Registration Flow', () => {
    it('should display registration page correctly', () => {
      cy.visit('/signup');
      
      cy.get('[data-cy="signup-form"]').should('be.visible');
      cy.get('[data-cy="firstName-input"]').should('be.visible');
      cy.get('[data-cy="lastName-input"]').should('be.visible');
      cy.get('[data-cy="email-input"]').should('be.visible');
      cy.get('[data-cy="password-input"]').should('be.visible');
      cy.get('[data-cy="confirmPassword-input"]').should('be.visible');
      cy.get('[data-cy="agreeTerms-checkbox"]').should('be.visible');
      cy.get('[data-cy="signup-button"]').should('be.visible');
      
      cy.checkAccessibility();
    });

    it('should validate password requirements', () => {
      cy.visit('/signup');
      
      cy.get('[data-cy="password-input"]').type('weak');
      cy.get('[data-cy="confirmPassword-input"]').type('weak');
      cy.get('[data-cy="signup-button"]').click();
      
      cy.get('[data-cy="password-error"]').should('contain', 'Password must be at least 8 characters');
    });

    it('should validate password confirmation', () => {
      cy.visit('/signup');
      
      cy.get('[data-cy="password-input"]').type('TestPassword123!');
      cy.get('[data-cy="confirmPassword-input"]').type('DifferentPassword123!');
      cy.get('[data-cy="signup-button"]').click();
      
      cy.get('[data-cy="confirmPassword-error"]').should('contain', 'Passwords do not match');
    });

    it('should require terms agreement', () => {
      cy.visit('/signup');
      
      cy.get('[data-cy="firstName-input"]').type('Test');
      cy.get('[data-cy="lastName-input"]').type('User');
      cy.get('[data-cy="email-input"]').type('test@finnexusai.com');
      cy.get('[data-cy="password-input"]').type('TestPassword123!');
      cy.get('[data-cy="confirmPassword-input"]').type('TestPassword123!');
      cy.get('[data-cy="signup-button"]').click();
      
      cy.get('[data-cy="terms-error"]').should('contain', 'You must agree to the terms');
    });

    it('should handle successful registration', () => {
      // Mock successful registration API response
      cy.intercept('POST', '/api/auth/register', {
        statusCode: 201,
        body: {
          success: true,
          token: 'mock-jwt-token',
          user: {
            id: 'user-123',
            email: 'test@finnexusai.com',
            firstName: 'Test',
            lastName: 'User',
            role: 'user'
          }
        }
      }).as('registerRequest');
      
      cy.visit('/signup');
      
      cy.get('[data-cy="firstName-input"]').type('Test');
      cy.get('[data-cy="lastName-input"]').type('User');
      cy.get('[data-cy="email-input"]').type('test@finnexusai.com');
      cy.get('[data-cy="password-input"]').type('TestPassword123!');
      cy.get('[data-cy="confirmPassword-input"]').type('TestPassword123!');
      cy.get('[data-cy="agreeTerms-checkbox"]').check();
      cy.get('[data-cy="signup-button"]').click();
      
      cy.wait('@registerRequest');
      cy.url().should('include', '/dashboard');
      cy.get('[data-cy="welcome-message"]').should('contain', 'Welcome, Test');
    });

    it('should handle duplicate email registration', () => {
      // Mock duplicate email API response
      cy.intercept('POST', '/api/auth/register', {
        statusCode: 409,
        body: {
          success: false,
          message: 'Email already exists'
        }
      }).as('registerRequest');
      
      cy.visit('/signup');
      
      cy.get('[data-cy="firstName-input"]').type('Test');
      cy.get('[data-cy="lastName-input"]').type('User');
      cy.get('[data-cy="email-input"]').type('existing@finnexusai.com');
      cy.get('[data-cy="password-input"]').type('TestPassword123!');
      cy.get('[data-cy="confirmPassword-input"]').type('TestPassword123!');
      cy.get('[data-cy="agreeTerms-checkbox"]').check();
      cy.get('[data-cy="signup-button"]').click();
      
      cy.wait('@registerRequest');
      cy.get('[data-cy="error-message"]').should('contain', 'Email already exists');
    });
  });

  describe('Password Reset Flow', () => {
    it('should display forgot password page', () => {
      cy.visit('/forgot-password');
      
      cy.get('[data-cy="forgot-password-form"]').should('be.visible');
      cy.get('[data-cy="email-input"]').should('be.visible');
      cy.get('[data-cy="reset-button"]').should('be.visible');
      cy.get('[data-cy="back-to-login-link"]').should('be.visible');
      
      cy.checkAccessibility();
    });

    it('should send password reset email', () => {
      // Mock successful password reset API response
      cy.intercept('POST', '/api/auth/forgot-password', {
        statusCode: 200,
        body: {
          success: true,
          message: 'Password reset email sent'
        }
      }).as('resetRequest');
      
      cy.visit('/forgot-password');
      
      cy.get('[data-cy="email-input"]').type('test@finnexusai.com');
      cy.get('[data-cy="reset-button"]').click();
      
      cy.wait('@resetRequest');
      cy.get('[data-cy="success-message"]').should('contain', 'Password reset email sent');
    });

    it('should handle password reset with invalid email', () => {
      // Mock invalid email API response
      cy.intercept('POST', '/api/auth/forgot-password', {
        statusCode: 404,
        body: {
          success: false,
          message: 'Email not found'
        }
      }).as('resetRequest');
      
      cy.visit('/forgot-password');
      
      cy.get('[data-cy="email-input"]').type('nonexistent@finnexusai.com');
      cy.get('[data-cy="reset-button"]').click();
      
      cy.wait('@resetRequest');
      cy.get('[data-cy="error-message"]').should('contain', 'Email not found');
    });

    it('should reset password with valid token', () => {
      // Mock successful password reset API response
      cy.intercept('POST', '/api/auth/reset-password', {
        statusCode: 200,
        body: {
          success: true,
          message: 'Password reset successful'
        }
      }).as('resetPasswordRequest');
      
      cy.visit('/reset-password?token=valid-token');
      
      cy.get('[data-cy="new-password-input"]').type('NewPassword123!');
      cy.get('[data-cy="confirm-password-input"]').type('NewPassword123!');
      cy.get('[data-cy="reset-password-button"]').click();
      
      cy.wait('@resetPasswordRequest');
      cy.get('[data-cy="success-message"]').should('contain', 'Password reset successful');
      cy.url().should('include', '/login');
    });

    it('should handle invalid reset token', () => {
      cy.visit('/reset-password?token=invalid-token');
      
      cy.get('[data-cy="error-message"]').should('contain', 'Invalid or expired token');
      cy.get('[data-cy="back-to-login-link"]').should('be.visible');
    });
  });

  describe('Logout Flow', () => {
    it('should logout successfully', () => {
      cy.login();
      
      cy.get('[data-cy="user-menu"]').click();
      cy.get('[data-cy="logout-button"]').click();
      
      cy.url().should('include', '/login');
      cy.get('[data-cy="login-form"]').should('be.visible');
    });

    it('should clear user session on logout', () => {
      cy.login();
      
      // Verify user is logged in
      cy.get('[data-cy="user-menu"]').should('be.visible');
      
      cy.logout();
      
      // Verify session is cleared
      cy.window().then((win) => {
        expect(win.localStorage.getItem('authToken')).to.be.null;
      });
      
      cy.url().should('include', '/login');
    });
  });

  describe('Session Management', () => {
    it('should maintain session on page refresh', () => {
      cy.login();
      
      cy.reload();
      
      cy.url().should('include', '/dashboard');
      cy.get('[data-cy="user-menu"]').should('be.visible');
    });

    it('should redirect to login when session expires', () => {
      cy.login();
      
      // Simulate session expiration
      cy.window().then((win) => {
        win.localStorage.removeItem('authToken');
      });
      
      cy.visit('/dashboard');
      cy.url().should('include', '/login');
    });

    it('should handle concurrent sessions', () => {
      cy.login();
      
      // Mock session conflict
      cy.intercept('GET', '/api/auth/verify', {
        statusCode: 409,
        body: {
          success: false,
          message: 'Session conflict detected'
        }
      }).as('sessionConflict');
      
      cy.visit('/dashboard');
      cy.wait('@sessionConflict');
      
      cy.get('[data-cy="error-message"]').should('contain', 'Session conflict detected');
    });
  });

  describe('Security Features', () => {
    it('should implement rate limiting on login attempts', () => {
      // Mock rate limiting response
      cy.intercept('POST', '/api/auth/login', {
        statusCode: 429,
        body: {
          success: false,
          message: 'Too many login attempts',
          retryAfter: 60
        }
      }).as('rateLimitRequest');
      
      cy.visit('/login');
      
      // Attempt multiple logins
      for (let i = 0; i < 6; i++) {
        cy.get('[data-cy="email-input"]').clear().type('test@finnexusai.com');
        cy.get('[data-cy="password-input"]').clear().type('wrongpassword');
        cy.get('[data-cy="login-button"]').click();
      }
      
      cy.wait('@rateLimitRequest');
      cy.get('[data-cy="error-message"]').should('contain', 'Too many login attempts');
    });

    it('should log security events', () => {
      cy.intercept('POST', '/api/audit/log', {
        statusCode: 200,
        body: { success: true }
      }).as('auditLog');
      
      cy.login();
      
      cy.wait('@auditLog');
      
      // Verify audit log was created
      cy.get('@auditLog').should('have.been.called');
    });

    it('should validate CSRF protection', () => {
      cy.visit('/login');
      
      // Try to submit form without CSRF token
      cy.get('[data-cy="email-input"]').type('test@finnexusai.com');
      cy.get('[data-cy="password-input"]').type('TestPassword123!');
      
      // Remove CSRF token if it exists
      cy.get('input[name="csrfToken"]').invoke('remove');
      
      cy.get('[data-cy="login-button"]').click();
      
      cy.get('[data-cy="error-message"]').should('contain', 'CSRF token missing');
    });
  });
});
