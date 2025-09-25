/**
 * FinAI Nexus - Social Trading Rooms Service
 *
 * Collaborative trading rooms featuring:
 * - Real-time voice chat with WebRTC
 * - Shared trading screens and portfolios
 * - Live trade execution and sharing
 * - Trading competitions and leaderboards
 * - Expert trader mentorship
 * - AI-moderated discussions
 * - Sentiment analysis and social signals
 * - Cross-platform compatibility
 */

const { v4: uuidv4 } = require('uuid');
const EventEmitter = require('events');
const logger = require('../../utils/logger');

class SocialTradingRooms extends EventEmitter {
  constructor() {
    super();
    this.activeRooms = new Map();
    this.userSessions = new Map();
    this.voiceConnections = new Map();
    this.tradingSignals = new Map();
    this.competitions = new Map();

    this.initializeVoiceEngine();
    this.initializeModeration();
    this.startSentimentAnalysis();

    logger.info('SocialTradingRooms initialized with voice chat and collaboration');
  }

  /**
   * Initialize voice chat engine
   */
  initializeVoiceEngine() {
    this.voiceEngine = {
      webrtc: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ],
        codecPreferences: ['opus', 'g722', 'pcmu'],
        audioConstraints: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000
        }
      },
      spatialAudio: {
        enabled: true,
        maxDistance: 10,
        rolloffFactor: 1,
        refDistance: 1
      },
      moderation: {
        profanityFilter: true,
        volumeLimits: { min: 0.1, max: 0.9 },
        autoMute: true,
        recordingEnabled: false
      }
    };
  }

  /**
   * Initialize AI moderation
   */
  initializeModeration() {
    this.moderationEngine = {
      contentFilter: {
        profanity: true,
        spam: true,
        harassment: true,
        financialAdvice: true
      },
      sentimentAnalysis: {
        enabled: true,
        threshold: 0.7,
        realTime: true
      },
      autoActions: {
        muteOnToxicity: true,
        warnOnSpam: true,
        flagFinancialAdvice: true
      }
    };
  }

  /**
   * Create trading room
   */
  async createTradingRoom(creatorId, roomConfig = {}) {
    const roomId = uuidv4();

    const room = {
      roomId,
      creatorId,
      name: roomConfig.name || `Trading Room ${roomId.substring(0, 8)}`,
      description: roomConfig.description || '',
      type: roomConfig.type || 'general', // general, beginner, advanced, crypto, forex
      maxParticipants: roomConfig.maxParticipants || 50,
      isPrivate: roomConfig.isPrivate || false,
      password: roomConfig.password || null,
      createdAt: new Date(),
      status: 'active',
      participants: new Map(),
      voiceChannels: new Map(),
      tradingSessions: new Map(),
      sharedPortfolios: new Map(),
      messages: [],
      competitions: [],
      rules: this.getDefaultRoomRules()
    };

    // Create default voice channels
    room.voiceChannels.set('main', {
      channelId: 'main',
      name: 'Main Chat',
      type: 'voice',
      participants: [],
      isMuted: false,
      spatialAudio: true
    });

    room.voiceChannels.set('trading', {
      channelId: 'trading',
      name: 'Trading Discussion',
      type: 'voice',
      participants: [],
      isMuted: false,
      spatialAudio: false
    });

    this.activeRooms.set(roomId, room);

    logger.info(`🏠 Created trading room: ${room.name} (${roomId})`);

    return room;
  }

  /**
   * Get default room rules
   */
  getDefaultRoomRules() {
    return {
      respect: 'Be respectful to all participants',
      noAdvice: 'No unsolicited financial advice',
      noSpam: 'No spam or promotional content',
      stayOnTopic: 'Keep discussions relevant to trading',
      noHarassment: 'No harassment or inappropriate behavior',
      language: 'Use appropriate language',
      sharing: 'Share trades responsibly'
    };
  }

  /**
   * Join trading room
   */
  async joinTradingRoom(roomId, userId, userConfig = {}) {
    const room = this.activeRooms.get(roomId);
    if (!room) {
      throw new Error(`Room not found: ${roomId}`);
    }

    if (room.participants.size >= room.maxParticipants) {
      throw new Error('Room is full');
    }

    if (room.isPrivate && room.password && userConfig.password !== room.password) {
      throw new Error('Invalid room password');
    }

    const participant = {
      userId,
      username: userConfig.username || `User${userId.substring(0, 6)}`,
      avatar: userConfig.avatar || null,
      joinTime: new Date(),
      status: 'active',
      permissions: this.getUserPermissions(userId, room),
      voiceConnected: false,
      currentChannel: 'main',
      tradingStats: {
        totalTrades: 0,
        winRate: 0,
        totalProfit: 0,
        riskScore: 0
      },
      preferences: {
        voiceEnabled: userConfig.voiceEnabled !== false,
        notifications: userConfig.notifications !== false,
        shareTrades: userConfig.shareTrades !== false
      }
    };

    room.participants.set(userId, participant);

    // Notify other participants
    await this.broadcastToRoom(roomId, 'user_joined', {
      userId,
      username: participant.username,
      participantCount: room.participants.size
    });

    logger.info(`👤 User ${participant.username} joined room ${room.name}`);

    return {
      roomId,
      participant,
      room: this.getPublicRoomData(room)
    };
  }

  /**
   * Get user permissions based on role
   */
  getUserPermissions(userId, room) {
    const permissions = {
      canCreateCompetitions: false,
      canModerate: false,
      canInvite: false,
      canShareTrades: true,
      canVoiceChat: true,
      canViewAllTrades: false
    };

    // Creator has all permissions
    if (userId === room.creatorId) {
      Object.keys(permissions).forEach(key => permissions[key] = true);
    }

    return permissions;
  }

  /**
   * Connect to voice channel
   */
  async connectToVoiceChannel(roomId, userId, channelId = 'main') {
    const room = this.activeRooms.get(roomId);
    if (!room) {
      throw new Error(`Room not found: ${roomId}`);
    }

    const participant = room.participants.get(userId);
    if (!participant) {
      throw new Error(`User not in room: ${userId}`);
    }

    const channel = room.voiceChannels.get(channelId);
    if (!channel) {
      throw new Error(`Voice channel not found: ${channelId}`);
    }

    // Create WebRTC connection
    const voiceConnection = {
      connectionId: uuidv4(),
      userId,
      channelId,
      roomId,
      webrtc: {
        peerConnection: null,
        dataChannel: null,
        audioTrack: null,
        isConnected: false
      },
      audio: {
        volume: 0.5,
        muted: false,
        spatialPosition: { x: 0, y: 0, z: 0 }
      },
      createdAt: new Date()
    };

    // Add to channel participants
    channel.participants.push(userId);
    participant.currentChannel = channelId;
    participant.voiceConnected = true;

    this.voiceConnections.set(voiceConnection.connectionId, voiceConnection);

    // Notify channel participants
    await this.broadcastToChannel(roomId, channelId, 'voice_user_connected', {
      userId,
      username: participant.username,
      participantCount: channel.participants.length
    });

    logger.info(`🎤 User ${participant.username} connected to voice channel ${channelId}`);

    return voiceConnection;
  }

  /**
   * Send voice message
   */
  async sendVoiceMessage(roomId, userId, audioData, metadata = {}) {
    const room = this.activeRooms.get(roomId);
    if (!room) return;

    const participant = room.participants.get(userId);
    if (!participant || !participant.voiceConnected) {
      throw new Error('User not connected to voice');
    }

    const voiceMessage = {
      messageId: uuidv4(),
      userId,
      username: participant.username,
      audioData,
      duration: metadata.duration || 0,
      timestamp: new Date(),
      channelId: participant.currentChannel,
      metadata
    };

    // Apply moderation
    const moderationResult = await this.moderateVoiceMessage(voiceMessage);
    if (moderationResult.blocked) {
      await this.handleModerationAction(userId, moderationResult);
      return null;
    }

    // Broadcast to channel participants
    await this.broadcastToChannel(roomId, participant.currentChannel, 'voice_message', voiceMessage);

    logger.info(`🎙️ Voice message from ${participant.username} in ${participant.currentChannel}`);

    return voiceMessage;
  }

  /**
   * Moderate voice message
   */
  async moderateVoiceMessage(voiceMessage) {
    const result = {
      allowed: true,
      blocked: false,
      reason: null,
      actions: []
    };

    // Check volume levels
    if (voiceMessage.metadata.volume > this.voiceEngine.moderation.volumeLimits.max) {
      result.actions.push('auto_mute');
      result.reason = 'Volume too high';
    }

    // Check for profanity in transcription (if available)
    if (voiceMessage.metadata.transcription) {
      const profanityCheck = await this.checkProfanity(voiceMessage.metadata.transcription);
      if (profanityCheck.detected) {
        result.blocked = true;
        result.reason = 'Inappropriate language detected';
        result.actions.push('mute_user');
      }
    }

    return result;
  }

  /**
   * Check for profanity in text
   */
  async checkProfanity(text) {
    // Simple profanity filter (in production, use advanced NLP)
    const profanityWords = ['spam', 'scam', 'pump', 'dump']; // Example words
    const detected = profanityWords.some(word =>
      text.toLowerCase().includes(word.toLowerCase())
    );

    return {
      detected,
      confidence: detected ? 0.8 : 0.1,
      words: detected ? profanityWords.filter(word =>
        text.toLowerCase().includes(word.toLowerCase())
      ) : []
    };
  }

  /**
   * Share trade in room
   */
  async shareTrade(roomId, userId, tradeData) {
    const room = this.activeRooms.get(roomId);
    if (!room) return;

    const participant = room.participants.get(userId);
    if (!participant) {
      throw new Error(`User not in room: ${userId}`);
    }

    if (!participant.permissions.canShareTrades) {
      throw new Error('User does not have permission to share trades');
    }

    const sharedTrade = {
      tradeId: uuidv4(),
      userId,
      username: participant.username,
      trade: {
        symbol: tradeData.symbol,
        type: tradeData.type, // buy, sell
        amount: tradeData.amount,
        price: tradeData.price,
        timestamp: new Date(),
        reason: tradeData.reason || '',
        screenshot: tradeData.screenshot || null
      },
      reactions: new Map(),
      comments: [],
      visibility: tradeData.visibility || 'room', // room, public
      timestamp: new Date()
    };

    // Add to room trading sessions
    room.tradingSessions.set(sharedTrade.tradeId, sharedTrade);

    // Update user trading stats
    participant.tradingStats.totalTrades += 1;

    // Notify room participants
    await this.broadcastToRoom(roomId, 'trade_shared', {
      tradeId: sharedTrade.tradeId,
      userId,
      username: participant.username,
      trade: sharedTrade.trade
    });

    // Analyze trade sentiment
    await this.analyzeTradeSentiment(roomId, sharedTrade);

    logger.info(`📈 Trade shared by ${participant.username}: ${tradeData.symbol} ${tradeData.type}`);

    return sharedTrade;
  }

  /**
   * React to shared trade
   */
  async reactToTrade(roomId, userId, tradeId, reactionType) {
    const room = this.activeRooms.get(roomId);
    if (!room) return;

    const trade = room.tradingSessions.get(tradeId);
    if (!trade) {
      throw new Error(`Trade not found: ${tradeId}`);
    }

    const participant = room.participants.get(userId);
    if (!participant) {
      throw new Error(`User not in room: ${userId}`);
    }

    // Add or update reaction
    const existingReaction = trade.reactions.get(userId);
    if (existingReaction && existingReaction.type === reactionType) {
      // Remove reaction if same type
      trade.reactions.delete(userId);
    } else {
      // Add or update reaction
      trade.reactions.set(userId, {
        userId,
        username: participant.username,
        type: reactionType,
        timestamp: new Date()
      });
    }

    // Notify trade owner and room
    await this.broadcastToRoom(roomId, 'trade_reaction', {
      tradeId,
      userId,
      username: participant.username,
      reactionType,
      reactionCount: trade.reactions.size
    });

    logger.info(`👍 Reaction added to trade ${tradeId}: ${reactionType}`);

    return {
      tradeId,
      reactions: Array.from(trade.reactions.values()),
      reactionCount: trade.reactions.size
    };
  }

  /**
   * Create trading competition
   */
  async createCompetition(roomId, creatorId, competitionConfig) {
    const room = this.activeRooms.get(roomId);
    if (!room) return;

    const participant = room.participants.get(creatorId);
    if (!participant || !participant.permissions.canCreateCompetitions) {
      throw new Error('User does not have permission to create competitions');
    }

    const competition = {
      competitionId: uuidv4(),
      roomId,
      creatorId,
      name: competitionConfig.name,
      description: competitionConfig.description,
      type: competitionConfig.type || 'profit_contest', // profit_contest, accuracy_contest, risk_contest
      duration: competitionConfig.duration || 24, // hours
      startTime: new Date(),
      endTime: new Date(Date.now() + competitionConfig.duration * 3600000),
      rules: competitionConfig.rules || {},
      participants: new Map(),
      leaderboard: [],
      prizes: competitionConfig.prizes || [],
      status: 'active'
    };

    room.competitions.push(competition);
    this.competitions.set(competition.competitionId, competition);

    // Notify room participants
    await this.broadcastToRoom(roomId, 'competition_created', {
      competitionId: competition.competitionId,
      name: competition.name,
      type: competition.type,
      duration: competition.duration
    });

    logger.info(`🏆 Competition created: ${competition.name} in room ${room.name}`);

    return competition;
  }

  /**
   * Join competition
   */
  async joinCompetition(roomId, userId, competitionId) {
    const competition = this.competitions.get(competitionId);
    if (!competition || competition.roomId !== roomId) {
      throw new Error(`Competition not found: ${competitionId}`);
    }

    if (competition.status !== 'active') {
      throw new Error('Competition is not active');
    }

    const participant = {
      userId,
      joinTime: new Date(),
      initialBalance: 10000, // Starting balance
      currentBalance: 10000,
      trades: [],
      performance: {
        totalReturn: 0,
        winRate: 0,
        riskScore: 0,
        sharpeRatio: 0
      }
    };

    competition.participants.set(userId, participant);

    // Update leaderboard
    await this.updateCompetitionLeaderboard(competitionId);

    // Notify room participants
    await this.broadcastToRoom(roomId, 'competition_joined', {
      competitionId,
      userId,
      participantCount: competition.participants.size
    });

    logger.info(`👤 User ${userId} joined competition ${competition.name}`);

    return participant;
  }

  /**
   * Update competition leaderboard
   */
  async updateCompetitionLeaderboard(competitionId) {
    const competition = this.competitions.get(competitionId);
    if (!competition) return;

    const leaderboard = Array.from(competition.participants.values())
      .map(participant => ({
        userId: participant.userId,
        currentBalance: participant.currentBalance,
        totalReturn: participant.performance.totalReturn,
        winRate: participant.performance.winRate,
        riskScore: participant.performance.riskScore
      }))
      .sort((a, b) => b.totalReturn - a.totalReturn)
      .map((entry, index) => ({
        ...entry,
        rank: index + 1
      }));

    competition.leaderboard = leaderboard;

    // Broadcast leaderboard update
    await this.broadcastToRoom(competition.roomId, 'leaderboard_update', {
      competitionId,
      leaderboard: leaderboard.slice(0, 10) // Top 10
    });

    return leaderboard;
  }

  /**
   * Analyze trade sentiment
   */
  async analyzeTradeSentiment(roomId, trade) {
    // Simple sentiment analysis (in production, use advanced NLP)
    const sentimentScore = Math.random() * 2 - 1; // -1 to 1

    const sentiment = {
      tradeId: trade.tradeId,
      score: sentimentScore,
      label: sentimentScore > 0.1 ? 'positive' : sentimentScore < -0.1 ? 'negative' : 'neutral',
      confidence: 0.7 + Math.random() * 0.3,
      timestamp: new Date()
    };

    // Store sentiment data
    if (!this.tradingSignals.has(roomId)) {
      this.tradingSignals.set(roomId, []);
    }
    this.tradingSignals.get(roomId).push(sentiment);

    // Notify room if sentiment is significant
    if (Math.abs(sentimentScore) > 0.5) {
      await this.broadcastToRoom(roomId, 'sentiment_alert', {
        tradeId: trade.tradeId,
        symbol: trade.trade.symbol,
        sentiment: sentiment.label,
        confidence: sentiment.confidence
      });
    }

    return sentiment;
  }

  /**
   * Start sentiment analysis monitoring
   */
  startSentimentAnalysis() {
    setInterval(() => {
      this.updateRoomSentimentMetrics();
    }, 30000); // Update every 30 seconds
  }

  /**
   * Update room sentiment metrics
   */
  updateRoomSentimentMetrics() {
    for (const [roomId, signals] of this.tradingSignals) {
      if (signals.length === 0) continue;

      const recentSignals = signals.filter(s =>
        Date.now() - s.timestamp.getTime() < 300000 // Last 5 minutes
      );

      if (recentSignals.length === 0) continue;

      const avgSentiment = recentSignals.reduce((sum, s) => sum + s.score, 0) / recentSignals.length;

      // Broadcast sentiment update
      this.broadcastToRoom(roomId, 'sentiment_update', {
        averageSentiment: avgSentiment,
        signalCount: recentSignals.length,
        timestamp: new Date()
      });
    }
  }

  /**
   * Broadcast message to room
   */
  async broadcastToRoom(roomId, event, data) {
    const room = this.activeRooms.get(roomId);
    if (!room) return;

    const message = {
      event,
      data,
      timestamp: new Date()
    };

    // In production, this would send WebSocket messages to all participants
    logger.info(`📢 Broadcasting to room ${room.name}: ${event}`);

    this.emit('room_broadcast', { roomId, message });

    return message;
  }

  /**
   * Broadcast message to voice channel
   */
  async broadcastToChannel(roomId, channelId, event, data) {
    const room = this.activeRooms.get(roomId);
    if (!room) return;

    const channel = room.voiceChannels.get(channelId);
    if (!channel) return;

    const message = {
      event,
      data,
      timestamp: new Date()
    };

    logger.info(`📢 Broadcasting to channel ${channel.name}: ${event}`);

    this.emit('channel_broadcast', { roomId, channelId, message });

    return message;
  }

  /**
   * Get public room data (without sensitive information)
   */
  getPublicRoomData(room) {
    return {
      roomId: room.roomId,
      name: room.name,
      description: room.description,
      type: room.type,
      participantCount: room.participants.size,
      maxParticipants: room.maxParticipants,
      isPrivate: room.isPrivate,
      createdAt: room.createdAt,
      status: room.status,
      competitions: room.competitions.length,
      voiceChannels: Array.from(room.voiceChannels.keys())
    };
  }

  /**
   * Handle moderation action
   */
  async handleModerationAction(userId, moderationResult) {
    const actions = moderationResult.actions || [];

    for (const action of actions) {
      switch (action) {
      case 'auto_mute':
        await this.muteUser(userId, 300); // 5 minutes
        break;
      case 'mute_user':
        await this.muteUser(userId, 1800); // 30 minutes
        break;
      case 'warn_user':
        await this.warnUser(userId, moderationResult.reason);
        break;
      }
    }
  }

  /**
   * Mute user temporarily
   */
  async muteUser(userId, durationSeconds) {
    // Find user in all rooms and mute
    for (const room of this.activeRooms.values()) {
      const participant = room.participants.get(userId);
      if (participant) {
        participant.mutedUntil = new Date(Date.now() + durationSeconds * 1000);

        await this.broadcastToRoom(room.roomId, 'user_muted', {
          userId,
          username: participant.username,
          duration: durationSeconds,
          reason: 'Automated moderation'
        });
      }
    }
  }

  /**
   * Warn user
   */
  async warnUser(userId, reason) {
    // Find user in all rooms and send warning
    for (const room of this.activeRooms.values()) {
      const participant = room.participants.get(userId);
      if (participant) {
        await this.broadcastToRoom(room.roomId, 'user_warned', {
          userId,
          username: participant.username,
          reason
        });
      }
    }
  }

  /**
   * Get room analytics
   */
  getRoomAnalytics() {
    const analytics = {
      totalRooms: this.activeRooms.size,
      totalParticipants: 0,
      totalVoiceConnections: this.voiceConnections.size,
      totalCompetitions: this.competitions.size,
      roomTypes: {},
      activeCompetitions: 0
    };

    for (const room of this.activeRooms.values()) {
      analytics.totalParticipants += room.participants.size;
      analytics.roomTypes[room.type] = (analytics.roomTypes[room.type] || 0) + 1;
    }

    for (const competition of this.competitions.values()) {
      if (competition.status === 'active') {
        analytics.activeCompetitions++;
      }
    }

    return analytics;
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const analytics = this.getRoomAnalytics();

      return {
        status: 'healthy',
        service: 'social-trading-rooms',
        metrics: {
          totalRooms: analytics.totalRooms,
          totalParticipants: analytics.totalParticipants,
          voiceConnections: analytics.totalVoiceConnections,
          activeCompetitions: analytics.activeCompetitions
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        service: 'social-trading-rooms',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = SocialTradingRooms;
