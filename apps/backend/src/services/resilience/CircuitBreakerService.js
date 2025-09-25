/**
 * FinAI Nexus - Circuit Breaker Service
 *
 * Implements circuit breaker pattern for resilience and fault tolerance
 * Handles service failures gracefully with automatic recovery
 */

const EventEmitter = require('events');
const logger = require('../../utils/logger');

class CircuitBreakerService extends EventEmitter {
  constructor(options = {}) {
    super();

    // Circuit breaker configuration
    this.config = {
      failureThreshold: options.failureThreshold || 5,
      resetTimeout: options.resetTimeout || 60000, // 1 minute
      monitoringPeriod: options.monitoringPeriod || 10000, // 10 seconds
      timeout: options.timeout || 5000, // 5 seconds
      ...options
    };

    // Circuit states
    this.states = {
      CLOSED: 'CLOSED',
      OPEN: 'OPEN',
      HALF_OPEN: 'HALF_OPEN'
    };

    // Circuit breaker state
    this.state = this.states.CLOSED;
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.nextAttempt = null;

    // Statistics
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      circuitOpens: 0,
      circuitCloses: 0
    };

    // Start monitoring
    this.startMonitoring();
  }

  /**
   * Execute function with circuit breaker protection
   */
  async execute(func, context = {}) {
    if (this.state === this.states.OPEN) {
      if (Date.now() < this.nextAttempt) {
        this.stats.failedRequests++;
        throw new Error('Circuit breaker is OPEN - service unavailable');
      }

      // Transition to HALF_OPEN
      this.state = this.states.HALF_OPEN;
      this.emit('stateChange', { from: this.states.OPEN, to: this.states.HALF_OPEN });
    }

    this.stats.totalRequests++;

    try {
      // Execute function with timeout
      const result = await this.executeWithTimeout(func, context);

      // Success - reset failure count
      this.onSuccess();
      return result;

    } catch (error) {
      // Failure - increment failure count
      this.onFailure(error);
      throw error;
    }
  }

  /**
   * Execute function with timeout
   */
  async executeWithTimeout(func, context) {
    return new Promise(async(resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Circuit breaker timeout: ${this.config.timeout}ms`));
      }, this.config.timeout);

      try {
        const result = await func(context);
        clearTimeout(timeout);
        resolve(result);
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  /**
   * Handle successful execution
   */
  onSuccess() {
    this.stats.successfulRequests++;
    this.failureCount = 0;

    if (this.state === this.states.HALF_OPEN) {
      this.state = this.states.CLOSED;
      this.stats.circuitCloses++;
      this.emit('stateChange', { from: this.states.HALF_OPEN, to: this.states.CLOSED });
      this.emit('circuitClosed');
    }
  }

  /**
   * Handle failed execution
   */
  onFailure(error) {
    this.stats.failedRequests++;
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === this.states.HALF_OPEN) {
      // Immediate failure in HALF_OPEN state - open circuit
      this.state = this.states.OPEN;
      this.nextAttempt = Date.now() + this.config.resetTimeout;
      this.stats.circuitOpens++;
      this.emit('stateChange', { from: this.states.HALF_OPEN, to: this.states.OPEN });
      this.emit('circuitOpened', { error, failureCount: this.failureCount });
    } else if (this.failureCount >= this.config.failureThreshold) {
      // Threshold reached - open circuit
      this.state = this.states.OPEN;
      this.nextAttempt = Date.now() + this.config.resetTimeout;
      this.stats.circuitOpens++;
      this.emit('stateChange', { from: this.states.CLOSED, to: this.states.OPEN });
      this.emit('circuitOpened', { error, failureCount: this.failureCount });
    }
  }

  /**
   * Start monitoring circuit breaker state
   */
  startMonitoring() {
    setInterval(() => {
      this.monitor();
    }, this.config.monitoringPeriod);
  }

  /**
   * Monitor circuit breaker state and emit events
   */
  monitor() {
    const health = this.getHealth();

    this.emit('monitor', {
      state: this.state,
      health,
      stats: { ...this.stats },
      failureCount: this.failureCount,
      nextAttempt: this.nextAttempt
    });

    // Check if circuit should transition from OPEN to HALF_OPEN
    if (this.state === this.states.OPEN && Date.now() >= this.nextAttempt) {
      this.state = this.states.HALF_OPEN;
      this.emit('stateChange', { from: this.states.OPEN, to: this.states.HALF_OPEN });
      this.emit('circuitHalfOpen');
    }
  }

  /**
   * Get circuit breaker health information
   */
  getHealth() {
    const totalRequests = this.stats.totalRequests;
    const successRate = totalRequests > 0 ? (this.stats.successfulRequests / totalRequests) * 100 : 100;
    const failureRate = totalRequests > 0 ? (this.stats.failedRequests / totalRequests) * 100 : 0;

    return {
      state: this.state,
      successRate: Math.round(successRate * 100) / 100,
      failureRate: Math.round(failureRate * 100) / 100,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      nextAttempt: this.nextAttempt,
      isHealthy: this.state === this.states.CLOSED && successRate > 95,
      stats: { ...this.stats }
    };
  }

  /**
   * Reset circuit breaker to initial state
   */
  reset() {
    this.state = this.states.CLOSED;
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.nextAttempt = null;

    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      circuitOpens: 0,
      circuitCloses: 0
    };

    this.emit('reset');
  }

  /**
   * Get current state
   */
  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      nextAttempt: this.nextAttempt
    };
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      ...this.stats,
      health: this.getHealth()
    };
  }
}

/**
 * Circuit breaker manager for multiple services
 */
class CircuitBreakerManager {
  constructor() {
    this.breakers = new Map();
    this.defaultConfig = {
      failureThreshold: 5,
      resetTimeout: 60000,
      monitoringPeriod: 10000,
      timeout: 5000
    };
  }

  /**
   * Create or get circuit breaker for service
   */
  getBreaker(serviceName, config = {}) {
    if (!this.breakers.has(serviceName)) {
      const breakerConfig = { ...this.defaultConfig, ...config };
      const breaker = new CircuitBreakerService(breakerConfig);

      // Add service name to breaker
      breaker.serviceName = serviceName;

      // Set up event listeners
      breaker.on('circuitOpened', (data) => {
        logger.warn(`🚨 Circuit breaker OPENED for service: ${serviceName}`, data);
      });

      breaker.on('circuitClosed', () => {
        logger.info(`✅ Circuit breaker CLOSED for service: ${serviceName}`);
      });

      breaker.on('circuitHalfOpen', () => {
        logger.info(`⚠️ Circuit breaker HALF-OPEN for service: ${serviceName}`);
      });

      this.breakers.set(serviceName, breaker);
    }

    return this.breakers.get(serviceName);
  }

  /**
   * Execute function with circuit breaker protection
   */
  async execute(serviceName, func, context = {}) {
    const breaker = this.getBreaker(serviceName);
    return await breaker.execute(func, context);
  }

  /**
   * Get health status of all circuit breakers
   */
  getAllHealth() {
    const health = {};

    for (const [serviceName, breaker] of this.breakers) {
      health[serviceName] = breaker.getHealth();
    }

    return health;
  }

  /**
   * Get statistics for all circuit breakers
   */
  getAllStats() {
    const stats = {};

    for (const [serviceName, breaker] of this.breakers) {
      stats[serviceName] = breaker.getStats();
    }

    return stats;
  }

  /**
   * Reset all circuit breakers
   */
  resetAll() {
    for (const [_serviceName, breaker] of this.breakers) {
      breaker.reset();
    }
  }

  /**
   * Remove circuit breaker for service
   */
  removeBreaker(serviceName) {
    if (this.breakers.has(serviceName)) {
      this.breakers.delete(serviceName);
    }
  }
}

// Create singleton instance
const circuitBreakerManager = new CircuitBreakerManager();

module.exports = {
  CircuitBreakerService,
  CircuitBreakerManager,
  circuitBreakerManager
};


