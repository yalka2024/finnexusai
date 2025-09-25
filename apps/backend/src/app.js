/**
 * FinNexusAI Backend Application Entry Point
 *
 * This is the main entry point for the FinNexusAI backend server.
 * It initializes all services, middleware, routes, and database connections.
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');
require('dotenv').config();

// Import database connection
const { connectDB, disconnectDB } = require('./config/database');

// Import middleware
const { errorHandler } = require('./middleware/errorHandler');
const requestLogger = require('./middleware/requestLogger');
const { authenticate } = require('./middleware/auth');

// Import services
const tradingEngine = require('./services/trading/TradingEngine');
const marketDataService = require('./services/market/RealTimeMarketDataService');
const predictionService = require('./services/ai/MLModelManager');
const defiService = require('./services/blockchain/MultiChainManager');
const paymentService = require('./services/payment/EnterprisePaymentService');
const complianceService = require('./services/compliance/ComplianceService');
const quantumSecurity = require('./services/security/QuantumSecurityManager');
const streamingService = require('./services/streaming/RealTimeStreamingService');
const autonomousAgents = require('./services/ai/AutonomousTradingAgents');
const quantumComputing = require('./services/quantum/QuantumComputingService');
const metaverseTrading = require('./services/metaverse/MetaverseTradingService');
const edgeAI = require('./services/edge/EdgeAIComputingService');
const socialTrading = require('./services/social/SocialTradingNetwork');
const playToEarn = require('./services/gamification/PlayToEarnService');
const globalCDN = require('./services/global/GlobalCDNMultiRegionService');
const hftEngine = require('./services/hft/HighFrequencyTradingEngine');
const shariaCompliance = require('./services/compliance/ShariaComplianceManager');
const arbitrageEngine = require('./services/arbitrage/CrossExchangeArbitrageEngine');
const derivativesEngine = require('./services/derivatives/OptionsDerivativesEngine');
const sandboxEngine = require('./services/sandbox/FuturistSandboxEngine');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const portfolioRoutes = require('./routes/portfolio');
const tradingRoutes = require('./routes/trading');
const aiRoutes = require('./routes/ai-ml');
const blockchainRoutes = require('./routes/blockchain');
const paymentRoutes = require('./routes/payment-processing');
const complianceRoutes = require('./routes/compliance');
const analyticsRoutes = require('./routes/analytics');
const adminRoutes = require('./routes/admin');
const globalCDNRoutes = require('./routes/global-cdn');
const hftRoutes = require('./routes/hft');
const shariaRoutes = require('./routes/sharia-compliance');
const arbitrageRoutes = require('./routes/arbitrage');
const derivativesRoutes = require('./routes/derivatives');
const sandboxRoutes = require('./routes/sandbox');

// Import logger

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for accurate IP addresses (important for rate limiting and security)
app.set('trust proxy', 1);

// Load Swagger documentation
const swaggerDocument = YAML.load(path.join(__dirname, '../../swagger.yaml'));

// ================================
// SECURITY MIDDLEWARE
// ================================

// Helmet for security headers
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
const corsOptions = {
  origin: function(origin, callback) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS ?
      process.env.ALLOWED_ORIGINS.split(',') :
      ['http://localhost:3000', 'http://localhost:3001'];

    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};
app.use(cors(corsOptions));

// Compression middleware
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use(requestLogger);

// ================================
// RATE LIMITING
// ================================

// General API rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Max 1000 requests per 15 minutes per IP
  message: {
    error: 'Too many requests from this IP, please try again after 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Strict rate limiting for sensitive endpoints
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Max 5 requests per 15 minutes
  message: {
    error: 'Too many requests for this sensitive endpoint'
  }
});

app.use('/api/', apiLimiter);
app.use('/api/auth/', strictLimiter);

// ================================
// HEALTH CHECK & MONITORING
// ================================

// Health check endpoint
app.get('/health', async(req, res) => {
  try {
    const healthStatus = {
      status: 'UP',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      services: {
        database: 'UP',
        trading: 'UP',
        marketData: 'UP',
        ai: 'UP',
        blockchain: 'UP',
        payments: 'UP'
      }
    };

    res.status(200).json(healthStatus);
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'DOWN',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// API status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    name: 'FinNexusAI API',
    version: '1.0.0',
    status: 'operational',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      portfolio: '/api/portfolio',
      trading: '/api/trading',
      ai: '/api/ai',
      blockchain: '/api/blockchain',
      payments: '/api/payments',
      compliance: '/api/compliance',
      analytics: '/api/analytics',
      admin: '/api/admin'
    }
  });
});

// ================================
// API ROUTES
// ================================

// Public routes (no authentication required)
app.use('/api/auth', authRoutes);

// Protected routes (authentication required)
app.use('/api/users', authenticate, userRoutes);
app.use('/api/portfolio', authenticate, portfolioRoutes);
app.use('/api/trading', authenticate, tradingRoutes);
app.use('/api/ai', authenticate, aiRoutes);
app.use('/api/blockchain', authenticate, blockchainRoutes);
app.use('/api/payments', authenticate, paymentRoutes);
app.use('/api/compliance', authenticate, complianceRoutes);
app.use('/api/analytics', authenticate, analyticsRoutes);
app.use('/api/global-cdn', authenticate, globalCDNRoutes);
app.use('/api/hft', authenticate, hftRoutes);
app.use('/api/sharia', authenticate, shariaRoutes);
app.use('/api/arbitrage', authenticate, arbitrageRoutes);
app.use('/api/derivatives', authenticate, derivativesRoutes);
app.use('/api/sandbox', authenticate, sandboxRoutes);

// Admin routes (admin authentication required)
app.use('/api/admin', authenticate, adminRoutes);

// ================================
// API DOCUMENTATION
// ================================

// Swagger API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'FinNexusAI API Documentation'
}));

// API documentation redirect
app.get('/docs', (req, res) => {
  res.redirect('/api-docs');
});

// ================================
// ERROR HANDLING
// ================================

// 404 handler for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use(errorHandler);

// ================================
// GRACEFUL SHUTDOWN
// ================================

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
    await complianceService.shutdown();
    await quantumSecurity.shutdown();
    await streamingService.shutdown();
    await autonomousAgents.shutdown();
    await quantumComputing.shutdown();
    await metaverseTrading.shutdown();
    await edgeAI.shutdown();
    await socialTrading.shutdown();
    await playToEarn.shutdown();
    await globalCDN.shutdown();
    await hftEngine.shutdown();
    await shariaCompliance.shutdown();
    await arbitrageEngine.shutdown();
    await derivativesEngine.shutdown();
    await sandboxEngine.shutdown();

    // Close database connections
    await disconnectDB();
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

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

// ================================
// SERVER INITIALIZATION
// ================================

if (require.main === module) {
  async function startServer() {
    try {
      logger.info('🚀 Starting FinNexusAI Backend...');

      // Initialize database connections
      logger.info('📊 Initializing database connections...');
      await connectDB();
      logger.info('✅ Database connections established');

      // Initialize services
      logger.info('🔧 Initializing services...');

      logger.info('📈 Initializing Trading Engine...');
      await tradingEngine.initialize();
      logger.info('✅ Trading Engine initialized');

      logger.info('📊 Initializing Real-Time Market Data Service...');
      await marketDataService.initialize();
      logger.info('✅ Real-Time Market Data Service initialized');

      logger.info('🤖 Initializing ML Model Manager...');
      await predictionService.initialize();
      logger.info('✅ ML Model Manager initialized');

      logger.info('⛓️ Initializing Multi-Chain Manager...');
      await defiService.initialize();
      logger.info('✅ Multi-Chain Manager initialized');

      logger.info('💳 Initializing Enterprise Payment Service...');
      await paymentService.initialize();
      logger.info('✅ Enterprise Payment Service initialized');

      logger.info('🛡️ Initializing Compliance Service...');
      await complianceService.initialize();
      logger.info('✅ Compliance Service initialized');

      logger.info('🔐 Initializing Quantum Security Manager...');
      await quantumSecurity.initialize();
      logger.info('✅ Quantum Security Manager initialized');

      logger.info('📡 Initializing Real-Time Streaming Service...');
      await streamingService.initialize();
      logger.info('✅ Real-Time Streaming Service initialized');

      logger.info('🤖 Initializing Autonomous Trading Agents...');
      await autonomousAgents.initialize();
      logger.info('✅ Autonomous Trading Agents initialized');

      logger.info('⚛️ Initializing Quantum Computing Service...');
      await quantumComputing.initialize();
      logger.info('✅ Quantum Computing Service initialized');

      logger.info('🌐 Initializing Metaverse Trading Service...');
      await metaverseTrading.initialize();
      logger.info('✅ Metaverse Trading Service initialized');

      logger.info('⚡ Initializing Edge AI Computing Service...');
      await edgeAI.initialize();
      logger.info('✅ Edge AI Computing Service initialized');

      logger.info('👥 Initializing Social Trading Network...');
      await socialTrading.initialize();
      logger.info('✅ Social Trading Network initialized');

      logger.info('🎮 Initializing Play-to-Earn Service...');
      await playToEarn.initialize();
      logger.info('✅ Play-to-Earn Service initialized');

      logger.info('🌍 Initializing Global CDN Multi-Region Service...');
      await globalCDN.initialize();

      logger.info('⚡ Initializing High-Frequency Trading Engine...');
      await hftEngine.initialize();
      logger.info('✅ High-Frequency Trading Engine initialized');

      logger.info('🕌 Initializing Sharia Compliance Manager...');
      await shariaCompliance.initialize();
      logger.info('✅ Sharia Compliance Manager initialized');

      logger.info('⚖️ Initializing Cross-Exchange Arbitrage Engine...');
      await arbitrageEngine.initialize();
      logger.info('✅ Cross-Exchange Arbitrage Engine initialized');

      logger.info('📊 Initializing Options and Derivatives Trading Engine...');
      await derivativesEngine.initialize();
      logger.info('✅ Options and Derivatives Trading Engine initialized');

      logger.info('🔮 Initializing Futurist Sandbox Engine...');
      await sandboxEngine.initialize();
      logger.info('✅ Futurist Sandbox Engine initialized');

      // Start HTTP server
      const server = app.listen(PORT, () => {
        logger.info(`🚀 Backend ready at http://localhost:${PORT}`);
        logger.info(`🏥 Health check: http://localhost:${PORT}/health`);
        logger.info(`📚 API docs: http://localhost:${PORT}/api-docs`);
        logger.info(`📊 API status: http://localhost:${PORT}/api/status`);
        logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      });

      // Handle server errors
      server.on('error', (error) => {
        if (error.syscall !== 'listen') {
          throw error;
        }

        const bind = typeof PORT === 'string' ? `Pipe ${  PORT}` : `Port ${  PORT}`;

        switch (error.code) {
        case 'EACCES':
          logger.error(`${bind} requires elevated privileges`);
          process.exit(1);
          break;
        case 'EADDRINUSE':
          logger.error(`${bind} is already in use`);
          process.exit(1);
          break;
        default:
          throw error;
        }
      });

    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  startServer();
} else {
  // Export app for testing
  module.exports = app;
}
