/**
 * Business Metrics Collector
 * Comprehensive business metrics for trading, portfolio, and financial operations
 */

const { Pool } = require('pg');
const { MongoClient } = require('mongodb');
const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../../utils/logger');

class BusinessMetricsCollector extends EventEmitter {
  constructor() {
    super();
    this.config = {
      postgresUrl: process.env.DATABASE_URL || 'postgresql://localhost:5432/fin_nexus_ai',
      mongoUrl: process.env.MONGO_URI || 'mongodb://localhost:27017/finnexusai',
      collectionInterval: parseInt(process.env.BUSINESS_METRICS_INTERVAL) || 60000, // 1 minute
      enableRealTimeMetrics: process.env.ENABLE_REAL_TIME_METRICS !== 'false',
      enableHistoricalMetrics: process.env.ENABLE_HISTORICAL_METRICS !== 'false',
      enableTradingMetrics: process.env.ENABLE_TRADING_METRICS !== 'false',
      enablePortfolioMetrics: process.env.ENABLE_PORTFOLIO_METRICS !== 'false',
      enableUserMetrics: process.env.ENABLE_USER_METRICS !== 'false',
      enableComplianceMetrics: process.env.ENABLE_COMPLIANCE_METRICS !== 'false',
      enableRevenueMetrics: process.env.ENABLE_REVENUE_METRICS !== 'false',
      metricsDir: path.join(__dirname, '..', '..', 'data', 'metrics')
    };

    this.postgres = null;
    this.mongodb = null;
    this.metricsInterval = null;

    // Business metrics storage
    this.metrics = {
      trading: new Map(),
      portfolio: new Map(),
      user: new Map(),
      compliance: new Map(),
      revenue: new Map(),
      system: new Map()
    };

    // Real-time metrics cache
    this.realTimeMetrics = {
      activeTraders: 0,
      totalVolume24h: 0,
      totalTrades24h: 0,
      totalRevenue24h: 0,
      activePortfolios: 0,
      systemUptime: 0,
      lastUpdated: new Date()
    };

    // Metric definitions
    this.metricDefinitions = {
      trading: {
        volume_24h: { type: 'sum', aggregation: 'daily', retention: 365 },
        trades_24h: { type: 'count', aggregation: 'daily', retention: 365 },
        avg_trade_size: { type: 'average', aggregation: 'daily', retention: 365 },
        success_rate: { type: 'percentage', aggregation: 'daily', retention: 365 },
        latency_p95: { type: 'percentile', aggregation: 'hourly', retention: 90 },
        error_rate: { type: 'percentage', aggregation: 'hourly', retention: 90 },
        top_pairs: { type: 'top_n', aggregation: 'daily', retention: 30 },
        geographic_distribution: { type: 'distribution', aggregation: 'daily', retention: 30 }
      },
      portfolio: {
        total_value: { type: 'sum', aggregation: 'hourly', retention: 365 },
        active_portfolios: { type: 'count', aggregation: 'hourly', retention: 365 },
        avg_portfolio_size: { type: 'average', aggregation: 'daily', retention: 365 },
        portfolio_performance: { type: 'percentage', aggregation: 'daily', retention: 365 },
        asset_allocation: { type: 'distribution', aggregation: 'daily', retention: 90 },
        risk_metrics: { type: 'composite', aggregation: 'hourly', retention: 90 },
        rebalancing_frequency: { type: 'average', aggregation: 'daily', retention: 90 }
      },
      user: {
        active_users: { type: 'count', aggregation: 'hourly', retention: 365 },
        new_registrations: { type: 'count', aggregation: 'daily', retention: 365 },
        user_retention: { type: 'percentage', aggregation: 'weekly', retention: 365 },
        avg_session_duration: { type: 'average', aggregation: 'daily', retention: 90 },
        feature_usage: { type: 'distribution', aggregation: 'daily', retention: 30 },
        geographic_distribution: { type: 'distribution', aggregation: 'daily', retention: 30 },
        device_usage: { type: 'distribution', aggregation: 'daily', retention: 30 }
      },
      compliance: {
        kyc_completion_rate: { type: 'percentage', aggregation: 'daily', retention: 365 },
        aml_alerts: { type: 'count', aggregation: 'daily', retention: 365 },
        regulatory_reports: { type: 'count', aggregation: 'monthly', retention: 2555 },
        audit_compliance: { type: 'percentage', aggregation: 'weekly', retention: 365 },
        data_retention_compliance: { type: 'percentage', aggregation: 'daily', retention: 365 }
      },
      revenue: {
        total_revenue: { type: 'sum', aggregation: 'daily', retention: 365 },
        revenue_by_source: { type: 'distribution', aggregation: 'daily', retention: 365 },
        avg_revenue_per_user: { type: 'average', aggregation: 'daily', retention: 365 },
        revenue_growth: { type: 'percentage', aggregation: 'monthly', retention: 365 },
        churn_revenue_impact: { type: 'sum', aggregation: 'monthly', retention: 365 }
      }
    };
  }

