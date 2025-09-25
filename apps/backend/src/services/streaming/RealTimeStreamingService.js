/**
 * Real-Time Streaming Service - Enterprise-Grade Event Streaming
 *
 * Implements real-time data streaming with Apache Kafka, WebSockets,
 * and event-driven architecture for low-latency data delivery
 */

const WebSocket = require('ws');
const EventEmitter = require('events');

// Optional imports - application will work without these dependencies
let kafka = null;

try {
  kafka = require('kafkajs');
} catch (error) {
  logger.info('⚠️ Kafka not available - streaming features will be limited');
}

// const databaseManager = require('../../config/database');
const logger = require('../../utils/logger');

class RealTimeStreamingService extends EventEmitter {
  constructor() {
    super();
    this.isInitialized = false;
    this.kafkaClient = null;
    this.kafkaProducer = null;
    this.kafkaConsumer = null;
    this.wss = null;
    this.clients = new Map();
    this.topics = new Map();
    this.streams = new Map();
    this.messageQueue = new Map();
    this.isProcessing = false;
  }

  async initialize() {
    try {
      logger.info('📡 Initializing Real-Time Streaming Service...');

      // Initialize Kafka
      await this.initializeKafka();

      // Initialize WebSocket server
      await this.initializeWebSocketServer();

      // Initialize streaming topics
      await this.initializeStreamingTopics();

      // Start message processing
      this.startMessageProcessing();

      // Start health monitoring
      this.startHealthMonitoring();

      this.isInitialized = true;
      logger.info('✅ Real-Time Streaming Service initialized successfully');
      return { success: true, message: 'Real-Time Streaming Service initialized' };
    } catch (error) {
      logger.error('Real-Time Streaming Service initialization failed:', error);
      throw error;
    }
  }

  async shutdown() {
    try {
      this.isInitialized = false;

      // Close WebSocket server
      if (this.wss) {
        this.wss.close();
      }

      // Disconnect Kafka
      if (this.kafkaProducer) {
        await this.kafkaProducer.disconnect();
      }
      if (this.kafkaConsumer) {
        await this.kafkaConsumer.disconnect();
      }

      // Clear intervals
      if (this.messageProcessingInterval) {
        clearInterval(this.messageProcessingInterval);
      }
      if (this.healthMonitoringInterval) {
        clearInterval(this.healthMonitoringInterval);
      }

      logger.info('Real-Time Streaming Service shut down');
      return { success: true, message: 'Real-Time Streaming Service shut down' };
    } catch (error) {
      logger.error('Real-Time Streaming Service shutdown failed:', error);
      throw error;
    }
  }

  // Initialize Kafka
  async initializeKafka() {
    try {
      // Kafka configuration
      const kafkaConfig = {
        clientId: 'finnexusai-streaming',
        brokers: process.env.KAFKA_BROKERS ?
          process.env.KAFKA_BROKERS.split(',') :
          ['localhost:9092'],
        retry: {
          initialRetryTime: 100,
          retries: 8
        },
        requestTimeout: 30000,
        connectionTimeout: 3000
      };

      this.kafkaClient = kafka.kafka(kafkaConfig);
      this.kafkaProducer = this.kafkaClient.producer({
        maxInFlightRequests: 1,
        idempotent: true,
        transactionTimeout: 30000
      });
      this.kafkaConsumer = this.kafkaClient.consumer({
        groupId: 'finnexusai-consumer-group',
        sessionTimeout: 30000,
        rebalanceTimeout: 60000,
        heartbeatInterval: 3000
      });

      // Connect to Kafka
      await this.kafkaProducer.connect();
      await this.kafkaConsumer.connect();

      logger.info('✅ Kafka client initialized and connected');
    } catch (error) {
      logger.error('Failed to initialize Kafka:', error);
      throw error;
    }
  }

  // Initialize WebSocket server
  async initializeWebSocketServer() {
    try {
      const port = process.env.WEBSOCKET_PORT || 8080;

      this.wss = new WebSocket.Server({
        port,
        perMessageDeflate: false,
        maxPayload: 16 * 1024 * 1024, // 16MB
        verifyClient: (_info) => {
          // Add authentication logic here
          return true;
        }
      });

      this.wss.on('connection', (ws, req) => {
        this.handleWebSocketConnection(ws, req);
      });

      this.wss.on('error', (error) => {
        logger.error('WebSocket server error:', error);
      });

      logger.info(`✅ WebSocket server started on port ${port}`);
    } catch (error) {
      logger.error('Failed to initialize WebSocket server:', error);
      throw error;
    }
  }

