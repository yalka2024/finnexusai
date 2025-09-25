const axios = require('axios');

const databaseManager = require('../../config/database');
const logger = require('../../utils/logger');

class MarketDataService {
  constructor() {
    this.priceCache = new Map();
    this.updateInterval = null;
    this.isRunning = false;
    this.exchangeRates = new Map();
  }

  async initialize() {
    try {
      this.isRunning = true;
      await this.loadInitialPrices();
      this.startPriceUpdates();

      logger.info('Market Data Service initialized');
      return { success: true, message: 'Market Data Service initialized' };
    } catch (error) {
      logger.error('Market Data Service initialization failed:', error);
      throw error;
    }
  }

  async shutdown() {
    try {
      this.isRunning = false;
      if (this.updateInterval) {
        clearInterval(this.updateInterval);
      }
      logger.info('Market Data Service shut down');
      return { success: true, message: 'Market Data Service shut down' };
    } catch (error) {
      logger.error('Market Data Service shutdown failed:', error);
      throw error;
    }
  }

  // Start price update loop
  startPriceUpdates() {
    // Update prices every 30 seconds
    this.updateInterval = setInterval(async() => {
      if (!this.isRunning) return;

      try {
        await this.updateAllPrices();
      } catch (error) {
        logger.error('Price update error:', error);
      }
    }, 30000);
  }

  // Load initial prices from database
  async loadInitialPrices() {
    try {
      const result = await databaseManager.query(`
        SELECT ap.*, a.symbol
        FROM asset_prices ap
        JOIN assets a ON ap.asset_id = a.id
        WHERE ap.timestamp > NOW() - INTERVAL '1 hour'
        ORDER BY ap.timestamp DESC
      `);

      for (const price of result.rows) {
        this.priceCache.set(price.asset_id, {
          price: parseFloat(price.price),
          volume: parseFloat(price.volume_24h),
          change24h: parseFloat(price.price_change_percentage_24h),
          timestamp: price.timestamp
        });
      }

      logger.info(`Loaded ${result.rows.length} initial prices`);
    } catch (error) {
      logger.error('Failed to load initial prices:', error);
    }
  }

  // Update all asset prices
  async updateAllPrices() {
    try {
      // Get all active assets
      const assetsResult = await databaseManager.query(`
        SELECT id, symbol, asset_type FROM assets WHERE is_active = TRUE
      `);

      const updatePromises = assetsResult.rows.map(asset => this.updateAssetPrice(asset));
      await Promise.all(updatePromises);

      logger.debug(`Updated prices for ${assetsResult.rows.length} assets`);
    } catch (error) {
      logger.error('Failed to update all prices:', error);
    }
  }

  // Update price for a specific asset
  async updateAssetPrice(asset) {
    try {
      let priceData;

      if (asset.asset_type === 'cryptocurrency') {
        priceData = await this.getCryptoPrice(asset.symbol);
      } else if (asset.asset_type === 'stock') {
        priceData = await this.getStockPrice(asset.symbol);
      } else {
        // Use mock data for other asset types
        priceData = await this.getMockPrice(asset.symbol);
      }

      if (priceData) {
        // Update cache
        this.priceCache.set(asset.id, priceData);

        // Store in database
        await this.storePriceData(asset.id, priceData);
      }
    } catch (error) {
      logger.error(`Failed to update price for ${asset.symbol}:`, error);
    }
  }

  // Get cryptocurrency price from CoinGecko API
  async getCryptoPrice(symbol) {
    try {
      const coinGeckoId = this.getCoinGeckoId(symbol);
      if (!coinGeckoId) {
        return this.getMockPrice(symbol);
      }

      const response = await axios.get(
        `https://api.coingecko.com/api/v3/simple/price?ids=${coinGeckoId}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true`,
        { timeout: 5000 }
      );

      const data = response.data[coinGeckoId];
      if (!data) {
        return this.getMockPrice(symbol);
      }

      return {
        price: data.usd,
        volume: data.usd_24h_vol || 0,
        change24h: data.usd_24h_change || 0,
        timestamp: new Date()
      };
    } catch (error) {
      logger.warn(`Failed to fetch crypto price for ${symbol}:`, error.message);
      return this.getMockPrice(symbol);
    }
  }

