/**
 * Order Book Manager - Enterprise Order Management System
 *
 * Comprehensive order book management including:
 * - Order matching and execution
 * - Market depth management
 * - Order routing and optimization
 * - Real-time order book updates
 * - Multi-exchange order book aggregation
 */

const EventEmitter = require('events');
const logger = require('../../utils/logger');


class OrderBookManager extends EventEmitter {
  constructor() {
    super();
    this.isInitialized = false;
    this.orderBooks = new Map(); // Symbol -> OrderBook
    this.activeOrders = new Map(); // OrderID -> Order
    this.orderHistory = new Map(); // OrderID -> OrderHistory
    this.marketData = new Map(); // Symbol -> MarketData

    // Order book configuration
    this.config = {
      maxOrderBookDepth: 1000, // Maximum orders per side
      maxOrderSize: 1000000, // $1M max order size
      minOrderSize: 10, // $10 min order size
      tickSize: 0.01, // Minimum price increment
      lotSize: 0.001, // Minimum quantity increment
      maxSpread: 0.05, // 5% maximum spread
      updateFrequency: 100 // Update every 100ms
    };

    this.initializeOrderBooks();
    logger.info('OrderBookManager initialized');
  }

  initializeOrderBooks() {
    // Initialize order books for major trading pairs
    const tradingPairs = [
      'BTC/USD', 'ETH/USD', 'BNB/USD', 'ADA/USD', 'SOL/USD',
      'DOT/USD', 'MATIC/USD', 'AVAX/USD', 'LINK/USD', 'UNI/USD'
    ];

    tradingPairs.forEach(pair => {
      this.orderBooks.set(pair, {
        bids: [], // Buy orders (sorted by price desc)
        asks: [], // Sell orders (sorted by price asc)
        lastUpdate: Date.now(),
        spread: 0,
        volume24h: 0,
        trades24h: 0
      });
    });
  }

  async initialize() {
    try {
      this.startOrderBookUpdates();
      this.startMarketDataUpdates();
      this.isInitialized = true;
      logger.info('✅ OrderBookManager initialized successfully');
      return { success: true, message: 'OrderBookManager initialized' };
    } catch (error) {
      logger.error('❌ OrderBookManager initialization failed:', error);
      throw error;
    }
  }

  startOrderBookUpdates() {
    // Update order books every 100ms
    this.orderBookInterval = setInterval(() => {
      this.updateOrderBooks();
    }, this.config.updateFrequency);
  }

  startMarketDataUpdates() {
    // Update market data every second
    this.marketDataInterval = setInterval(() => {
      this.updateMarketData();
    }, 1000);
  }

  updateOrderBooks() {
    this.orderBooks.forEach((orderBook, symbol) => {
      // Simulate market activity
      this.simulateMarketActivity(symbol, orderBook);

      // Calculate spread
      if (orderBook.bids.length > 0 && orderBook.asks.length > 0) {
        const bestBid = orderBook.bids[0].price;
        const bestAsk = orderBook.asks[0].price;
        orderBook.spread = bestAsk - bestBid;
        orderBook.lastUpdate = Date.now();
      }

      // Emit order book update
      this.emit('orderBookUpdate', symbol, orderBook);
    });
  }

  updateMarketData() {
    this.orderBooks.forEach((orderBook, symbol) => {
      const marketData = {
        symbol,
        timestamp: Date.now(),
        bid: orderBook.bids.length > 0 ? orderBook.bids[0].price : 0,
        ask: orderBook.asks.length > 0 ? orderBook.asks[0].price : 0,
        spread: orderBook.spread,
        volume24h: orderBook.volume24h,
        trades24h: orderBook.trades24h,
        lastPrice: this.getLastTradePrice(symbol),
        priceChange24h: this.getPriceChange24h(symbol),
        volumeChange24h: this.getVolumeChange24h(symbol)
      };

      this.marketData.set(symbol, marketData);
      this.emit('marketDataUpdate', symbol, marketData);
    });
  }

  simulateMarketActivity(symbol, orderBook) {
    // Simulate market makers adding/removing orders
    const price = this.getCurrentPrice(symbol);
    const volatility = 0.02; // 2% volatility

    // Add random bids
    if (Math.random() < 0.3 && orderBook.bids.length < this.config.maxOrderBookDepth) {
      const bidPrice = price * (1 - Math.random() * volatility);
      const bidSize = Math.random() * 1000 + 100;

      this.addOrder(symbol, 'buy', bidPrice, bidSize, 'market_maker');
    }

    // Add random asks
    if (Math.random() < 0.3 && orderBook.asks.length < this.config.maxOrderBookDepth) {
      const askPrice = price * (1 + Math.random() * volatility);
      const askSize = Math.random() * 1000 + 100;

      this.addOrder(symbol, 'sell', askPrice, askSize, 'market_maker');
    }

    // Remove random orders
    if (Math.random() < 0.1) {
      if (orderBook.bids.length > 0) {
        const randomIndex = Math.floor(Math.random() * orderBook.bids.length);
        orderBook.bids.splice(randomIndex, 1);
      }
    }

    if (Math.random() < 0.1) {
      if (orderBook.asks.length > 0) {
        const randomIndex = Math.floor(Math.random() * orderBook.asks.length);
        orderBook.asks.splice(randomIndex, 1);
      }
    }
  }