  // Initialize streaming topics
  async initializeStreamingTopics() {
    try {
      const topics = [
        {
          name: 'market-data',
          partitions: 3,
          replicationFactor: 1,
          config: {
            'cleanup.policy': 'delete',
            'retention.ms': '86400000', // 24 hours
            'compression.type': 'snappy'
          }
        },
        {
          name: 'trading-events',
          partitions: 5,
          replicationFactor: 1,
          config: {
            'cleanup.policy': 'delete',
            'retention.ms': '604800000', // 7 days
            'compression.type': 'snappy'
          }
        },
        {
          name: 'portfolio-updates',
          partitions: 3,
          replicationFactor: 1,
          config: {
            'cleanup.policy': 'delete',
            'retention.ms': '259200000', // 3 days
            'compression.type': 'snappy'
          }
        },
        {
          name: 'ai-predictions',
          partitions: 2,
          replicationFactor: 1,
          config: {
            'cleanup.policy': 'delete',
            'retention.ms': '3600000', // 1 hour
            'compression.type': 'snappy'
          }
        },
        {
          name: 'security-events',
          partitions: 1,
          replicationFactor: 1,
          config: {
            'cleanup.policy': 'delete',
            'retention.ms': '259200000', // 3 days
            'compression.type': 'snappy'
          }
        }
      ];

      for (const topic of topics) {
        this.topics.set(topic.name, topic);
        logger.info(`✅ Streaming topic initialized: ${topic.name}`);
      }

      // Subscribe to topics
      await this.subscribeToTopics();

      logger.info(`✅ Initialized ${this.topics.size} streaming topics`);
    } catch (error) {
      logger.error('Failed to initialize streaming topics:', error);
      throw error;
    }
  }

  // Subscribe to topics
  async subscribeToTopics() {
    try {
      const topicNames = Array.from(this.topics.keys());
      await this.kafkaConsumer.subscribe({
        topics: topicNames,
        fromBeginning: false
      });

      await this.kafkaConsumer.run({
        eachMessage: async({ topic, partition, message }) => {
          await this.handleKafkaMessage(topic, partition, message);
        }
      });

      logger.info(`✅ Subscribed to ${topicNames.length} Kafka topics`);
    } catch (error) {
      logger.error('Failed to subscribe to topics:', error);
      throw error;
    }
  }