  /**
   * Initialize the business metrics collector
   */
  async initialize() {
    try {
      logger.info('🔄 Initializing business metrics collector...');

      // Initialize database connections
      await this.initializeConnections();

      // Create metrics directory
      await this.createMetricsDirectory();

      // Create metrics tables
      await this.createMetricsTables();

      // Start metrics collection
      if (this.config.enableRealTimeMetrics) {
        this.startMetricsCollection();
      }

      logger.info('✅ Business metrics collector initialized successfully');

      return {
        success: true,
        message: 'Business metrics collector initialized successfully',
        config: {
          collectionInterval: this.config.collectionInterval,
          realTimeMetrics: this.config.enableRealTimeMetrics,
          historicalMetrics: this.config.enableHistoricalMetrics,
          tradingMetrics: this.config.enableTradingMetrics,
          portfolioMetrics: this.config.enablePortfolioMetrics,
          userMetrics: this.config.enableUserMetrics,
          complianceMetrics: this.config.enableComplianceMetrics,
          revenueMetrics: this.config.enableRevenueMetrics
        }
      };

    } catch (error) {
      logger.error('❌ Failed to initialize business metrics collector:', error);
      throw new Error(`Business metrics collector initialization failed: ${error.message}`);
    }
  }

  /**
   * Initialize database connections
   */
  async initializeConnections() {
    // PostgreSQL connection
    this.postgres = new Pool({
      connectionString: this.config.postgresUrl,
      max: 2,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000
    });

    // MongoDB connection
    this.mongodb = new MongoClient(this.config.mongoUrl);
    await this.mongodb.connect();
  }

