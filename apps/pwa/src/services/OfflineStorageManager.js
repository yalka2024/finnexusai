/**
 * Offline Storage Manager for PWA
 * 
 * Manages offline data storage, synchronization, and caching
 * using IndexedDB, Cache API, and Background Sync
 */

import Dexie from 'dexie';
import { openDB, DBSchema, IDBPDatabase } from 'idb';

class OfflineStorageManager {
  constructor() {
    this.isInitialized = false;
    this.db = null;
    this.cacheName = 'finnexusai-offline-v1';
    this.syncQueue = new Map();
    this.maxRetries = 3;
    this.retryDelay = 5000; // 5 seconds
  }

  async initialize() {
    try {
      console.log('🔄 Initializing Offline Storage Manager...');

      // Initialize IndexedDB
      await this.initializeIndexedDB();
      
      // Initialize Cache API
      await this.initializeCache();
      
      // Setup background sync
      await this.setupBackgroundSync();
      
      // Load pending operations
      await this.loadPendingOperations();

      this.isInitialized = true;
      console.log('✅ Offline Storage Manager initialized successfully');
      
      return { success: true, message: 'Offline storage manager initialized' };
    } catch (error) {
      console.error('Offline storage manager initialization failed:', error);
      throw error;
    }
  }

  async initializeIndexedDB() {
    this.db = new Dexie('FinNexusAI_Offline');
    
    this.db.version(1).stores({
      trades: '++id, tradeId, userId, symbol, side, quantity, price, timestamp, status, syncStatus',
      portfolio: '++id, portfolioId, userId, symbol, quantity, averagePrice, currentPrice, value, timestamp, syncStatus',
      marketData: '++id, symbol, price, volume, change24h, timestamp, syncStatus',
      userProfile: '++id, userId, profileData, timestamp, syncStatus',
      notifications: '++id, notificationId, userId, title, message, type, data, timestamp, readStatus, syncStatus',
      syncQueue: '++id, operationId, operationType, tableName, recordId, operationData, retryCount, maxRetries, status, timestamp',
      conflictQueue: '++id, conflictId, tableName, recordId, localData, serverData, conflictType, resolutionStrategy, status, timestamp'
    });

    await this.db.open();
    console.log('✅ IndexedDB initialized');
  }

  async initializeCache() {
    try {
      const cache = await caches.open(this.cacheName);
      console.log('✅ Cache API initialized');
    } catch (error) {
      console.error('Cache initialization failed:', error);
    }
  }

