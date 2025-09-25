/**
 * FinAI Nexus - WebSocket Service
 *
 * Advanced real-time data streaming featuring:
 * - WebSocket connections with Socket.IO
 * - Real-time market data streaming
 * - Live trading notifications
 * - Portfolio updates
 * - Chat and collaboration features
 */

const { Server } = require('socket.io');
const databaseManager = require('../../config/database');
const logger = require('../../utils/logger');

class WebSocketService {
  constructor() {
    this.db = databaseManager;
    this.io = null;
    this.connectedUsers = new Map();
    this.rooms = new Map();
    this.subscriptions = new Map();
    this.messageQueue = [];
    this.broadcastInterval = null;

    this.eventTypes = {
      // Market data events
      MARKET_DATA_UPDATE: 'market_data_update',
      PRICE_CHANGE: 'price_change',
      VOLUME_UPDATE: 'volume_update',

      // Trading events
      TRADE_EXECUTED: 'trade_executed',
      ORDER_UPDATED: 'order_updated',
      PORTFOLIO_CHANGE: 'portfolio_change',

      // User events
      USER_CONNECTED: 'user_connected',
      USER_DISCONNECTED: 'user_disconnected',
      USER_TYPING: 'user_typing',

      // Chat events
      MESSAGE_SENT: 'message_sent',
      MESSAGE_RECEIVED: 'message_received',

      // System events
      SYSTEM_NOTIFICATION: 'system_notification',
      ALERT_TRIGGERED: 'alert_triggered',

      // AI events
      AI_ANALYSIS_READY: 'ai_analysis_ready',
      EMOTION_DETECTED: 'emotion_detected',

      // Social events
      SOCIAL_TRADE_SHARED: 'social_trade_shared',
      FOLLOW_UPDATE: 'follow_update'
    };
  }

  /**
   * Initialize WebSocket service
   */
  async initialize(httpServer) {
    try {
      await this.setupSocketIO(httpServer);
      await this.setupEventHandlers();
      await this.startDataStreaming();
      logger.info('WebSocket service initialized');
    } catch (error) {
      logger.error('Error initializing WebSocket service:', error);
    }
  }

  /**
   * Setup Socket.IO server
   */
  async setupSocketIO(httpServer) {
    try {
      this.io = new Server(httpServer, {
        cors: {
          origin: process.env.FRONTEND_URL || 'http://localhost:3000',
          methods: ['GET', 'POST'],
          credentials: true
        },
        transports: ['websocket', 'polling']
      });

      // Connection middleware
      this.io.use(async(socket, next) => {
        try {
          const userId = await this.authenticateSocket(socket);
          if (userId) {
            socket.userId = userId;
            next();
          } else {
            next(new Error('Authentication failed'));
          }
        } catch (error) {
          next(new Error('Authentication error'));
        }
      });
    } catch (error) {
      logger.error('Error setting up Socket.IO:', error);
      throw error;
    }
  }

