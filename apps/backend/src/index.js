const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import our actual implementations
const databaseManager = require('./config/database');

// Import new services
const tradingEngine = require('./services/trading/TradingEngine');
const marketDataService = require('./services/market/MarketDataService');
const predictionService = require('./services/ai/PredictionService');
const defiService = require('./services/blockchain/DeFiService');
const paymentService = require('./services/payment/PaymentService');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const portfolioRoutes = require('./routes/portfolio');
const tradingRoutes = require('./routes/trading');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ['\'self\''],
      styleSrc: ['\'self\'', '\'unsafe-inline\''],
      scriptSrc: ['\'self\''],
      imgSrc: ['\'self\'', 'data:', 'https:']
    }
  },
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3001',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Request logging middleware
app.use(logger.logRequest);

// Health check endpoint
app.get('/api/v1/health', async(req, res) => {
  try {
    const dbHealth = await databaseManager.healthCheck();

    res.status(200).json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      database: dbHealth
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/portfolio', portfolioRoutes);
app.use('/api/v1/trading', tradingRoutes);

// API Documentation endpoint
app.get('/api-docs', (req, res) => {
  res.json({
    name: 'FinNexusAI API',
    version: '1.0.0',
    description: 'AI-powered financial platform API',
    endpoints: {
      auth: {
        'POST /api/v1/auth/register': 'Register new user',
        'POST /api/v1/auth/login': 'Login user',
        'POST /api/v1/auth/refresh': 'Refresh access token',
        'POST /api/v1/auth/logout': 'Logout user',
        'GET /api/v1/auth/verify': 'Verify authentication token',
        'POST /api/v1/auth/2fa/setup': 'Setup two-factor authentication',
        'POST /api/v1/auth/2fa/enable': 'Enable two-factor authentication',
        'POST /api/v1/auth/2fa/disable': 'Disable two-factor authentication'
      },
      users: {
        'GET /api/v1/users/profile': 'Get user profile',
        'PUT /api/v1/users/profile': 'Update user profile',
        'POST /api/v1/users/change-password': 'Change password',
        'GET /api/v1/users/stats': 'Get user statistics',
        'GET /api/v1/users/notifications': 'Get user notifications',
        'PUT /api/v1/users/notifications/:id/read': 'Mark notification as read',
        'PUT /api/v1/users/notifications/read-all': 'Mark all notifications as read',
        'GET /api/v1/users/api-keys': 'Get user API keys',
        'POST /api/v1/users/api-keys': 'Create API key',
        'DELETE /api/v1/users/api-keys/:id': 'Revoke API key'
      },
      portfolio: {
        'POST /api/v1/portfolio': 'Create portfolio',
        'GET /api/v1/portfolio': 'Get user portfolios',
        'GET /api/v1/portfolio/:id': 'Get portfolio by ID',
        'PUT /api/v1/portfolio/:id': 'Update portfolio',
        'DELETE /api/v1/portfolio/:id': 'Delete portfolio',
        'GET /api/v1/portfolio/:id/holdings': 'Get portfolio holdings',
        'GET /api/v1/portfolio/:id/performance': 'Get portfolio performance',
        'GET /api/v1/portfolio/:id/value': 'Get portfolio value'
      }
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Global error handler
app.use((error, req, res, next) => {
  logger.logError(error, {
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// Graceful shutdown handler
const gracefulShutdown = async(signal) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  try {
    // Shutdown services
    logger.info('🛑 Shutting down services...');

    await tradingEngine.shutdown();
    await marketDataService.shutdown();
    await predictionService.shutdown();
    await defiService.shutdown();
    await paymentService.shutdown();

    // Close database connections
    await databaseManager.close();
    logger.info('Database connections closed');

    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
if (require.main === module) {
  async function startServer() {
    try {
      logger.info('🚀 Starting FinNexusAI Backend...');

      // Initialize database connections
      logger.info('📊 Initializing database connections...');
      await databaseManager.initialize();
      logger.info('✅ Database connections established');

      // Initialize services
      logger.info('🔧 Initializing services...');

      logger.info('📈 Initializing Trading Engine...');
      await tradingEngine.initialize();
      logger.info('✅ Trading Engine initialized');

      logger.info('📊 Initializing Market Data Service...');
      await marketDataService.initialize();
      logger.info('✅ Market Data Service initialized');

      logger.info('🤖 Initializing AI Prediction Service...');
      await predictionService.initialize();
      logger.info('✅ AI Prediction Service initialized');

      logger.info('⛓️ Initializing DeFi Service...');
      await defiService.initialize();
      logger.info('✅ DeFi Service initialized');

      logger.info('💳 Initializing Payment Service...');
      await paymentService.initialize();
      logger.info('✅ Payment Service initialized');

      // Start HTTP server
      const server = app.listen(PORT, () => {
        logger.info(`🚀 Backend ready at http://localhost:${PORT}`);
        logger.info(`🏥 Health check: http://localhost:${PORT}/api/v1/health`);
        logger.info(`📝 API Documentation: http://localhost:${PORT}/api-docs`);
        logger.info(`🔒 Environment: ${process.env.NODE_ENV || 'development'}`);
        logger.info(`⏰ Started at: ${new Date().toISOString()}`);
      });

      // Handle server errors
      server.on('error', (error) => {
        if (error.code === 'EADDRINUSE') {
          logger.error(`❌ Port ${PORT} is already in use`);
        } else {
          logger.error('❌ Server error:', error);
        }
        process.exit(1);
      });

    } catch (error) {
      logger.error('❌ Failed to start server:', error);
      process.exit(1);
    }
  }

  startServer();
} else {
  module.exports = app;
}