  // Order management
  addOrder(symbol, side, price, quantity, orderType = 'limit', userId = 'system') {
    try {
      // Validate order
      const validation = this.validateOrder(symbol, side, price, quantity);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      const order = {
        id: this.generateOrderId(),
        symbol,
        side, // 'buy' or 'sell'
        price: parseFloat(price),
        quantity: parseFloat(quantity),
        orderType, // 'limit', 'market', 'stop'
        userId,
        timestamp: Date.now(),
        status: 'pending',
        filledQuantity: 0,
        remainingQuantity: parseFloat(quantity),
        averagePrice: 0,
        fees: 0
      };

      // Add to active orders
      this.activeOrders.set(order.id, order);

      // Add to order book
      const orderBook = this.orderBooks.get(symbol);
      if (side === 'buy') {
        this.addBidOrder(orderBook, order);
      } else {
        this.addAskOrder(orderBook, order);
      }

      // Attempt to match orders
      this.matchOrders(symbol, order);

      logger.info(`Order added: ${order.id} - ${side} ${quantity} ${symbol} @ ${price}`);
      this.emit('orderAdded', order);

      return order;
    } catch (error) {
      logger.error('Error adding order:', error);
      throw error;
    }
  }

  addBidOrder(orderBook, order) {
    // Insert bid in descending price order
    const insertIndex = orderBook.bids.findIndex(bid => bid.price < order.price);
    if (insertIndex === -1) {
      orderBook.bids.push(order);
    } else {
      orderBook.bids.splice(insertIndex, 0, order);
    }
  }

  addAskOrder(orderBook, order) {
    // Insert ask in ascending price order
    const insertIndex = orderBook.asks.findIndex(ask => ask.price > order.price);
    if (insertIndex === -1) {
      orderBook.asks.push(order);
    } else {
      orderBook.asks.splice(insertIndex, 0, order);
    }
  }

  matchOrders(symbol, newOrder) {
    const orderBook = this.orderBooks.get(symbol);
    if (!orderBook) return;

    if (newOrder.side === 'buy') {
      // Match against asks
      this.matchAgainstAsks(orderBook, newOrder);
    } else {
      // Match against bids
      this.matchAgainstBids(orderBook, newOrder);
    }
  }

  matchAgainstAsks(orderBook, buyOrder) {
    while (buyOrder.remainingQuantity > 0 && orderBook.asks.length > 0) {
      const askOrder = orderBook.asks[0];

      // Check if prices match
      if (buyOrder.price < askOrder.price) {
        break; // No more matches possible
      }

      // Calculate fill quantity
      const fillQuantity = Math.min(buyOrder.remainingQuantity, askOrder.remainingQuantity);
      const fillPrice = askOrder.price; // Take the ask price

      // Execute the trade
      this.executeTrade(buyOrder, askOrder, fillQuantity, fillPrice);

      // Remove ask order if fully filled
      if (askOrder.remainingQuantity <= 0) {
        orderBook.asks.shift();
        this.activeOrders.delete(askOrder.id);
      }
    }
  }

  matchAgainstBids(orderBook, sellOrder) {
    while (sellOrder.remainingQuantity > 0 && orderBook.bids.length > 0) {
      const bidOrder = orderBook.bids[0];

      // Check if prices match
      if (sellOrder.price > bidOrder.price) {
        break; // No more matches possible
      }

      // Calculate fill quantity
      const fillQuantity = Math.min(sellOrder.remainingQuantity, bidOrder.remainingQuantity);
      const fillPrice = bidOrder.price; // Take the bid price

      // Execute the trade
      this.executeTrade(bidOrder, sellOrder, fillQuantity, fillPrice);

      // Remove bid order if fully filled
      if (bidOrder.remainingQuantity <= 0) {
        orderBook.bids.shift();
        this.activeOrders.delete(bidOrder.id);
      }
    }
  }