  /**
   * Setup event handlers
   */
  async setupEventHandlers() {
    try {
      this.io.on('connection', async(socket) => {
        logger.info(`User ${socket.userId} connected`);

        // Store user connection
        this.connectedUsers.set(socket.userId, {
          socketId: socket.id,
          connectedAt: new Date(),
          subscriptions: new Set(),
          lastActivity: new Date()
        });

        // Handle user joining rooms
        socket.on('join_room', async(roomData) => {
          await this.handleJoinRoom(socket, roomData);
        });

        // Handle user leaving rooms
        socket.on('leave_room', async(roomData) => {
          await this.handleLeaveRoom(socket, roomData);
        });

        // Handle subscription to market data
        socket.on('subscribe_market', async(subscriptionData) => {
          await this.handleMarketSubscription(socket, subscriptionData);
        });

        // Handle unsubscription from market data
        socket.on('unsubscribe_market', async(subscriptionData) => {
          await this.handleMarketUnsubscription(socket, subscriptionData);
        });

        // Handle chat messages
        socket.on('send_message', async(messageData) => {
          await this.handleChatMessage(socket, messageData);
        });

        // Handle typing indicators
        socket.on('typing_start', async(typingData) => {
          await this.handleTypingStart(socket, typingData);
        });

        socket.on('typing_stop', async(typingData) => {
          await this.handleTypingStop(socket, typingData);
        });

        // Handle trading events
        socket.on('trade_executed', async(tradeData) => {
          await this.handleTradeExecuted(socket, tradeData);
        });

        // Handle portfolio updates
        socket.on('portfolio_updated', async(portfolioData) => {
          await this.handlePortfolioUpdate(socket, portfolioData);
        });

        // Handle social trading events
        socket.on('share_trade', async(shareData) => {
          await this.handleTradeShare(socket, shareData);
        });

        // Handle AI interaction events
        socket.on('ai_interaction', async(aiData) => {
          await this.handleAIInteraction(socket, aiData);
        });

        // Handle disconnect
        socket.on('disconnect', async() => {
          await this.handleDisconnect(socket);
        });

        // Send welcome message
        socket.emit('connected', {
          message: 'Connected to FinAI Nexus real-time services',
          userId: socket.userId,
          timestamp: new Date().toISOString()
        });
      });
    } catch (error) {
      logger.error('Error setting up event handlers:', error);
    }
  }

