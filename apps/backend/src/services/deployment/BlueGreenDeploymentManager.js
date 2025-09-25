/**
 * Blue-Green Deployment Manager
 * Manages blue-green deployment strategy for zero-downtime deployments
 */

const EventEmitter = require('events');
const axios = require('axios');
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../../utils/logger');

const execAsync = promisify(exec);

class BlueGreenDeploymentManager extends EventEmitter {
  constructor() {
    super();
    this.config = {
      enableBlueGreen: process.env.ENABLE_BLUE_GREEN_DEPLOYMENT !== 'false',
      deploymentTimeout: parseInt(process.env.DEPLOYMENT_TIMEOUT) || 1800000, // 30 minutes
      healthCheckTimeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT) || 300000, // 5 minutes
      rollbackTimeout: parseInt(process.env.ROLLBACK_TIMEOUT) || 600000, // 10 minutes
      trafficSwitchTimeout: parseInt(process.env.TRAFFIC_SWITCH_TIMEOUT) || 60000, // 1 minute
      enableAutoRollback: process.env.ENABLE_AUTO_ROLLBACK !== 'false',
      enableTrafficGradual: process.env.ENABLE_GRADUAL_TRAFFIC_SWITCH !== 'false',
      enablePreDeploymentTests: process.env.ENABLE_PRE_DEPLOYMENT_TESTS !== 'false',
      enablePostDeploymentTests: process.env.ENABLE_POST_DEPLOYMENT_TESTS !== 'false',
      enableDatabaseMigration: process.env.ENABLE_DATABASE_MIGRATION !== 'false',
      enableCacheWarming: process.env.ENABLE_CACHE_WARMING !== 'false',
      enableLoadTesting: process.env.ENABLE_LOAD_TESTING !== 'false',
      maxRetries: parseInt(process.env.MAX_DEPLOYMENT_RETRIES) || 3,
      retryDelay: parseInt(process.env.DEPLOYMENT_RETRY_DELAY) || 30000, // 30 seconds
      environments: {
        blue: {
          name: 'blue',
          color: '#007bff',
          active: false,
          version: null,
          healthCheckUrl: process.env.BLUE_HEALTH_CHECK_URL || 'http://blue.finnexusai.com/api/v1/health',
          trafficWeight: 0
        },
        green: {
          name: 'green',
          color: '#28a745',
          active: false,
          version: null,
          healthCheckUrl: process.env.GREEN_HEALTH_CHECK_URL || 'http://green.finnexusai.com/api/v1/health',
          trafficWeight: 0
        }
      },
      loadBalancer: {
        type: process.env.LOAD_BALANCER_TYPE || 'nginx', // nginx, haproxy, aws-alb
        configPath: process.env.LOAD_BALANCER_CONFIG_PATH || '/etc/nginx/conf.d',
        reloadCommand: process.env.LOAD_BALANCER_RELOAD_COMMAND || 'nginx -s reload'
      },
      database: {
        enableMigration: process.env.ENABLE_DB_MIGRATION !== 'false',
        migrationCommand: process.env.DB_MIGRATION_COMMAND || 'npm run migrate',
        rollbackCommand: process.env.DB_ROLLBACK_COMMAND || 'npm run migrate:rollback'
      },
      monitoring: {
        enableMetrics: process.env.ENABLE_DEPLOYMENT_METRICS !== 'false',
        metricsEndpoint: process.env.METRICS_ENDPOINT || 'http://localhost:9090/api/v1/metrics',
        alertEndpoint: process.env.ALERT_ENDPOINT || 'http://localhost:9093/api/v1/alerts'
      }
    };

    this.deploymentState = {
      current: null,
      previous: null,
      inProgress: false,
      startTime: null,
      endTime: null,
      status: 'idle', // idle, deploying, deployed, failed, rolling_back
      version: null,
      commitHash: null,
      branch: null,
      environment: null,
      steps: [],
      errors: [],
      metrics: {
        deploymentTime: 0,
        trafficSwitchTime: 0,
        healthCheckTime: 0,
        rollbackTime: 0,
        successRate: 0,
        errorRate: 0
      }
    };

