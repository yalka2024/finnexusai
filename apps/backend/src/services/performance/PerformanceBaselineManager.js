/**
 * Performance Baseline Manager
 * Manages performance baselines, SLOs, and performance monitoring for FinNexusAI
 */

const config = require('../../config');

const { Counter, Gauge, Histogram } = require('prom-client');
const logger = require('../../utils/logger');

// Prometheus Metrics
const performanceBaselineCounter = new Counter({
  name: 'performance_baselines_total',
  help: 'Total number of performance baselines',
  labelNames: ['service', 'metric_type', 'status']
});

const performanceSLOGauge = new Gauge({
  name: 'performance_slo_status',
  help: 'Performance SLO status (1=meeting, 0=violating)',
  labelNames: ['service', 'slo_name']
});

const performanceMetricGauge = new Gauge({
  name: 'performance_metric_value',
  help: 'Current performance metric values',
  labelNames: ['service', 'metric_type', 'instance']
});

const performanceSLIHistogram = new Histogram({
  name: 'performance_sli_duration_seconds',
  help: 'Performance SLI measurement duration in seconds',
  labelNames: ['service', 'sli_type']
});

class PerformanceBaselineManager {
  constructor() {
    this.performanceMetrics = {
      'response_time': {
        name: 'Response Time',
        description: 'API response time in milliseconds',
        unit: 'ms',
        aggregation: 'percentile',
        percentiles: [50, 95, 99],
        baselinePeriod: 7, // days
        alertThresholds: {
          p50: 200,
          p95: 500,
          p99: 1000
        }
      },
      'throughput': {
        name: 'Throughput',
        description: 'Requests per second',
        unit: 'rps',
        aggregation: 'average',
        baselinePeriod: 7,
        alertThresholds: {
          min: 100,
          max: 10000
        }
      },
      'error_rate': {
        name: 'Error Rate',
        description: 'Percentage of failed requests',
        unit: '%',
        aggregation: 'average',
        baselinePeriod: 7,
        alertThresholds: {
          max: 1.0
        }
      },
      'availability': {
        name: 'Availability',
        description: 'Service availability percentage',
        unit: '%',
        aggregation: 'average',
        baselinePeriod: 30,
        alertThresholds: {
          min: 99.9
        }
      },
      'cpu_utilization': {
        name: 'CPU Utilization',
        description: 'CPU usage percentage',
        unit: '%',
        aggregation: 'average',
        baselinePeriod: 7,
        alertThresholds: {
          max: 80
        }
      },
      'memory_utilization': {
        name: 'Memory Utilization',
        description: 'Memory usage percentage',
        unit: '%',
        aggregation: 'average',
        baselinePeriod: 7,
        alertThresholds: {
          max: 85
        }
      },
      'database_connections': {
        name: 'Database Connections',
        description: 'Active database connections',
        unit: 'count',
        aggregation: 'max',
        baselinePeriod: 7,
        alertThresholds: {
          max: 80
        }
      },
      'queue_depth': {
        name: 'Queue Depth',
        description: 'Message queue depth',
        unit: 'count',
        aggregation: 'max',
        baselinePeriod: 7,
        alertThresholds: {
          max: 1000
        }
      },
      'cache_hit_rate': {
        name: 'Cache Hit Rate',
        description: 'Cache hit percentage',
        unit: '%',
        aggregation: 'average',
        baselinePeriod: 7,
        alertThresholds: {
          min: 90
        }
      },
      'database_query_time': {
        name: 'Database Query Time',
        description: 'Average database query execution time',
        unit: 'ms',
        aggregation: 'percentile',
        percentiles: [50, 95, 99],
        baselinePeriod: 7,
        alertThresholds: {
          p50: 50,
          p95: 200,
          p99: 500
        }
      }
    };

    this.sloDefinitions = {
      'api_response_time': {
        name: 'API Response Time SLO',
        description: 'API response time service level objective',
        service: 'api',
        metric: 'response_time',
        target: 99.9, // 99.9% of requests under 500ms
        window: 30, // 30 days
        threshold: 500, // ms
        severity: 'critical'
      },
      'api_availability': {
        name: 'API Availability SLO',
        description: 'API availability service level objective',
        service: 'api',
        metric: 'availability',
        target: 99.99, // 99.99% availability
        window: 30, // 30 days
        threshold: 99.99, // %
        severity: 'critical'
      },
      'api_error_rate': {
        name: 'API Error Rate SLO',
        description: 'API error rate service level objective',
        service: 'api',
        metric: 'error_rate',
        target: 99.5, // 99.5% success rate
        window: 30, // 30 days
        threshold: 0.5, // %
        severity: 'high'
      },
      'database_performance': {
        name: 'Database Performance SLO',
        description: 'Database performance service level objective',
        service: 'database',
        metric: 'database_query_time',
        target: 99.0, // 99% of queries under 200ms
        window: 30, // 30 days
        threshold: 200, // ms
        severity: 'high'
      },
      'system_resources': {
        name: 'System Resources SLO',
        description: 'System resource utilization service level objective',
        service: 'system',
        metric: 'cpu_utilization',
        target: 95.0, // 95% of time under 80% CPU
        window: 30, // 30 days
        threshold: 80, // %
        severity: 'medium'
      },
      'cache_performance': {
        name: 'Cache Performance SLO',
        description: 'Cache performance service level objective',
        service: 'cache',
        metric: 'cache_hit_rate',
        target: 95.0, // 95% cache hit rate
        window: 30, // 30 days
        threshold: 95, // %
        severity: 'medium'
      }
    };

    this.services = {
      'api': {
        name: 'API Service',
        description: 'Main API service',
        endpoints: ['/api/v1/auth', '/api/v1/users', '/api/v1/trading'],
        criticality: 'critical'
      },
      'database': {
        name: 'Database Service',
        description: 'Database service',
        endpoints: ['postgresql', 'mongodb'],
        criticality: 'critical'
      },
      'cache': {
        name: 'Cache Service',
        description: 'Redis cache service',
        endpoints: ['redis'],
        criticality: 'high'
      },
      'queue': {
        name: 'Queue Service',
        description: 'Message queue service',
        endpoints: ['rabbitmq'],
        criticality: 'high'
      },
      'monitoring': {
        name: 'Monitoring Service',
        description: 'Monitoring and observability service',
        endpoints: ['prometheus', 'grafana'],
        criticality: 'medium'
      }
    };

    this.baselines = new Map();
    this.sloStatus = new Map();
    this.currentMetrics = new Map();
    this.isInitialized = false;
  }