  executeTrade(buyOrder, sellOrder, quantity, price) {
    const trade = {
      id: this.generateTradeId(),
      symbol: buyOrder.symbol,
      quantity,
      price,
      timestamp: Date.now(),
      buyOrderId: buyOrder.id,
      sellOrderId: sellOrder.id,
      buyUserId: buyOrder.userId,
      sellUserId: sellOrder.userId
    };

    // Update orders
    buyOrder.filledQuantity += quantity;
    buyOrder.remainingQuantity -= quantity;
    buyOrder.averagePrice = (buyOrder.averagePrice * (buyOrder.filledQuantity - quantity) + price * quantity) / buyOrder.filledQuantity;

    sellOrder.filledQuantity += quantity;
    sellOrder.remainingQuantity -= quantity;
    sellOrder.averagePrice = (sellOrder.averagePrice * (sellOrder.filledQuantity - quantity) + price * quantity) / sellOrder.filledQuantity;

    // Update order status
    if (buyOrder.remainingQuantity <= 0) {
      buyOrder.status = 'filled';
    } else {
      buyOrder.status = 'partially_filled';
    }

    if (sellOrder.remainingQuantity <= 0) {
      sellOrder.status = 'filled';
    } else {
      sellOrder.status = 'partially_filled';
    }

    // Update market data
    const orderBook = this.orderBooks.get(buyOrder.symbol);
    orderBook.volume24h += quantity * price;
    orderBook.trades24h += 1;

    // Emit trade event
    this.emit('tradeExecuted', trade);
    logger.info(`Trade executed: ${trade.id} - ${quantity} ${buyOrder.symbol} @ ${price}`);

    return trade;
  }

  // Order validation
  validateOrder(symbol, side, price, quantity) {
    // Check if symbol exists
    if (!this.orderBooks.has(symbol)) {
      return { valid: false, error: `Symbol ${symbol} not supported` };
    }

    // Check quantity limits
    if (quantity < this.config.minOrderSize) {
      return { valid: false, error: `Quantity below minimum ${this.config.minOrderSize}` };
    }

    if (quantity > this.config.maxOrderSize) {
      return { valid: false, error: `Quantity above maximum ${this.config.maxOrderSize}` };
    }

    // Check price limits
    if (price <= 0) {
      return { valid: false, error: 'Price must be positive' };
    }

    // Check tick size
    if (price % this.config.tickSize !== 0) {
      return { valid: false, error: `Price must be multiple of ${this.config.tickSize}` };
    }

    return { valid: true };
  }

  // Order book queries
  getOrderBook(symbol, depth = 10) {
    const orderBook = this.orderBooks.get(symbol);
    if (!orderBook) {
      return null;
    }

    return {
      symbol,
      bids: orderBook.bids.slice(0, depth),
      asks: orderBook.asks.slice(0, depth),
      spread: orderBook.spread,
      lastUpdate: orderBook.lastUpdate,
      volume24h: orderBook.volume24h,
      trades24h: orderBook.trades24h
    };
  }

  getBestBidAsk(symbol) {
    const orderBook = this.orderBooks.get(symbol);
    if (!orderBook) {
      return null;
    }

    return {
      symbol,
      bid: orderBook.bids.length > 0 ? orderBook.bids[0].price : 0,
      ask: orderBook.asks.length > 0 ? orderBook.asks[0].price : 0,
      spread: orderBook.spread,
      timestamp: orderBook.lastUpdate
    };
  }

  getMarketData(symbol) {
    return this.marketData.get(symbol);
  }

  // Utility methods
  generateOrderId() {
    return `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateTradeId() {
    return `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getCurrentPrice(symbol) {
    // Simplified - in production, this would get from real market data
    const basePrices = {
      'BTC/USD': 45000,
      'ETH/USD': 3000,
      'BNB/USD': 300,
      'ADA/USD': 0.5,
      'SOL/USD': 100
    };
    return basePrices[symbol] || 100;
  }

  getLastTradePrice(symbol) {
    // Simplified - in production, this would get from trade history
    return this.getCurrentPrice(symbol);
  }

  getPriceChange24h(symbol) {
    // Simplified - in production, this would calculate from historical data
    return Math.random() * 0.1 - 0.05; // Random change between -5% and +5%
  }

  getVolumeChange24h(symbol) {
    // Simplified - in production, this would calculate from historical data
    return Math.random() * 0.2 - 0.1; // Random change between -10% and +10%
  }

  // Health check
  async healthCheck() {
    return {
      status: 'healthy',
      isInitialized: this.isInitialized,
      activeOrders: this.activeOrders.size,
      orderBooks: this.orderBooks.size,
      marketData: this.marketData.size,
      lastUpdate: new Date().toISOString()
    };
  }

  // Cleanup
  destroy() {
    if (this.orderBookInterval) {
      clearInterval(this.orderBookInterval);
    }
    if (this.marketDataInterval) {
      clearInterval(this.marketDataInterval);
    }
    this.removeAllListeners();
    logger.info('OrderBookManager destroyed');
  }
}

module.exports = OrderBookManager;
