/**
 * Offline Sync Manager - Mobile Offline Capabilities
 * 
 * Manages offline data synchronization, conflict resolution,
 * background sync, and seamless online/offline transitions
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-netinfo/netinfo';
import BackgroundJob from 'react-native-background-job';
import { MMKV } from 'react-native-mmkv';
import SQLite from 'react-native-sqlite-storage';
import CryptoJS from 'react-native-crypto-js';
import { logger } from '../utils/Logger';

class OfflineSyncManager {
  constructor() {
    this.isInitialized = false;
    this.isOnline = false;
    this.syncInProgress = false;
    this.backgroundSyncEnabled = true;
    this.syncInterval = 30000; // 30 seconds
    this.maxRetries = 3;
    this.retryDelay = 5000; // 5 seconds
    
    // Storage instances
    this.mmkv = new MMKV({
      id: 'finnexusai_offline',
      encryptionKey: 'finnexusai_offline_key_2024'
    });
    
    this.db = null;
    this.syncQueue = new Map();
    this.conflictQueue = new Map();
    this.pendingOperations = [];
    
    // Sync strategies
    this.syncStrategies = {
      'trading': 'last_write_wins',
      'portfolio': 'merge_conflict',
      'user_profile': 'server_wins',
      'market_data': 'client_wins',
      'notifications': 'queue_merge'
    };
    
    this.backgroundSyncJob = null;
  }

  async initialize() {
    try {
      logger.info('🔄 Initializing Offline Sync Manager...');

      // Initialize SQLite database
      await this.initializeSQLite();
      
      // Set up network monitoring
      await this.setupNetworkMonitoring();
      
      // Initialize background sync
      await this.setupBackgroundSync();
      
      // Load pending operations
      await this.loadPendingOperations();
      
      // Start sync process
      await this.startSyncProcess();
      
      this.isInitialized = true;
      logger.info('✅ Offline Sync Manager initialized successfully');
      
      return { success: true, message: 'Offline sync manager initialized' };
    } catch (error) {
      logger.error('Offline sync manager initialization failed:', error);
      throw error;
    }
  }

  async shutdown() {
    try {
      this.isInitialized = false;
      
      // Stop background sync
      if (this.backgroundSyncJob) {
        BackgroundJob.stop();
      }
      
      // Close database
      if (this.db) {
        await this.db.close();
      }
      
      logger.info('Offline Sync Manager shut down');
      return { success: true, message: 'Offline sync manager shut down' };
    } catch (error) {
      logger.error('Offline sync manager shutdown failed:', error);
      throw error;
    }
  }

  async initializeSQLite() {
    try {
      this.db = await SQLite.openDatabase({
        name: 'FinNexusAI_Offline.db',
        location: 'default',
        createFromLocation: '~www/FinNexusAI_Offline.db'
      });

      // Create tables for offline data
      await this.createOfflineTables();
      
      logger.info('✅ SQLite database initialized');
    } catch (error) {
      logger.error('SQLite initialization failed:', error);
      throw error;
    }
  }

  async createOfflineTables() {
    const tables = [
      // Trading operations
      `CREATE TABLE IF NOT EXISTS offline_trades (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trade_id TEXT UNIQUE,
        user_id TEXT,
        symbol TEXT,
        side TEXT,
        quantity REAL,
        price REAL,
        timestamp INTEGER,
        status TEXT,
        sync_status TEXT DEFAULT 'pending',
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER DEFAULT (strftime('%s', 'now'))
      )`,
      
      // Portfolio data
      `CREATE TABLE IF NOT EXISTS offline_portfolio (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        portfolio_id TEXT UNIQUE,
        user_id TEXT,
        symbol TEXT,
        quantity REAL,
        average_price REAL,
        current_price REAL,
        value REAL,
        timestamp INTEGER,
        sync_status TEXT DEFAULT 'pending',
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER DEFAULT (strftime('%s', 'now'))
      )`,
      
      // User profile data
      `CREATE TABLE IF NOT EXISTS offline_user_profile (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT UNIQUE,
        profile_data TEXT,
        timestamp INTEGER,
        sync_status TEXT DEFAULT 'pending',
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER DEFAULT (strftime('%s', 'now'))
      )`,
      
      // Market data cache
      `CREATE TABLE IF NOT EXISTS offline_market_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol TEXT,
        price REAL,
        volume REAL,
        change_24h REAL,
        timestamp INTEGER,
        sync_status TEXT DEFAULT 'pending',
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER DEFAULT (strftime('%s', 'now'))
      )`,
      
      // Notifications
      `CREATE TABLE IF NOT EXISTS offline_notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        notification_id TEXT UNIQUE,
        user_id TEXT,
        title TEXT,
        message TEXT,
        type TEXT,
        data TEXT,
        timestamp INTEGER,
        read_status TEXT DEFAULT 'unread',
        sync_status TEXT DEFAULT 'pending',
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER DEFAULT (strftime('%s', 'now'))
      )`,
      
      // Sync queue
      `CREATE TABLE IF NOT EXISTS sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        operation_id TEXT UNIQUE,
        operation_type TEXT,
        table_name TEXT,
        record_id TEXT,
        operation_data TEXT,
        retry_count INTEGER DEFAULT 0,
        max_retries INTEGER DEFAULT 3,
        status TEXT DEFAULT 'pending',
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER DEFAULT (strftime('%s', 'now'))
      )`,
      
      // Conflict resolution
      `CREATE TABLE IF NOT EXISTS conflict_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conflict_id TEXT UNIQUE,
        table_name TEXT,
        record_id TEXT,
        local_data TEXT,
        server_data TEXT,
        conflict_type TEXT,
        resolution_strategy TEXT,
        status TEXT DEFAULT 'pending',
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER DEFAULT (strftime('%s', 'now'))
      )`
    ];

    for (const table of tables) {
      await this.db.executeSql(table);
    }

    // Create indexes for better performance
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_offline_trades_user_id ON offline_trades(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_offline_trades_sync_status ON offline_trades(sync_status)',
      'CREATE INDEX IF NOT EXISTS idx_offline_portfolio_user_id ON offline_portfolio(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_offline_portfolio_sync_status ON offline_portfolio(sync_status)',
      'CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status)',
      'CREATE INDEX IF NOT EXISTS idx_conflict_queue_status ON conflict_queue(status)'
    ];

    for (const index of indexes) {
      await this.db.executeSql(index);
    }

    logger.info('✅ Offline tables created');
  }

  async setupNetworkMonitoring() {
    // Listen for network state changes
    NetInfo.addEventListener(state => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected && state.isInternetReachable;
      
      logger.info(`🌐 Network status changed: ${this.isOnline ? 'Online' : 'Offline'}`);
      
      if (!wasOnline && this.isOnline) {
        // Just came online - trigger sync
        this.triggerSync();
      }
    });

    // Get initial network state
    const state = await NetInfo.fetch();
    this.isOnline = state.isConnected && state.isInternetReachable;
    
    logger.info(`🌐 Initial network status: ${this.isOnline ? 'Online' : 'Offline'}`);
  }

  async setupBackgroundSync() {
    if (!this.backgroundSyncEnabled) return;

    try {
      this.backgroundSyncJob = BackgroundJob.start({
        jobKey: 'finnexusai_sync',
        period: this.syncInterval,
        requiredNetworkType: 'ANY',
        job: async () => {
          if (this.isOnline && !this.syncInProgress) {
            await this.performBackgroundSync();
          }
        }
      });

      logger.info('✅ Background sync configured');
    } catch (error) {
      logger.error('Background sync setup failed:', error);
    }
  }

  async loadPendingOperations() {
    try {
      const result = await this.db.executeSql(
        'SELECT * FROM sync_queue WHERE status = ?',
        ['pending']
      );

      const rows = result.rows;
      for (let i = 0; i < rows.length; i++) {
        const operation = rows.item(i);
        this.pendingOperations.push(operation);
      }

      logger.info(`📋 Loaded ${this.pendingOperations.length} pending operations`);
    } catch (error) {
      logger.error('Failed to load pending operations:', error);
    }
  }

  async startSyncProcess() {
    if (this.isOnline) {
      await this.triggerSync();
    }
  }

  // Public methods for data operations
  async saveOfflineTrade(tradeData) {
    try {
      const tradeId = tradeData.trade_id || this.generateId();
      const encryptedData = this.encryptData(tradeData);

      await this.db.executeSql(
        `INSERT OR REPLACE INTO offline_trades 
         (trade_id, user_id, symbol, side, quantity, price, timestamp, status, sync_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          tradeId,
          tradeData.user_id,
          tradeData.symbol,
          tradeData.side,
          tradeData.quantity,
          tradeData.price,
          Date.now(),
          tradeData.status || 'pending',
          'pending'
        ]
      );

      // Add to sync queue
      await this.addToSyncQueue('trade', 'offline_trades', tradeId, tradeData);

      logger.info(`💾 Saved offline trade: ${tradeId}`);
      
      return { success: true, tradeId, message: 'Trade saved offline' };
    } catch (error) {
      logger.error('Failed to save offline trade:', error);
      throw error;
    }
  }

  async saveOfflinePortfolio(portfolioData) {
    try {
      const portfolioId = portfolioData.portfolio_id || this.generateId();

      await this.db.executeSql(
        `INSERT OR REPLACE INTO offline_portfolio 
         (portfolio_id, user_id, symbol, quantity, average_price, current_price, value, timestamp, sync_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          portfolioId,
          portfolioData.user_id,
          portfolioData.symbol,
          portfolioData.quantity,
          portfolioData.average_price,
          portfolioData.current_price,
          portfolioData.value,
          Date.now(),
          'pending'
        ]
      );

      // Add to sync queue
      await this.addToSyncQueue('portfolio', 'offline_portfolio', portfolioId, portfolioData);

      logger.info(`💾 Saved offline portfolio: ${portfolioId}`);
      
      return { success: true, portfolioId, message: 'Portfolio saved offline' };
    } catch (error) {
      logger.error('Failed to save offline portfolio:', error);
      throw error;
    }
  }

  async getOfflineTrades(userId) {
    try {
      const result = await this.db.executeSql(
        'SELECT * FROM offline_trades WHERE user_id = ? ORDER BY timestamp DESC',
        [userId]
      );

      const trades = [];
      const rows = result.rows;
      for (let i = 0; i < rows.length; i++) {
        trades.push(rows.item(i));
      }

      return { success: true, trades, message: 'Offline trades retrieved' };
    } catch (error) {
      logger.error('Failed to get offline trades:', error);
      throw error;
    }
  }

  async getOfflinePortfolio(userId) {
    try {
      const result = await this.db.executeSql(
        'SELECT * FROM offline_portfolio WHERE user_id = ? ORDER BY timestamp DESC',
        [userId]
      );

      const portfolio = [];
      const rows = result.rows;
      for (let i = 0; i < rows.length; i++) {
        portfolio.push(rows.item(i));
      }

      return { success: true, portfolio, message: 'Offline portfolio retrieved' };
    } catch (error) {
      logger.error('Failed to get offline portfolio:', error);
      throw error;
    }
  }

  async triggerSync() {
    if (this.syncInProgress || !this.isOnline) {
      return { success: false, message: 'Sync already in progress or offline' };
    }

    try {
      this.syncInProgress = true;
      logger.info('🔄 Starting offline sync...');

      // Sync pending operations
      await this.syncPendingOperations();
      
      // Sync conflicts
      await this.resolveConflicts();
      
      // Update local data from server
      await this.syncFromServer();

      this.syncInProgress = false;
      logger.info('✅ Offline sync completed');
      
      return { success: true, message: 'Sync completed successfully' };
    } catch (error) {
      this.syncInProgress = false;
      logger.error('Sync failed:', error);
      throw error;
    }
  }

  async syncPendingOperations() {
    for (const operation of this.pendingOperations) {
      try {
        const success = await this.syncOperation(operation);
        
        if (success) {
          // Mark as synced
          await this.db.executeSql(
            'UPDATE sync_queue SET status = ?, updated_at = ? WHERE operation_id = ?',
            ['synced', Date.now(), operation.operation_id]
          );
          
          // Remove from pending list
          this.pendingOperations = this.pendingOperations.filter(
            op => op.operation_id !== operation.operation_id
          );
        } else {
          // Increment retry count
          operation.retry_count++;
          
          if (operation.retry_count >= operation.max_retries) {
            // Mark as failed
            await this.db.executeSql(
              'UPDATE sync_queue SET status = ?, updated_at = ? WHERE operation_id = ?',
              ['failed', Date.now(), operation.operation_id]
            );
          } else {
            // Update retry count
            await this.db.executeSql(
              'UPDATE sync_queue SET retry_count = ?, updated_at = ? WHERE operation_id = ?',
              [operation.retry_count, Date.now(), operation.operation_id]
            );
          }
        }
      } catch (error) {
        logger.error(`Failed to sync operation ${operation.operation_id}:`, error);
      }
    }
  }

  async syncOperation(operation) {
    try {
      // Make API call to server
      const response = await this.makeApiCall(operation);
      return response.success;
    } catch (error) {
      logger.error('Operation sync failed:', error);
      return false;
    }
  }

  async makeApiCall(operation) {
    // Simulate API call based on operation type
    const { operation_type, operation_data } = operation;
    
    switch (operation_type) {
    case 'trade':
      return await this.syncTradeToServer(operation_data);
    case 'portfolio':
      return await this.syncPortfolioToServer(operation_data);
    default:
      return { success: false, error: 'Unknown operation type' };
    }
  }

  async syncTradeToServer(tradeData) {
    // Simulate API call to sync trade
    logger.info(`📤 Syncing trade to server: ${tradeData.trade_id}`);
    
    // In real implementation, make actual API call
    // const response = await fetch('/api/trades', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(tradeData)
    // });
    
    // Simulate success
    return { success: true, message: 'Trade synced to server' };
  }

  async syncPortfolioToServer(portfolioData) {
    // Simulate API call to sync portfolio
    logger.info(`📤 Syncing portfolio to server: ${portfolioData.portfolio_id}`);
    
    // In real implementation, make actual API call
    // const response = await fetch('/api/portfolio', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(portfolioData)
    // });
    
    // Simulate success
    return { success: true, message: 'Portfolio synced to server' };
  }

  async resolveConflicts() {
    try {
      const result = await this.db.executeSql(
        'SELECT * FROM conflict_queue WHERE status = ?',
        ['pending']
      );

      const conflicts = [];
      const rows = result.rows;
      for (let i = 0; i < rows.length; i++) {
        conflicts.push(rows.item(i));
      }

      for (const conflict of conflicts) {
        await this.resolveConflict(conflict);
      }

      logger.info(`✅ Resolved ${conflicts.length} conflicts`);
    } catch (error) {
      logger.error('Conflict resolution failed:', error);
    }
  }

  async resolveConflict(conflict) {
    try {
      const { conflict_type, resolution_strategy, local_data, server_data } = conflict;
      
      let resolvedData;
      
      switch (resolution_strategy) {
      case 'last_write_wins':
        const localTime = JSON.parse(local_data).timestamp;
        const serverTime = JSON.parse(server_data).timestamp;
        resolvedData = localTime > serverTime ? local_data : server_data;
        break;
          
      case 'server_wins':
        resolvedData = server_data;
        break;
          
      case 'client_wins':
        resolvedData = local_data;
        break;
          
      case 'merge_conflict':
        resolvedData = this.mergeData(local_data, server_data);
        break;
          
      default:
        resolvedData = server_data; // Default to server
      }

      // Update local data with resolved data
      await this.updateLocalData(conflict.table_name, conflict.record_id, resolvedData);
      
      // Mark conflict as resolved
      await this.db.executeSql(
        'UPDATE conflict_queue SET status = ?, updated_at = ? WHERE conflict_id = ?',
        ['resolved', Date.now(), conflict.conflict_id]
      );

      logger.info(`✅ Resolved conflict: ${conflict.conflict_id}`);
    } catch (error) {
      logger.error(`Failed to resolve conflict ${conflict.conflict_id}:`, error);
    }
  }

  mergeData(localData, serverData) {
    const local = JSON.parse(localData);
    const server = JSON.parse(serverData);
    
    // Simple merge strategy - in real implementation, use more sophisticated logic
    return JSON.stringify({
      ...server,
      ...local,
      timestamp: Math.max(local.timestamp || 0, server.timestamp || 0)
    });
  }

  async syncFromServer() {
    try {
      // Sync latest data from server
      await this.syncLatestTrades();
      await this.syncLatestPortfolio();
      await this.syncLatestMarketData();
      
      logger.info('✅ Synced latest data from server');
    } catch (error) {
      logger.error('Server sync failed:', error);
    }
  }

  async syncLatestTrades() {
    // Simulate fetching latest trades from server
    logger.info('📥 Syncing latest trades from server');
    
    // In real implementation:
    // const response = await fetch('/api/trades/latest');
    // const trades = await response.json();
    // 
    // for (const trade of trades) {
    //   await this.saveOfflineTrade(trade);
    // }
  }

  async syncLatestPortfolio() {
    // Simulate fetching latest portfolio from server
    logger.info('📥 Syncing latest portfolio from server');
    
    // In real implementation:
    // const response = await fetch('/api/portfolio/latest');
    // const portfolio = await response.json();
    // 
    // for (const item of portfolio) {
    //   await this.saveOfflinePortfolio(item);
    // }
  }

  async syncLatestMarketData() {
    // Simulate fetching latest market data from server
    logger.info('📥 Syncing latest market data from server');
    
    // In real implementation:
    // const response = await fetch('/api/market-data/latest');
    // const marketData = await response.json();
    // 
    // for (const data of marketData) {
    //   await this.saveOfflineMarketData(data);
    // }
  }

  async addToSyncQueue(operationType, tableName, recordId, operationData) {
    try {
      const operationId = this.generateId();
      
      await this.db.executeSql(
        `INSERT INTO sync_queue 
         (operation_id, operation_type, table_name, record_id, operation_data, status)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          operationId,
          operationType,
          tableName,
          recordId,
          JSON.stringify(operationData),
          'pending'
        ]
      );

      logger.info(`📋 Added to sync queue: ${operationId}`);
    } catch (error) {
      logger.error('Failed to add to sync queue:', error);
    }
  }

  async performBackgroundSync() {
    try {
      logger.info('🔄 Performing background sync...');
      await this.triggerSync();
    } catch (error) {
      logger.error('Background sync failed:', error);
    }
  }

  // Utility methods
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  encryptData(data) {
    try {
      const key = 'finnexusai_encryption_key_2024';
      const encrypted = CryptoJS.AES.encrypt(JSON.stringify(data), key).toString();
      return encrypted;
    } catch (error) {
      logger.error('Encryption failed:', error);
      return JSON.stringify(data);
    }
  }

  decryptData(encryptedData) {
    try {
      const key = 'finnexusai_encryption_key_2024';
      const decrypted = CryptoJS.AES.decrypt(encryptedData, key).toString(CryptoJS.enc.Utf8);
      return JSON.parse(decrypted);
    } catch (error) {
      logger.error('Decryption failed:', error);
      return JSON.parse(encryptedData);
    }
  }

  async updateLocalData(tableName, recordId, data) {
    try {
      await this.db.executeSql(
        `UPDATE ${tableName} SET sync_status = ?, updated_at = ? WHERE id = ?`,
        ['synced', Date.now(), recordId]
      );
    } catch (error) {
      logger.error('Failed to update local data:', error);
    }
  }

  // Public status methods
  getSyncStatus() {
    return {
      isInitialized: this.isInitialized,
      isOnline: this.isOnline,
      syncInProgress: this.syncInProgress,
      pendingOperations: this.pendingOperations.length,
      backgroundSyncEnabled: this.backgroundSyncEnabled,
      syncInterval: this.syncInterval
    };
  }

  async getOfflineDataStats() {
    try {
      const tables = ['offline_trades', 'offline_portfolio', 'offline_user_profile', 'offline_market_data', 'offline_notifications'];
      const stats = {};

      for (const table of tables) {
        const result = await this.db.executeSql(`SELECT COUNT(*) as count FROM ${table}`);
        stats[table] = result.rows.item(0).count;
      }

      return { success: true, stats, message: 'Offline data stats retrieved' };
    } catch (error) {
      logger.error('Failed to get offline data stats:', error);
      throw error;
    }
  }
}

export default new OfflineSyncManager();