  /**
   * Initialize performance baseline manager
   */
  async initialize() {
    try {
      logger.info('🔄 Initializing performance baseline manager...');

      // Load existing baseline data
      await this.loadBaselineData();

      // Initialize baselines for all services
      await this.initializeBaselines();

      // Start performance monitoring
      this.startPerformanceMonitoring();

      // Initialize metrics
      this.initializeMetrics();

      this.isInitialized = true;
      logger.info('✅ Performance baseline manager initialized successfully');

      return {
        success: true,
        message: 'Performance baseline manager initialized successfully',
        metrics: Object.keys(this.performanceMetrics).length,
        slos: Object.keys(this.sloDefinitions).length,
        services: Object.keys(this.services).length
      };

    } catch (error) {
      logger.error('❌ Failed to initialize performance baseline manager:', error);
      throw new Error(`Performance baseline manager initialization failed: ${error.message}`);
    }
  }

  /**
   * Create performance baseline
   */
  async createBaseline(baselineData) {
    try {
      const baselineId = this.generateBaselineId();
      const timestamp = new Date().toISOString();

      // Validate baseline data
      const validation = this.validateBaselineData(baselineData);
      if (!validation.isValid) {
        throw new Error(`Invalid baseline data: ${validation.errors.join(', ')}`);
      }

      const baseline = {
        id: baselineId,
        service: baselineData.service,
        metric: baselineData.metric,
        baselineType: baselineData.baselineType || 'statistical',
        period: baselineData.period || '7d',
        dataPoints: baselineData.dataPoints || [],
        statistics: {
          mean: 0,
          median: 0,
          p95: 0,
          p99: 0,
          min: 0,
          max: 0,
          stdDev: 0
        },
        thresholds: baselineData.thresholds || {},
        createdAt: timestamp,
        updatedAt: timestamp,
        createdBy: baselineData.createdBy || 'system'
      };

      // Calculate statistics if data points provided
      if (baseline.dataPoints.length > 0) {
        baseline.statistics = this.calculateStatistics(baseline.dataPoints);
      }

      // Store baseline
      this.baselines.set(baselineId, baseline);

      // Update metrics
      performanceBaselineCounter.labels(baseline.service, baseline.metric, 'created').inc();

      // Log baseline creation
      logger.info(`📊 Performance baseline created: ${baselineId}`, {
        baselineId: baselineId,
        service: baseline.service,
        metric: baseline.metric,
        baselineType: baseline.baselineType,
        dataPoints: baseline.dataPoints.length
      });

      logger.info(`📊 Performance baseline created: ${baselineId}`);

      return {
        success: true,
        baselineId: baselineId,
        baseline: baseline
      };

    } catch (error) {
      logger.error('❌ Error creating performance baseline:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update performance baseline
   */
  async updateBaseline(baselineId, updateData) {
    try {
      const baseline = this.baselines.get(baselineId);
      if (!baseline) {
        throw new Error(`Baseline ${baselineId} not found`);
      }

      // Update baseline data
      if (updateData.dataPoints) {
        baseline.dataPoints = updateData.dataPoints;
        baseline.statistics = this.calculateStatistics(baseline.dataPoints);
      }

      if (updateData.thresholds) {
        baseline.thresholds = { ...baseline.thresholds, ...updateData.thresholds };
      }

      baseline.updatedAt = new Date().toISOString();
      baseline.updatedBy = updateData.updatedBy || 'system';

      // Update metrics
      performanceBaselineCounter.labels(baseline.service, baseline.metric, 'updated').inc();

      // Log baseline update
      logger.info(`📊 Performance baseline updated: ${baselineId}`, {
        baselineId: baselineId,
        service: baseline.service,
        metric: baseline.metric,
        dataPoints: baseline.dataPoints.length
      });

      logger.info(`📊 Performance baseline updated: ${baselineId}`);

      return {
        success: true,
        baseline: baseline
      };

    } catch (error) {
      logger.error('❌ Error updating performance baseline:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Evaluate SLO compliance
   */
  async evaluateSLOCompliance(sloId, metricData) {
    try {
      const slo = this.sloDefinitions[sloId];
      if (!slo) {
        throw new Error(`SLO ${sloId} not found`);
      }

      const evaluation = {
        sloId: sloId,
        sloName: slo.name,
        service: slo.service,
        metric: slo.metric,
        target: slo.target,
        threshold: slo.threshold,
        currentValue: 0,
        compliance: false,
        compliancePercentage: 0,
        evaluationTime: new Date().toISOString(),
        violations: [],
        recommendations: []
      };

      // Calculate current value based on metric data
      evaluation.currentValue = this.calculateMetricValue(slo.metric, metricData);

      // Evaluate compliance
      evaluation.compliance = this.evaluateCompliance(slo, evaluation.currentValue);
      evaluation.compliancePercentage = this.calculateCompliancePercentage(slo, metricData);

      // Identify violations
      evaluation.violations = this.identifyViolations(slo, metricData);

      // Generate recommendations
      evaluation.recommendations = this.generateRecommendations(slo, evaluation.violations);

      // Update SLO status
      this.sloStatus.set(sloId, evaluation);

      // Update metrics
      const isCompliant = evaluation.compliance ? 1 : 0;
      performanceSLOGauge.labels(slo.service, sloId).set(isCompliant);

      // Log SLO evaluation
      logger.info(`📈 SLO compliance evaluated: ${sloId}`, {
        sloId: sloId,
        service: slo.service,
        compliance: evaluation.compliance,
        compliancePercentage: evaluation.compliancePercentage,
        currentValue: evaluation.currentValue
      });

      logger.info(`📈 SLO compliance evaluated: ${sloId} - ${evaluation.compliance ? 'MEETING' : 'VIOLATING'}`);

      return {
        success: true,
        evaluation: evaluation
      };

    } catch (error) {
      logger.error('❌ Error evaluating SLO compliance:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Record performance metric
   */
  async recordPerformanceMetric(metricData) {
    try {
      const timestamp = new Date().toISOString();
      const metricRecord = {
        service: metricData.service,
        metric: metricData.metric,
        value: metricData.value,
        timestamp: timestamp,
        instance: metricData.instance || 'default',
        tags: metricData.tags || {}
      };

      // Store current metric value
      const metricKey = `${metricData.service}:${metricData.metric}`;
      this.currentMetrics.set(metricKey, metricRecord);

      // Update Prometheus metrics
      performanceMetricGauge.labels(
        metricData.service,
        metricData.metric,
        metricRecord.instance
      ).set(metricData.value);

      // Evaluate SLOs for this metric
      await this.evaluateRelevantSLOs(metricData.service, metricData.metric, metricData.value);

      // Log metric recording
      logger.debug(`📊 Performance metric recorded: ${metricKey}`, {
        service: metricData.service,
        metric: metricData.metric,
        value: metricData.value,
        timestamp: timestamp
      });

      return {
        success: true,
        metricRecord: metricRecord
      };

    } catch (error) {
      logger.error('❌ Error recording performance metric:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get performance baseline
   */
  getBaseline(baselineId) {
    const baseline = this.baselines.get(baselineId);
    if (!baseline) {
      return {
        success: false,
        error: `Baseline ${baselineId} not found`
      };
    }

    return {
      success: true,
      baseline: baseline
    };
  }

  /**
   * List performance baselines
   */
  listBaselines(filters = {}) {
    try {
      let baselines = Array.from(this.baselines.values());

      // Apply filters
      if (filters.service) {
        baselines = baselines.filter(baseline => baseline.service === filters.service);
      }

      if (filters.metric) {
        baselines = baselines.filter(baseline => baseline.metric === filters.metric);
      }

      if (filters.baselineType) {
        baselines = baselines.filter(baseline => baseline.baselineType === filters.baselineType);
      }

      // Sort by creation date (newest first)
      baselines.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      // Apply pagination
      const limit = filters.limit || 50;
      const offset = filters.offset || 0;
      const paginatedBaselines = baselines.slice(offset, offset + limit);

      return {
        success: true,
        baselines: paginatedBaselines,
        total: baselines.length,
        limit: limit,
        offset: offset
      };

    } catch (error) {
      logger.error('❌ Error listing performance baselines:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get performance statistics
   */
  getPerformanceStatistics() {
    try {
      const baselines = Array.from(this.baselines.values());
      const sloStatuses = Array.from(this.sloStatus.values());

      const stats = {
        totalBaselines: baselines.length,
        totalSLOs: Object.keys(this.sloDefinitions).length,
        sloCompliance: {
          meeting: 0,
          violating: 0,
          unknown: 0
        },
        byService: {},
        byMetric: {},
        averageCompliance: 0
      };

      // Calculate SLO compliance statistics
      sloStatuses.forEach(status => {
        if (status.compliance) {
          stats.sloCompliance.meeting++;
        } else {
          stats.sloCompliance.violating++;
        }
      });

      stats.sloCompliance.unknown = stats.totalSLOs - sloStatuses.length;

      // Calculate average compliance
      if (sloStatuses.length > 0) {
        stats.averageCompliance = sloStatuses.reduce((sum, status) =>
          sum + status.compliancePercentage, 0) / sloStatuses.length;
      }

      // Calculate statistics by service
      baselines.forEach(baseline => {
        if (!stats.byService[baseline.service]) {
          stats.byService[baseline.service] = 0;
        }
        stats.byService[baseline.service]++;
      });

      // Calculate statistics by metric
      baselines.forEach(baseline => {
        if (!stats.byMetric[baseline.metric]) {
          stats.byMetric[baseline.metric] = 0;
        }
        stats.byMetric[baseline.metric]++;
      });

      return {
        success: true,
        statistics: stats,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('❌ Error getting performance statistics:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Calculate statistics from data points
   */
  calculateStatistics(dataPoints) {
    if (dataPoints.length === 0) {
      return {
        mean: 0,
        median: 0,
        p95: 0,
        p99: 0,
        min: 0,
        max: 0,
        stdDev: 0
      };
    }

    const sorted = dataPoints.slice().sort((a, b) => a - b);
    const n = sorted.length;

    const statistics = {
      mean: dataPoints.reduce((sum, val) => sum + val, 0) / n,
      median: n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)],
      p95: sorted[Math.floor(n * 0.95)],
      p99: sorted[Math.floor(n * 0.99)],
      min: sorted[0],
      max: sorted[n - 1],
      stdDev: 0
    };

    // Calculate standard deviation
    const variance = dataPoints.reduce((sum, val) => sum + Math.pow(val - statistics.mean, 2), 0) / n;
    statistics.stdDev = Math.sqrt(variance);

    return statistics;
  }

  /**
   * Calculate metric value
   */
  calculateMetricValue(metric, metricData) {
    const metricConfig = this.performanceMetrics[metric];
    if (!metricConfig) {
      return 0;
    }

    switch (metricConfig.aggregation) {
    case 'average':
      return metricData.reduce((sum, val) => sum + val, 0) / metricData.length;
    case 'max':
      return Math.max(...metricData);
    case 'min':
      return Math.min(...metricData);
    case 'percentile':
      const sorted = metricData.slice().sort((a, b) => a - b);
      const p95Index = Math.floor(sorted.length * 0.95);
      return sorted[p95Index];
    default:
      return metricData[metricData.length - 1] || 0;
    }
  }

  /**
   * Evaluate compliance
   */
  evaluateCompliance(slo, currentValue) {
    switch (slo.metric) {
    case 'response_time':
    case 'database_query_time':
      return currentValue <= slo.threshold;
    case 'error_rate':
      return currentValue <= slo.threshold;
    case 'availability':
    case 'cache_hit_rate':
      return currentValue >= slo.threshold;
    case 'cpu_utilization':
    case 'memory_utilization':
      return currentValue <= slo.threshold;
    default:
      return true;
    }
  }

  /**
   * Calculate compliance percentage
   */
  calculateCompliancePercentage(slo, metricData) {
    if (metricData.length === 0) {
      return 0;
    }

    const compliantCount = metricData.filter(value =>
      this.evaluateCompliance(slo, value)
    ).length;

    return (compliantCount / metricData.length) * 100;
  }

  /**
   * Identify violations
   */
  identifyViolations(slo, metricData) {
    const violations = [];
    const threshold = slo.threshold;

    metricData.forEach((value, index) => {
      if (!this.evaluateCompliance(slo, value)) {
        violations.push({
          index: index,
          value: value,
          threshold: threshold,
          severity: slo.severity
        });
      }
    });

    return violations;
  }

  /**
   * Generate recommendations
   */
  generateRecommendations(slo, violations) {
    const recommendations = [];

    if (violations.length > 0) {
      switch (slo.metric) {
      case 'response_time':
        recommendations.push('Optimize API endpoints and database queries');
        recommendations.push('Consider implementing caching strategies');
        break;
      case 'error_rate':
        recommendations.push('Review error handling and retry mechanisms');
        recommendations.push('Investigate root causes of errors');
        break;
      case 'availability':
        recommendations.push('Implement redundancy and failover mechanisms');
        recommendations.push('Review monitoring and alerting systems');
        break;
      case 'cpu_utilization':
        recommendations.push('Optimize CPU-intensive operations');
        recommendations.push('Consider horizontal scaling');
        break;
      case 'memory_utilization':
        recommendations.push('Review memory usage and potential leaks');
        recommendations.push('Optimize memory allocation');
        break;
      default:
        recommendations.push('Review system performance and optimization opportunities');
      }
    }

    return recommendations;
  }

  /**
   * Evaluate relevant SLOs
   */
  async evaluateRelevantSLOs(service, metric, value) {
    try {
      for (const [sloId, slo] of Object.entries(this.sloDefinitions)) {
        if (slo.service === service && slo.metric === metric) {
          await this.evaluateSLOCompliance(sloId, [value]);
        }
      }
    } catch (error) {
      logger.error('❌ Error evaluating relevant SLOs:', error);
    }
  }

  /**
   * Validate baseline data
   */
  validateBaselineData(data) {
    const errors = [];

    if (!data.service || !this.services[data.service]) {
      errors.push('Valid service is required');
    }

    if (!data.metric || !this.performanceMetrics[data.metric]) {
      errors.push('Valid metric is required');
    }

    if (data.dataPoints && !Array.isArray(data.dataPoints)) {
      errors.push('Data points must be an array');
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Initialize baselines for all services
   */
  async initializeBaselines() {
    try {
      for (const [serviceId, service] of Object.entries(this.services)) {
        for (const [metricId, metric] of Object.entries(this.performanceMetrics)) {
          const baselineId = `${serviceId}-${metricId}`;

          if (!this.baselines.has(baselineId)) {
            await this.createBaseline({
              service: serviceId,
              metric: metricId,
              baselineType: 'statistical',
              period: `${metric.baselinePeriod}d`,
              dataPoints: [],
              thresholds: metric.alertThresholds,
              createdBy: 'system'
            });
          }
        }
      }

      logger.info('✅ Performance baselines initialized for all services');

    } catch (error) {
      logger.error('❌ Error initializing baselines:', error);
    }
  }

  /**
   * Generate baseline ID
   */
  generateBaselineId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `BASELINE-${timestamp}-${random}`.toUpperCase();
  }

  /**
   * Start performance monitoring
   */
  startPerformanceMonitoring() {
    // Monitor performance every 5 minutes
    setInterval(async() => {
      try {
        await this.monitorPerformance();
      } catch (error) {
        logger.error('❌ Error in performance monitoring:', error);
      }
    }, 300000); // 5 minutes

    logger.info('✅ Performance monitoring started');
  }

  /**
   * Monitor performance
   */
  async monitorPerformance() {
    try {
      // In a real implementation, this would collect actual metrics
      logger.info('📊 Monitoring performance metrics...');

      // Simulate metric collection and SLO evaluation
      for (const [serviceId, service] of Object.entries(this.services)) {
        for (const [metricId, metric] of Object.entries(this.performanceMetrics)) {
          // Simulate metric value
          const simulatedValue = Math.random() * 100;

          await this.recordPerformanceMetric({
            service: serviceId,
            metric: metricId,
            value: simulatedValue,
            instance: 'default'
          });
        }
      }

    } catch (error) {
      logger.error('❌ Error monitoring performance:', error);
    }
  }

  /**
   * Load baseline data
   */
  async loadBaselineData() {
    try {
      // In a real implementation, this would load from persistent storage
      logger.info('⚠️ No existing baseline data found, starting fresh');
      this.baselines = new Map();
      this.sloStatus = new Map();
      this.currentMetrics = new Map();
    } catch (error) {
      logger.error('❌ Error loading baseline data:', error);
    }
  }

  /**
   * Initialize metrics
   */
  initializeMetrics() {
    // Initialize SLO gauges
    for (const [sloId, slo] of Object.entries(this.sloDefinitions)) {
      performanceSLOGauge.labels(slo.service, sloId).set(0);
    }

    logger.info('✅ Performance baseline metrics initialized');
  }

  /**
   * Get performance baseline status
   */
  getPerformanceBaselineStatus() {
    return {
      isInitialized: this.isInitialized,
      totalBaselines: this.baselines.size,
      totalSLOs: Object.keys(this.sloDefinitions).length,
      sloStatuses: this.sloStatus.size,
      currentMetrics: this.currentMetrics.size,
      services: Object.keys(this.services).length,
      metrics: Object.keys(this.performanceMetrics).length
    };
  }

  /**
   * Shutdown performance baseline manager
   */
  async shutdown() {
    try {
      logger.info('✅ Performance baseline manager shutdown completed');
    } catch (error) {
      logger.error('❌ Error shutting down performance baseline manager:', error);
    }
  }
}

module.exports = new PerformanceBaselineManager();
