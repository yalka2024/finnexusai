/**
 * FinAI Nexus - Business Metrics and KPI Dashboard Service
 *
 * Comprehensive business intelligence featuring:
 * - Real-time KPI tracking
 * - Revenue and growth metrics
 * - User engagement analytics
 * - Trading volume and transaction metrics
 * - AI service utilization metrics
 * - Compliance and risk metrics
 * - Predictive analytics and forecasting
 * - Custom dashboard creation
 */

const { v4: uuidv4 } = require('uuid');
const logger = require('../../utils/logger');

class BusinessMetricsService {
  constructor() {
    this.metrics = new Map();
    this.kpis = new Map();
    this.dashboards = new Map();
    this.alerts = new Map();
    this.historicalData = new Map();

    this.initializeKPIs();
    this.initializeDashboards();
    this.startMetricsCollection();

    logger.info('BusinessMetricsService initialized with comprehensive KPI tracking');
  }

  /**
   * Initialize core KPIs
   */
  initializeKPIs() {
    // Revenue KPIs
    this.kpis.set('monthly_recurring_revenue', {
      id: 'monthly_recurring_revenue',
      name: 'Monthly Recurring Revenue (MRR)',
      category: 'revenue',
      unit: 'USD',
      target: 100000,
      currentValue: 0,
      previousValue: 0,
      trend: 'stable',
      priority: 'high',
      calculation: 'sum',
      timeframe: 'monthly'
    });

    this.kpis.set('annual_recurring_revenue', {
      id: 'annual_recurring_revenue',
      name: 'Annual Recurring Revenue (ARR)',
      category: 'revenue',
      unit: 'USD',
      target: 1200000,
      currentValue: 0,
      previousValue: 0,
      trend: 'stable',
      priority: 'high',
      calculation: 'sum',
      timeframe: 'annual'
    });

    this.kpis.set('transaction_fee_revenue', {
      id: 'transaction_fee_revenue',
      name: 'Transaction Fee Revenue',
      category: 'revenue',
      unit: 'USD',
      target: 50000,
      currentValue: 0,
      previousValue: 0,
      trend: 'stable',
      priority: 'medium',
      calculation: 'sum',
      timeframe: 'monthly'
    });

    // User Growth KPIs
    this.kpis.set('total_users', {
      id: 'total_users',
      name: 'Total Registered Users',
      category: 'growth',
      unit: 'count',
      target: 10000,
      currentValue: 0,
      previousValue: 0,
      trend: 'stable',
      priority: 'high',
      calculation: 'count',
      timeframe: 'cumulative'
    });

    this.kpis.set('monthly_active_users', {
      id: 'monthly_active_users',
      name: 'Monthly Active Users (MAU)',
      category: 'growth',
      unit: 'count',
      target: 5000,
      currentValue: 0,
      previousValue: 0,
      trend: 'stable',
      priority: 'high',
      calculation: 'unique_count',
      timeframe: 'monthly'
    });

    this.kpis.set('daily_active_users', {
      id: 'daily_active_users',
      name: 'Daily Active Users (DAU)',
      category: 'growth',
      unit: 'count',
      target: 500,
      currentValue: 0,
      previousValue: 0,
      trend: 'stable',
      priority: 'medium',
      calculation: 'unique_count',
      timeframe: 'daily'
    });

    // Engagement KPIs
    this.kpis.set('user_retention_rate', {
      id: 'user_retention_rate',
      name: 'User Retention Rate (30-day)',
      category: 'engagement',
      unit: 'percentage',
      target: 75,
      currentValue: 0,
      previousValue: 0,
      trend: 'stable',
      priority: 'high',
      calculation: 'percentage',
      timeframe: 'monthly'
    });

    this.kpis.set('session_duration', {
      id: 'session_duration',
      name: 'Average Session Duration',
      category: 'engagement',
      unit: 'minutes',
      target: 15,
      currentValue: 0,
      previousValue: 0,
      trend: 'stable',
      priority: 'medium',
      calculation: 'average',
      timeframe: 'daily'
    });

    // Trading KPIs
    this.kpis.set('trading_volume', {
      id: 'trading_volume',
      name: 'Daily Trading Volume',
      category: 'trading',
      unit: 'USD',
      target: 1000000,
      currentValue: 0,
      previousValue: 0,
      trend: 'stable',
      priority: 'high',
      calculation: 'sum',
      timeframe: 'daily'
    });

    this.kpis.set('total_transactions', {
      id: 'total_transactions',
      name: 'Total Transactions',
      category: 'trading',
      unit: 'count',
      target: 1000,
      currentValue: 0,
      previousValue: 0,
      trend: 'stable',
      priority: 'medium',
      calculation: 'count',
      timeframe: 'daily'
    });

    // AI Service KPIs
    this.kpis.set('ai_api_calls', {
      id: 'ai_api_calls',
      name: 'AI API Calls',
      category: 'ai-services',
      unit: 'count',
      target: 10000,
      currentValue: 0,
      previousValue: 0,
      trend: 'stable',
      priority: 'medium',
      calculation: 'count',
      timeframe: 'daily'
    });

    this.kpis.set('avatar_interactions', {
      id: 'avatar_interactions',
      name: 'Avatar Interactions',
      category: 'ai-services',
      unit: 'count',
      target: 5000,
      currentValue: 0,
      previousValue: 0,
      trend: 'stable',
      priority: 'medium',
      calculation: 'count',
      timeframe: 'daily'
    });

    // Risk and Compliance KPIs
    this.kpis.set('compliance_score', {
      id: 'compliance_score',
      name: 'Compliance Score',
      category: 'risk',
      unit: 'percentage',
      target: 95,
      currentValue: 0,
      previousValue: 0,
      trend: 'stable',
      priority: 'high',
      calculation: 'percentage',
      timeframe: 'daily'
    });

    this.kpis.set('fraud_detection_rate', {
      id: 'fraud_detection_rate',
      name: 'Fraud Detection Rate',
      category: 'risk',
      unit: 'percentage',
      target: 99,
      currentValue: 0,
      previousValue: 0,
      trend: 'stable',
      priority: 'high',
      calculation: 'percentage',
      timeframe: 'daily'
    });
  }

