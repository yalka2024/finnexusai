/**
 * Circuit Breaker Pattern Implementation
 * Provides fault tolerance and resilience for external service calls
 */

const _EventEmitter = require('events');

class CircuitBreaker extends EventEmitter {
  constructor(name, options = {}) {
    super();

    this.name = name;
    this.config = {
      timeout: options.timeout || 3000,
      errorThreshold: options.errorThreshold || 50, // percentage
      volumeThreshold: options.volumeThreshold || 10, // minimum requests before checking
      resetTimeout: options.resetTimeout || 60000, // 1 minute
      monitoringPeriod: options.monitoringPeriod || 10000, // 10 seconds
      halfOpenMaxCalls: options.halfOpenMaxCalls || 3
    };

    this.states = {
      CLOSED: 'CLOSED',
      OPEN: 'OPEN',
      HALF_OPEN: 'HALF_OPEN'
    };

    this.state = this.states.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.requestCount = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;
    this.halfOpenCalls = 0;

    // Statistics
    this.stats = {
      totalRequests: 0,
      totalFailures: 0,
      totalSuccesses: 0,
      totalTimeouts: 0,
      lastResetTime: Date.now()
    };

    // Start monitoring
    this.startMonitoring();
  }

  /**
   * Execute function with circuit breaker protection
   */
  async execute(fn, fallbackFn = null) {
    this.stats.totalRequests++;

    // Check if circuit is open
    if (this.state === this.states.OPEN) {
      if (Date.now() < this.nextAttemptTime) {
        this.emit('circuitBreaker:rejected', {
          name: this.name,
          state: this.state,
          reason: 'Circuit is open'
        });

        if (fallbackFn) {
          try {
            return await fallbackFn();
          } catch (error) {
            this.emit('circuitBreaker:fallbackFailed', {
              name: this.name,
              error: error.message
            });
            throw error;
          }
        }

        throw new Error(`Circuit breaker ${this.name} is OPEN`);
      } else {
        this.state = this.states.HALF_OPEN;
        this.halfOpenCalls = 0;
        this.emit('circuitBreaker:halfOpen', { name: this.name });
      }
    }

    // Check half-open state limits
    if (this.state === this.states.HALF_OPEN) {
      if (this.halfOpenCalls >= this.config.halfOpenMaxCalls) {
        this.emit('circuitBreaker:rejected', {
          name: this.name,
          state: this.state,
          reason: 'Half-open call limit reached'
        });

        if (fallbackFn) {
          return await fallbackFn();
        }

        throw new Error(`Circuit breaker ${this.name} is HALF_OPEN (max calls reached)`);
      }

      this.halfOpenCalls++;
    }

    const _startTime = Date.now();

    try {
      // Execute function with timeout
      const _result = await Promise.race([
        fn(),
        new Promise(_(_, _reject) =>
          setTimeout_(() => reject(new Error('Circuit breaker timeout')), this.config.timeout)
        )
      ]);

      const _duration = Date.now() - startTime;

      // Handle success
      this.onSuccess(duration);

      this.emit('circuitBreaker:success', {
        name: this.name,
        state: this.state,
        duration
      });

      return result;

    } catch (error) {
      const _duration = Date.now() - startTime;

      // Handle failure
      this.onFailure(error, duration);

      this.emit('circuitBreaker:failure', {
        name: this.name,
        state: this.state,
        error: error.message,
        duration
      });

      // Try fallback if available
      if (fallbackFn) {
        try {
          const _fallbackResult = await fallbackFn();
          this.emit('circuitBreaker:fallbackSuccess', {
            name: this.name,
            fallbackResult
          });
          return fallbackResult;
        } catch (fallbackError) {
          this.emit('circuitBreaker:fallbackFailed', {
            name: this.name,
            error: fallbackError.message
          });
          throw fallbackError;
        }
      }

      throw error;
    }
  }

  /**
   * Handle successful execution
   */
  onSuccess(_duration) {
    this.successCount++;
    this.stats.totalSuccesses++;
    this.requestCount++;

    if (this.state === this.states.HALF_OPEN) {
      // Check if we should close the circuit
      if (this.successCount >= this.config.halfOpenMaxCalls) {
        this.state = this.states.CLOSED;
        this.failureCount = 0;
        this.successCount = 0;
        this.requestCount = 0;
        this.halfOpenCalls = 0;

        this.emit('circuitBreaker:closed', {
          name: this.name,
          reason: 'Success threshold reached in half-open state'
        });
      }
    } else if (this.state === this.states.CLOSED) {
      // Reset failure count on success
      if (this.failureCount > 0) {
        this.failureCount = Math.max(0, this.failureCount - 1);
      }
    }
  }