  async setupBackgroundSync() {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      try {
        const registration = await navigator.serviceWorker.ready;
        
        // Register background sync
        await registration.sync.register('finnexusai-sync');
        console.log('✅ Background sync registered');
      } catch (error) {
        console.error('Background sync setup failed:', error);
      }
    }
  }

  async loadPendingOperations() {
    try {
      const pendingOps = await this.db.syncQueue.where('status').equals('pending').toArray();
      console.log(`📋 Loaded ${pendingOps.length} pending operations`);
    } catch (error) {
      console.error('Failed to load pending operations:', error);
    }
  }

  // Trading operations
  async saveTrade(tradeData) {
    try {
      const tradeId = tradeData.tradeId || this.generateId();
      
      await this.db.trades.add({
        tradeId,
        userId: tradeData.userId,
        symbol: tradeData.symbol,
        side: tradeData.side,
        quantity: tradeData.quantity,
        price: tradeData.price,
        timestamp: Date.now(),
        status: tradeData.status || 'pending',
        syncStatus: 'pending'
      });

      // Add to sync queue
      await this.addToSyncQueue('trade', 'trades', tradeId, tradeData);

      console.log(`💾 Saved trade: ${tradeId}`);
      return { success: true, tradeId, message: 'Trade saved offline' };
    } catch (error) {
      console.error('Failed to save trade:', error);
      throw error;
    }
  }

  async getTrades(userId) {
    try {
      const trades = await this.db.trades.where('userId').equals(userId).toArray();
      return { success: true, trades, message: 'Trades retrieved' };
    } catch (error) {
      console.error('Failed to get trades:', error);
      throw error;
    }
  }

  // Portfolio operations
  async savePortfolioItem(portfolioData) {
    try {
      const portfolioId = portfolioData.portfolioId || this.generateId();
      
      await this.db.portfolio.add({
        portfolioId,
        userId: portfolioData.userId,
        symbol: portfolioData.symbol,
        quantity: portfolioData.quantity,
        averagePrice: portfolioData.averagePrice,
        currentPrice: portfolioData.currentPrice,
        value: portfolioData.value,
        timestamp: Date.now(),
        syncStatus: 'pending'
      });

      // Add to sync queue
      await this.addToSyncQueue('portfolio', 'portfolio', portfolioId, portfolioData);

      console.log(`💾 Saved portfolio item: ${portfolioId}`);
      return { success: true, portfolioId, message: 'Portfolio item saved offline' };
    } catch (error) {
      console.error('Failed to save portfolio item:', error);
      throw error;
    }
  }

  async getPortfolio(userId) {
    try {
      const portfolio = await this.db.portfolio.where('userId').equals(userId).toArray();
      return { success: true, portfolio, message: 'Portfolio retrieved' };
    } catch (error) {
      console.error('Failed to get portfolio:', error);
      throw error;
    }
  }

  // Market data operations
  async saveMarketData(marketData) {
    try {
      await this.db.marketData.add({
        symbol: marketData.symbol,
        price: marketData.price,
        volume: marketData.volume,
        change24h: marketData.change24h,
        timestamp: Date.now(),
        syncStatus: 'synced'
      });

      console.log(`💾 Saved market data: ${marketData.symbol}`);
      return { success: true, message: 'Market data saved offline' };
    } catch (error) {
      console.error('Failed to save market data:', error);
      throw error;
    }
  }

  async getMarketData(symbol) {
    try {
      const marketData = await this.db.marketData.where('symbol').equals(symbol).last();
      return { success: true, marketData, message: 'Market data retrieved' };
    } catch (error) {
      console.error('Failed to get market data:', error);
      throw error;
    }
  }

  // User profile operations
  async saveUserProfile(profileData) {
    try {
      await this.db.userProfile.put({
        userId: profileData.userId,
        profileData: JSON.stringify(profileData),
        timestamp: Date.now(),
        syncStatus: 'pending'
      });

      // Add to sync queue
      await this.addToSyncQueue('userProfile', 'userProfile', profileData.userId, profileData);

      console.log(`💾 Saved user profile: ${profileData.userId}`);
      return { success: true, message: 'User profile saved offline' };
    } catch (error) {
      console.error('Failed to save user profile:', error);
      throw error;
    }
  }

  async getUserProfile(userId) {
    try {
      const profile = await this.db.userProfile.where('userId').equals(userId).first();
      if (profile) {
        profile.profileData = JSON.parse(profile.profileData);
      }
      return { success: true, profile, message: 'User profile retrieved' };
    } catch (error) {
      console.error('Failed to get user profile:', error);
      throw error;
    }
  }

  // Notification operations
  async saveNotification(notificationData) {
    try {
      const notificationId = notificationData.notificationId || this.generateId();
      
      await this.db.notifications.add({
        notificationId,
        userId: notificationData.userId,
        title: notificationData.title,
        message: notificationData.message,
        type: notificationData.type,
        data: JSON.stringify(notificationData.data || {}),
        timestamp: Date.now(),
        readStatus: 'unread',
        syncStatus: 'pending'
      });

      console.log(`💾 Saved notification: ${notificationId}`);
      return { success: true, notificationId, message: 'Notification saved offline' };
    } catch (error) {
      console.error('Failed to save notification:', error);
      throw error;
    }
  }

  async getNotifications(userId) {
    try {
      const notifications = await this.db.notifications.where('userId').equals(userId).toArray();
      return { success: true, notifications, message: 'Notifications retrieved' };
    } catch (error) {
      console.error('Failed to get notifications:', error);
      throw error;
    }
  }

  // Sync operations
  async addToSyncQueue(operationType, tableName, recordId, operationData) {
    try {
      const operationId = this.generateId();
      
      await this.db.syncQueue.add({
        operationId,
        operationType,
        tableName,
        recordId,
        operationData: JSON.stringify(operationData),
        retryCount: 0,
        maxRetries: this.maxRetries,
        status: 'pending',
        timestamp: Date.now()
      });

      console.log(`📋 Added to sync queue: ${operationId}`);
    } catch (error) {
      console.error('Failed to add to sync queue:', error);
    }
  }

  async syncPendingOperations() {
    try {
      const pendingOps = await this.db.syncQueue.where('status').equals('pending').toArray();
      
      for (const operation of pendingOps) {
        try {
          const success = await this.syncOperation(operation);
          
          if (success) {
            // Mark as synced
            await this.db.syncQueue.update(operation.id, {
              status: 'synced',
              timestamp: Date.now()
            });
          } else {
            // Increment retry count
            const newRetryCount = operation.retryCount + 1;
            
            if (newRetryCount >= operation.maxRetries) {
              // Mark as failed
              await this.db.syncQueue.update(operation.id, {
                status: 'failed',
                timestamp: Date.now()
              });
            } else {
              // Update retry count
              await this.db.syncQueue.update(operation.id, {
                retryCount: newRetryCount,
                timestamp: Date.now()
              });
            }
          }
        } catch (error) {
          console.error(`Failed to sync operation ${operation.operationId}:`, error);
        }
      }

      console.log('✅ Pending operations synced');
    } catch (error) {
      console.error('Sync failed:', error);
    }
  }

  async syncOperation(operation) {
    try {
      const operationData = JSON.parse(operation.operationData);
      
      // Simulate API call based on operation type
      switch (operation.operationType) {
      case 'trade':
        return await this.syncTradeToServer(operationData);
      case 'portfolio':
        return await this.syncPortfolioToServer(operationData);
      case 'userProfile':
        return await this.syncUserProfileToServer(operationData);
      default:
        return false;
      }
    } catch (error) {
      console.error('Operation sync failed:', error);
      return false;
    }
  }

  async syncTradeToServer(tradeData) {
    try {
      // In real implementation, make actual API call
      // const response = await fetch('/api/trades', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(tradeData)
      // });
      
      // Simulate success
      console.log(`📤 Syncing trade to server: ${tradeData.tradeId}`);
      return true;
    } catch (error) {
      console.error('Trade sync failed:', error);
      return false;
    }
  }

  async syncPortfolioToServer(portfolioData) {
    try {
      // In real implementation, make actual API call
      console.log(`📤 Syncing portfolio to server: ${portfolioData.portfolioId}`);
      return true;
    } catch (error) {
      console.error('Portfolio sync failed:', error);
      return false;
    }
  }

  async syncUserProfileToServer(profileData) {
    try {
      // In real implementation, make actual API call
      console.log(`📤 Syncing user profile to server: ${profileData.userId}`);
      return true;
    } catch (error) {
      console.error('User profile sync failed:', error);
      return false;
    }
  }

  // Cache operations
  async cacheResponse(url, response) {
    try {
      const cache = await caches.open(this.cacheName);
      await cache.put(url, response);
      console.log(`💾 Cached response: ${url}`);
    } catch (error) {
      console.error('Failed to cache response:', error);
    }
  }

  async getCachedResponse(url) {
    try {
      const cache = await caches.open(this.cacheName);
      const response = await cache.match(url);
      return response;
    } catch (error) {
      console.error('Failed to get cached response:', error);
      return null;
    }
  }

  async clearCache() {
    try {
      await caches.delete(this.cacheName);
      console.log('🗑️ Cache cleared');
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }

  // Utility methods
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Public status methods
  async getStorageStats() {
    try {
      const stats = {
        trades: await this.db.trades.count(),
        portfolio: await this.db.portfolio.count(),
        marketData: await this.db.marketData.count(),
        userProfile: await this.db.userProfile.count(),
        notifications: await this.db.notifications.count(),
        syncQueue: await this.db.syncQueue.where('status').equals('pending').count(),
        conflictQueue: await this.db.conflictQueue.where('status').equals('pending').count()
      };

      return { success: true, stats, message: 'Storage stats retrieved' };
    } catch (error) {
      console.error('Failed to get storage stats:', error);
      throw error;
    }
  }

  async clearAllData() {
    try {
      await this.db.trades.clear();
      await this.db.portfolio.clear();
      await this.db.marketData.clear();
      await this.db.userProfile.clear();
      await this.db.notifications.clear();
      await this.db.syncQueue.clear();
      await this.db.conflictQueue.clear();
      
      console.log('🗑️ All offline data cleared');
      return { success: true, message: 'All offline data cleared' };
    } catch (error) {
      console.error('Failed to clear all data:', error);
      throw error;
    }
  }

  // Export/Import functionality
  async exportData() {
    try {
      const data = {
        trades: await this.db.trades.toArray(),
        portfolio: await this.db.portfolio.toArray(),
        marketData: await this.db.marketData.toArray(),
        userProfile: await this.db.userProfile.toArray(),
        notifications: await this.db.notifications.toArray(),
        exportDate: new Date().toISOString()
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      // Trigger download
      const a = document.createElement('a');
      a.href = url;
      a.download = `finnexusai-offline-data-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log('📤 Data exported');
      return { success: true, message: 'Data exported successfully' };
    } catch (error) {
      console.error('Failed to export data:', error);
      throw error;
    }
  }

  async importData(file) {
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // Validate data structure
      if (!data.exportDate) {
        throw new Error('Invalid data format');
      }

      // Clear existing data
      await this.clearAllData();

      // Import new data
      if (data.trades) await this.db.trades.bulkAdd(data.trades);
      if (data.portfolio) await this.db.portfolio.bulkAdd(data.portfolio);
      if (data.marketData) await this.db.marketData.bulkAdd(data.marketData);
      if (data.userProfile) await this.db.userProfile.bulkAdd(data.userProfile);
      if (data.notifications) await this.db.notifications.bulkAdd(data.notifications);

      console.log('📥 Data imported');
      return { success: true, message: 'Data imported successfully' };
    } catch (error) {
      console.error('Failed to import data:', error);
      throw error;
    }
  }
}

export default new OfflineStorageManager();