  /**
   * Initialize default dashboards
   */
  initializeDashboards() {
    // Executive Dashboard
    this.dashboards.set('executive', {
      id: 'executive',
      name: 'Executive Dashboard',
      description: 'High-level KPIs for executives and stakeholders',
      widgets: [
        {
          id: 'revenue-summary',
          type: 'metric-card',
          kpis: ['monthly_recurring_revenue', 'annual_recurring_revenue'],
          size: 'large'
        },
        {
          id: 'user-growth',
          type: 'chart',
          kpis: ['total_users', 'monthly_active_users'],
          chartType: 'line',
          timeRange: '6M'
        },
        {
          id: 'trading-volume',
          type: 'chart',
          kpis: ['trading_volume'],
          chartType: 'bar',
          timeRange: '30D'
        },
        {
          id: 'key-metrics',
          type: 'table',
          kpis: ['user_retention_rate', 'compliance_score', 'fraud_detection_rate'],
          size: 'medium'
        }
      ],
      refreshInterval: 300000, // 5 minutes
      accessLevel: 'executive'
    });

    // Operations Dashboard
    this.dashboards.set('operations', {
      id: 'operations',
      name: 'Operations Dashboard',
      description: 'Operational metrics for day-to-day management',
      widgets: [
        {
          id: 'daily-metrics',
          type: 'metric-grid',
          kpis: ['daily_active_users', 'total_transactions', 'ai_api_calls'],
          size: 'large'
        },
        {
          id: 'engagement-trends',
          type: 'chart',
          kpis: ['session_duration', 'avatar_interactions'],
          chartType: 'area',
          timeRange: '7D'
        },
        {
          id: 'system-health',
          type: 'status-board',
          metrics: ['api-uptime', 'response-time', 'error-rate'],
          size: 'medium'
        }
      ],
      refreshInterval: 60000, // 1 minute
      accessLevel: 'operations'
    });

    // Product Dashboard
    this.dashboards.set('product', {
      id: 'product',
      name: 'Product Analytics',
      description: 'Product usage and feature adoption metrics',
      widgets: [
        {
          id: 'feature-usage',
          type: 'heatmap',
          metrics: ['portfolio-views', 'trading-actions', 'ai-consultations'],
          size: 'large'
        },
        {
          id: 'user-journey',
          type: 'funnel',
          steps: ['registration', 'verification', 'first-deposit', 'first-trade'],
          size: 'medium'
        },
        {
          id: 'retention-cohorts',
          type: 'cohort-table',
          kpis: ['user_retention_rate'],
          timeRange: '12M'
        }
      ],
      refreshInterval: 300000, // 5 minutes
      accessLevel: 'product'
    });
  }

  /**
   * Record metric value
   */
  recordMetric(metricName, value, metadata = {}) {
    const timestamp = new Date();
    const metricId = uuidv4();

    const metric = {
      id: metricId,
      name: metricName,
      value,
      timestamp,
      metadata,
      source: metadata.source || 'system'
    };

    // Store current metric
    if (!this.metrics.has(metricName)) {
      this.metrics.set(metricName, []);
    }
    this.metrics.get(metricName).push(metric);

    // Store historical data
    this.storeHistoricalData(metricName, value, timestamp);

    // Update related KPIs
    this.updateKPIs(metricName, value);

    // Check for alerts
    this.checkAlerts(metricName, value);

    logger.info(`📊 Recorded metric: ${metricName} = ${value}`);
    return metric;
  }

