/**
 * Real-Time Market Data Service - Enterprise-Grade Market Data Pipeline
 *
 * Integrates with multiple market data providers for real-time price feeds,
 * order book data, and market analytics
 */

const WebSocket = require('ws');
const axios = require('axios');
const EventEmitter = require('events');

const databaseManager = require('../../config/database');
const logger = require('../../utils/logger');

class RealTimeMarketDataService extends EventEmitter {
  constructor() {
    super();
    this.isInitialized = false;
    this.connections = new Map();
    this.marketData = new Map();
    this.subscribers = new Map();
    this.dataProviders = new Map();
    this.reconnectAttempts = new Map();
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 5000;
  }

  async initialize() {
    try {
      logger.info('📊 Initializing Real-Time Market Data Service...');

      // Initialize data providers
      await this.initializeDataProviders();

      // Start WebSocket connections
      await this.startWebSocketConnections();

      // Start data processing pipeline
      this.startDataProcessingPipeline();

      // Start market data storage
      this.startMarketDataStorage();

      // Start health monitoring
      this.startHealthMonitoring();

      this.isInitialized = true;
      logger.info('✅ Real-Time Market Data Service initialized successfully');
      return { success: true, message: 'Real-Time Market Data Service initialized' };
    } catch (error) {
      logger.error('Real-Time Market Data Service initialization failed:', error);
      throw error;
    }
  }

