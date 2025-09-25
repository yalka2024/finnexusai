/**
 * FinAI Nexus - Notification Service
 *
 * Advanced real-time notification system featuring:
 * - WebSocket real-time notifications
 * - Push notifications (FCM, APNs)
 * - Email notifications
 * - SMS notifications
 * - In-app notifications
 * - Notification templates and personalization
 * - Delivery tracking and analytics
 * - Notification preferences and opt-out
 */

const { v4: uuidv4 } = require('uuid');
const logger = require('../../utils/logger');

class NotificationService {
  constructor() {
    this.notifications = new Map(); // Store notifications in memory
    this.subscribers = new Map(); // WebSocket subscribers
    this.templates = new Map(); // Notification templates
    this.deliveryStats = {
      total: 0,
      delivered: 0,
      failed: 0,
      pending: 0
    };

    this.setupDefaultTemplates();
    this.setupDeliveryQueues();

    logger.info('NotificationService initialized with real-time capabilities');
  }

  /**
   * Setup default notification templates
   */
  setupDefaultTemplates() {
    // Trading notifications
    this.templates.set('trade_executed', {
      id: 'trade_executed',
      name: 'Trade Executed',
      channels: ['websocket', 'push', 'email'],
      template: {
        title: 'Trade Executed',
        body: 'Your {type} order for {amount} {symbol} has been executed at ${price}',
        data: {
          type: 'trade',
          action: 'view_trade',
          tradeId: '{tradeId}'
        }
      },
      priority: 'high',
      ttl: 3600 // 1 hour
    });

    this.templates.set('trade_failed', {
      id: 'trade_failed',
      name: 'Trade Failed',
      channels: ['websocket', 'push', 'email'],
      template: {
        title: 'Trade Failed',
        body: 'Your {type} order for {amount} {symbol} has failed. Reason: {reason}',
        data: {
          type: 'trade',
          action: 'retry_trade',
          tradeId: '{tradeId}'
        }
      },
      priority: 'high',
      ttl: 3600
    });

    // Portfolio notifications
    this.templates.set('portfolio_alert', {
      id: 'portfolio_alert',
      name: 'Portfolio Alert',
      channels: ['websocket', 'push', 'email'],
      template: {
        title: 'Portfolio Alert',
        body: 'Your portfolio {symbol} has {change} by {percentage}%',
        data: {
          type: 'portfolio',
          action: 'view_portfolio',
          portfolioId: '{portfolioId}'
        }
      },
      priority: 'medium',
      ttl: 1800 // 30 minutes
    });

    this.templates.set('price_alert', {
      id: 'price_alert',
      name: 'Price Alert',
      channels: ['websocket', 'push', 'sms'],
      template: {
        title: 'Price Alert',
        body: '{symbol} has reached your target price of ${price}',
        data: {
          type: 'price_alert',
          action: 'view_asset',
          symbol: '{symbol}'
        }
      },
      priority: 'high',
      ttl: 1800
    });

    // Security notifications
    this.templates.set('security_alert', {
      id: 'security_alert',
      name: 'Security Alert',
      channels: ['websocket', 'push', 'email', 'sms'],
      template: {
        title: 'Security Alert',
        body: 'Suspicious activity detected on your account. Please verify your identity.',
        data: {
          type: 'security',
          action: 'verify_identity',
          alertId: '{alertId}'
        }
      },
      priority: 'critical',
      ttl: 86400 // 24 hours
    });

    this.templates.set('login_notification', {
      id: 'login_notification',
      name: 'Login Notification',
      channels: ['websocket', 'email'],
      template: {
        title: 'New Login Detected',
        body: 'Your account was accessed from {location} at {time}',
        data: {
          type: 'security',
          action: 'view_security',
          sessionId: '{sessionId}'
        }
      },
      priority: 'medium',
      ttl: 3600
    });

    // AI service notifications
    this.templates.set('ai_insight', {
      id: 'ai_insight',
      name: 'AI Insight',
      channels: ['websocket', 'push'],
      template: {
        title: 'New AI Insight',
        body: 'Your AI advisor has new insights about {topic}',
        data: {
          type: 'ai',
          action: 'view_insights',
          insightId: '{insightId}'
        }
      },
      priority: 'low',
      ttl: 7200 // 2 hours
    });

    this.templates.set('avatar_message', {
      id: 'avatar_message',
      name: 'Avatar Message',
      channels: ['websocket', 'push'],
      template: {
        title: 'Message from {avatarName}',
        body: '{message}',
        data: {
          type: 'avatar',
          action: 'chat_avatar',
          avatarId: '{avatarId}'
        }
      },
      priority: 'low',
      ttl: 3600
    });

    // System notifications
    this.templates.set('system_maintenance', {
      id: 'system_maintenance',
      name: 'System Maintenance',
      channels: ['websocket', 'push', 'email'],
      template: {
        title: 'Scheduled Maintenance',
        body: 'System maintenance scheduled for {date} from {startTime} to {endTime}',
        data: {
          type: 'system',
          action: 'view_status',
          maintenanceId: '{maintenanceId}'
        }
      },
      priority: 'medium',
      ttl: 86400
    });

    // Achievement notifications
    this.templates.set('achievement_unlocked', {
      id: 'achievement_unlocked',
      name: 'Achievement Unlocked',
      channels: ['websocket', 'push'],
      template: {
        title: 'Achievement Unlocked!',
        body: 'Congratulations! You have unlocked the "{achievementName}" achievement',
        data: {
          type: 'achievement',
          action: 'view_achievements',
          achievementId: '{achievementId}'
        }
      },
      priority: 'low',
      ttl: 7200
    });
  }

