/**
 * FinAI Nexus - Vault Service
 *
 * HashiCorp Vault integration for secrets management
 * Provides secure storage and retrieval of sensitive data
 */

const axios = require('axios');
const logger = require('../../utils/logger');

class VaultService {
  constructor(options = {}) {
    this.vaultUrl = options.vaultUrl || process.env.VAULT_ADDR || 'http://vault-service:8200';
    this.vaultToken = options.vaultToken || process.env.VAULT_TOKEN || 'root';
    this.secretPath = options.secretPath || 'finnexus';
    this.isInitialized = false;
    this.retryAttempts = 3;
    this.retryDelay = 1000;
  }

  /**
   * Initialize Vault service
   */
  async initialize() {
    try {
      // Check if Vault is available
      await this.healthCheck();

      // Verify token is valid
      await this.verifyToken();

      this.isInitialized = true;
      logger.info('✅ Vault service initialized successfully');

      return true;
    } catch (error) {
      logger.error('❌ Vault initialization failed:', error.message);
      this.isInitialized = false;
      return false;
    }
  }

  /**
   * Health check for Vault
   */
  async healthCheck() {
    try {
      const response = await axios.get(`${this.vaultUrl}/v1/sys/health`, {
        timeout: 5000,
        headers: {
          'X-Vault-Token': this.vaultToken
        }
      });

      if (response.status === 200) {
        return response.data;
      } else {
        throw new Error(`Vault health check failed with status: ${response.status}`);
      }
    } catch (error) {
      throw new Error(`Vault health check failed: ${error.message}`);
    }
  }

  /**
   * Verify Vault token is valid
   */
  async verifyToken() {
    try {
      const response = await axios.get(`${this.vaultUrl}/v1/auth/token/lookup-self`, {
        headers: {
          'X-Vault-Token': this.vaultToken
        }
      });

      if (response.status === 200) {
        return response.data;
      } else {
        throw new Error('Invalid Vault token');
      }
    } catch (error) {
      throw new Error(`Token verification failed: ${error.message}`);
    }
  }

  /**
   * Get secret from Vault with retry logic
   */
  async getSecret(path, retryCount = 0) {
    if (!this.isInitialized) {
      throw new Error('Vault service not initialized');
    }

    try {
      const response = await axios.get(`${this.vaultUrl}/v1/${this.secretPath}/data/${path}`, {
        headers: {
          'X-Vault-Token': this.vaultToken
        },
        timeout: 10000
      });

      if (response.status === 200 && response.data.data) {
        return response.data.data.data;
      } else {
        throw new Error(`Secret not found: ${path}`);
      }
    } catch (error) {
      if (retryCount < this.retryAttempts) {
        logger.warn(`⚠️ Vault request failed, retrying... (${retryCount + 1}/${this.retryAttempts})`);
        await this.delay(this.retryDelay * Math.pow(2, retryCount));
        return this.getSecret(path, retryCount + 1);
      }
      throw new Error(`Failed to get secret ${path}: ${error.message}`);
    }
  }