  // Handle WebSocket connection
  handleWebSocketConnection(ws, req) {
    const clientId = this.generateClientId();
    const clientInfo = {
      id: clientId,
      ws,
      ip: req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
      connectedAt: new Date(),
      subscriptions: new Set(),
      lastPing: Date.now()
    };

    this.clients.set(clientId, clientInfo);

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connection',
      clientId,
      timestamp: new Date(),
      message: 'Connected to FinNexusAI Real-Time Streaming'
    }));

    // Handle messages
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        this.handleClientMessage(clientId, message);
      } catch (error) {
        logger.error(`Failed to parse message from client ${clientId}:`, error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format',
          timestamp: new Date()
        }));
      }
    });

    // Handle disconnection
    ws.on('close', () => {
      this.handleClientDisconnection(clientId);
    });

    // Handle errors
    ws.on('error', (error) => {
      logger.error(`WebSocket error for client ${clientId}:`, error);
      this.handleClientDisconnection(clientId);
    });

    // Start ping/pong
    this.startClientPing(clientId);

    logger.info(`✅ WebSocket client connected: ${clientId}`);
  }

  // Handle client message
  handleClientMessage(clientId, message) {
    try {
      const client = this.clients.get(clientId);
      if (!client) return;

      switch (message.type) {
      case 'subscribe':
        this.handleSubscription(clientId, message);
        break;
      case 'unsubscribe':
        this.handleUnsubscription(clientId, message);
        break;
      case 'ping':
        this.handlePing(clientId, message);
        break;
      case 'get_status':
        this.handleStatusRequest(clientId, message);
        break;
      default:
        logger.warn(`Unknown message type from client ${clientId}: ${message.type}`);
      }
    } catch (error) {
      logger.error(`Failed to handle message from client ${clientId}:`, error);
    }
  }

  // Handle subscription
  handleSubscription(clientId, message) {
    try {
      const client = this.clients.get(clientId);
      if (!client) return;

      const { topics } = message;
      if (!Array.isArray(topics)) {
        client.ws.send(JSON.stringify({
          type: 'error',
          message: 'Topics must be an array',
          timestamp: new Date()
        }));
        return;
      }

      for (const topic of topics) {
        if (this.topics.has(topic)) {
          client.subscriptions.add(topic);

          // Initialize stream if not exists
          if (!this.streams.has(topic)) {
            this.streams.set(topic, new Set());
          }
          this.streams.get(topic).add(clientId);
        }
      }

      client.ws.send(JSON.stringify({
        type: 'subscription_confirmed',
        topics: Array.from(client.subscriptions),
        timestamp: new Date()
      }));

      logger.info(`Client ${clientId} subscribed to: ${topics.join(', ')}`);
    } catch (error) {
      logger.error(`Failed to handle subscription for client ${clientId}:`, error);
    }
  }

  // Handle unsubscription
  handleUnsubscription(clientId, message) {
    try {
      const client = this.clients.get(clientId);
      if (!client) return;

      const { topics } = message;
      if (!Array.isArray(topics)) {
        client.ws.send(JSON.stringify({
          type: 'error',
          message: 'Topics must be an array',
          timestamp: new Date()
        }));
        return;
      }

      for (const topic of topics) {
        client.subscriptions.delete(topic);

        if (this.streams.has(topic)) {
          this.streams.get(topic).delete(clientId);
        }
      }

      client.ws.send(JSON.stringify({
        type: 'unsubscription_confirmed',
        topics: Array.from(client.subscriptions),
        timestamp: new Date()
      }));

      logger.info(`Client ${clientId} unsubscribed from: ${topics.join(', ')}`);
    } catch (error) {
      logger.error(`Failed to handle unsubscription for client ${clientId}:`, error);
    }
  }

  // Handle ping
  handlePing(clientId, _message) {
    try {
      const client = this.clients.get(clientId);
      if (!client) return;

      client.lastPing = Date.now();

      client.ws.send(JSON.stringify({
        type: 'pong',
        timestamp: new Date()
      }));
    } catch (error) {
      logger.error(`Failed to handle ping for client ${clientId}:`, error);
    }
  }

  // Handle status request
  handleStatusRequest(clientId, _message) {
    try {
      const client = this.clients.get(clientId);
      if (!client) return;

      const status = {
        clientId,
        connectedAt: client.connectedAt,
        subscriptions: Array.from(client.subscriptions),
        uptime: Date.now() - client.connectedAt.getTime(),
        timestamp: new Date()
      };

      client.ws.send(JSON.stringify({
        type: 'status',
        data: status,
        timestamp: new Date()
      }));
    } catch (error) {
      logger.error(`Failed to handle status request for client ${clientId}:`, error);
    }
  }

  // Handle client disconnection
  handleClientDisconnection(clientId) {
    try {
      const client = this.clients.get(clientId);
      if (!client) return;

      // Remove from all streams
      for (const topic of client.subscriptions) {
        if (this.streams.has(topic)) {
          this.streams.get(topic).delete(clientId);
        }
      }

      this.clients.delete(clientId);
      logger.info(`✅ WebSocket client disconnected: ${clientId}`);
    } catch (error) {
      logger.error(`Failed to handle client disconnection ${clientId}:`, error);
    }
  }

  // Start client ping
  startClientPing(clientId) {
    const pingInterval = setInterval(() => {
      const client = this.clients.get(clientId);
      if (!client) {
        clearInterval(pingInterval);
        return;
      }

      const now = Date.now();
      if (now - client.lastPing > 60000) { // 60 seconds timeout
        logger.warn(`Client ${clientId} ping timeout`);
        client.ws.close();
        clearInterval(pingInterval);
        return;
      }

      client.ws.ping();
    }, 30000); // Ping every 30 seconds
  }

  // Handle Kafka message
  async handleKafkaMessage(topic, partition, message) {
    try {
      const messageData = {
        topic,
        partition,
        offset: message.offset,
        timestamp: message.timestamp,
        key: message.key?.toString(),
        value: message.value.toString(),
        headers: message.headers
      };

      // Parse message value
      let parsedData;
      try {
        parsedData = JSON.parse(messageData.value);
      } catch (error) {
        logger.error(`Failed to parse Kafka message from topic ${topic}:`, error);
        return;
      }

      // Add to message queue for processing
      if (!this.messageQueue.has(topic)) {
        this.messageQueue.set(topic, []);
      }
      this.messageQueue.get(topic).push({
        ...messageData,
        data: parsedData
      });

      // Emit message event
      this.emit('kafkaMessage', {
        topic,
        data: parsedData,
        timestamp: new Date()
      });

    } catch (error) {
      logger.error(`Failed to handle Kafka message from topic ${topic}:`, error);
    }
  }

  // Start message processing
  startMessageProcessing() {
    this.messageProcessingInterval = setInterval(async() => {
      if (!this.isProcessing) {
        await this.processMessages();
      }
    }, 100); // Process every 100ms for low latency
  }

  // Process messages
  async processMessages() {
    try {
      this.isProcessing = true;

      for (const [topic, messages] of this.messageQueue) {
        if (messages.length === 0) continue;

        // Process messages in batches
        const batch = messages.splice(0, 100); // Process up to 100 messages at a time

        for (const message of batch) {
          await this.broadcastToSubscribers(topic, message);
        }
      }

      this.isProcessing = false;
    } catch (error) {
      logger.error('Message processing failed:', error);
      this.isProcessing = false;
    }
  }

  // Broadcast to subscribers
  async broadcastToSubscribers(topic, message) {
    try {
      const subscribers = this.streams.get(topic);
      if (!subscribers || subscribers.size === 0) return;

      const broadcastData = {
        type: 'data',
        topic,
        data: message.data,
        timestamp: message.timestamp,
        offset: message.offset
      };

      const broadcastMessage = JSON.stringify(broadcastData);

      // Broadcast to all subscribers
      for (const clientId of subscribers) {
        const client = this.clients.get(clientId);
        if (client && client.ws.readyState === WebSocket.OPEN) {
          try {
            client.ws.send(broadcastMessage);
          } catch (error) {
            logger.error(`Failed to send message to client ${clientId}:`, error);
            // Remove client if sending fails
            this.handleClientDisconnection(clientId);
          }
        }
      }

    } catch (error) {
      logger.error(`Failed to broadcast message for topic ${topic}:`, error);
    }
  }

  // Publish message to Kafka
  async publishMessage(topic, data, key = null) {
    try {
      if (!this.kafkaProducer) {
        throw new Error('Kafka producer not initialized');
      }

      const message = {
        topic,
        messages: [{
          key: key ? Buffer.from(key) : null,
          value: Buffer.from(JSON.stringify(data)),
          timestamp: Date.now().toString()
        }]
      };

      await this.kafkaProducer.send(message);

      logger.info(`✅ Published message to topic ${topic}`);
      return {
        success: true,
        topic,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error(`Failed to publish message to topic ${topic}:`, error);
      throw error;
    }
  }

  // Start health monitoring
  startHealthMonitoring() {
    this.healthMonitoringInterval = setInterval(() => {
      this.performHealthCheck();
    }, 30000); // Every 30 seconds
  }

  // Perform health check
  performHealthCheck() {
    try {
      const health = {
        isInitialized: this.isInitialized,
        kafka: {
          producer: !!this.kafkaProducer,
          consumer: !!this.kafkaConsumer
        },
        websocket: {
          server: !!this.wss,
          clients: this.clients.size,
          uptime: this.wss ? Date.now() - this.wss.startTime : 0
        },
        topics: {
          total: this.topics.size,
          active: this.streams.size
        },
        messageQueue: {
          totalMessages: Array.from(this.messageQueue.values()).reduce((sum, msgs) => sum + msgs.length, 0),
          topicsWithMessages: Array.from(this.messageQueue.entries()).filter(([_, msgs]) => msgs.length > 0).length
        },
        timestamp: new Date()
      };

      // Check for issues
      if (health.messageQueue.totalMessages > 10000) {
        logger.warn(`⚠️ High message queue backlog: ${health.messageQueue.totalMessages} messages`);
      }

      if (health.websocket.clients === 0 && health.messageQueue.totalMessages > 0) {
        logger.warn('⚠️ No WebSocket clients but messages in queue');
      }

      // Emit health metrics
      this.emit('healthMetrics', health);

    } catch (error) {
      logger.error('Health check failed:', error);
    }
  }

  // Generate client ID
  generateClientId() {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get streaming status
  getStreamingStatus() {
    const status = {
      isInitialized: this.isInitialized,
      kafka: {
        producer: !!this.kafkaProducer,
        consumer: !!this.kafkaConsumer
      },
      websocket: {
        server: !!this.wss,
        port: this.wss ? this.wss.options.port : null,
        clients: this.clients.size
      },
      topics: {},
      streams: {},
      messageQueue: {}
    };

    for (const [name, topic] of this.topics) {
      status.topics[name] = {
        name: topic.name,
        partitions: topic.partitions,
        replicationFactor: topic.replicationFactor
      };
    }

    for (const [topic, subscribers] of this.streams) {
      status.streams[topic] = {
        subscribers: subscribers.size,
        clientIds: Array.from(subscribers)
      };
    }

    for (const [topic, messages] of this.messageQueue) {
      status.messageQueue[topic] = {
        messageCount: messages.length,
        oldestMessage: messages[0]?.timestamp,
        newestMessage: messages[messages.length - 1]?.timestamp
      };
    }

    return status;
  }

  // Get client information
  getClientInfo(clientId) {
    const client = this.clients.get(clientId);
    if (!client) return null;

    return {
      id: client.id,
      ip: client.ip,
      userAgent: client.userAgent,
      connectedAt: client.connectedAt,
      subscriptions: Array.from(client.subscriptions),
      uptime: Date.now() - client.connectedAt.getTime(),
      lastPing: client.lastPing
    };
  }

  // Get all clients
  getAllClients() {
    const clients = [];
    for (const [clientId, _client] of this.clients) {
      clients.push(this.getClientInfo(clientId));
    }
    return clients;
  }
}

module.exports = new RealTimeStreamingService();