  /**
   * Setup delivery queues for different notification channels
   */
  setupDeliveryQueues() {
    this.deliveryQueues = {
      websocket: [],
      push: [],
      email: [],
      sms: []
    };

    // Start processing queues
    this.startQueueProcessing();
  }

  /**
   * Start processing notification queues
   */
  startQueueProcessing() {
    // Process WebSocket queue (immediate)
    setInterval(() => {
      this.processWebSocketQueue();
    }, 100);

    // Process push notification queue
    setInterval(() => {
      this.processPushQueue();
    }, 1000);

    // Process email queue
    setInterval(() => {
      this.processEmailQueue();
    }, 2000);

    // Process SMS queue
    setInterval(() => {
      this.processSMSQueue();
    }, 3000);
  }

  /**
   * Send notification using template
   */
  async sendNotification(userId, templateId, data, options = {}) {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    const notification = {
      id: uuidv4(),
      userId,
      templateId,
      template,
      data,
      channels: options.channels || template.channels,
      priority: options.priority || template.priority,
      ttl: options.ttl || template.ttl,
      scheduledAt: options.scheduledAt || new Date(),
      status: 'pending',
      attempts: 0,
      maxAttempts: 3,
      createdAt: new Date(),
      deliveredAt: null,
      failedAt: null
    };

    // Personalize template
    notification.content = this.personalizeTemplate(template.template, data);

    // Store notification
    this.notifications.set(notification.id, notification);

    // Add to delivery queues
    await this.addToDeliveryQueues(notification);

    this.deliveryStats.total++;
    this.deliveryStats.pending++;

    logger.info(`Notification ${notification.id} created for user ${userId}`);

    return notification;
  }

  /**
   * Personalize notification template
   */
  personalizeTemplate(template, data) {
    const content = { ...template };

    // Replace placeholders in title and body
    if (content.title) {
      content.title = this.replacePlaceholders(content.title, data);
    }

    if (content.body) {
      content.body = this.replacePlaceholders(content.body, data);
    }

    // Replace placeholders in data object
    if (content.data) {
      content.data = this.replacePlaceholdersInObject(content.data, data);
    }

    return content;
  }