  // Get stock price from Alpha Vantage API
  async getStockPrice(symbol) {
    try {
      // Using mock data for now - in production, integrate with real stock APIs
      return this.getMockPrice(symbol);
    } catch (error) {
      logger.warn(`Failed to fetch stock price for ${symbol}:`, error.message);
      return this.getMockPrice(symbol);
    }
  }

  // Get mock price data for testing
  async getMockPrice(symbol) {
    // Generate realistic price movements
    const basePrices = {
      'BTC': 45000,
      'ETH': 3200,
      'USDT': 1.00,
      'USDC': 1.00,
      'AAPL': 180,
      'GOOGL': 2800,
      'MSFT': 420,
      'TSLA': 250
    };

    const basePrice = basePrices[symbol] || 100;
    const volatility = 0.02; // 2% volatility
    const randomChange = (Math.random() - 0.5) * 2 * volatility;
    const newPrice = basePrice * (1 + randomChange);

    return {
      price: Math.max(newPrice, 0.01), // Ensure price is positive
      volume: Math.random() * 1000000000,
      change24h: (Math.random() - 0.5) * 10, // -5% to +5%
      timestamp: new Date()
    };
  }

  // Store price data in database
  async storePriceData(assetId, priceData) {
    try {
      await databaseManager.query(`
        INSERT INTO asset_prices (
          asset_id, price, volume_24h, price_change_24h, 
          price_change_percentage_24h, high_24h, low_24h, timestamp
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        assetId,
        priceData.price,
        priceData.volume,
        priceData.change24h,
        priceData.change24h,
        priceData.price * 1.02, // Mock high
        priceData.price * 0.98, // Mock low
        priceData.timestamp
      ]);
    } catch (error) {
      logger.error('Failed to store price data:', error);
    }
  }

  // Get current price for an asset
  async getCurrentPrice(assetId) {
    try {
      // Check cache first
      if (this.priceCache.has(assetId)) {
        const cached = this.priceCache.get(assetId);
        // Return cached data if it's less than 5 minutes old
        if (Date.now() - new Date(cached.timestamp).getTime() < 5 * 60 * 1000) {
          return cached;
        }
      }

      // Get from database
      const result = await databaseManager.query(`
        SELECT price, volume_24h, price_change_percentage_24h, timestamp
        FROM asset_prices 
        WHERE asset_id = $1 
        ORDER BY timestamp DESC 
        LIMIT 1
      `, [assetId]);

      if (result.rows.length > 0) {
        const price = result.rows[0];
        const priceData = {
          price: parseFloat(price.price),
          volume: parseFloat(price.volume_24h),
          change24h: parseFloat(price.price_change_percentage_24h),
          timestamp: price.timestamp
        };

        this.priceCache.set(assetId, priceData);
        return priceData;
      }

      throw new Error('Price not available');
    } catch (error) {
      logger.error('Failed to get current price:', error);
      throw error;
    }
  }

  // Get price history for an asset
  async getPriceHistory(assetId, period = '24h', limit = 100) {
    try {
      let timeFilter;
      switch (period) {
      case '1h':
        timeFilter = 'timestamp > NOW() - INTERVAL \'1 hour\'';
        break;
      case '24h':
        timeFilter = 'timestamp > NOW() - INTERVAL \'24 hours\'';
        break;
      case '7d':
        timeFilter = 'timestamp > NOW() - INTERVAL \'7 days\'';
        break;
      case '30d':
        timeFilter = 'timestamp > NOW() - INTERVAL \'30 days\'';
        break;
      default:
        timeFilter = 'timestamp > NOW() - INTERVAL \'24 hours\'';
      }

      const result = await databaseManager.query(`
        SELECT price, volume_24h, timestamp
        FROM asset_prices 
        WHERE asset_id = $1 AND ${timeFilter}
        ORDER BY timestamp DESC 
        LIMIT $2
      `, [assetId, limit]);

      return result.rows.map(row => ({
        price: parseFloat(row.price),
        volume: parseFloat(row.volume_24h),
        timestamp: row.timestamp
      }));
    } catch (error) {
      logger.error('Failed to get price history:', error);
      throw error;
    }
  }

  // Get market overview
  async getMarketOverview() {
    try {
      const result = await databaseManager.query(`
        SELECT 
          a.id, a.symbol, a.name, a.asset_type,
          ap.price, ap.volume_24h, ap.price_change_percentage_24h,
          ap.timestamp
        FROM assets a
        LEFT JOIN LATERAL (
          SELECT price, volume_24h, price_change_percentage_24h, timestamp
          FROM asset_prices ap2 
          WHERE ap2.asset_id = a.id 
          ORDER BY ap2.timestamp DESC 
          LIMIT 1
        ) ap ON true
        WHERE a.is_active = TRUE
        ORDER BY ap.price DESC
      `);

      return result.rows.map(row => ({
        id: row.id,
        symbol: row.symbol,
        name: row.name,
        assetType: row.asset_type,
        price: row.price ? parseFloat(row.price) : 0,
        volume: row.volume_24h ? parseFloat(row.volume_24h) : 0,
        change24h: row.price_change_percentage_24h ? parseFloat(row.price_change_percentage_24h) : 0,
        timestamp: row.timestamp
      }));
    } catch (error) {
      logger.error('Failed to get market overview:', error);
      throw error;
    }
  }

  // Get trending assets
  async getTrendingAssets(limit = 10) {
    try {
      const result = await databaseManager.query(`
        SELECT 
          a.id, a.symbol, a.name, a.asset_type,
          ap.price, ap.volume_24h, ap.price_change_percentage_24h
        FROM assets a
        LEFT JOIN LATERAL (
          SELECT price, volume_24h, price_change_percentage_24h
          FROM asset_prices ap2 
          WHERE ap2.asset_id = a.id 
          ORDER BY ap2.timestamp DESC 
          LIMIT 1
        ) ap ON true
        WHERE a.is_active = TRUE AND ap.price_change_percentage_24h > 0
        ORDER BY ap.price_change_percentage_24h DESC
        LIMIT $1
      `, [limit]);

      return result.rows.map(row => ({
        id: row.id,
        symbol: row.symbol,
        name: row.name,
        assetType: row.asset_type,
        price: parseFloat(row.price),
        volume: parseFloat(row.volume_24h),
        change24h: parseFloat(row.price_change_percentage_24h)
      }));
    } catch (error) {
      logger.error('Failed to get trending assets:', error);
      throw error;
    }
  }

  // Helper method to map symbols to CoinGecko IDs
  getCoinGeckoId(symbol) {
    const coinGeckoIds = {
      'BTC': 'bitcoin',
      'ETH': 'ethereum',
      'USDT': 'tether',
      'USDC': 'usd-coin',
      'BNB': 'binancecoin',
      'ADA': 'cardano',
      'SOL': 'solana',
      'DOT': 'polkadot',
      'DOGE': 'dogecoin',
      'AVAX': 'avalanche-2'
    };
    return coinGeckoIds[symbol];
  }

  // Get exchange rates
  async getExchangeRates() {
    try {
      if (this.exchangeRates.size === 0) {
        await this.updateExchangeRates();
      }

      return Object.fromEntries(this.exchangeRates);
    } catch (error) {
      logger.error('Failed to get exchange rates:', error);
      return {};
    }
  }

  // Update exchange rates
  async updateExchangeRates() {
    try {
      // Using mock exchange rates for now
      this.exchangeRates.set('USD', 1.0);
      this.exchangeRates.set('EUR', 0.85);
      this.exchangeRates.set('GBP', 0.73);
      this.exchangeRates.set('JPY', 110.0);
      this.exchangeRates.set('CAD', 1.25);
    } catch (error) {
      logger.error('Failed to update exchange rates:', error);
    }
  }
}

module.exports = new MarketDataService();