  async shutdown() {
    try {
      this.isInitialized = false;

      // Close all WebSocket connections
      for (const [provider, ws] of this.connections) {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      }

      // Clear intervals
      if (this.dataProcessingInterval) {
        clearInterval(this.dataProcessingInterval);
      }
      if (this.storageInterval) {
        clearInterval(this.storageInterval);
      }
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
      }

      logger.info('Real-Time Market Data Service shut down');
      return { success: true, message: 'Real-Time Market Data Service shut down' };
    } catch (error) {
      logger.error('Real-Time Market Data Service shutdown failed:', error);
      throw error;
    }
  }

  // Initialize data providers
  async initializeDataProviders() {
    try {
      // CoinGecko API
      this.dataProviders.set('coingecko', {
        name: 'CoinGecko',
        apiKey: process.env.COINGECKO_API_KEY,
        baseUrl: process.env.COINGECKO_API_URL || 'https://api.coingecko.com/api/v3',
        rateLimit: 50, // requests per minute
        priority: 1
      });

      // Alpha Vantage API (for stocks)
      this.dataProviders.set('alphavantage', {
        name: 'Alpha Vantage',
        apiKey: process.env.ALPHA_VANTAGE_API_KEY,
        baseUrl: process.env.ALPHA_VANTAGE_API_URL || 'https://www.alphavantage.co/query',
        rateLimit: 5, // requests per minute (free tier)
        priority: 2
      });

      // Yahoo Finance API
      this.dataProviders.set('yahoo', {
        name: 'Yahoo Finance',
        baseUrl: process.env.YAHOO_FINANCE_API_URL || 'https://query1.finance.yahoo.com/v8/finance/chart',
        rateLimit: 100, // requests per minute
        priority: 3
      });

      // Binance WebSocket (for crypto)
      this.dataProviders.set('binance', {
        name: 'Binance',
        wsUrl: 'wss://stream.binance.com:9443/ws/',
        priority: 1
      });

      // Coinbase WebSocket (for crypto)
      this.dataProviders.set('coinbase', {
        name: 'Coinbase',
        wsUrl: 'wss://ws-feed.exchange.coinbase.com',
        priority: 2
      });

      logger.info('✅ Data providers initialized');
    } catch (error) {
      logger.error('Failed to initialize data providers:', error);
      throw error;
    }
  }

  // Start WebSocket connections
  async startWebSocketConnections() {
    try {
      // Binance WebSocket
      await this.connectBinanceWebSocket();

      // Coinbase WebSocket
      await this.connectCoinbaseWebSocket();

      logger.info('✅ WebSocket connections established');
    } catch (error) {
      logger.error('Failed to start WebSocket connections:', error);
      throw error;
    }
  }

  // Connect to Binance WebSocket
  async connectBinanceWebSocket() {
    try {
      const wsUrl = 'wss://stream.binance.com:9443/ws/btcusdt@ticker';
      const ws = new WebSocket(wsUrl);

      ws.on('open', () => {
        logger.info('✅ Connected to Binance WebSocket');
        this.connections.set('binance', ws);
        this.reconnectAttempts.set('binance', 0);
      });

      ws.on('message', (data) => {
        try {
          const ticker = JSON.parse(data);
          this.processBinanceTicker(ticker);
        } catch (error) {
          logger.error('Failed to process Binance ticker:', error);
        }
      });

      ws.on('error', (error) => {
        logger.error('Binance WebSocket error:', error);
        this.handleWebSocketError('binance', error);
      });

      ws.on('close', () => {
        logger.warn('Binance WebSocket connection closed');
        this.handleWebSocketDisconnect('binance');
      });

    } catch (error) {
      logger.error('Failed to connect to Binance WebSocket:', error);
    }
  }

  // Connect to Coinbase WebSocket
  async connectCoinbaseWebSocket() {
    try {
      const wsUrl = 'wss://ws-feed.exchange.coinbase.com';
      const ws = new WebSocket(wsUrl);

      ws.on('open', () => {
        logger.info('✅ Connected to Coinbase WebSocket');

        // Subscribe to ticker updates
        const subscribeMessage = {
          type: 'subscribe',
          product_ids: ['BTC-USD', 'ETH-USD', 'LTC-USD'],
          channels: ['ticker']
        };

        ws.send(JSON.stringify(subscribeMessage));
        this.connections.set('coinbase', ws);
        this.reconnectAttempts.set('coinbase', 0);
      });

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          if (message.type === 'ticker') {
            this.processCoinbaseTicker(message);
          }
        } catch (error) {
          logger.error('Failed to process Coinbase ticker:', error);
        }
      });

      ws.on('error', (error) => {
        logger.error('Coinbase WebSocket error:', error);
        this.handleWebSocketError('coinbase', error);
      });

      ws.on('close', () => {
        logger.warn('Coinbase WebSocket connection closed');
        this.handleWebSocketDisconnect('coinbase');
      });

    } catch (error) {
      logger.error('Failed to connect to Coinbase WebSocket:', error);
    }
  }

  // Process Binance ticker data
  processBinanceTicker(ticker) {
    const marketData = {
      symbol: ticker.s.replace('USDT', '/USDT'),
      price: parseFloat(ticker.c),
      volume: parseFloat(ticker.v),
      change24h: parseFloat(ticker.P),
      high24h: parseFloat(ticker.h),
      low24h: parseFloat(ticker.l),
      timestamp: new Date(parseInt(ticker.E)),
      provider: 'binance',
      bid: parseFloat(ticker.b),
      ask: parseFloat(ticker.a)
    };

    this.updateMarketData(marketData);
  }

  // Process Coinbase ticker data
  processCoinbaseTicker(ticker) {
    const marketData = {
      symbol: ticker.product_id,
      price: parseFloat(ticker.price),
      volume: parseFloat(ticker.volume_24h),
      change24h: parseFloat(ticker.price_24h_change),
      high24h: parseFloat(ticker.high_24h),
      low24h: parseFloat(ticker.low_24h),
      timestamp: new Date(ticker.time),
      provider: 'coinbase',
      bid: parseFloat(ticker.best_bid),
      ask: parseFloat(ticker.best_ask)
    };

    this.updateMarketData(marketData);
  }

  // Update market data
  updateMarketData(data) {
    const key = `${data.symbol}_${data.provider}`;
    const previousData = this.marketData.get(key);

    this.marketData.set(key, {
      ...data,
      previousPrice: previousData?.price || data.price,
      priceChange: previousData ? data.price - previousData.price : 0,
      priceChangePercent: previousData ?
        ((data.price - previousData.price) / previousData.price) * 100 : 0
    });

    // Emit real-time update
    this.emit('marketDataUpdate', {
      symbol: data.symbol,
      data: this.marketData.get(key)
    });

    // Notify subscribers
    this.notifySubscribers(data.symbol, this.marketData.get(key));
  }

  // Start data processing pipeline
  startDataProcessingPipeline() {
    this.dataProcessingInterval = setInterval(() => {
      this.processMarketData();
    }, 1000); // Process every second
  }

  // Process market data
  processMarketData() {
    for (const [key, data] of this.marketData) {
      // Calculate technical indicators
      this.calculateTechnicalIndicators(key, data);

      // Detect market anomalies
      this.detectMarketAnomalies(key, data);

      // Update market statistics
      this.updateMarketStatistics(key, data);
    }
  }

  // Calculate technical indicators
  calculateTechnicalIndicators(symbol, data) {
    // This would integrate with a technical analysis library
    // For now, we'll calculate basic indicators

    const priceHistory = this.getPriceHistory(symbol, 20);
    if (priceHistory.length >= 20) {
      // Simple Moving Average
      const sma20 = priceHistory.reduce((sum, p) => sum + p, 0) / priceHistory.length;

      // Relative Strength Index (simplified)
      const gains = [];
      const losses = [];

      for (let i = 1; i < priceHistory.length; i++) {
        const change = priceHistory[i] - priceHistory[i - 1];
        if (change > 0) gains.push(change);
        else losses.push(Math.abs(change));
      }

      const avgGain = gains.length > 0 ? gains.reduce((sum, g) => sum + g, 0) / gains.length : 0;
      const avgLoss = losses.length > 0 ? losses.reduce((sum, l) => sum + l, 0) / losses.length : 0;

      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      const rsi = 100 - (100 / (1 + rs));

      // Update data with indicators
      data.indicators = {
        sma20,
        rsi,
        timestamp: new Date()
      };
    }
  }

  // Detect market anomalies
  detectMarketAnomalies(symbol, data) {
    const priceChangeThreshold = 0.05; // 5% change threshold
    const volumeThreshold = 2.0; // 2x normal volume

    if (Math.abs(data.priceChangePercent) > priceChangeThreshold) {
      logger.warn(`⚠️ Price anomaly detected for ${symbol}: ${data.priceChangePercent.toFixed(2)}% change`);
      this.emit('marketAnomaly', {
        type: 'price',
        symbol,
        data,
        severity: Math.abs(data.priceChangePercent) > 0.1 ? 'high' : 'medium'
      });
    }

    // Volume anomaly detection would require historical volume data
    // This is a simplified version
  }

  // Update market statistics
  updateMarketStatistics(symbol, data) {
    const stats = this.marketData.get(`${symbol}_stats`) || {
      totalVolume: 0,
      priceHigh: data.price,
      priceLow: data.price,
      updateCount: 0,
      lastUpdate: new Date()
    };

    stats.totalVolume += data.volume || 0;
    stats.priceHigh = Math.max(stats.priceHigh, data.price);
    stats.priceLow = Math.min(stats.priceLow, data.price);
    stats.updateCount++;
    stats.lastUpdate = new Date();

    this.marketData.set(`${symbol}_stats`, stats);
  }

  // Start market data storage
  startMarketDataStorage() {
    this.storageInterval = setInterval(async() => {
      await this.storeMarketData();
    }, 60000); // Store every minute
  }

  // Store market data to database
  async storeMarketData() {
    try {
      const client = await databaseManager.getClient();

      try {
        await client.query('BEGIN');

        for (const [key, data] of this.marketData) {
          if (key.includes('_stats')) continue; // Skip statistics

          await client.query(`
            INSERT INTO market_data (
              symbol, price, volume, change_24h, high_24h, low_24h,
              provider, timestamp, bid, ask, price_change, price_change_percent
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            ON CONFLICT (symbol, provider, timestamp) 
            DO UPDATE SET
              price = EXCLUDED.price,
              volume = EXCLUDED.volume,
              change_24h = EXCLUDED.change_24h,
              high_24h = EXCLUDED.high_24h,
              low_24h = EXCLUDED.low_24h,
              bid = EXCLUDED.bid,
              ask = EXCLUDED.ask,
              price_change = EXCLUDED.price_change,
              price_change_percent = EXCLUDED.price_change_percent
          `, [
            data.symbol,
            data.price,
            data.volume,
            data.change24h,
            data.high24h,
            data.low24h,
            data.provider,
            data.timestamp,
            data.bid,
            data.ask,
            data.priceChange,
            data.priceChangePercent
          ]);
        }

        await client.query('COMMIT');
        logger.info(`Stored ${this.marketData.size} market data points`);

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

    } catch (error) {
      logger.error('Failed to store market data:', error);
    }
  }

  // Start health monitoring
  startHealthMonitoring() {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, 30000); // Check every 30 seconds
  }

  // Perform health check
  performHealthCheck() {
    for (const [provider, ws] of this.connections) {
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        logger.warn(`⚠️ ${provider} WebSocket connection is not healthy`);
        this.handleWebSocketDisconnect(provider);
      }
    }

    // Check data freshness
    const now = Date.now();
    for (const [key, data] of this.marketData) {
      if (key.includes('_stats')) continue;

      const age = now - data.timestamp.getTime();
      if (age > 300000) { // 5 minutes
        logger.warn(`⚠️ Market data for ${data.symbol} is stale (${Math.round(age / 1000)}s old)`);
      }
    }
  }

  // Handle WebSocket errors
  handleWebSocketError(provider, error) {
    logger.error(`${provider} WebSocket error:`, error);
    this.reconnectWebSocket(provider);
  }

  // Handle WebSocket disconnects
  handleWebSocketDisconnect(provider) {
    logger.warn(`${provider} WebSocket disconnected`);
    this.reconnectWebSocket(provider);
  }

  // Reconnect WebSocket
  reconnectWebSocket(provider) {
    const attempts = this.reconnectAttempts.get(provider) || 0;

    if (attempts >= this.maxReconnectAttempts) {
      logger.error(`Max reconnection attempts reached for ${provider}`);
      return;
    }

    this.reconnectAttempts.set(provider, attempts + 1);

    setTimeout(() => {
      logger.info(`Attempting to reconnect ${provider} WebSocket (attempt ${attempts + 1})`);

      if (provider === 'binance') {
        this.connectBinanceWebSocket();
      } else if (provider === 'coinbase') {
        this.connectCoinbaseWebSocket();
      }
    }, this.reconnectDelay * (attempts + 1));
  }

  // Get real-time price
  async getRealTimePrice(symbol) {
    try {
      const key = `${symbol}_binance`; // Prefer Binance for crypto
      const data = this.marketData.get(key);

      if (data) {
        return {
          success: true,
          symbol,
          price: data.price,
          timestamp: data.timestamp,
          provider: data.provider,
          change24h: data.change24h
        };
      }

      // Fallback to API call
      return await this.fetchPriceFromAPI(symbol);
    } catch (error) {
      logger.error(`Failed to get real-time price for ${symbol}:`, error);
      throw error;
    }
  }

  // Fetch price from API
  async fetchPriceFromAPI(symbol) {
    try {
      // Try CoinGecko first
      const coingeckoResponse = await axios.get(
        `${this.dataProviders.get('coingecko').baseUrl}/simple/price`,
        {
          params: {
            ids: symbol.toLowerCase(),
            vs_currencies: 'usd',
            include_24hr_change: true
          },
          headers: {
            'x-cg-demo-api-key': this.dataProviders.get('coingecko').apiKey
          }
        }
      );

      if (coingeckoResponse.data && coingeckoResponse.data[symbol.toLowerCase()]) {
        const data = coingeckoResponse.data[symbol.toLowerCase()];
        return {
          success: true,
          symbol,
          price: data.usd,
          timestamp: new Date(),
          provider: 'coingecko',
          change24h: data.usd_24h_change
        };
      }

      throw new Error(`Price not found for ${symbol}`);
    } catch (error) {
      logger.error(`API price fetch failed for ${symbol}:`, error);
      throw error;
    }
  }

  // Get price history
  getPriceHistory(symbol, limit = 100) {
    const history = [];
    const keys = Array.from(this.marketData.keys()).filter(key =>
      key.startsWith(symbol) && !key.includes('_stats')
    );

    for (const key of keys) {
      const data = this.marketData.get(key);
      if (data && data.price) {
        history.push(data.price);
      }
    }

    return history.slice(-limit);
  }

  // Subscribe to market data updates
  subscribe(symbol, callback) {
    if (!this.subscribers.has(symbol)) {
      this.subscribers.set(symbol, new Set());
    }
    this.subscribers.get(symbol).add(callback);

    logger.info(`Subscribed to ${symbol} market data updates`);
  }

  // Unsubscribe from market data updates
  unsubscribe(symbol, callback) {
    if (this.subscribers.has(symbol)) {
      this.subscribers.get(symbol).delete(callback);

      if (this.subscribers.get(symbol).size === 0) {
        this.subscribers.delete(symbol);
      }
    }
  }

  // Notify subscribers
  notifySubscribers(symbol, data) {
    if (this.subscribers.has(symbol)) {
      for (const callback of this.subscribers.get(symbol)) {
        try {
          callback(data);
        } catch (error) {
          logger.error('Subscriber callback error:', error);
        }
      }
    }
  }

  // Get market data status
  getStatus() {
    const status = {
      isInitialized: this.isInitialized,
      connections: {},
      dataProviders: {},
      marketDataCount: this.marketData.size,
      subscribersCount: this.subscribers.size
    };

    for (const [provider, ws] of this.connections) {
      status.connections[provider] = {
        connected: ws && ws.readyState === WebSocket.OPEN,
        readyState: ws ? ws.readyState : -1
      };
    }

    for (const [name, config] of this.dataProviders) {
      status.dataProviders[name] = {
        name: config.name,
        priority: config.priority,
        rateLimit: config.rateLimit
      };
    }

    return status;
  }
}

module.exports = new RealTimeMarketDataService();

