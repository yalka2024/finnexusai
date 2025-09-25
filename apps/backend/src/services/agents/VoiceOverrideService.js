const logger = require('../../utils/logger');
/**
 * FinAI Nexus - Voice Override Service
 *
 * Natural language control for autonomous agents:
 * - Voice command interpretation
 * - Agent coordination through voice
 * - Emergency overrides
 * - Learning from voice interactions
 * - Multi-agent voice control
 */

import { xAIGrokAPI } from '../ai/xAIGrokAPI.js';
import { VoiceProcessor } from '../voice/VoiceProcessor.js';
import { CommandParser } from './CommandParser.js';
import { AgentCoordinator } from './AgentCoordinator.js';

export class VoiceOverrideService {
  constructor() {
    this.grokAPI = new xAIGrokAPI();
    this.voiceProcessor = new VoiceProcessor();
    this.commandParser = new CommandParser();
    this.coordinator = null;
    this.agents = [];

    this.voiceCommands = new Map();
    this.commandHistory = [];
    this.learningData = [];

    this.voiceConfig = {
      confidenceThreshold: 0.8,
      maxCommandLength: 100,
      learningEnabled: true,
      emergencyKeywords: ['stop', 'emergency', 'halt', 'pause', 'abort'],
      priorityKeywords: ['urgent', 'immediately', 'now', 'asap'],
      agentKeywords: {
        portfolio: ['portfolio', 'balance', 'rebalance', 'diversify'],
        trade: ['trade', 'buy', 'sell', 'execute', 'order'],
        compliance: ['compliance', 'rules', 'violation', 'alert'],
        yield: ['yield', 'optimize', 'farming', 'staking']
      }
    };
  }

  /**
   * Initialize voice override service
   * @param {string} userId - User ID
   * @param {Object} config - Configuration
   * @returns {Promise<Object>} Initialization result
   */
  async initialize(userId, config = {}) {
    try {
      this.userId = userId;
      this.coordinator = config.coordinator;
      this.agents = config.agents || [];
      this.voiceConfig = { ...this.voiceConfig, ...config.voiceConfig };

      // Initialize voice processor
      await this.voiceProcessor.initialize(userId, config.voiceProcessor);

      // Initialize command parser
      await this.commandParser.initialize(userId, config.commandParser);

      // Initialize voice commands
      await this.initializeVoiceCommands();

      // Start voice monitoring
      this.startVoiceMonitoring();

      return {
        status: 'initialized',
        userId: userId,
        config: this.voiceConfig,
        commands: Array.from(this.voiceCommands.keys())
      };
    } catch (error) {
      logger.error('Voice override initialization failed:', error);
      throw new Error('Failed to initialize voice override service');
    }
  }

