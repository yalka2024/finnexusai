# FinNexusAI API Documentation

## Overview

The FinNexusAI API provides comprehensive financial services including portfolio management, trading, AI-powered analytics, and blockchain integration. This document describes all available endpoints, request/response formats, and authentication methods.

## Base URL

```
Production: https://api.finainexus.com
Staging: https://staging-api.finainexus.com
Development: http://localhost:3000
```

## Authentication

All API endpoints require authentication using JWT tokens. Include the token in the Authorization header:

```
Authorization: Bearer <your-access-token>
```

### Token Types

- **Access Token**: Short-lived (24 hours) for API requests
- **Refresh Token**: Long-lived (7 days) for obtaining new access tokens

## Rate Limiting

API endpoints are rate-limited to ensure fair usage:

- **Authentication**: 5 requests per 15 minutes
- **Trading**: 100 requests per minute
- **General API**: 1000 requests per hour

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

## Error Handling

All errors follow a consistent format:

```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human-readable error message",
  "details": "Additional error details (optional)"
}
```

### Common Error Codes

- `UNAUTHORIZED`: Invalid or missing authentication
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `VALIDATION_ERROR`: Invalid request data
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `INTERNAL_SERVER_ERROR`: Server error

## API Endpoints

### Authentication

#### Register User
```http
POST /api/v1/auth/register
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "username": "username",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe",
  "dateOfBirth": "1990-01-01",
  "phoneNumber": "+1234567890",
  "countryCode": "US",
  "country": "United States",
  "termsAccepted": true,
  "privacyPolicyAccepted": true,
  "marketingConsent": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully. Please check your email for verification.",
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "username": "username",
    "firstName": "John",
    "lastName": "Doe",
    "status": "active",
    "emailVerified": false,
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

#### Login
```http
POST /api/v1/auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "twoFactorCode": "123456",
  "rememberMe": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "username": "username",
    "firstName": "John",
    "lastName": "Doe",
    "emailVerified": true,
    "phoneVerified": true,
    "twoFactorEnabled": true,
    "kycStatus": "approved",
    "kycLevel": 2,
    "status": "active",
    "lastLoginAt": "2024-01-15T10:30:00Z"
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": "24h"
  }
}
```

#### Refresh Token
```http
POST /api/v1/auth/refresh
```

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": "24h"
  }
}
```

#### Logout
```http
POST /api/v1/auth/logout
```

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### User Management

#### Get User Profile
```http
GET /api/v1/users/profile
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "username": "username",
    "firstName": "John",
    "lastName": "Doe",
    "dateOfBirth": "1990-01-01",
    "phoneNumber": "+1234567890",
    "country": "United States",
    "kycStatus": "approved",
    "kycLevel": 2,
    "emailVerified": true,
    "phoneVerified": true,
    "twoFactorEnabled": true,
    "status": "active",
    "preferences": {
      "timezone": "UTC",
      "language": "en",
      "currency": "USD",
      "theme": "light"
    },
    "createdAt": "2024-01-15T10:30:00Z",
    "lastLoginAt": "2024-01-15T10:30:00Z"
  }
}
```