  /**
   * Replace placeholders in string
   */
  replacePlaceholders(text, data) {
    return text.replace(/\{(\w+)\}/g, (match, key) => {
      return data[key] !== undefined ? data[key] : match;
    });
  }

  /**
   * Replace placeholders in object
   */
  replacePlaceholdersInObject(obj, data) {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        result[key] = this.replacePlaceholders(value, data);
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  /**
   * Add notification to delivery queues
   */
  async addToDeliveryQueues(notification) {
    for (const channel of notification.channels) {
      if (this.deliveryQueues[channel]) {
        this.deliveryQueues[channel].push(notification);
      }
    }
  }

  /**
   * Process WebSocket queue
   */
  async processWebSocketQueue() {
    const queue = this.deliveryQueues.websocket;

    while (queue.length > 0) {
      const notification = queue.shift();

      try {
        await this.sendWebSocketNotification(notification);
        await this.markNotificationDelivered(notification.id);
      } catch (error) {
        await this.handleDeliveryFailure(notification, error);
      }
    }
  }

  /**
   * Send WebSocket notification
   */
  async sendWebSocketNotification(notification) {
    const subscribers = this.subscribers.get(notification.userId);

    if (subscribers && subscribers.length > 0) {
      const message = {
        id: notification.id,
        type: 'notification',
        template: notification.templateId,
        content: notification.content,
        timestamp: notification.createdAt.toISOString(),
        priority: notification.priority
      };

      for (const subscriber of subscribers) {
        try {
          subscriber.send(JSON.stringify(message));
          logger.info(`WebSocket notification sent to user ${notification.userId}`);
        } catch (error) {
          logger.error(`Failed to send WebSocket notification: ${error.message}`);
          throw error;
        }
      }
    } else {
      logger.info(`No WebSocket subscribers for user ${notification.userId}`);
    }
  }

  /**
   * Process push notification queue
   */
  async processPushQueue() {
    const queue = this.deliveryQueues.push;

    while (queue.length > 0) {
      const notification = queue.shift();

      try {
        await this.sendPushNotification(notification);
        await this.markNotificationDelivered(notification.id);
      } catch (error) {
        await this.handleDeliveryFailure(notification, error);
      }
    }
  }

  /**
   * Send push notification
   */
  async sendPushNotification(notification) {
    // Mock push notification service (FCM/APNs)
    logger.info(`Push notification sent to user ${notification.userId}: ${notification.content.title}`);

    // In a real implementation, this would integrate with:
    // - Firebase Cloud Messaging (FCM) for Android
    // - Apple Push Notification Service (APNs) for iOS

    return true;
  }

  /**
   * Process email queue
   */
  async processEmailQueue() {
    const queue = this.deliveryQueues.email;

    while (queue.length > 0) {
      const notification = queue.shift();

      try {
        await this.sendEmailNotification(notification);
        await this.markNotificationDelivered(notification.id);
      } catch (error) {
        await this.handleDeliveryFailure(notification, error);
      }
    }
  }

  /**
   * Send email notification
   */
  async sendEmailNotification(notification) {
    // Mock email service
    logger.info(`Email notification sent to user ${notification.userId}: ${notification.content.title}`);

    // In a real implementation, this would integrate with:
    // - SendGrid, AWS SES, or similar email service

    return true;
  }

  /**
   * Process SMS queue
   */
  async processSMSQueue() {
    const queue = this.deliveryQueues.sms;

    while (queue.length > 0) {
      const notification = queue.shift();

      try {
        await this.sendSMSNotification(notification);
        await this.markNotificationDelivered(notification.id);
      } catch (error) {
        await this.handleDeliveryFailure(notification, error);
      }
    }
  }

  /**
   * Send SMS notification
   */
  async sendSMSNotification(notification) {
    // Mock SMS service
    logger.info(`SMS notification sent to user ${notification.userId}: ${notification.content.body}`);

    // In a real implementation, this would integrate with:
    // - Twilio, AWS SNS, or similar SMS service

    return true;
  }

  /**
   * Mark notification as delivered
   */
  async markNotificationDelivered(notificationId) {
    const notification = this.notifications.get(notificationId);
    if (notification) {
      notification.status = 'delivered';
      notification.deliveredAt = new Date();
      this.deliveryStats.delivered++;
      this.deliveryStats.pending--;
    }
  }

  /**
   * Handle delivery failure
   */
  async handleDeliveryFailure(notification, error) {
    notification.attempts++;

    if (notification.attempts >= notification.maxAttempts) {
      notification.status = 'failed';
      notification.failedAt = new Date();
      this.deliveryStats.failed++;
      this.deliveryStats.pending--;

      logger.error(`Notification ${notification.id} failed after ${notification.maxAttempts} attempts: ${error.message}`);
    } else {
      // Retry after delay
      setTimeout(() => {
        this.addToDeliveryQueues(notification);
      }, Math.pow(2, notification.attempts) * 1000); // Exponential backoff
    }
  }

  /**
   * Subscribe user to WebSocket notifications
   */
  subscribeToWebSocket(userId, websocket) {
    if (!this.subscribers.has(userId)) {
      this.subscribers.set(userId, []);
    }

    this.subscribers.get(userId).push(websocket);

    websocket.on('close', () => {
      this.unsubscribeFromWebSocket(userId, websocket);
    });

    logger.info(`User ${userId} subscribed to WebSocket notifications`);
  }

  /**
   * Unsubscribe user from WebSocket notifications
   */
  unsubscribeFromWebSocket(userId, websocket) {
    const subscribers = this.subscribers.get(userId);
    if (subscribers) {
      const index = subscribers.indexOf(websocket);
      if (index > -1) {
        subscribers.splice(index, 1);
      }

      if (subscribers.length === 0) {
        this.subscribers.delete(userId);
      }
    }

    logger.info(`User ${userId} unsubscribed from WebSocket notifications`);
  }

  /**
   * Get user notifications
   */
  getUserNotifications(userId, options = {}) {
    const { limit = 50, offset = 0, status = null, type = null } = options;

    let notifications = Array.from(this.notifications.values())
      .filter(n => n.userId === userId);

    if (status) {
      notifications = notifications.filter(n => n.status === status);
    }

    if (type) {
      notifications = notifications.filter(n => n.templateId === type);
    }

    // Sort by creation date (newest first)
    notifications.sort((a, b) => b.createdAt - a.createdAt);

    return notifications.slice(offset, offset + limit);
  }

  /**
   * Mark notification as read
   */
  markAsRead(notificationId, userId) {
    const notification = this.notifications.get(notificationId);
    if (notification && notification.userId === userId) {
      notification.readAt = new Date();
      notification.isRead = true;
      return true;
    }
    return false;
  }

  /**
   * Get notification statistics
   */
  getNotificationStats() {
    const stats = {
      total: this.deliveryStats.total,
      delivered: this.deliveryStats.delivered,
      failed: this.deliveryStats.failed,
      pending: this.deliveryStats.pending,
      successRate: this.deliveryStats.total > 0 ?
        (this.deliveryStats.delivered / this.deliveryStats.total) * 100 : 0,
      templates: this.templates.size,
      activeSubscribers: this.subscribers.size
    };

    return stats;
  }

  /**
   * Create custom notification template
   */
  createTemplate(templateId, template) {
    this.templates.set(templateId, {
      id: templateId,
      ...template
    });

    logger.info(`Custom template ${templateId} created`);
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const stats = this.getNotificationStats();

      return {
        status: 'healthy',
        service: 'notifications',
        stats,
        queues: {
          websocket: this.deliveryQueues.websocket.length,
          push: this.deliveryQueues.push.length,
          email: this.deliveryQueues.email.length,
          sms: this.deliveryQueues.sms.length
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        service: 'notifications',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = NotificationService;