  /**
   * Authenticate socket connection
   */
  async authenticateSocket(socket) {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization;

      if (!token) {
        return null;
      }

      // Verify JWT token (simplified for demo)
      // In production, this would verify the actual JWT
      const userId = this.extractUserIdFromToken(token);
      return userId;
    } catch (error) {
      logger.error('Error authenticating socket:', error);
      return null;
    }
  }

  /**
   * Extract user ID from token
   */
  extractUserIdFromToken(token) {
    // Simplified token extraction for demo
    // In production, this would decode and verify JWT
    const cleanToken = token.replace('Bearer ', '');
    return `user_${cleanToken.slice(-8)}`; // Mock user ID
  }

  /**
   * Handle user joining room
   */
  async handleJoinRoom(socket, roomData) {
    try {
      const { roomId, roomType = 'general' } = roomData;

      // Join Socket.IO room
      socket.join(roomId);

      // Update user's room subscriptions
      const user = this.connectedUsers.get(socket.userId);
      if (user) {
        user.subscriptions.add(roomId);
      }

      // Add room to rooms map
      if (!this.rooms.has(roomId)) {
        this.rooms.set(roomId, {
          id: roomId,
          type: roomType,
          users: new Set(),
          createdAt: new Date()
        });
      }

      const room = this.rooms.get(roomId);
      room.users.add(socket.userId);

      // Notify room about new user
      socket.to(roomId).emit('user_joined', {
        userId: socket.userId,
        roomId: roomId,
        timestamp: new Date().toISOString()
      });

      // Send room info to user
      socket.emit('room_joined', {
        roomId: roomId,
        userCount: room.users.size,
        timestamp: new Date().toISOString()
      });

      logger.info(`User ${socket.userId} joined room ${roomId}`);
    } catch (error) {
      logger.error('Error handling join room:', error);
    }
  }

  /**
   * Handle user leaving room
   */
  async handleLeaveRoom(socket, roomData) {
    try {
      const { roomId } = roomData;

      // Leave Socket.IO room
      socket.leave(roomId);

      // Update user's room subscriptions
      const user = this.connectedUsers.get(socket.userId);
      if (user) {
        user.subscriptions.delete(roomId);
      }

      // Update room users
      const room = this.rooms.get(roomId);
      if (room) {
        room.users.delete(socket.userId);
      }

      // Notify room about user leaving
      socket.to(roomId).emit('user_left', {
        userId: socket.userId,
        roomId: roomId,
        timestamp: new Date().toISOString()
      });

      logger.info(`User ${socket.userId} left room ${roomId}`);
    } catch (error) {
      logger.error('Error handling leave room:', error);
    }
  }

  /**
   * Handle market data subscription
   */
  async handleMarketSubscription(socket, subscriptionData) {
    try {
      const { symbols, dataTypes = ['price', 'volume'] } = subscriptionData;

      const user = this.connectedUsers.get(socket.userId);
      if (!user) return;

      // Add subscriptions
      symbols.forEach(symbol => {
        const subscriptionKey = `${symbol}:${dataTypes.join(',')}`;
        user.subscriptions.add(`market:${subscriptionKey}`);
        socket.join(`market:${subscriptionKey}`);
      });

      // Store subscription
      this.subscriptions.set(socket.userId, {
        symbols: symbols,
        dataTypes: dataTypes,
        subscribedAt: new Date()
      });

      socket.emit('market_subscribed', {
        symbols: symbols,
        dataTypes: dataTypes,
        timestamp: new Date().toISOString()
      });

      logger.info(`User ${socket.userId} subscribed to market data for ${symbols.join(', ')}`);
    } catch (error) {
      logger.error('Error handling market subscription:', error);
    }
  }

  /**
   * Handle market data unsubscription
   */
  async handleMarketUnsubscription(socket, subscriptionData) {
    try {
      const { symbols } = subscriptionData;

      const user = this.connectedUsers.get(socket.userId);
      if (!user) return;

      // Remove subscriptions
      symbols.forEach(symbol => {
        user.subscriptions.delete(`market:${symbol}`);
        socket.leave(`market:${symbol}`);
      });

      socket.emit('market_unsubscribed', {
        symbols: symbols,
        timestamp: new Date().toISOString()
      });

      logger.info(`User ${socket.userId} unsubscribed from market data for ${symbols.join(', ')}`);
    } catch (error) {
      logger.error('Error handling market unsubscription:', error);
    }
  }

  /**
   * Handle chat messages
   */
  async handleChatMessage(socket, messageData) {
    try {
      const { roomId, message, messageType = 'text' } = messageData;

      const chatMessage = {
        id: this.generateMessageId(),
        userId: socket.userId,
        roomId: roomId,
        message: message,
        messageType: messageType,
        timestamp: new Date(),
        edited: false,
        deleted: false
      };

      // Store message in database
      await this.storeChatMessage(chatMessage);

      // Broadcast message to room
      socket.to(roomId).emit('message_received', chatMessage);

      // Send confirmation to sender
      socket.emit('message_sent', {
        messageId: chatMessage.id,
        timestamp: chatMessage.timestamp
      });

      logger.info(`Message sent by ${socket.userId} in room ${roomId}`);
    } catch (error) {
      logger.error('Error handling chat message:', error);
    }
  }

  /**
   * Handle typing start
   */
  async handleTypingStart(socket, typingData) {
    try {
      const { roomId } = typingData;

      socket.to(roomId).emit('user_typing', {
        userId: socket.userId,
        roomId: roomId,
        isTyping: true,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error handling typing start:', error);
    }
  }

  /**
   * Handle typing stop
   */
  async handleTypingStop(socket, typingData) {
    try {
      const { roomId } = typingData;

      socket.to(roomId).emit('user_typing', {
        userId: socket.userId,
        roomId: roomId,
        isTyping: false,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error handling typing stop:', error);
    }
  }

  /**
   * Handle trade executed
   */
  async handleTradeExecuted(socket, tradeData) {
    try {
      const { tradeId, symbol, amount, price, type } = tradeData;

      const tradeEvent = {
        tradeId: tradeId,
        userId: socket.userId,
        symbol: symbol,
        amount: amount,
        price: price,
        type: type,
        timestamp: new Date().toISOString()
      };

      // Broadcast to user's followers (if social trading enabled)
      this.broadcastToFollowers(socket.userId, 'trade_executed', tradeEvent);

      // Send confirmation to user
      socket.emit('trade_confirmed', tradeEvent);

      logger.info(`Trade executed by ${socket.userId}: ${type} ${amount} ${symbol} at ${price}`);
    } catch (error) {
      logger.error('Error handling trade executed:', error);
    }
  }

  /**
   * Handle portfolio update
   */
  async handlePortfolioUpdate(socket, portfolioData) {
    try {
      const { portfolioId, totalValue, change, changePercent } = portfolioData;

      const portfolioEvent = {
        portfolioId: portfolioId,
        userId: socket.userId,
        totalValue: totalValue,
        change: change,
        changePercent: changePercent,
        timestamp: new Date().toISOString()
      };

      // Send update to user
      socket.emit('portfolio_updated', portfolioEvent);

      logger.info(`Portfolio updated for ${socket.userId}: $${totalValue} (${changePercent}%)`);
    } catch (error) {
      logger.error('Error handling portfolio update:', error);
    }
  }

  /**
   * Handle trade share
   */
  async handleTradeShare(socket, shareData) {
    try {
      const { tradeId, symbol, amount, price, type, message } = shareData;

      const shareEvent = {
        tradeId: tradeId,
        userId: socket.userId,
        symbol: symbol,
        amount: amount,
        price: price,
        type: type,
        message: message,
        timestamp: new Date().toISOString()
      };

      // Broadcast to followers
      this.broadcastToFollowers(socket.userId, 'social_trade_shared', shareEvent);

      // Send confirmation
      socket.emit('trade_shared', shareEvent);

      logger.info(`Trade shared by ${socket.userId}: ${type} ${amount} ${symbol}`);
    } catch (error) {
      logger.error('Error handling trade share:', error);
    }
  }

  /**
   * Handle AI interaction
   */
  async handleAIInteraction(socket, aiData) {
    try {
      const { interactionType, data } = aiData;

      const aiEvent = {
        userId: socket.userId,
        interactionType: interactionType,
        data: data,
        timestamp: new Date().toISOString()
      };

      // Send AI response
      socket.emit('ai_response', aiEvent);

      logger.info(`AI interaction by ${socket.userId}: ${interactionType}`);
    } catch (error) {
      logger.error('Error handling AI interaction:', error);
    }
  }

  /**
   * Handle user disconnect
   */
  async handleDisconnect(socket) {
    try {
      logger.info(`User ${socket.userId} disconnected`);

      // Remove user from connected users
      this.connectedUsers.delete(socket.userId);

      // Remove from all rooms
      this.rooms.forEach((room, roomId) => {
        room.users.delete(socket.userId);

        // Notify room about user leaving
        socket.to(roomId).emit('user_disconnected', {
          userId: socket.userId,
          roomId: roomId,
          timestamp: new Date().toISOString()
        });
      });

      // Remove subscriptions
      this.subscriptions.delete(socket.userId);
    } catch (error) {
      logger.error('Error handling disconnect:', error);
    }
  }

  /**
   * Start data streaming
   */
  async startDataStreaming() {
    try {
      // Start market data streaming
      this.broadcastInterval = setInterval(async() => {
        await this.broadcastMarketData();
        await this.broadcastSystemNotifications();
      }, 1000); // Broadcast every second

      logger.info('Data streaming started');
    } catch (error) {
      logger.error('Error starting data streaming:', error);
    }
  }

  /**
   * Broadcast market data
   */
  async broadcastMarketData() {
    try {
      const marketData = await this.generateMarketData();

      // Broadcast to all market subscribers
      this.io.to('market:*').emit('market_data_update', marketData);

      // Broadcast specific symbol updates
      Object.entries(marketData).forEach(([symbol, data]) => {
        this.io.to(`market:${symbol}`).emit('price_change', {
          symbol: symbol,
          price: data.price,
          change: data.change,
          changePercent: data.changePercent,
          volume: data.volume,
          timestamp: new Date().toISOString()
        });
      });
    } catch (error) {
      logger.error('Error broadcasting market data:', error);
    }
  }

  /**
   * Generate mock market data
   */
  async generateMarketData() {
    const symbols = ['BTC', 'ETH', 'BNB', 'ADA', 'SOL', 'MATIC', 'DOT', 'AVAX'];
    const marketData = {};

    symbols.forEach(symbol => {
      const basePrice = this.getBasePrice(symbol);
      const change = (Math.random() - 0.5) * basePrice * 0.1; // ±5% change
      const newPrice = basePrice + change;

      marketData[symbol] = {
        symbol: symbol,
        price: newPrice,
        change: change,
        changePercent: (change / basePrice) * 100,
        volume: Math.random() * 1000000,
        high24h: newPrice * (1 + Math.random() * 0.05),
        low24h: newPrice * (1 - Math.random() * 0.05),
        marketCap: newPrice * this.getCirculatingSupply(symbol)
      };
    });

    return marketData;
  }

  /**
   * Get base price for symbol
   */
  getBasePrice(symbol) {
    const basePrices = {
      'BTC': 45000,
      'ETH': 3200,
      'BNB': 300,
      'ADA': 0.5,
      'SOL': 100,
      'MATIC': 0.8,
      'DOT': 7,
      'AVAX': 25
    };
    return basePrices[symbol] || 100;
  }

  /**
   * Get circulating supply for symbol
   */
  getCirculatingSupply(symbol) {
    const supplies = {
      'BTC': 19500000,
      'ETH': 120000000,
      'BNB': 200000000,
      'ADA': 35000000000,
      'SOL': 400000000,
      'MATIC': 10000000000,
      'DOT': 1200000000,
      'AVAX': 300000000
    };
    return supplies[symbol] || 1000000000;
  }

  /**
   * Broadcast system notifications
   */
  async broadcastSystemNotifications() {
    try {
      // Check for pending notifications
      const notifications = await this.getPendingNotifications();

      notifications.forEach(notification => {
        if (notification.userId) {
          // Send to specific user
          this.io.to(`user:${notification.userId}`).emit('system_notification', notification);
        } else {
          // Broadcast to all users
          this.io.emit('system_notification', notification);
        }

        // Mark as sent
        this.markNotificationAsSent(notification.id);
      });
    } catch (error) {
      logger.error('Error broadcasting system notifications:', error);
    }
  }

  /**
   * Broadcast to followers
   */
  async broadcastToFollowers(userId, eventType, data) {
    try {
      const followers = await this.getUserFollowers(userId);

      followers.forEach(followerId => {
        const follower = this.connectedUsers.get(followerId);
        if (follower) {
          this.io.to(follower.socketId).emit(eventType, data);
        }
      });
    } catch (error) {
      logger.error('Error broadcasting to followers:', error);
    }
  }

  /**
   * Generate message ID
   */
  generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Store chat message
   */
  async storeChatMessage(message) {
    try {
      await this.db.queryMongo('chat_messages', 'insertOne', message);
    } catch (error) {
      logger.error('Error storing chat message:', error);
    }
  }

  /**
   * Get pending notifications
   */
  async getPendingNotifications() {
    try {
      const notifications = await this.db.queryMongo('notifications', 'find', {
        sent: false,
        scheduledAt: { $lte: new Date() }
      });
      return notifications || [];
    } catch (error) {
      logger.error('Error getting pending notifications:', error);
      return [];
    }
  }

  /**
   * Mark notification as sent
   */
  async markNotificationAsSent(notificationId) {
    try {
      await this.db.queryMongo('notifications', 'updateOne',
        { _id: notificationId },
        { $set: { sent: true, sentAt: new Date() } }
      );
    } catch (error) {
      logger.error('Error marking notification as sent:', error);
    }
  }

  /**
   * Get user followers
   */
  async getUserFollowers(userId) {
    try {
      const followers = await this.db.queryMongo('user_follows', 'find', {
        followingUserId: userId,
        isActive: true
      });
      return followers.map(follow => follow.followerUserId) || [];
    } catch (error) {
      logger.error('Error getting user followers:', error);
      return [];
    }
  }

  /**
   * Get connection statistics
   */
  async getConnectionStats() {
    try {
      return {
        connectedUsers: this.connectedUsers.size,
        activeRooms: this.rooms.size,
        activeSubscriptions: this.subscriptions.size,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error getting connection stats:', error);
      return {
        connectedUsers: 0,
        activeRooms: 0,
        activeSubscriptions: 0,
        error: error.message
      };
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const stats = await this.getConnectionStats();

      return {
        status: 'healthy',
        service: 'websocket',
        stats: stats,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        service: 'websocket',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = WebSocketService;
