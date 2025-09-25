const FinNexusContracts = require('../contracts/FinNexusContracts');
const { WebhookClient } = require('discord.js');
const nodemailer = require('nodemailer');

/**
 * FinNexus AI Contract Monitoring System
 * Monitors smart contracts for critical events and sends alerts
 */
class ContractMonitor {
  constructor(config) {
    this.config = config;
    this.contracts = new FinNexusContracts(config.contracts);

    // Initialize alerting systems
    this.discordWebhook = config.discord?.webhookUrl ? new WebhookClient({
      url: config.discord.webhookUrl
    }) : null;

    this.emailTransporter = config.email ? nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: config.email.user,
        pass: config.email.password
      }
    }) : null;

    // Monitoring state
    this.isMonitoring = false;
    this.alertThresholds = config.alertThresholds || {
      largeTransfer: '1000', // 1000 NEXUS tokens
      highGasPrice: '100', // 100 gwei
      failedTransactions: 5, // 5 failed transactions in 1 hour
      contractPaused: true,
      emergencyWithdrawals: true
    };

    // Statistics
    this.stats = {
      eventsProcessed: 0,
      alertsSent: 0,
      errors: 0,
      startTime: null
    };
  }

  /**
   * Start monitoring contracts
   */
  async startMonitoring() {
    if (this.isMonitoring) {
      logger.info('⚠️ Monitoring already active');
      return;
    }

    logger.info('🚀 Starting FinNexus AI contract monitoring...');
    this.isMonitoring = true;
    this.stats.startTime = new Date();

    // Start event monitoring
    this.contracts.startEventMonitoring((contract, event, data) => {
      this.handleContractEvent(contract, event, data);
    });

    // Start periodic health checks
    this.startHealthChecks();

    // Start gas price monitoring
    this.startGasPriceMonitoring();

    logger.info('✅ Contract monitoring started successfully');
  }

  /**
   * Stop monitoring contracts
   */
  stopMonitoring() {
    if (!this.isMonitoring) {
      logger.info('⚠️ Monitoring not active');
      return;
    }

    logger.info('🛑 Stopping contract monitoring...');
    this.isMonitoring = false;
    this.contracts.stopEventMonitoring();

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    if (this.gasPriceInterval) {
      clearInterval(this.gasPriceInterval);
    }

    logger.info('✅ Contract monitoring stopped');
  }

  /**
   * Handle contract events
   */
  async handleContractEvent(contract, event, data) {
    try {
      this.stats.eventsProcessed++;

      logger.info(`📄 ${contract} ${event}:`, data);

      // Process different event types
      switch (event) {
      case 'Transfer':
        await this.handleTransferEvent(contract, data);
        break;
      case 'RewardMinted':
        await this.handleRewardEvent(data);
        break;
      case 'YieldOptimized':
        await this.handleYieldOptimizationEvent(data);
        break;
      case 'PortfolioRebalanced':
        await this.handlePortfolioRebalanceEvent(data);
        break;
      case 'EmergencyWithdrawal':
        await this.handleEmergencyWithdrawalEvent(data);
        break;
      default:
        logger.info(`ℹ️ Unhandled event: ${event}`);
      }
    } catch (error) {
      this.stats.errors++;
      logger.error('Error handling contract event:', error);
    }
  }

  /**
   * Handle transfer events
   */
  async handleTransferEvent(contract, data) {
    const amount = parseFloat(data.value);
    const threshold = parseFloat(this.alertThresholds.largeTransfer);

    if (amount >= threshold) {
      await this.sendAlert('large_transfer', {
        contract,
        from: data.from,
        to: data.to,
        amount: data.value,
        txHash: data.txHash,
        blockNumber: data.blockNumber
      });
    }
  }

  /**
   * Handle reward minting events
   */
  async handleRewardEvent(data) {
    await this.sendAlert('reward_minted', {
      user: data.user,
      amount: data.amount,
      category: data.category,
      reason: data.reason,
      trustScore: data.trustScore,
      txHash: data.txHash
    });
  }

  /**
   * Handle yield optimization events
   */
  async handleYieldOptimizationEvent(data) {
    await this.sendAlert('yield_optimized', {
      user: data.user,
      amount: data.amount,
      strategyId: data.strategyId,
      txHash: data.txHash
    });
  }

  /**
   * Handle portfolio rebalance events
   */
  async handlePortfolioRebalanceEvent(data) {
    await this.sendAlert('portfolio_rebalanced', {
      user: data.user,
      newValue: data.newValue,
      txHash: data.txHash
    });
  }

  /**
   * Handle emergency withdrawal events
   */
  async handleEmergencyWithdrawalEvent(data) {
    if (this.alertThresholds.emergencyWithdrawals) {
      await this.sendAlert('emergency_withdrawal', {
        user: data.user,
        amount: data.amount,
        reason: data.reason,
        txHash: data.txHash,
        severity: 'critical'
      });
    }
  }

  /**
   * Start periodic health checks
   */
  startHealthChecks() {
    this.healthCheckInterval = setInterval(async() => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        logger.error('Health check failed:', error);
        this.stats.errors++;
      }
    }, 60000); // Check every minute
  }

  /**
   * Perform health check on contracts
   */
  async performHealthCheck() {
    try {
      // Check if contracts are paused
      const nexusTokenPaused = await this.contracts.nexusToken.paused();
      const potTokenPaused = await this.potToken.paused();
      const deFAIPaused = await this.contracts.deFAIManager.paused();

      if (nexusTokenPaused || potTokenPaused || deFAIPaused) {
        await this.sendAlert('contract_paused', {
          nexusToken: nexusTokenPaused,
          potToken: potTokenPaused,
          deFAIManager: deFAIPaused,
          severity: 'critical'
        });
      }

      // Check contract balances
      const nexusBalance = await this.contracts.nexusToken.balanceOf(
        this.config.contractAddresses.deFAIManager
      );

      if (nexusBalance < ethers.parseEther('1000')) {
        await this.sendAlert('low_contract_balance', {
          contract: 'DeFAIManager',
          balance: ethers.formatEther(nexusBalance),
          threshold: '1000',
          severity: 'warning'
        });
      }

    } catch (error) {
      logger.error('Health check error:', error);
    }
  }

  /**
   * Start gas price monitoring
   */
  startGasPriceMonitoring() {
    this.gasPriceInterval = setInterval(async() => {
      try {
        const gasPrice = await this.contracts.getGasPrice();
        const threshold = parseFloat(this.alertThresholds.highGasPrice);

        if (parseFloat(gasPrice) >= threshold) {
          await this.sendAlert('high_gas_price', {
            gasPrice: gasPrice,
            threshold: threshold.toString(),
            severity: 'warning'
          });
        }
      } catch (error) {
        logger.error('Gas price monitoring error:', error);
      }
    }, 300000); // Check every 5 minutes
  }

  /**
   * Send alert through configured channels
   */
  async sendAlert(type, data) {
    this.stats.alertsSent++;

    const alert = {
      type,
      data,
      timestamp: new Date().toISOString(),
      severity: data.severity || 'info'
    };

    logger.info(`🚨 Alert: ${type}`, alert);

    // Send Discord alert
    if (this.discordWebhook) {
      await this.sendDiscordAlert(alert);
    }

    // Send email alert for critical issues
    if (this.emailTransporter && alert.severity === 'critical') {
      await this.sendEmailAlert(alert);
    }

    // Log alert to database
    await this.logAlert(alert);
  }

  /**
   * Send Discord alert
   */
  async sendDiscordAlert(alert) {
    try {
      const embed = {
        title: `🚨 FinNexus AI Alert: ${alert.type}`,
        description: this.formatAlertMessage(alert),
        color: this.getAlertColor(alert.severity),
        timestamp: alert.timestamp,
        fields: this.formatAlertFields(alert.data)
      };

      await this.discordWebhook.send({
        embeds: [embed]
      });
    } catch (error) {
      logger.error('Discord alert failed:', error);
    }
  }

  /**
   * Send email alert
   */
  async sendEmailAlert(alert) {
    try {
      const mailOptions = {
        from: this.config.email.user,
        to: this.config.email.recipients.join(', '),
        subject: `🚨 FinNexus AI Critical Alert: ${alert.type}`,
        html: `
          <h2>FinNexus AI Critical Alert</h2>
          <p><strong>Type:</strong> ${alert.type}</p>
          <p><strong>Severity:</strong> ${alert.severity}</p>
          <p><strong>Time:</strong> ${alert.timestamp}</p>
          <h3>Details:</h3>
          <pre>${JSON.stringify(alert.data, null, 2)}</pre>
        `
      };

      await this.emailTransporter.sendMail(mailOptions);
    } catch (error) {
      logger.error('Email alert failed:', error);
    }
  }

  /**
   * Log alert to database
   */
  async logAlert(alert) {
    // TODO: Implement database logging
    logger.info('📝 Logging alert to database:', alert);
  }

  /**
   * Format alert message
   */
  formatAlertMessage(alert) {
    const messages = {
      large_transfer: `Large transfer detected: ${alert.data.amount} NEXUS tokens`,
      reward_minted: `Reward minted for ${alert.data.user}: ${alert.data.amount} POT tokens`,
      yield_optimized: `Yield optimized for ${alert.data.user}: ${alert.data.amount} NEXUS tokens`,
      portfolio_rebalanced: `Portfolio rebalanced for ${alert.data.user}`,
      emergency_withdrawal: `Emergency withdrawal: ${alert.data.amount} tokens`,
      contract_paused: 'One or more contracts are paused',
      low_contract_balance: `Low contract balance: ${alert.data.balance} tokens`,
      high_gas_price: `High gas price detected: ${alert.data.gasPrice} gwei`
    };

    return messages[alert.type] || `Alert: ${alert.type}`;
  }

  /**
   * Get alert color based on severity
   */
  getAlertColor(severity) {
    const colors = {
      critical: 0xFF0000, // Red
      warning: 0xFFA500,  // Orange
      info: 0x0099FF     // Blue
    };
    return colors[severity] || colors.info;
  }

  /**
   * Format alert fields for Discord embed
   */
  formatAlertFields(data) {
    const fields = [];

    for (const [key, value] of Object.entries(data)) {
      if (key !== 'severity') {
        fields.push({
          name: key.charAt(0).toUpperCase() + key.slice(1),
          value: String(value),
          inline: true
        });
      }
    }

    return fields;
  }

  /**
   * Get monitoring statistics
   */
  getStats() {
    const uptime = this.stats.startTime ?
      Date.now() - this.stats.startTime.getTime() : 0;

    return {
      ...this.stats,
      uptime: Math.floor(uptime / 1000), // seconds
      isMonitoring: this.isMonitoring,
      alertThresholds: this.alertThresholds
    };
  }

  /**
   * Update alert thresholds
   */
  updateThresholds(newThresholds) {
    this.alertThresholds = {
      ...this.alertThresholds,
      ...newThresholds
    };
    logger.info('✅ Alert thresholds updated:', this.alertThresholds);
  }
}

module.exports = ContractMonitor;