#### Update User Profile
```http
PUT /api/v1/users/profile
```

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "+1234567890",
  "timezone": "UTC",
  "language": "en",
  "currency": "USD",
  "theme": "dark"
}
```

### Portfolio Management

#### Get Portfolios
```http
GET /api/v1/portfolio
```

**Query Parameters:**
- `status`: Filter by status (active, inactive, suspended)
- `type`: Filter by type (standard, retirement, education, trading, defi, nft)
- `limit`: Number of results (default: 50, max: 100)
- `offset`: Offset for pagination (default: 0)

**Response:**
```json
{
  "success": true,
  "portfolios": [
    {
      "id": "portfolio-id",
      "name": "My Portfolio",
      "description": "Main investment portfolio",
      "type": "standard",
      "riskLevel": "medium",
      "totalValue": 100000.00,
      "totalCostBasis": 95000.00,
      "totalReturn": 5000.00,
      "totalReturnPercentage": 5.26,
      "dailyPnl": 250.00,
      "dailyPnlPercentage": 0.25,
      "holdings": [
        {
          "id": "holding-id",
          "assetId": "asset-id",
          "symbol": "BTC",
          "name": "Bitcoin",
          "quantity": 0.5,
          "averageCost": 45000.00,
          "currentPrice": 50000.00,
          "currentValue": 25000.00,
          "unrealizedPnl": 2500.00,
          "unrealizedPnlPercentage": 11.11,
          "allocation": 25.00
        }
      ],
      "allocation": [
        {
          "symbol": "BTC",
          "name": "Bitcoin",
          "percentage": 25.00,
          "value": 25000.00,
          "color": "#f7931a"
        }
      ],
      "status": "active",
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 1,
    "limit": 50,
    "offset": 0,
    "hasMore": false
  }
}
```

#### Create Portfolio
```http
POST /api/v1/portfolio
```

**Request Body:**
```json
{
  "name": "New Portfolio",
  "description": "Portfolio description",
  "type": "standard",
  "riskLevel": "medium",
  "rebalancingFrequency": "monthly",
  "autoRebalancing": true,
  "rebalancingThreshold": 5.00
}
```

**Response:**
```json
{
  "success": true,
  "message": "Portfolio created successfully",
  "portfolio": {
    "id": "portfolio-id",
    "name": "New Portfolio",
    "description": "Portfolio description",
    "type": "standard",
    "riskLevel": "medium",
    "totalValue": 0.00,
    "totalCostBasis": 0.00,
    "totalReturn": 0.00,
    "totalReturnPercentage": 0.00,
    "status": "active",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

#### Get Portfolio Details
```http
GET /api/v1/portfolio/:id
```

**Response:**
```json
{
  "success": true,
  "portfolio": {
    "id": "portfolio-id",
    "name": "My Portfolio",
    "description": "Main investment portfolio",
    "type": "standard",
    "riskLevel": "medium",
    "totalValue": 100000.00,
    "totalCostBasis": 95000.00,
    "totalReturn": 5000.00,
    "totalReturnPercentage": 5.26,
    "dailyPnl": 250.00,
    "dailyPnlPercentage": 0.25,
    "volatility": 15.2,
    "sharpeRatio": 1.8,
    "maxDrawdown": -8.5,
    "beta": 1.2,
    "holdings": [
      {
        "id": "holding-id",
        "assetId": "asset-id",
        "symbol": "BTC",
        "name": "Bitcoin",
        "quantity": 0.5,
        "averageCost": 45000.00,
        "currentPrice": 50000.00,
        "currentValue": 25000.00,
        "unrealizedPnl": 2500.00,
        "unrealizedPnlPercentage": 11.11,
        "allocation": 25.00,
        "firstPurchaseDate": "2024-01-01T00:00:00Z",
        "lastPurchaseDate": "2024-01-01T00:00:00Z"
      }
    ],
    "allocation": [
      {
        "symbol": "BTC",
        "name": "Bitcoin",
        "percentage": 25.00,
        "value": 25000.00,
        "color": "#f7931a"
      }
    ],
    "performance": {
      "1d": 0.25,
      "1w": 2.5,
      "1m": 8.5,
      "3m": 15.2,
      "1y": 45.8,
      "all": 125.5
    },
    "status": "active",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

### Trading

#### Place Order
```http
POST /api/v1/trading/order
```

**Request Body:**
```json
{
  "portfolioId": "portfolio-id",
  "assetId": "asset-id",
  "side": "buy",
  "type": "market",
  "quantity": 0.001,
  "price": 50000.00,
  "stopPrice": 45000.00,
  "timeInForce": "GTC",
  "strategyType": "manual"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Order placed successfully",
  "order": {
    "id": "order-id",
    "portfolioId": "portfolio-id",
    "assetId": "asset-id",
    "symbol": "BTC",
    "side": "buy",
    "type": "market",
    "status": "submitted",
    "quantity": 0.001,
    "price": 50000.00,
    "filledQuantity": 0.000,
    "remainingQuantity": 0.001,
    "averageFillPrice": 0.00,
    "totalValue": 0.00,
    "commission": 0.00,
    "totalFees": 0.00,
    "timeInForce": "GTC",
    "strategyType": "manual",
    "submittedAt": "2024-01-15T10:30:00Z",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

#### Get Orders
```http
GET /api/v1/trading/orders
```

**Query Parameters:**
- `status`: Filter by status (pending, submitted, processing, filled, cancelled, rejected)
- `side`: Filter by side (buy, sell)
- `type`: Filter by type (market, limit, stop, stop_limit)
- `assetId`: Filter by asset
- `portfolioId`: Filter by portfolio
- `limit`: Number of results (default: 50, max: 100)
- `offset`: Offset for pagination (default: 0)

**Response:**
```json
{
  "success": true,
  "orders": [
    {
      "id": "order-id",
      "portfolioId": "portfolio-id",
      "assetId": "asset-id",
      "symbol": "BTC",
      "side": "buy",
      "type": "market",
      "status": "filled",
      "quantity": 0.001,
      "price": 50000.00,
      "filledQuantity": 0.001,
      "remainingQuantity": 0.000,
      "averageFillPrice": 50000.00,
      "totalValue": 50.00,
      "commission": 0.05,
      "totalFees": 0.05,
      "timeInForce": "GTC",
      "strategyType": "manual",
      "submittedAt": "2024-01-15T10:30:00Z",
      "filledAt": "2024-01-15T10:30:05Z",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 1,
    "limit": 50,
    "offset": 0,
    "hasMore": false
  }
}
```

#### Cancel Order
```http
POST /api/v1/trading/order/:id/cancel
```

**Response:**
```json
{
  "success": true,
  "message": "Order cancelled successfully"
}
```

### Market Data

#### Get Assets
```http
GET /api/v1/market/assets
```

**Query Parameters:**
- `type`: Filter by asset type (cryptocurrency, stock, etf, bond, commodity, forex)
- `category`: Filter by category
- `sector`: Filter by sector
- `status`: Filter by status (active, inactive, suspended, delisted)
- `search`: Search by symbol or name
- `limit`: Number of results (default: 50, max: 100)
- `offset`: Offset for pagination (default: 0)

**Response:**
```json
{
  "success": true,
  "assets": [
    {
      "id": "asset-id",
      "symbol": "BTC",
      "name": "Bitcoin",
      "fullName": "Bitcoin",
      "assetType": "cryptocurrency",
      "category": "digital-currency",
      "currentPrice": 50000.00,
      "priceChange24h": 2500.00,
      "priceChangePercentage24h": 5.26,
      "marketCap": 950000000000,
      "volume24h": 25000000000,
      "circulatingSupply": 19000000,
      "totalSupply": 21000000,
      "maxSupply": 21000000,
      "volatility": 15.2,
      "beta": 1.2,
      "riskRating": "high",
      "blockchain": "Bitcoin",
      "decimals": 8,
      "regulatoryStatus": "active",
      "supportedExchanges": ["binance", "coinbase", "kraken"],
      "primaryExchange": "binance",
      "tags": ["cryptocurrency", "store-of-value", "digital-gold"],
      "status": "active",
      "isTradable": true,
      "createdAt": "2024-01-15T10:30:00Z",
      "lastPriceUpdate": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 1,
    "limit": 50,
    "offset": 0,
    "hasMore": false
  }
}
```

#### Get Asset Price
```http
GET /api/v1/market/price/:symbol
```

**Response:**
```json
{
  "success": true,
  "price": {
    "symbol": "BTC",
    "price": 50000.00,
    "change24h": 2500.00,
    "changePercentage24h": 5.26,
    "volume24h": 25000000000,
    "marketCap": 950000000000,
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### AI/ML Features

#### Get Trading Signals
```http
GET /api/v1/ai-ml/signals
```

**Query Parameters:**
- `assetId`: Filter by asset
- `signal`: Filter by signal type (BUY, SELL, HOLD)
- `confidence`: Minimum confidence level (0-100)
- `limit`: Number of results (default: 20, max: 100)
- `offset`: Offset for pagination (default: 0)

**Response:**
```json
{
  "success": true,
  "signals": [
    {
      "id": "signal-id",
      "assetId": "asset-id",
      "symbol": "BTC",
      "signal": "BUY",
      "confidence": 85,
      "reason": "Strong bullish momentum with RSI oversold",
      "timestamp": "2024-01-15T10:30:00Z",
      "metadata": {
        "rsi": 25.5,
        "macd": "bullish",
        "volume": "high",
        "support": 45000.00,
        "resistance": 55000.00
      }
    }
  ],
  "pagination": {
    "total": 1,
    "limit": 20,
    "offset": 0,
    "hasMore": false
  }
}
```

#### Get Price Prediction
```http
POST /api/v1/ai-ml/predict
```

**Request Body:**
```json
{
  "assetId": "asset-id",
  "timeframe": "1h",
  "horizon": "24h",
  "model": "lstm"
}
```

**Response:**
```json
{
  "success": true,
  "prediction": {
    "assetId": "asset-id",
    "symbol": "BTC",
    "currentPrice": 50000.00,
    "predictedPrice": 52000.00,
    "confidence": 78,
    "timeframe": "1h",
    "horizon": "24h",
    "model": "lstm",
    "timestamp": "2024-01-15T10:30:00Z",
    "metadata": {
      "volatility": 15.2,
      "trend": "bullish",
      "support": 48000.00,
      "resistance": 53000.00,
      "riskLevel": "medium"
    }
  }
}
```

### Advanced Trading

#### Get Available Strategies
```http
GET /api/v1/advanced-trading/strategies
```

**Response:**
```json
{
  "success": true,
  "strategies": [
    "MOMENTUM_TRADING",
    "MEAN_REVERSION",
    "CROSS_EXCHANGE_ARBITRAGE",
    "PAIRS_TRADING",
    "GRID_TRADING",
    "DOLLAR_COST_AVERAGING",
    "TREND_FOLLOWING",
    "VOLATILITY_TRADING"
  ]
}
```

#### Execute Strategy
```http
POST /api/v1/advanced-trading/execute
```

**Request Body:**
```json
{
  "strategyName": "MOMENTUM_TRADING",
  "params": {
    "symbol": "BTC/USD",
    "period": "1h",
    "threshold": 0.01
  }
}
```

**Response:**
```json
{
  "success": true,
  "executionId": "execution-id",
  "result": {
    "strategy": "Momentum Trading",
    "symbol": "BTC/USD",
    "signal": "BUY",
    "price": 50000.00,
    "confidence": 85,
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### Market Intelligence

#### Get Available Sources
```http
GET /api/v1/market-intelligence/sources
```

**Response:**
```json
{
  "success": true,
  "sources": [
    "NEWS_SENTIMENT",
    "SOCIAL_MEDIA_INTELLIGENCE",
    "ON_CHAIN_METRICS",
    "ORDER_BOOK_ANALYSIS",
    "INSTITUTIONAL_FLOW_ANALYSIS",
    "MACRO_ECONOMIC_INDICATORS"
  ]
}
```

#### Get Intelligence
```http
POST /api/v1/market-intelligence/get
```

**Request Body:**
```json
{
  "sourceName": "NEWS_SENTIMENT",
  "params": {
    "query": "Bitcoin",
    "period": "24h"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "source": "NEWS_SENTIMENT",
    "query": "Bitcoin",
    "sentiment": "positive",
    "score": 0.75,
    "confidence": 82,
    "timestamp": "2024-01-15T10:30:00Z",
    "metadata": {
      "articlesAnalyzed": 150,
      "positiveArticles": 120,
      "negativeArticles": 20,
      "neutralArticles": 10,
      "trend": "improving"
    }
  }
}
```

### Portfolio Optimization

#### Get Available Methods
```http
GET /api/v1/portfolio-optimization/methods
```

**Response:**
```json
{
  "success": true,
  "methods": [
    "MODERN_PORTFOLIO_THEORY",
    "BLACK_LITTERMAN",
    "RISK_PARITY",
    "MINIMUM_VARIANCE",
    "MAXIMUM_SHARPE_RATIO",
    "KELLY_CRITERION",
    "RISK_BUDGETING",
    "FACTOR_INVESTING"
  ]
}
```

#### Optimize Portfolio
```http
POST /api/v1/portfolio-optimization/optimize
```

**Request Body:**
```json
{
  "methodName": "MODERN_PORTFOLIO_THEORY",
  "portfolio": {
    "assets": [
      {
        "symbol": "BTC",
        "currentWeight": 0.6
      },
      {
        "symbol": "ETH",
        "currentWeight": 0.4
      }
    ],
    "historicalData": []
  },
  "constraints": {
    "maxRisk": 0.15,
    "minReturn": 0.08
  }
}
```

**Response:**
```json
{
  "success": true,
  "optimizedPortfolio": {
    "method": "MPT",
    "optimizedWeights": [
      {
        "symbol": "BTC",
        "weight": 0.65
      },
      {
        "symbol": "ETH",
        "weight": 0.35
      }
    ],
    "expectedReturn": 0.12,
    "expectedVolatility": 0.15,
    "sharpeRatio": 0.8,
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

## WebSocket API

### Connection

```javascript
const ws = new WebSocket('wss://api.finainexus.com/ws');

ws.onopen = function() {
  // Subscribe to market data
  ws.send(JSON.stringify({
    type: 'subscribe',
    channel: 'market_data',
    symbols: ['BTC', 'ETH', 'ADA']
  }));
};

ws.onmessage = function(event) {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};
```

### Available Channels

- `market_data`: Real-time price updates
- `portfolio_updates`: Portfolio value changes
- `order_updates`: Order status changes
- `trading_signals`: AI-generated trading signals
- `notifications`: System notifications

### Message Formats

#### Market Data
```json
{
  "type": "market_data",
  "symbol": "BTC",
  "price": 50000.00,
  "change24h": 2500.00,
  "changePercentage24h": 5.26,
  "volume24h": 25000000000,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### Portfolio Updates
```json
{
  "type": "portfolio_update",
  "portfolioId": "portfolio-id",
  "totalValue": 100000.00,
  "totalReturn": 5000.00,
  "totalReturnPercentage": 5.26,
  "dailyPnl": 250.00,
  "dailyPnlPercentage": 0.25,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## SDKs and Libraries

### JavaScript/Node.js
```bash
npm install finainexus-sdk
```

```javascript
const FinNexusAPI = require('finainexus-sdk');

const api = new FinNexusAPI({
  apiKey: 'your-api-key',
  baseURL: 'https://api.finainexus.com'
});

// Get portfolios
const portfolios = await api.portfolio.getAll();

// Place order
const order = await api.trading.placeOrder({
  portfolioId: 'portfolio-id',
  assetId: 'asset-id',
  side: 'buy',
  type: 'market',
  quantity: 0.001
});
```

### Python
```bash
pip install finainexus-python
```

```python
from finainexus import FinNexusAPI

api = FinNexusAPI(api_key='your-api-key')

# Get portfolios
portfolios = api.portfolio.get_all()

# Place order
order = api.trading.place_order(
    portfolio_id='portfolio-id',
    asset_id='asset-id',
    side='buy',
    type='market',
    quantity=0.001
)
```

## Examples

### Complete Trading Flow

```javascript
// 1. Authenticate
const authResponse = await fetch('/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password'
  })
});

const { tokens } = await authResponse.json();

// 2. Get portfolios
const portfoliosResponse = await fetch('/api/v1/portfolio', {
  headers: { 'Authorization': `Bearer ${tokens.accessToken}` }
});

const { portfolios } = await portfoliosResponse.json();

// 3. Get market data
const marketResponse = await fetch('/api/v1/market/price/BTC', {
  headers: { 'Authorization': `Bearer ${tokens.accessToken}` }
});

const { price } = await marketResponse.json();

// 4. Place order
const orderResponse = await fetch('/api/v1/trading/order', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${tokens.accessToken}`
  },
  body: JSON.stringify({
    portfolioId: portfolios[0].id,
    assetId: 'btc-asset-id',
    side: 'buy',
    type: 'market',
    quantity: 0.001
  })
});

const { order } = await orderResponse.json();
console.log('Order placed:', order);
```

## Support

For API support and questions:

- **Documentation**: https://docs.finainexus.com
- **Status Page**: https://status.finainexus.com
- **Support Email**: api-support@finainexus.com
- **Discord**: https://discord.gg/finainexus
- **GitHub**: https://github.com/finainexus/api

## Changelog

### Version 1.0.0 (2024-01-15)
- Initial API release
- Authentication and user management
- Portfolio management
- Trading functionality
- Market data endpoints
- AI/ML features
- WebSocket support