  /**
   * Handle failed execution
   */
  onFailure(error, _duration) {
    this.failureCount++;
    this.stats.totalFailures++;
    this.requestCount++;
    this.lastFailureTime = Date.now();

    if (error.message === 'Circuit breaker timeout') {
      this.stats.totalTimeouts++;
    }

    // Check if we should open the circuit
    if (this.shouldOpenCircuit()) {
      this.state = this.states.OPEN;
      this.nextAttemptTime = Date.now() + this.config.resetTimeout;

      this.emit('circuitBreaker:opened', {
        name: this.name,
        reason: 'Error threshold exceeded',
        failureCount: this.failureCount,
        requestCount: this.requestCount,
        errorRate: this.getErrorRate()
      });
    } else if (this.state === this.states.HALF_OPEN) {
      // Open circuit immediately if failure in half-open state
      this.state = this.states.OPEN;
      this.nextAttemptTime = Date.now() + this.config.resetTimeout;

      this.emit('circuitBreaker:opened', {
        name: this.name,
        reason: 'Failure in half-open state',
        failureCount: this.failureCount
      });
    }
  }

  /**
   * Check if circuit should be opened
   */
  shouldOpenCircuit() {
    if (this.requestCount < this.config.volumeThreshold) {
      return false;
    }

    const _errorRate = this.getErrorRate();
    return errorRate >= this.config.errorThreshold;
  }

  /**
   * Get current error rate
   */
  getErrorRate() {
    if (this.requestCount === 0) {
      return 0;
    }
    return (this.failureCount / this.requestCount) * 100;
  }

  /**
   * Get current state
   */
  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      requestCount: this.requestCount,
      errorRate: this.getErrorRate(),
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime,
      halfOpenCalls: this.halfOpenCalls,
      stats: { ...this.stats }
    };
  }

  /**
   * Reset circuit breaker
   */
  reset() {
    this.state = this.states.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.requestCount = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;
    this.halfOpenCalls = 0;
    this.stats.lastResetTime = Date.now();

    this.emit('circuitBreaker:reset', {
      name: this.name,
      resetTime: this.stats.lastResetTime
    });
  }

  /**
   * Start monitoring circuit breaker
   */
  startMonitoring() {
    setInterval_(() => {
      this.emit('circuitBreaker:monitoring', {
        name: this.name,
        state: this.getState()
      });
    }, this.config.monitoringPeriod);
  }

  /**
   * Get health status
   */
  getHealthStatus() {
    const _state = this.getState();

    let _health = 'healthy';
    if (this.state === this.states.OPEN) {
      health = 'unhealthy';
    } else if (this.state === this.states.HALF_OPEN || state.errorRate > 25) {
      health = 'degraded';
    }

    return {
      name: this.name,
      health,
      state: this.state,
      errorRate: state.errorRate,
      requestCount: state.requestCount,
      lastFailureTime: state.lastFailureTime,
      nextAttemptTime: state.nextAttemptTime
    };
  }
}

/**
 * Circuit Breaker Manager
 * Manages multiple circuit breakers
 */
class CircuitBreakerManager extends EventEmitter {
  constructor() {
    super();
    this.breakers = new Map();
    this.defaultOptions = {
      timeout: 5000,
      errorThreshold: 50,
      volumeThreshold: 10,
      resetTimeout: 60000,
      monitoringPeriod: 10000,
      halfOpenMaxCalls: 3
    };
  }

  /**
   * Create or get circuit breaker
   */
  getBreaker(name, options = {}) {
    if (!this.breakers.has(name)) {
      const _breakerOptions = { ...this.defaultOptions, ...options };
      const _breaker = new CircuitBreaker(name, breakerOptions);

      // Forward events
      breaker.on(_'circuitBreaker:opened', _(data) => {
        this.emit('circuitBreaker:opened', data);
      });

      breaker.on(_'circuitBreaker:closed', _(data) => {
        this.emit('circuitBreaker:closed', data);
      });

      breaker.on(_'circuitBreaker:halfOpen', _(data) => {
        this.emit('circuitBreaker:halfOpen', data);
      });

      this.breakers.set(name, breaker);
    }

    return this.breakers.get(name);
  }

  /**
   * Execute function with circuit breaker
   */
  async execute(name, fn, fallbackFn = null, options = {}) {
    const _breaker = this.getBreaker(name, options);
    return await breaker.execute(fn, fallbackFn);
  }

  /**
   * Get all circuit breaker states
   */
  getAllStates() {
    const _states = {};
    for (const [name, breaker] of this.breakers) {
      states[name] = breaker.getState();
    }
    return states;
  }

  /**
   * Get health status of all circuit breakers
   */
  getAllHealthStatus() {
    const _healthStatus = {};
    for (const [name, breaker] of this.breakers) {
      healthStatus[name] = breaker.getHealthStatus();
    }
    return healthStatus;
  }

  /**
   * Reset all circuit breakers
   */
  resetAll() {
    for (const [_name, breaker] of this.breakers) {
      breaker.reset();
    }
  }

  /**
   * Reset specific circuit breaker
   */
  reset(name) {
    const _breaker = this.breakers.get(name);
    if (breaker) {
      breaker.reset();
    }
  }

  /**
   * Remove circuit breaker
   */
  remove(name) {
    const _breaker = this.breakers.get(name);
    if (breaker) {
      breaker.removeAllListeners();
      this.breakers.delete(name);
    }
  }
}

module.exports = {
  CircuitBreaker,
  CircuitBreakerManager
};