  /**
   * Store historical data
   */
  storeHistoricalData(metricName, value, timestamp) {
    if (!this.historicalData.has(metricName)) {
      this.historicalData.set(metricName, []);
    }

    const history = this.historicalData.get(metricName);
    history.push({ value, timestamp });

    // Keep only last 1000 data points per metric
    if (history.length > 1000) {
      history.splice(0, history.length - 1000);
    }
  }

  /**
   * Update KPIs based on metrics
   */
  updateKPIs(metricName, value) {
    // Map metrics to KPIs and update accordingly
    const metricToKPIMapping = {
      'user_registration': 'total_users',
      'user_login': 'daily_active_users',
      'trade_executed': 'trading_volume',
      'transaction_completed': 'total_transactions',
      'ai_request': 'ai_api_calls',
      'avatar_chat': 'avatar_interactions',
      'subscription_payment': 'monthly_recurring_revenue',
      'transaction_fee': 'transaction_fee_revenue'
    };

    const kpiId = metricToKPIMapping[metricName];
    if (kpiId && this.kpis.has(kpiId)) {
      const kpi = this.kpis.get(kpiId);

      // Update KPI value based on calculation type
      switch (kpi.calculation) {
      case 'sum':
        kpi.currentValue += value;
        break;
      case 'count':
        kpi.currentValue++;
        break;
      case 'average':
        // Simplified average calculation
        kpi.currentValue = (kpi.currentValue + value) / 2;
        break;
      case 'max':
        kpi.currentValue = Math.max(kpi.currentValue, value);
        break;
      }

      // Calculate trend
      if (kpi.currentValue > kpi.previousValue) {
        kpi.trend = 'increasing';
      } else if (kpi.currentValue < kpi.previousValue) {
        kpi.trend = 'decreasing';
      } else {
        kpi.trend = 'stable';
      }

      kpi.lastUpdated = new Date();
    }
  }

  /**
   * Check for metric alerts
   */
  checkAlerts(metricName, value) {
    // Check if any KPIs have exceeded thresholds
    for (const [kpiId, kpi] of this.kpis) {
      if (kpi.target && kpi.currentValue) {
        const percentageOfTarget = (kpi.currentValue / kpi.target) * 100;

        if (percentageOfTarget < 50 && kpi.priority === 'high') {
          this.createAlert(kpiId, 'underperforming', {
            message: `${kpi.name} is significantly below target (${percentageOfTarget.toFixed(1)}%)`,
            severity: 'high',
            currentValue: kpi.currentValue,
            target: kpi.target
          });
        } else if (percentageOfTarget > 120) {
          this.createAlert(kpiId, 'overperforming', {
            message: `${kpi.name} is exceeding target (${percentageOfTarget.toFixed(1)}%)`,
            severity: 'info',
            currentValue: kpi.currentValue,
            target: kpi.target
          });
        }
      }
    }
  }

  /**
   * Create alert
   */
  createAlert(kpiId, type, details) {
    const alertId = uuidv4();

    const alert = {
      id: alertId,
      kpiId,
      type,
      details,
      timestamp: new Date(),
      status: 'active',
      acknowledged: false
    };

    this.alerts.set(alertId, alert);

    logger.info(`🚨 Alert created: ${details.message}`);
    return alert;
  }

  /**
   * Get dashboard data
   */
  getDashboardData(dashboardId, timeRange = '24h') {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {
      throw new Error(`Dashboard not found: ${dashboardId}`);
    }

    const dashboardData = {
      ...dashboard,
      widgets: dashboard.widgets.map(widget => ({
        ...widget,
        data: this.getWidgetData(widget, timeRange)
      })),
      lastUpdated: new Date()
    };

    return dashboardData;
  }

  /**
   * Get widget data
   */
  getWidgetData(widget, timeRange) {
    const data = {};

    switch (widget.type) {
    case 'metric-card':
    case 'metric-grid':
      data.metrics = widget.kpis.map(kpiId => {
        const kpi = this.kpis.get(kpiId);
        return kpi ? {
          ...kpi,
          percentageOfTarget: kpi.target ? (kpi.currentValue / kpi.target) * 100 : null
        } : null;
      }).filter(Boolean);
      break;

    case 'chart':
      data.series = widget.kpis.map(kpiId => {
        const history = this.getHistoricalData(kpiId, timeRange);
        return {
          name: this.kpis.get(kpiId)?.name || kpiId,
          data: history
        };
      });
      break;

    case 'table':
      data.rows = widget.kpis.map(kpiId => {
        const kpi = this.kpis.get(kpiId);
        return kpi ? {
          name: kpi.name,
          value: kpi.currentValue,
          unit: kpi.unit,
          trend: kpi.trend,
          target: kpi.target,
          percentageOfTarget: kpi.target ? (kpi.currentValue / kpi.target) * 100 : null
        } : null;
      }).filter(Boolean);
      break;

    default:
      data.placeholder = `Widget type ${widget.type} not implemented`;
    }

    return data;
  }