  /**
   * Process voice command
   * @param {string} userId - User ID
   * @param {string} command - Voice command
   * @returns {Promise<Object>} Command processing result
   */
  async processCommand(userId, command) {
    try {
      // Validate command
      if (!command || command.length > this.voiceConfig.maxCommandLength) {
        throw new Error('Invalid command length');
      }

      // Process voice command
      const processedCommand = await this.voiceProcessor.processCommand(command);

      // Parse command
      const parsedCommand = await this.commandParser.parseCommand(processedCommand);

      // Determine priority
      const priority = this.determinePriority(parsedCommand);

      // Check for emergency commands
      const isEmergency = this.isEmergencyCommand(parsedCommand);

      // Execute command
      const executionResult = await this.executeCommand(parsedCommand, priority, isEmergency);

      // Store command history
      this.commandHistory.push({
        userId: userId,
        command: command,
        processedCommand: processedCommand,
        parsedCommand: parsedCommand,
        priority: priority,
        isEmergency: isEmergency,
        executionResult: executionResult,
        timestamp: new Date()
      });

      // Update learning data
      if (this.voiceConfig.learningEnabled) {
        await this.updateLearningData(parsedCommand, executionResult);
      }

      return {
        success: true,
        command: command,
        processedCommand: processedCommand,
        parsedCommand: parsedCommand,
        priority: priority,
        isEmergency: isEmergency,
        executionResult: executionResult,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Voice command processing failed:', error);
      throw new Error('Failed to process voice command');
    }
  }

  /**
   * Execute parsed command
   * @param {Object} parsedCommand - Parsed command
   * @param {string} priority - Command priority
   * @param {boolean} isEmergency - Is emergency command
   * @returns {Promise<Object>} Execution result
   */
  async executeCommand(parsedCommand, priority, isEmergency) {
    try {
      const { agent, action, parameters } = parsedCommand;

      // Handle emergency commands
      if (isEmergency) {
        return await this.handleEmergencyCommand(parsedCommand);
      }

      // Route to appropriate agent
      const agentInstance = this.findAgent(agent);
      if (!agentInstance) {
        throw new Error(`Agent not found: ${agent}`);
      }

      // Execute command with priority
      const executionResult = await agentInstance.executeCommand(action, parameters);

      // Coordinate with other agents if needed
      if (this.coordinator && parsedCommand.coordination) {
        await this.coordinator.coordinateCommand(agent, action, parameters, executionResult);
      }

      return {
        success: true,
        agent: agent,
        action: action,
        parameters: parameters,
        result: executionResult,
        priority: priority,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Command execution failed:', error);
      throw new Error('Failed to execute command');
    }
  }

  /**
   * Handle emergency commands
   * @param {Object} parsedCommand - Parsed command
   * @returns {Promise<Object>} Emergency handling result
   */
  async handleEmergencyCommand(parsedCommand) {
    try {
      const { action } = parsedCommand;

      switch (action) {
      case 'stop_all':
        return await this.stopAllAgents();
      case 'pause_all':
        return await this.pauseAllAgents();
      case 'emergency_sell':
        return await this.emergencySell();
      case 'emergency_rebalance':
        return await this.emergencyRebalance();
      default:
        throw new Error(`Unknown emergency action: ${action}`);
      }
    } catch (error) {
      logger.error('Emergency command handling failed:', error);
      throw new Error('Failed to handle emergency command');
    }
  }

  /**
   * Stop all agents
   * @returns {Promise<Object>} Stop result
   */
  async stopAllAgents() {
    const results = [];

    for (const agent of this.agents) {
      try {
        const result = await agent.stop();
        results.push({ agent: agent.constructor.name, result: result });
      } catch (error) {
        results.push({ agent: agent.constructor.name, error: error.message });
      }
    }

    return {
      success: true,
      action: 'stop_all',
      results: results,
      timestamp: new Date()
    };
  }

  /**
   * Pause all agents
   * @returns {Promise<Object>} Pause result
   */
  async pauseAllAgents() {
    const results = [];

    for (const agent of this.agents) {
      try {
        const result = await agent.pause();
        results.push({ agent: agent.constructor.name, result: result });
      } catch (error) {
        results.push({ agent: agent.constructor.name, error: error.message });
      }
    }

    return {
      success: true,
      action: 'pause_all',
      results: results,
      timestamp: new Date()
    };
  }

  /**
   * Emergency sell all positions
   * @returns {Promise<Object>} Emergency sell result
   */
  async emergencySell() {
    try {
      const tradeAgent = this.findAgent('trade');
      if (!tradeAgent) {
        throw new Error('Trade agent not found');
      }

      const result = await tradeAgent.emergencySell();

      return {
        success: true,
        action: 'emergency_sell',
        result: result,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Emergency sell failed:', error);
      throw new Error('Failed to execute emergency sell');
    }
  }

  /**
   * Emergency rebalance to safe assets
   * @returns {Promise<Object>} Emergency rebalance result
   */
  async emergencyRebalance() {
    try {
      const portfolioAgent = this.findAgent('portfolio');
      if (!portfolioAgent) {
        throw new Error('Portfolio agent not found');
      }

      const result = await portfolioAgent.emergencyRebalance();

      return {
        success: true,
        action: 'emergency_rebalance',
        result: result,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Emergency rebalance failed:', error);
      throw new Error('Failed to execute emergency rebalance');
    }
  }

  /**
   * Initialize voice commands
   */
  async initializeVoiceCommands() {
    const commands = [
      // Portfolio commands
      { command: 'rebalance portfolio', agent: 'portfolio', action: 'rebalance' },
      { command: 'optimize portfolio', agent: 'portfolio', action: 'optimize' },
      { command: 'reduce risk', agent: 'portfolio', action: 'reduce_risk' },
      { command: 'change strategy to {strategy}', agent: 'portfolio', action: 'change_strategy' },
      { command: 'pause portfolio management', agent: 'portfolio', action: 'pause_management' },
      { command: 'resume portfolio management', agent: 'portfolio', action: 'resume_management' },

      // Trading commands
      { command: 'buy {asset} {amount}', agent: 'trade', action: 'buy' },
      { command: 'sell {asset} {amount}', agent: 'trade', action: 'sell' },
      { command: 'execute trade {tradeId}', agent: 'trade', action: 'execute_trade' },
      { command: 'cancel trade {tradeId}', agent: 'trade', action: 'cancel_trade' },
      { command: 'pause trading', agent: 'trade', action: 'pause_trading' },
      { command: 'resume trading', agent: 'trade', action: 'resume_trading' },

      // Compliance commands
      { command: 'check compliance', agent: 'compliance', action: 'check_compliance' },
      { command: 'generate report', agent: 'compliance', action: 'generate_report' },
      { command: 'update rules', agent: 'compliance', action: 'update_rules' },
      { command: 'pause compliance monitoring', agent: 'compliance', action: 'pause_monitoring' },
      { command: 'resume compliance monitoring', agent: 'compliance', action: 'resume_monitoring' },

      // Yield commands
      { command: 'optimize yield', agent: 'yield', action: 'optimize_yield' },
      { command: 'start yield farming', agent: 'yield', action: 'start_farming' },
      { command: 'stop yield farming', agent: 'yield', action: 'stop_farming' },
      { command: 'change yield strategy', agent: 'yield', action: 'change_strategy' },

      // System commands
      { command: 'stop all agents', agent: 'system', action: 'stop_all' },
      { command: 'pause all agents', agent: 'system', action: 'pause_all' },
      { command: 'get status', agent: 'system', action: 'get_status' },
      { command: 'emergency sell all', agent: 'system', action: 'emergency_sell' },
      { command: 'emergency rebalance', agent: 'system', action: 'emergency_rebalance' }
    ];

    for (const cmd of commands) {
      this.voiceCommands.set(cmd.command, cmd);
    }
  }

  /**
   * Start voice monitoring
   */
  startVoiceMonitoring() {
    // This would integrate with actual voice recognition
    // For now, it's a placeholder for the monitoring system
    logger.info('Voice monitoring started');
  }

  /**
   * Determine command priority
   * @param {Object} parsedCommand - Parsed command
   * @returns {string} Priority level
   */
  determinePriority(parsedCommand) {
    const { command } = parsedCommand;

    // Check for priority keywords
    for (const keyword of this.voiceConfig.priorityKeywords) {
      if (command.toLowerCase().includes(keyword)) {
        return 'high';
      }
    }

    // Check for emergency keywords
    for (const keyword of this.voiceConfig.emergencyKeywords) {
      if (command.toLowerCase().includes(keyword)) {
        return 'emergency';
      }
    }

    return 'normal';
  }

  /**
   * Check if command is emergency
   * @param {Object} parsedCommand - Parsed command
   * @returns {boolean} Is emergency command
   */
  isEmergencyCommand(parsedCommand) {
    const { command } = parsedCommand;

    for (const keyword of this.voiceConfig.emergencyKeywords) {
      if (command.toLowerCase().includes(keyword)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Find agent by name
   * @param {string} agentName - Agent name
   * @returns {Object} Agent instance
   */
  findAgent(agentName) {
    return this.agents.find(agent =>
      agent.constructor.name.toLowerCase().includes(agentName.toLowerCase())
    );
  }

  /**
   * Update learning data
   * @param {Object} parsedCommand - Parsed command
   * @param {Object} executionResult - Execution result
   */
  async updateLearningData(parsedCommand, executionResult) {
    const learningData = {
      command: parsedCommand.command,
      agent: parsedCommand.agent,
      action: parsedCommand.action,
      parameters: parsedCommand.parameters,
      success: executionResult.success,
      timestamp: new Date()
    };

    this.learningData.push(learningData);

    // Keep only last 1000 entries
    if (this.learningData.length > 1000) {
      this.learningData = this.learningData.slice(-1000);
    }
  }

  /**
   * Get voice override status
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Status
   */
  async getStatus(userId) {
    return {
      userId: userId,
      isActive: true,
      commands: Array.from(this.voiceCommands.keys()),
      commandHistory: this.commandHistory.length,
      learningData: this.learningData.length,
      config: this.voiceConfig
    };
  }

  /**
   * Stop voice override service
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Stop result
   */
  async stop(userId) {
    return {
      success: true,
      userId: userId,
      timestamp: new Date()
    };
  }
}

export default VoiceOverrideService;