  /**
   * Store secret in Vault
   */
  async storeSecret(path, data, retryCount = 0) {
    if (!this.isInitialized) {
      throw new Error('Vault service not initialized');
    }

    try {
      const response = await axios.post(`${this.vaultUrl}/v1/${this.secretPath}/data/${path}`, {
        data: data
      }, {
        headers: {
          'X-Vault-Token': this.vaultToken,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      if (response.status === 200 || response.status === 204) {
        return response.data;
      } else {
        throw new Error(`Failed to store secret: ${path}`);
      }
    } catch (error) {
      if (retryCount < this.retryAttempts) {
        logger.warn(`⚠️ Vault store failed, retrying... (${retryCount + 1}/${this.retryAttempts})`);
        await this.delay(this.retryDelay * Math.pow(2, retryCount));
        return this.storeSecret(path, data, retryCount + 1);
      }
      throw new Error(`Failed to store secret ${path}: ${error.message}`);
    }
  }

  /**
   * Delete secret from Vault
   */
  async deleteSecret(path, retryCount = 0) {
    if (!this.isInitialized) {
      throw new Error('Vault service not initialized');
    }

    try {
      const response = await axios.delete(`${this.vaultUrl}/v1/${this.secretPath}/data/${path}`, {
        headers: {
          'X-Vault-Token': this.vaultToken
        },
        timeout: 10000
      });

      return response.status === 200 || response.status === 204;
    } catch (error) {
      if (retryCount < this.retryAttempts) {
        logger.warn(`⚠️ Vault delete failed, retrying... (${retryCount + 1}/${this.retryAttempts})`);
        await this.delay(this.retryDelay * Math.pow(2, retryCount));
        return this.deleteSecret(path, retryCount + 1);
      }
      throw new Error(`Failed to delete secret ${path}: ${error.message}`);
    }
  }

  /**
   * Get database credentials from Vault
   */
  async getDatabaseCredentials() {
    try {
      const response = await axios.get(`${this.vaultUrl}/v1/database/creds/finnexus`, {
        headers: {
          'X-Vault-Token': this.vaultToken
        }
      });

      if (response.status === 200 && response.data.data) {
        return {
          username: response.data.data.username,
          password: response.data.data.password,
          lease_id: response.data.lease_id,
          lease_duration: response.data.lease_duration
        };
      } else {
        throw new Error('Failed to get database credentials');
      }
    } catch (error) {
      throw new Error(`Database credentials retrieval failed: ${error.message}`);
    }
  }

  /**
   * Get application secrets
   */
  async getApplicationSecrets() {
    try {
      const [database, redis, jwt, externalApis] = await Promise.all([
        this.getSecret('database'),
        this.getSecret('redis'),
        this.getSecret('jwt'),
        this.getSecret('external-apis')
      ]);

      return {
        database,
        redis,
        jwt,
        externalApis
      };
    } catch (error) {
      throw new Error(`Failed to get application secrets: ${error.message}`);
    }
  }

  /**
   * Generate PKI certificate
   */
  async generateCertificate(commonName, ttl = '720h') {
    try {
      const response = await axios.post(`${this.vaultUrl}/v1/pki/issue/finnexus`, {
        common_name: commonName,
        ttl: ttl
      }, {
        headers: {
          'X-Vault-Token': this.vaultToken,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 200 && response.data.data) {
        return {
          certificate: response.data.data.certificate,
          private_key: response.data.data.private_key,
          issuing_ca: response.data.data.issuing_ca,
          serial_number: response.data.data.serial_number
        };
      } else {
        throw new Error('Failed to generate certificate');
      }
    } catch (error) {
      throw new Error(`Certificate generation failed: ${error.message}`);
    }
  }

  /**
   * List secrets in a path
   */
  async listSecrets(path = '') {
    try {
      const response = await axios.request({
        method: 'LIST',
        url: `${this.vaultUrl}/v1/${this.secretPath}/metadata/${path}`,
        headers: {
          'X-Vault-Token': this.vaultToken
        },
        timeout: 10000
      });

      if (response.status === 200 && response.data.data) {
        return response.data.data.keys || [];
      } else {
        return [];
      }
    } catch (error) {
      logger.warn(`Failed to list secrets: ${error.message}`);
      return [];
    }
  }

  /**
   * Renew token lease
   */
  async renewToken() {
    try {
      const response = await axios.post(`${this.vaultUrl}/v1/auth/token/renew-self`, {}, {
        headers: {
          'X-Vault-Token': this.vaultToken
        }
      });

      if (response.status === 200) {
        return response.data;
      } else {
        throw new Error('Failed to renew token');
      }
    } catch (error) {
      throw new Error(`Token renewal failed: ${error.message}`);
    }
  }

  /**
   * Get Vault status and metrics
   */
  async getStatus() {
    try {
      const health = await this.healthCheck();
      const tokenInfo = await this.verifyToken();

      return {
        initialized: this.isInitialized,
        vault_url: this.vaultUrl,
        health: health,
        token_info: tokenInfo,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        initialized: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Utility function for delays
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    this.isInitialized = false;
    logger.info('✅ Vault service shutdown completed');
  }
}

/**
 * Vault Manager for multiple services
 */
class VaultManager {
  constructor() {
    this.vaultServices = new Map();
    this.defaultConfig = {
      vaultUrl: process.env.VAULT_ADDR || 'http://vault-service:8200',
      vaultToken: process.env.VAULT_TOKEN || 'root',
      secretPath: 'finnexus'
    };
  }

  /**
   * Get or create Vault service for a specific service
   */
  getVaultService(serviceName, config = {}) {
    if (!this.vaultServices.has(serviceName)) {
      const vaultConfig = { ...this.defaultConfig, ...config };
      const vaultService = new VaultService(vaultConfig);
      this.vaultServices.set(serviceName, vaultService);
    }

    return this.vaultServices.get(serviceName);
  }

  /**
   * Initialize all Vault services
   */
  async initializeAll() {
    const results = {};

    for (const [serviceName, vaultService] of this.vaultServices) {
      try {
        results[serviceName] = await vaultService.initialize();
      } catch (error) {
        results[serviceName] = false;
        logger.error(`Failed to initialize Vault service for ${serviceName}:`, error.message);
      }
    }

    return results;
  }

  /**
   * Get status of all Vault services
   */
  async getAllStatus() {
    const status = {};

    for (const [serviceName, vaultService] of this.vaultServices) {
      status[serviceName] = await vaultService.getStatus();
    }

    return status;
  }

  /**
   * Shutdown all Vault services
   */
  async shutdownAll() {
    for (const [serviceName, vaultService] of this.vaultServices) {
      await vaultService.shutdown();
    }
    this.vaultServices.clear();
  }
}

// Create singleton instance
const vaultManager = new VaultManager();

module.exports = {
  VaultService,
  VaultManager,
  vaultManager
};