  /**
   * Get historical data for time range
   */
  getHistoricalData(metricName, timeRange) {
    const history = this.historicalData.get(metricName) || [];
    const now = new Date();
    let cutoffTime;

    switch (timeRange) {
    case '1h':
      cutoffTime = new Date(now - 60 * 60 * 1000);
      break;
    case '24h':
      cutoffTime = new Date(now - 24 * 60 * 60 * 1000);
      break;
    case '7d':
    case '7D':
      cutoffTime = new Date(now - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
    case '30D':
      cutoffTime = new Date(now - 30 * 24 * 60 * 60 * 1000);
      break;
    case '6M':
      cutoffTime = new Date(now - 6 * 30 * 24 * 60 * 60 * 1000);
      break;
    case '12M':
      cutoffTime = new Date(now - 12 * 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      cutoffTime = new Date(now - 24 * 60 * 60 * 1000);
    }

    return history
      .filter(point => point.timestamp >= cutoffTime)
      .map(point => ({
        x: point.timestamp,
        y: point.value
      }));
  }

  /**
   * Start metrics collection
   */
  startMetricsCollection() {
    // Simulate real-time metrics collection
    setInterval(() => {
      this.simulateMetrics();
    }, 60000); // Every minute

    // Calculate KPI summaries every 5 minutes
    setInterval(() => {
      this.calculateKPISummaries();
    }, 300000);
  }

  /**
   * Simulate metrics for demo purposes
   */
  simulateMetrics() {
    // Simulate user activity
    this.recordMetric('user_login', Math.floor(Math.random() * 50));

    // Simulate trading activity
    this.recordMetric('trade_executed', Math.random() * 10000);

    // Simulate AI usage
    this.recordMetric('ai_request', Math.floor(Math.random() * 100));

    // Simulate subscription revenue
    this.recordMetric('subscription_payment', Math.random() * 1000);

    // Simulate transaction fees
    this.recordMetric('transaction_fee', Math.random() * 500);
  }

  /**
   * Calculate KPI summaries
   */
  calculateKPISummaries() {
    for (const [kpiId, kpi] of this.kpis) {
      // Store previous value for trend calculation
      kpi.previousValue = kpi.currentValue;

      // Reset daily/monthly counters as needed
      if (kpi.timeframe === 'daily' && this.isNewDay()) {
        kpi.currentValue = 0;
      }

      if (kpi.timeframe === 'monthly' && this.isNewMonth()) {
        kpi.currentValue = 0;
      }
    }
  }

  /**
   * Check if it's a new day
   */
  isNewDay() {
    // Simplified check - in production, use proper date handling
    return new Date().getHours() === 0 && new Date().getMinutes() === 0;
  }

  /**
   * Check if it's a new month
   */
  isNewMonth() {
    // Simplified check - in production, use proper date handling
    return new Date().getDate() === 1 && new Date().getHours() === 0;
  }

  /**
   * Get KPI summary
   */
  getKPISummary() {
    const summary = {
      totalKPIs: this.kpis.size,
      categories: {},
      trends: {
        increasing: 0,
        decreasing: 0,
        stable: 0
      },
      alerts: {
        active: Array.from(this.alerts.values()).filter(a => a.status === 'active').length,
        high: Array.from(this.alerts.values()).filter(a => a.details.severity === 'high').length
      }
    };

    // Group by category
    for (const kpi of this.kpis.values()) {
      if (!summary.categories[kpi.category]) {
        summary.categories[kpi.category] = 0;
      }
      summary.categories[kpi.category]++;

      // Count trends
      summary.trends[kpi.trend]++;
    }

    return summary;
  }

  /**
   * Get available dashboards
   */
  getAvailableDashboards() {
    return Array.from(this.dashboards.values()).map(dashboard => ({
      id: dashboard.id,
      name: dashboard.name,
      description: dashboard.description,
      accessLevel: dashboard.accessLevel,
      widgetCount: dashboard.widgets.length
    }));
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const summary = this.getKPISummary();

      return {
        status: 'healthy',
        service: 'business-metrics',
        metrics: {
          totalKPIs: summary.totalKPIs,
          totalDashboards: this.dashboards.size,
          activeAlerts: summary.alerts.active,
          metricsCollected: this.metrics.size
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        service: 'business-metrics',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = BusinessMetricsService;