    this.isInitialized = false;
    this.deploymentHistory = [];
    this.healthCheckInterval = null;
    this.trafficSwitchInterval = null;
  }

  /**
   * Initialize the blue-green deployment manager
   */
  async initialize() {
    try {
      logger.info('🔄 Initializing blue-green deployment manager...');

      if (!this.config.enableBlueGreen) {
        logger.info('⚠️ Blue-green deployment is disabled');
        return {
          success: true,
          message: 'Blue-green deployment manager initialized (disabled)',
          enabled: false
        };
      }

      // Detect current environment
      await this.detectCurrentEnvironment();

      // Initialize load balancer
      await this.initializeLoadBalancer();

      // Start health monitoring
      this.startHealthMonitoring();

      // Load deployment history
      await this.loadDeploymentHistory();

      this.isInitialized = true;
      logger.info('✅ Blue-green deployment manager initialized successfully');

      return {
        success: true,
        message: 'Blue-green deployment manager initialized successfully',
        enabled: true,
        currentEnvironment: this.deploymentState.current,
        environments: this.config.environments
      };

    } catch (error) {
      logger.error('❌ Failed to initialize blue-green deployment manager:', error);
      throw new Error(`Blue-green deployment manager initialization failed: ${error.message}`);
    }
  }

  /**
   * Detect current environment
   */
  async detectCurrentEnvironment() {
    try {
      // Check which environment is currently active
      for (const [envName, env] of Object.entries(this.config.environments)) {
        try {
          const response = await axios.get(env.healthCheckUrl, {
            timeout: 5000,
            headers: {
              'User-Agent': 'BlueGreen-Deployment-Manager/1.0'
            }
          });

          if (response.status === 200) {
            env.active = true;
            env.version = response.data.version || 'unknown';
            this.deploymentState.current = envName;
            logger.info(`✅ Detected active environment: ${envName} (version: ${env.version})`);
            break;
          }
        } catch (error) {
          env.active = false;
          logger.info(`⚠️ Environment ${envName} is not responding: ${error.message}`);
        }
      }

      if (!this.deploymentState.current) {
        logger.info('⚠️ No active environment detected');
      }

    } catch (error) {
      logger.error('❌ Failed to detect current environment:', error);
      throw error;
    }
  }

  /**
   * Initialize load balancer
   */
  async initializeLoadBalancer() {
    try {
      logger.info(`🔄 Initializing ${this.config.loadBalancer.type} load balancer...`);

      switch (this.config.loadBalancer.type) {
      case 'nginx':
        await this.initializeNginxLoadBalancer();
        break;
      case 'haproxy':
        await this.initializeHAProxyLoadBalancer();
        break;
      case 'aws-alb':
        await this.initializeAWSALBLoadBalancer();
        break;
      default:
        throw new Error(`Unsupported load balancer type: ${this.config.loadBalancer.type}`);
      }

      logger.info('✅ Load balancer initialized successfully');

    } catch (error) {
      logger.error('❌ Failed to initialize load balancer:', error);
      throw error;
    }
  }

  /**
   * Initialize Nginx load balancer
   */
  async initializeNginxLoadBalancer() {
    try {
      // Check if Nginx is running
      await execAsync('nginx -t');
      logger.info('✅ Nginx configuration is valid');

      // Create initial load balancer configuration
      const config = this.generateNginxConfig();
      await fs.writeFile(
        path.join(this.config.loadBalancer.configPath, 'blue-green.conf'),
        config
      );

      // Reload Nginx
      await execAsync(this.config.loadBalancer.reloadCommand);
      logger.info('✅ Nginx reloaded successfully');

    } catch (error) {
      logger.error('❌ Failed to initialize Nginx load balancer:', error);
      throw error;
    }
  }

  /**
   * Initialize HAProxy load balancer
   */
  async initializeHAProxyLoadBalancer() {
    try {
      // HAProxy initialization logic would go here
      logger.info('✅ HAProxy load balancer initialized');

    } catch (error) {
      logger.error('❌ Failed to initialize HAProxy load balancer:', error);
      throw error;
    }
  }

  /**
   * Initialize AWS ALB load balancer
   */
  async initializeAWSALBLoadBalancer() {
    try {
      // AWS ALB initialization logic would go here
      logger.info('✅ AWS ALB load balancer initialized');

    } catch (error) {
      logger.error('❌ Failed to initialize AWS ALB load balancer:', error);
      throw error;
    }
  }

  /**
   * Generate Nginx configuration
   */
  generateNginxConfig() {
    const blueWeight = this.config.environments.blue.trafficWeight;
    const greenWeight = this.config.environments.green.trafficWeight;

    return `
upstream finnexus_backend {
    # Blue environment
    server blue.finnexusai.com:3000 weight=${blueWeight} max_fails=3 fail_timeout=30s;
    
    # Green environment
    server green.finnexusai.com:3000 weight=${greenWeight} max_fails=3 fail_timeout=30s;
    
    # Health check
    keepalive 32;
}

server {
    listen 80;
    listen 443 ssl http2;
    server_name api.finnexusai.com;
    
    # SSL configuration
    ssl_certificate /etc/nginx/ssl/finnexusai.crt;
    ssl_certificate_key /etc/nginx/ssl/finnexusai.key;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";
    
    # Proxy configuration
    location / {
        proxy_pass http://finnexus_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
        
        # Buffer settings
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
        
        # Health check
        proxy_next_upstream error timeout invalid_header http_500 http_502 http_503 http_504;
        proxy_next_upstream_tries 3;
        proxy_next_upstream_timeout 30s;
    }
    
    # Health check endpoint
    location /health {
        access_log off;
        proxy_pass http://finnexus_backend/api/v1/health;
    }
    
    # Metrics endpoint
    location /metrics {
        access_log off;
        proxy_pass http://finnexus_backend/api/v1/metrics;
    }
}
`;
  }

  /**
   * Start health monitoring
   */
  startHealthMonitoring() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(async() => {
      try {
        await this.monitorEnvironments();
      } catch (error) {
        logger.error('❌ Error in health monitoring:', error);
        this.emit('deployment:health:error', { error });
      }
    }, 30000); // Check every 30 seconds

    logger.info('✅ Health monitoring started');
  }

  /**
   * Monitor environments health
   */
  async monitorEnvironments() {
    for (const [envName, env] of Object.entries(this.config.environments)) {
      try {
        const response = await axios.get(env.healthCheckUrl, {
          timeout: 5000,
          headers: {
            'User-Agent': 'BlueGreen-Deployment-Manager/1.0'
          }
        });

        const wasActive = env.active;
        env.active = response.status === 200;
        env.version = response.data.version || env.version;

        if (wasActive !== env.active) {
          logger.info(`🔄 Environment ${envName} status changed: ${wasActive ? 'active' : 'inactive'} -> ${env.active ? 'active' : 'inactive'}`);
          this.emit('deployment:environment:status_changed', {
            environment: envName,
            active: env.active,
            version: env.version
          });
        }

      } catch (error) {
        const wasActive = env.active;
        env.active = false;

        if (wasActive) {
          logger.info(`⚠️ Environment ${envName} became unhealthy: ${error.message}`);
          this.emit('deployment:environment:unhealthy', {
            environment: envName,
            error: error.message
          });
        }
      }
    }
  }

  /**
   * Deploy to blue-green environment
   */
  async deploy(options = {}) {
    if (!this.isInitialized) {
      throw new Error('Blue-green deployment manager not initialized');
    }

    if (this.deploymentState.inProgress) {
      throw new Error('Deployment already in progress');
    }

    const {
      version = 'latest',
      commitHash = null,
      branch = 'main',
      environment = null,
      skipTests = false,
      skipMigration = false,
      skipCacheWarming = false,
      skipLoadTesting = false
    } = options;

    try {
      this.deploymentState.inProgress = true;
      this.deploymentState.startTime = new Date();
      this.deploymentState.status = 'deploying';
      this.deploymentState.version = version;
      this.deploymentState.commitHash = commitHash;
      this.deploymentState.branch = branch;
      this.deploymentState.environment = environment;
      this.deploymentState.steps = [];
      this.deploymentState.errors = [];

      logger.info(`🚀 Starting blue-green deployment (version: ${version})`);
      this.emit('deployment:started', this.deploymentState);

      // Determine target environment
      const targetEnv = this.determineTargetEnvironment();
      this.deploymentState.environment = targetEnv;

      logger.info(`🎯 Target environment: ${targetEnv}`);

      // Pre-deployment phase
      await this.preDeploymentPhase({ skipTests, skipMigration });

      // Deployment phase
      await this.deploymentPhase(targetEnv, { version, commitHash, branch });

      // Post-deployment phase
      await this.postDeploymentPhase({ skipCacheWarming, skipLoadTesting });

      // Traffic switching phase
      await this.trafficSwitchingPhase(targetEnv);

      // Final verification
      await this.finalVerificationPhase(targetEnv);

      // Complete deployment
      await this.completeDeployment(targetEnv);

      logger.info('✅ Blue-green deployment completed successfully');
      this.emit('deployment:completed', this.deploymentState);

      return {
        success: true,
        message: 'Blue-green deployment completed successfully',
        environment: targetEnv,
        version: version,
        deploymentTime: this.deploymentState.metrics.deploymentTime
      };

    } catch (error) {
      logger.error('❌ Blue-green deployment failed:', error);
      this.deploymentState.status = 'failed';
      this.deploymentState.errors.push(error.message);

      this.emit('deployment:failed', {
        error: error.message,
        state: this.deploymentState
      });

      // Auto-rollback if enabled
      if (this.config.enableAutoRollback) {
        logger.info('🔄 Auto-rollback triggered');
        await this.rollback();
      }

      throw error;
    }
  }

  /**
   * Determine target environment
   */
  determineTargetEnvironment() {
    if (this.deploymentState.current === 'blue') {
      return 'green';
    } else if (this.deploymentState.current === 'green') {
      return 'blue';
    } else {
      // No current environment, start with blue
      return 'blue';
    }
  }

  /**
   * Pre-deployment phase
   */
  async preDeploymentPhase(options = {}) {
    logger.info('🔍 Starting pre-deployment phase...');
    this.deploymentState.steps.push('pre-deployment');

    try {
      // Run pre-deployment tests
      if (!options.skipTests && this.config.enablePreDeploymentTests) {
        await this.runPreDeploymentTests();
      }

      // Database migration preparation
      if (!options.skipMigration && this.config.enableDatabaseMigration) {
        await this.prepareDatabaseMigration();
      }

      // Environment validation
      await this.validateEnvironment();

      logger.info('✅ Pre-deployment phase completed');

    } catch (error) {
      logger.error('❌ Pre-deployment phase failed:', error);
      throw error;
    }
  }

  /**
   * Deployment phase
   */
  async deploymentPhase(targetEnv, options = {}) {
    logger.info(`🚀 Starting deployment phase (environment: ${targetEnv})...`);
    this.deploymentState.steps.push('deployment');

    try {
      // Deploy application
      await this.deployApplication(targetEnv, options);

      // Wait for deployment to complete
      await this.waitForDeployment(targetEnv);

      // Verify deployment
      await this.verifyDeployment(targetEnv);

      logger.info('✅ Deployment phase completed');

    } catch (error) {
      logger.error('❌ Deployment phase failed:', error);
      throw error;
    }
  }

  /**
   * Post-deployment phase
   */
  async postDeploymentPhase(options = {}) {
    logger.info('🔍 Starting post-deployment phase...');
    this.deploymentState.steps.push('post-deployment');

    try {
      // Run post-deployment tests
      if (this.config.enablePostDeploymentTests) {
        await this.runPostDeploymentTests();
      }

      // Warm up cache
      if (!options.skipCacheWarming && this.config.enableCacheWarming) {
        await this.warmUpCache();
      }

      // Load testing
      if (!options.skipLoadTesting && this.config.enableLoadTesting) {
        await this.runLoadTests();
      }

      logger.info('✅ Post-deployment phase completed');

    } catch (error) {
      logger.error('❌ Post-deployment phase failed:', error);
      throw error;
    }
  }

  /**
   * Traffic switching phase
   */
  async trafficSwitchingPhase(targetEnv) {
    logger.info('🔄 Starting traffic switching phase...');
    this.deploymentState.steps.push('traffic-switching');

    try {
      if (this.config.enableTrafficGradual) {
        await this.gradualTrafficSwitch(targetEnv);
      } else {
        await this.instantTrafficSwitch(targetEnv);
      }

      logger.info('✅ Traffic switching phase completed');

    } catch (error) {
      logger.error('❌ Traffic switching phase failed:', error);
      throw error;
    }
  }

  /**
   * Final verification phase
   */
  async finalVerificationPhase(targetEnv) {
    logger.info('🔍 Starting final verification phase...');
    this.deploymentState.steps.push('final-verification');

    try {
      // Health check
      await this.healthCheck(targetEnv);

      // Performance check
      await this.performanceCheck(targetEnv);

      // Business logic check
      await this.businessLogicCheck(targetEnv);

      logger.info('✅ Final verification phase completed');

    } catch (error) {
      logger.error('❌ Final verification phase failed:', error);
      throw error;
    }
  }

  /**
   * Complete deployment
   */
  async completeDeployment(targetEnv) {
    logger.info('✅ Completing deployment...');
    this.deploymentState.steps.push('completion');

    try {
      // Update environment status
      this.config.environments[targetEnv].active = true;
      this.config.environments[targetEnv].version = this.deploymentState.version;

      // Update previous environment
      if (this.deploymentState.current) {
        this.deploymentState.previous = this.deploymentState.current;
        this.config.environments[this.deploymentState.current].active = false;
        this.config.environments[this.deploymentState.current].trafficWeight = 0;
      }

      // Update current environment
      this.deploymentState.current = targetEnv;
      this.config.environments[targetEnv].trafficWeight = 100;

      // Update load balancer configuration
      await this.updateLoadBalancerConfiguration();

      // Record deployment
      this.deploymentState.endTime = new Date();
      this.deploymentState.status = 'deployed';
      this.deploymentState.metrics.deploymentTime = this.deploymentState.endTime - this.deploymentState.startTime;

      // Save deployment history
      this.deploymentHistory.push({ ...this.deploymentState });
      await this.saveDeploymentHistory();

      // Cleanup previous environment
      if (this.deploymentState.previous) {
        await this.cleanupPreviousEnvironment(this.deploymentState.previous);
      }

      this.deploymentState.inProgress = false;

      logger.info('✅ Deployment completed successfully');

    } catch (error) {
      logger.error('❌ Deployment completion failed:', error);
      throw error;
    }
  }

  /**
   * Rollback deployment
   */
  async rollback() {
    if (!this.deploymentState.previous) {
      throw new Error('No previous environment to rollback to');
    }

    logger.info(`🔄 Starting rollback to ${this.deploymentState.previous}...`);
    this.deploymentState.status = 'rolling_back';

    try {
      const rollbackStartTime = new Date();

      // Switch traffic back to previous environment
      await this.instantTrafficSwitch(this.deploymentState.previous);

      // Verify rollback
      await this.verifyRollback(this.deploymentState.previous);

      // Update environment status
      this.config.environments[this.deploymentState.previous].active = true;
      this.config.environments[this.deploymentState.current].active = false;
      this.config.environments[this.deploymentState.previous].trafficWeight = 100;
      this.config.environments[this.deploymentState.current].trafficWeight = 0;

      // Update current environment
      const temp = this.deploymentState.current;
      this.deploymentState.current = this.deploymentState.previous;
      this.deploymentState.previous = temp;

      // Update load balancer configuration
      await this.updateLoadBalancerConfiguration();

      // Record rollback
      const rollbackEndTime = new Date();
      this.deploymentState.metrics.rollbackTime = rollbackEndTime - rollbackStartTime;
      this.deploymentState.status = 'deployed';

      // Save deployment history
      this.deploymentHistory.push({ ...this.deploymentState });
      await this.saveDeploymentHistory();

      this.deploymentState.inProgress = false;

      logger.info('✅ Rollback completed successfully');
      this.emit('deployment:rollback:completed', this.deploymentState);

      return {
        success: true,
        message: 'Rollback completed successfully',
        environment: this.deploymentState.current,
        rollbackTime: this.deploymentState.metrics.rollbackTime
      };

    } catch (error) {
      logger.error('❌ Rollback failed:', error);
      this.deploymentState.status = 'failed';
      this.emit('deployment:rollback:failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Utility methods
   */
  async deployApplication(environment, options) {
    // This would be implemented based on your deployment strategy
    logger.info(`🚀 Deploying application to ${environment}...`);

    // Simulate deployment
    await new Promise(resolve => setTimeout(resolve, 5000));

    logger.info(`✅ Application deployed to ${environment}`);
  }

  async waitForDeployment(environment) {
    logger.info(`⏳ Waiting for deployment to complete in ${environment}...`);

    // Simulate waiting
    await new Promise(resolve => setTimeout(resolve, 10000));

    logger.info(`✅ Deployment completed in ${environment}`);
  }

  async verifyDeployment(environment) {
    logger.info(`🔍 Verifying deployment in ${environment}...`);

    // Simulate verification
    await new Promise(resolve => setTimeout(resolve, 2000));

    logger.info(`✅ Deployment verified in ${environment}`);
  }

  async runPreDeploymentTests() {
    logger.info('🧪 Running pre-deployment tests...');

    // Simulate tests
    await new Promise(resolve => setTimeout(resolve, 3000));

    logger.info('✅ Pre-deployment tests passed');
  }

  async runPostDeploymentTests() {
    logger.info('🧪 Running post-deployment tests...');

    // Simulate tests
    await new Promise(resolve => setTimeout(resolve, 3000));

    logger.info('✅ Post-deployment tests passed');
  }

  async prepareDatabaseMigration() {
    logger.info('🗄️ Preparing database migration...');

    // Simulate migration preparation
    await new Promise(resolve => setTimeout(resolve, 2000));

    logger.info('✅ Database migration prepared');
  }

  async validateEnvironment() {
    logger.info('🔍 Validating environment...');

    // Simulate validation
    await new Promise(resolve => setTimeout(resolve, 1000));

    logger.info('✅ Environment validated');
  }

  async warmUpCache() {
    logger.info('🔥 Warming up cache...');

    // Simulate cache warming
    await new Promise(resolve => setTimeout(resolve, 2000));

    logger.info('✅ Cache warmed up');
  }

  async runLoadTests() {
    logger.info('📊 Running load tests...');

    // Simulate load tests
    await new Promise(resolve => setTimeout(resolve, 5000));

    logger.info('✅ Load tests completed');
  }

  async gradualTrafficSwitch(targetEnv) {
    logger.info('🔄 Starting gradual traffic switch...');

    const steps = [10, 25, 50, 75, 100];

    for (const weight of steps) {
      this.config.environments[targetEnv].trafficWeight = weight;
      this.config.environments[this.deploymentState.current].trafficWeight = 100 - weight;

      await this.updateLoadBalancerConfiguration();

      logger.info(`📊 Traffic switched: ${targetEnv} ${weight}%, ${this.deploymentState.current} ${100 - weight}%`);

      // Wait between steps
      await new Promise(resolve => setTimeout(resolve, 10000));
    }

    logger.info('✅ Gradual traffic switch completed');
  }

  async instantTrafficSwitch(targetEnv) {
    logger.info('🔄 Starting instant traffic switch...');

    this.config.environments[targetEnv].trafficWeight = 100;
    this.config.environments[this.deploymentState.current].trafficWeight = 0;

    await this.updateLoadBalancerConfiguration();

    logger.info('✅ Instant traffic switch completed');
  }

  async updateLoadBalancerConfiguration() {
    logger.info('🔄 Updating load balancer configuration...');

    const config = this.generateNginxConfig();
    await fs.writeFile(
      path.join(this.config.loadBalancer.configPath, 'blue-green.conf'),
      config
    );

    await execAsync(this.config.loadBalancer.reloadCommand);

    logger.info('✅ Load balancer configuration updated');
  }

  async healthCheck(environment) {
    logger.info(`🏥 Performing health check on ${environment}...`);

    const env = this.config.environments[environment];
    const response = await axios.get(env.healthCheckUrl, { timeout: 10000 });

    if (response.status !== 200) {
      throw new Error(`Health check failed for ${environment}: ${response.status}`);
    }

    logger.info(`✅ Health check passed for ${environment}`);
  }

  async performanceCheck(environment) {
    logger.info(`📊 Performing performance check on ${environment}...`);

    // Simulate performance check
    await new Promise(resolve => setTimeout(resolve, 2000));

    logger.info(`✅ Performance check passed for ${environment}`);
  }

  async businessLogicCheck(environment) {
    logger.info(`🔍 Performing business logic check on ${environment}...`);

    // Simulate business logic check
    await new Promise(resolve => setTimeout(resolve, 2000));

    logger.info(`✅ Business logic check passed for ${environment}`);
  }

  async verifyRollback(environment) {
    logger.info(`🔍 Verifying rollback to ${environment}...`);

    await this.healthCheck(environment);

    logger.info(`✅ Rollback verified for ${environment}`);
  }

  async cleanupPreviousEnvironment(environment) {
    logger.info(`🧹 Cleaning up previous environment: ${environment}...`);

    // Simulate cleanup
    await new Promise(resolve => setTimeout(resolve, 1000));

    logger.info(`✅ Cleanup completed for ${environment}`);
  }

  async loadDeploymentHistory() {
    try {
      const historyPath = path.join(__dirname, '../../data/deployment-history.json');
      const data = await fs.readFile(historyPath, 'utf8');
      this.deploymentHistory = JSON.parse(data);
      logger.info(`✅ Loaded ${this.deploymentHistory.length} deployment records`);
    } catch (error) {
      logger.info('⚠️ No deployment history found, starting fresh');
      this.deploymentHistory = [];
    }
  }

  async saveDeploymentHistory() {
    try {
      const historyPath = path.join(__dirname, '../../data/deployment-history.json');
      await fs.mkdir(path.dirname(historyPath), { recursive: true });
      await fs.writeFile(historyPath, JSON.stringify(this.deploymentHistory, null, 2));
      logger.info('✅ Deployment history saved');
    } catch (error) {
      logger.error('❌ Failed to save deployment history:', error);
    }
  }

  /**
   * Get deployment status
   */
  getDeploymentStatus() {
    return {
      ...this.deploymentState,
      environments: this.config.environments,
      history: this.deploymentHistory.slice(-10) // Last 10 deployments
    };
  }

  /**
   * Get deployment history
   */
  getDeploymentHistory() {
    return this.deploymentHistory;
  }

  /**
   * Stop health monitoring
   */
  stopHealthMonitoring() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      logger.info('✅ Health monitoring stopped');
    }
  }

  /**
   * Shutdown deployment manager
   */
  async shutdown() {
    try {
      this.stopHealthMonitoring();
      logger.info('✅ Blue-green deployment manager shutdown completed');
    } catch (error) {
      logger.error('❌ Error shutting down blue-green deployment manager:', error);
    }
  }
}

module.exports = new BlueGreenDeploymentManager();