  /**
   * Create metrics directory
   */
  async createMetricsDirectory() {
    try {
      await fs.mkdir(this.config.metricsDir, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  /**
   * Create metrics tables
   */
  async createMetricsTables() {
    try {
      const client = await this.postgres.connect();

      // Create business metrics table
      await client.query(`
        CREATE TABLE IF NOT EXISTS business_metrics (
          id SERIAL PRIMARY KEY,
          metric_category VARCHAR(50) NOT NULL,
          metric_name VARCHAR(100) NOT NULL,
          metric_value DECIMAL(20,8) NOT NULL,
          metric_type VARCHAR(20) NOT NULL,
          aggregation_period VARCHAR(20) NOT NULL,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          metadata JSONB,
          tags TEXT[]
        );
      `);

      // Create real-time metrics table
      await client.query(`
        CREATE TABLE IF NOT EXISTS real_time_metrics (
          id SERIAL PRIMARY KEY,
          metric_name VARCHAR(100) UNIQUE NOT NULL,
          metric_value DECIMAL(20,8) NOT NULL,
          last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          metadata JSONB
        );
      `);

      // Create trading metrics table
      await client.query(`
        CREATE TABLE IF NOT EXISTS trading_metrics (
          id SERIAL PRIMARY KEY,
          trading_pair VARCHAR(20) NOT NULL,
          volume_24h DECIMAL(20,8) DEFAULT 0,
          trades_24h INTEGER DEFAULT 0,
          avg_trade_size DECIMAL(20,8) DEFAULT 0,
          success_rate DECIMAL(5,4) DEFAULT 0,
          latency_p95 INTEGER DEFAULT 0,
          error_rate DECIMAL(5,4) DEFAULT 0,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Create portfolio metrics table
      await client.query(`
        CREATE TABLE IF NOT EXISTS portfolio_metrics (
          id SERIAL PRIMARY KEY,
          total_value DECIMAL(20,8) DEFAULT 0,
          active_portfolios INTEGER DEFAULT 0,
          avg_portfolio_size DECIMAL(20,8) DEFAULT 0,
          portfolio_performance DECIMAL(5,4) DEFAULT 0,
          asset_allocation JSONB,
          risk_metrics JSONB,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Create indexes for performance
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_business_metrics_category_timestamp 
        ON business_metrics(metric_category, timestamp);
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_business_metrics_name_timestamp 
        ON business_metrics(metric_name, timestamp);
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_trading_metrics_pair_timestamp 
        ON trading_metrics(trading_pair, timestamp);
      `);

      client.release();
      logger.info('✅ Business metrics tables created');
    } catch (error) {
      logger.warn('⚠️ Could not create business metrics tables:', error.message);
    }
  }

  /**
   * Start metrics collection
   */
  startMetricsCollection() {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }

    this.metricsInterval = setInterval(async() => {
      try {
        await this.collectAllMetrics();
      } catch (error) {
        logger.error('❌ Error in metrics collection:', error);
        this.emit('metrics:error', { error });
      }
    }, this.config.collectionInterval);

    logger.info(`✅ Business metrics collection started (interval: ${this.config.collectionInterval}ms)`);
  }

  /**
   * Collect all metrics
   */
  async collectAllMetrics() {
    logger.info('📊 Collecting business metrics...');

    const startTime = Date.now();
    const results = {};

    try {
      // Collect trading metrics
      if (this.config.enableTradingMetrics) {
        results.trading = await this.collectTradingMetrics();
      }

      // Collect portfolio metrics
      if (this.config.enablePortfolioMetrics) {
        results.portfolio = await this.collectPortfolioMetrics();
      }

      // Collect user metrics
      if (this.config.enableUserMetrics) {
        results.user = await this.collectUserMetrics();
      }

      // Collect compliance metrics
      if (this.config.enableComplianceMetrics) {
        results.compliance = await this.collectComplianceMetrics();
      }

      // Collect revenue metrics
      if (this.config.enableRevenueMetrics) {
        results.revenue = await this.collectRevenueMetrics();
      }

      // Update real-time metrics
      this.updateRealTimeMetrics(results);

      // Store metrics
      if (this.config.enableHistoricalMetrics) {
        await this.storeMetrics(results);
      }

      const duration = Date.now() - startTime;
      logger.info(`✅ Business metrics collected in ${duration}ms`);

      this.emit('metrics:collected', { results, duration });

    } catch (error) {
      logger.error('❌ Error collecting business metrics:', error);
      throw error;
    }
  }

  /**
   * Collect trading metrics
   */
  async collectTradingMetrics() {
    try {
      const client = await this.postgres.connect();

      // Get trading volume and trades for last 24 hours
      const volumeQuery = `
        SELECT 
          trading_pair,
          SUM(amount * price) as volume_24h,
          COUNT(*) as trades_24h,
          AVG(amount * price) as avg_trade_size,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END)::DECIMAL / COUNT(*) as success_rate
        FROM trading_orders 
        WHERE created_at >= NOW() - INTERVAL '24 hours'
        GROUP BY trading_pair
      `;

      const volumeResult = await client.query(volumeQuery);

      // Get latency metrics
      const latencyQuery = `
        SELECT 
          trading_pair,
          PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY execution_time_ms) as latency_p95,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END)::DECIMAL / COUNT(*) as error_rate
        FROM trading_orders 
        WHERE created_at >= NOW() - INTERVAL '1 hour'
        GROUP BY trading_pair
      `;

      const latencyResult = await client.query(latencyQuery);

      // Get top trading pairs
      const topPairsQuery = `
        SELECT trading_pair, COUNT(*) as trade_count
        FROM trading_orders 
        WHERE created_at >= NOW() - INTERVAL '24 hours'
        GROUP BY trading_pair
        ORDER BY trade_count DESC
        LIMIT 10
      `;

      const topPairsResult = await client.query(topPairsQuery);

      client.release();

      const metrics = {
        volume_24h: volumeResult.rows.reduce((sum, row) => sum + parseFloat(row.volume_24h || 0), 0),
        trades_24h: volumeResult.rows.reduce((sum, row) => sum + parseInt(row.trades_24h || 0), 0),
        avg_trade_size: this.calculateAverage(volumeResult.rows.map(row => parseFloat(row.avg_trade_size || 0))),
        success_rate: this.calculateAverage(volumeResult.rows.map(row => parseFloat(row.success_rate || 0))),
        latency_p95: this.calculateAverage(latencyResult.rows.map(row => parseInt(row.latency_p95 || 0))),
        error_rate: this.calculateAverage(latencyResult.rows.map(row => parseFloat(row.error_rate || 0))),
        top_pairs: topPairsResult.rows,
        by_pair: volumeResult.rows
      };

      return metrics;

    } catch (error) {
      logger.error('❌ Error collecting trading metrics:', error);
      return {};
    }
  }

  /**
   * Collect portfolio metrics
   */
  async collectPortfolioMetrics() {
    try {
      const client = await this.postgres.connect();

      // Get portfolio value and count
      const portfolioQuery = `
        SELECT 
          COUNT(*) as active_portfolios,
          SUM(total_value) as total_value,
          AVG(total_value) as avg_portfolio_size
        FROM portfolios 
        WHERE status = 'active'
      `;

      const portfolioResult = await client.query(portfolioQuery);

      // Get portfolio performance
      const performanceQuery = `
        SELECT 
          AVG(
            CASE 
              WHEN initial_value > 0 
              THEN ((total_value - initial_value) / initial_value) * 100 
              ELSE 0 
            END
          ) as portfolio_performance
        FROM portfolios 
        WHERE status = 'active' AND created_at >= NOW() - INTERVAL '30 days'
      `;

      const performanceResult = await client.query(performanceQuery);

      // Get asset allocation
      const allocationQuery = `
        SELECT 
          asset_type,
          SUM(value) as total_value,
          COUNT(*) as count
        FROM portfolio_assets 
        WHERE portfolio_id IN (SELECT id FROM portfolios WHERE status = 'active')
        GROUP BY asset_type
        ORDER BY total_value DESC
      `;

      const allocationResult = await client.query(allocationQuery);

      client.release();

      const metrics = {
        total_value: parseFloat(portfolioResult.rows[0]?.total_value || 0),
        active_portfolios: parseInt(portfolioResult.rows[0]?.active_portfolios || 0),
        avg_portfolio_size: parseFloat(portfolioResult.rows[0]?.avg_portfolio_size || 0),
        portfolio_performance: parseFloat(performanceResult.rows[0]?.portfolio_performance || 0),
        asset_allocation: allocationResult.rows
      };

      return metrics;

    } catch (error) {
      logger.error('❌ Error collecting portfolio metrics:', error);
      return {};
    }
  }

  /**
   * Collect user metrics
   */
  async collectUserMetrics() {
    try {
      const client = await this.postgres.connect();

      // Get active users
      const activeUsersQuery = `
        SELECT COUNT(DISTINCT user_id) as active_users
        FROM user_sessions 
        WHERE last_activity >= NOW() - INTERVAL '1 hour'
      `;

      const activeUsersResult = await client.query(activeUsersQuery);

      // Get new registrations
      const newUsersQuery = `
        SELECT COUNT(*) as new_registrations
        FROM users 
        WHERE created_at >= NOW() - INTERVAL '24 hours'
      `;

      const newUsersResult = await client.query(newUsersQuery);

      // Get user retention
      const retentionQuery = `
        SELECT 
          COUNT(DISTINCT CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN user_id END) as new_users_30d,
          COUNT(DISTINCT CASE WHEN last_login >= NOW() - INTERVAL '30 days' THEN user_id END) as active_users_30d
        FROM users
      `;

      const retentionResult = await client.query(retentionQuery);

      // Get session duration
      const sessionQuery = `
        SELECT AVG(EXTRACT(EPOCH FROM (last_activity - created_at))) as avg_session_duration
        FROM user_sessions 
        WHERE created_at >= NOW() - INTERVAL '24 hours'
      `;

      const sessionResult = await client.query(sessionQuery);

      client.release();

      const newUsers30d = parseInt(retentionResult.rows[0]?.new_users_30d || 0);
      const activeUsers30d = parseInt(retentionResult.rows[0]?.active_users_30d || 0);
      const retentionRate = newUsers30d > 0 ? (activeUsers30d / newUsers30d) * 100 : 0;

      const metrics = {
        active_users: parseInt(activeUsersResult.rows[0]?.active_users || 0),
        new_registrations: parseInt(newUsersResult.rows[0]?.new_registrations || 0),
        user_retention: retentionRate,
        avg_session_duration: parseFloat(sessionResult.rows[0]?.avg_session_duration || 0)
      };

      return metrics;

    } catch (error) {
      logger.error('❌ Error collecting user metrics:', error);
      return {};
    }
  }

  /**
   * Collect compliance metrics
   */
  async collectComplianceMetrics() {
    try {
      const client = await this.postgres.connect();

      // Get KYC completion rate
      const kycQuery = `
        SELECT 
          COUNT(*) as total_users,
          SUM(CASE WHEN kyc_status = 'verified' THEN 1 ELSE 0 END) as verified_users
        FROM users
      `;

      const kycResult = await client.query(kycQuery);

      // Get AML alerts
      const amlQuery = `
        SELECT COUNT(*) as aml_alerts
        FROM aml_alerts 
        WHERE created_at >= NOW() - INTERVAL '24 hours'
      `;

      const amlResult = await client.query(amlQuery);

      // Get audit compliance
      const auditQuery = `
        SELECT 
          COUNT(*) as total_audits,
          SUM(CASE WHEN status = 'compliant' THEN 1 ELSE 0 END) as compliant_audits
        FROM audit_logs 
        WHERE created_at >= NOW() - INTERVAL '7 days'
      `;

      const auditResult = await client.query(auditQuery);

      client.release();

      const totalUsers = parseInt(kycResult.rows[0]?.total_users || 0);
      const verifiedUsers = parseInt(kycResult.rows[0]?.verified_users || 0);
      const kycCompletionRate = totalUsers > 0 ? (verifiedUsers / totalUsers) * 100 : 0;

      const totalAudits = parseInt(auditResult.rows[0]?.total_audits || 0);
      const compliantAudits = parseInt(auditResult.rows[0]?.compliant_audits || 0);
      const auditCompliance = totalAudits > 0 ? (compliantAudits / totalAudits) * 100 : 0;

      const metrics = {
        kyc_completion_rate: kycCompletionRate,
        aml_alerts: parseInt(amlResult.rows[0]?.aml_alerts || 0),
        audit_compliance: auditCompliance,
        data_retention_compliance: 100 // Placeholder - would be calculated based on actual retention compliance
      };

      return metrics;

    } catch (error) {
      logger.error('❌ Error collecting compliance metrics:', error);
      return {};
    }
  }

  /**
   * Collect revenue metrics
   */
  async collectRevenueMetrics() {
    try {
      const client = await this.postgres.connect();

      // Get total revenue for last 24 hours
      const revenueQuery = `
        SELECT 
          SUM(amount) as total_revenue,
          revenue_source,
          COUNT(*) as transaction_count
        FROM revenue_transactions 
        WHERE created_at >= NOW() - INTERVAL '24 hours'
        GROUP BY revenue_source
      `;

      const revenueResult = await client.query(revenueQuery);

      // Get average revenue per user
      const avgRevenueQuery = `
        SELECT 
          COUNT(DISTINCT user_id) as active_users,
          SUM(amount) as total_revenue
        FROM revenue_transactions 
        WHERE created_at >= NOW() - INTERVAL '24 hours'
      `;

      const avgRevenueResult = await client.query(avgRevenueQuery);

      client.release();

      const totalRevenue = revenueResult.rows.reduce((sum, row) => sum + parseFloat(row.total_revenue || 0), 0);
      const activeUsers = parseInt(avgRevenueResult.rows[0]?.active_users || 0);
      const avgRevenuePerUser = activeUsers > 0 ? totalRevenue / activeUsers : 0;

      const metrics = {
        total_revenue: totalRevenue,
        revenue_by_source: revenueResult.rows,
        avg_revenue_per_user: avgRevenuePerUser,
        revenue_growth: 0, // Would be calculated by comparing with previous period
        churn_revenue_impact: 0 // Would be calculated based on churned users
      };

      return metrics;

    } catch (error) {
      logger.error('❌ Error collecting revenue metrics:', error);
      return {};
    }
  }

  /**
   * Update real-time metrics
   */
  updateRealTimeMetrics(results) {
    this.realTimeMetrics = {
      activeTraders: results.user?.active_users || 0,
      totalVolume24h: results.trading?.volume_24h || 0,
      totalTrades24h: results.trading?.trades_24h || 0,
      totalRevenue24h: results.revenue?.total_revenue || 0,
      activePortfolios: results.portfolio?.active_portfolios || 0,
      systemUptime: process.uptime(),
      lastUpdated: new Date()
    };

    this.emit('realTimeMetrics:updated', this.realTimeMetrics);
  }

  /**
   * Store metrics in database
   */
  async storeMetrics(results) {
    try {
      const client = await this.postgres.connect();

      const timestamp = new Date();

      // Store trading metrics
      if (results.trading) {
        for (const [metricName, value] of Object.entries(results.trading)) {
          if (typeof value === 'number') {
            await client.query(`
              INSERT INTO business_metrics (
                metric_category, metric_name, metric_value, metric_type, 
                aggregation_period, timestamp, metadata
              ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, ['trading', metricName, value, 'gauge', 'hourly', timestamp, {}]);
          }
        }
      }

      // Store portfolio metrics
      if (results.portfolio) {
        for (const [metricName, value] of Object.entries(results.portfolio)) {
          if (typeof value === 'number') {
            await client.query(`
              INSERT INTO business_metrics (
                metric_category, metric_name, metric_value, metric_type, 
                aggregation_period, timestamp, metadata
              ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, ['portfolio', metricName, value, 'gauge', 'hourly', timestamp, {}]);
          }
        }
      }

      // Store user metrics
      if (results.user) {
        for (const [metricName, value] of Object.entries(results.user)) {
          if (typeof value === 'number') {
            await client.query(`
              INSERT INTO business_metrics (
                metric_category, metric_name, metric_value, metric_type, 
                aggregation_period, timestamp, metadata
              ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, ['user', metricName, value, 'gauge', 'hourly', timestamp, {}]);
          }
        }
      }

      // Store compliance metrics
      if (results.compliance) {
        for (const [metricName, value] of Object.entries(results.compliance)) {
          if (typeof value === 'number') {
            await client.query(`
              INSERT INTO business_metrics (
                metric_category, metric_name, metric_value, metric_type, 
                aggregation_period, timestamp, metadata
              ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, ['compliance', metricName, value, 'gauge', 'hourly', timestamp, {}]);
          }
        }
      }

      // Store revenue metrics
      if (results.revenue) {
        for (const [metricName, value] of Object.entries(results.revenue)) {
          if (typeof value === 'number') {
            await client.query(`
              INSERT INTO business_metrics (
                metric_category, metric_name, metric_value, metric_type, 
                aggregation_period, timestamp, metadata
              ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, ['revenue', metricName, value, 'gauge', 'hourly', timestamp, {}]);
          }
        }
      }

      client.release();
    } catch (error) {
      logger.error('❌ Error storing metrics:', error);
    }
  }

  /**
   * Get real-time metrics
   */
  getRealTimeMetrics() {
    return this.realTimeMetrics;
  }

  /**
   * Get historical metrics
   */
  async getHistoricalMetrics(category, timeRange = '24h', aggregation = 'hourly') {
    try {
      const client = await this.postgres.connect();

      const interval = this.getTimeInterval(timeRange);

      const query = `
        SELECT 
          metric_name,
          AVG(metric_value) as avg_value,
          MIN(metric_value) as min_value,
          MAX(metric_value) as max_value,
          COUNT(*) as data_points,
          DATE_TRUNC($1, timestamp) as time_bucket
        FROM business_metrics 
        WHERE metric_category = $2 
        AND timestamp >= NOW() - INTERVAL $3
        GROUP BY metric_name, time_bucket
        ORDER BY time_bucket DESC
      `;

      const result = await client.query(query, [aggregation, category, interval]);
      client.release();

      return result.rows;
    } catch (error) {
      logger.error('❌ Error getting historical metrics:', error);
      return [];
    }
  }

  /**
   * Get business dashboard data
   */
  async getBusinessDashboard() {
    try {
      const dashboard = {
        realTime: this.getRealTimeMetrics(),
        trading: await this.getHistoricalMetrics('trading', '24h'),
        portfolio: await this.getHistoricalMetrics('portfolio', '24h'),
        user: await this.getHistoricalMetrics('user', '24h'),
        compliance: await this.getHistoricalMetrics('compliance', '7d'),
        revenue: await this.getHistoricalMetrics('revenue', '24h'),
        lastUpdated: new Date().toISOString()
      };

      return dashboard;
    } catch (error) {
      logger.error('❌ Error getting business dashboard:', error);
      return null;
    }
  }

  /**
   * Utility methods
   */
  calculateAverage(values) {
    const validValues = values.filter(v => !isNaN(v) && v !== null && v !== undefined);
    return validValues.length > 0 ? validValues.reduce((sum, val) => sum + val, 0) / validValues.length : 0;
  }

  getTimeInterval(timeRange) {
    const intervals = {
      '1h': '1 hour',
      '24h': '24 hours',
      '7d': '7 days',
      '30d': '30 days',
      '90d': '90 days',
      '1y': '1 year'
    };
    return intervals[timeRange] || '24 hours';
  }

  /**
   * Stop metrics collection
   */
  stopMetricsCollection() {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
      logger.info('✅ Business metrics collection stopped');
    }
  }

  /**
   * Shutdown metrics collector
   */
  async shutdown() {
    try {
      this.stopMetricsCollection();

      if (this.postgres) {
        await this.postgres.end();
      }

      if (this.mongodb) {
        await this.mongodb.close();
      }

      logger.info('✅ Business metrics collector shutdown completed');
    } catch (error) {
      logger.error('❌ Error shutting down business metrics collector:', error);
    }
  }
}

module.exports = new BusinessMetricsCollector();
