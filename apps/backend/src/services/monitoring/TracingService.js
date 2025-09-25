/**
 * Distributed Tracing Service
 * OpenTelemetry integration for comprehensive request tracing
 */

const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
const { JaegerExporter } = require('@opentelemetry/exporter-jaeger');
const { ZipkinExporter } = require('@opentelemetry/exporter-zipkin');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-otlp-http');
const { BatchSpanProcessor } = require('@opentelemetry/sdk-trace-base');
const { trace, context, SpanStatusCode, SpanKind } = require('@opentelemetry/api');

class TracingService {
  constructor() {
    this.tracer = null;
    this.sdk = null;
    this.isInitialized = false;
    this.config = {
      serviceName: process.env.SERVICE_NAME || 'finnexus-backend',
      serviceVersion: process.env.SERVICE_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      jaegerEndpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
      zipkinEndpoint: process.env.ZIPKIN_ENDPOINT || 'http://localhost:9411/api/v2/spans',
      otlpEndpoint: process.env.OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
      samplingRatio: parseFloat(process.env.TRACING_SAMPLING_RATIO || '1.0'),
      enableAutoInstrumentation: process.env.ENABLE_AUTO_INSTRUMENTATION !== 'false'
    };
  }

  /**
   * Initialize the tracing service
   */
  async initialize() {
    try {
      if (this.isInitialized) {
        logger.info('⚠️ Tracing service already initialized');
        return;
      }

      logger.info('🔄 Initializing distributed tracing...');

      // Create resource
      const resource = new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: this.config.serviceName,
        [SemanticResourceAttributes.SERVICE_VERSION]: this.config.serviceVersion,
        [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: this.config.environment,
        [SemanticResourceAttributes.SERVICE_INSTANCE_ID]: this.generateInstanceId()
      });

      // Create exporters based on configuration
      const exporters = this.createExporters();

      // Create span processors
      const spanProcessors = exporters.map(exporter =>
        new BatchSpanProcessor(exporter, {
          maxExportBatchSize: 512,
          exportTimeoutMillis: 30000,
          scheduledDelayMillis: 5000
        })
      );

      // Configure SDK
      const sdkConfig = {
        resource,
        spanProcessors,
        instrumentations: this.config.enableAutoInstrumentation ? [
          getNodeAutoInstrumentations({
            '@opentelemetry/instrumentation-fs': {
              enabled: false // Disable file system instrumentation to reduce noise
            },
            '@opentelemetry/instrumentation-http': {
              enabled: true,
              requestHook: (span, request) => {
                span.setAttributes({
                  'http.request.header.user-agent': request.headers['user-agent'],
                  'http.request.header.x-forwarded-for': request.headers['x-forwarded-for'],
                  'http.request.header.x-real-ip': request.headers['x-real-ip']
                });
              },
              responseHook: (span, response) => {
                span.setAttributes({
                  'http.response.header.content-type': response.headers['content-type'],
                  'http.response.header.content-length': response.headers['content-length']
                });
              }
            },
            '@opentelemetry/instrumentation-express': {
              enabled: true,
              requestHook: (span, info) => {
                span.setAttributes({
                  'express.route': info.route?.path || info.request.url,
                  'express.method': info.request.method
                });
              }
            },
            '@opentelemetry/instrumentation-pg': {
              enabled: true,
              enhancedDatabaseReporting: true
            },
            '@opentelemetry/instrumentation-redis': {
              enabled: true
            },
            '@opentelemetry/instrumentation-mongodb': {
              enabled: true
            }
          })
        ] : []
      };

      // Initialize SDK
      this.sdk = new NodeSDK(sdkConfig);
      await this.sdk.start();

      // Get tracer
      this.tracer = trace.getTracer(this.config.serviceName, this.config.serviceVersion);

      this.isInitialized = true;
      logger.info('✅ Distributed tracing initialized successfully');

      return {
        success: true,
        message: 'Distributed tracing initialized successfully',
        config: {
          serviceName: this.config.serviceName,
          serviceVersion: this.config.serviceVersion,
          environment: this.config.environment,
          exporters: exporters.length
        }
      };
    } catch (error) {
      logger.error('❌ Failed to initialize tracing service:', error);
      throw new Error(`Tracing initialization failed: ${error.message}`);
    }
  }

  /**
   * Create exporters based on configuration
   */
  createExporters() {
    const exporters = [];

    // Jaeger exporter
    if (process.env.JAEGER_ENDPOINT) {
      try {
        const jaegerExporter = new JaegerExporter({
          endpoint: this.config.jaegerEndpoint,
          maxPacketSize: 65000
        });
        exporters.push(jaegerExporter);
        logger.info('✅ Jaeger exporter configured');
      } catch (error) {
        logger.warn('⚠️ Failed to configure Jaeger exporter:', error.message);
      }
    }

    // Zipkin exporter
    if (process.env.ZIPKIN_ENDPOINT) {
      try {
        const zipkinExporter = new ZipkinExporter({
          url: this.config.zipkinEndpoint,
          headers: {
            'Content-Type': 'application/json'
          }
        });
        exporters.push(zipkinExporter);
        logger.info('✅ Zipkin exporter configured');
      } catch (error) {
        logger.warn('⚠️ Failed to configure Zipkin exporter:', error.message);
      }
    }

    // OTLP exporter
    if (process.env.OTLP_ENDPOINT) {
      try {
        const otlpExporter = new OTLPTraceExporter({
          url: this.config.otlpEndpoint,
          headers: {}
        });
        exporters.push(otlpExporter);
        logger.info('✅ OTLP exporter configured');
      } catch (error) {
        logger.warn('⚠️ Failed to configure OTLP exporter:', error.message);
      }
    }

    if (exporters.length === 0) {
      logger.warn('⚠️ No tracing exporters configured');
    }

    return exporters;
  }

  /**
   * Create a custom span
   */
  createSpan(name, options = {}) {
    if (!this.isInitialized) {
      logger.warn('⚠️ Tracing service not initialized');
      return null;
    }

    const spanOptions = {
      kind: options.kind || SpanKind.INTERNAL,
      attributes: {
        'service.name': this.config.serviceName,
        'service.version': this.config.serviceVersion,
        'service.environment': this.config.environment,
        ...options.attributes
      }
    };

    return this.tracer.startSpan(name, spanOptions);
  }

  /**
   * Execute function with tracing
   */
  async executeWithTracing(name, fn, options = {}) {
    if (!this.isInitialized) {
      return await fn();
    }

    const span = this.createSpan(name, options);
    if (!span) {
      return await fn();
    }

    try {
      const result = await context.with(trace.setSpan(context.active(), span), fn);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message
      });
      span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Add attributes to current span
   */
  addAttributes(attributes) {
    if (!this.isInitialized) return;

    const activeSpan = trace.getActiveSpan();
    if (activeSpan) {
      activeSpan.setAttributes(attributes);
    }
  }

  /**
   * Add events to current span
   */
  addEvent(name, attributes = {}) {
    if (!this.isInitialized) return;

    const activeSpan = trace.getActiveSpan();
    if (activeSpan) {
      activeSpan.addEvent(name, attributes);
    }
  }

  /**
   * Create database operation span
   */
  createDatabaseSpan(operation, table, query = null) {
    const span = this.createSpan(`db.${operation}`, {
      kind: SpanKind.CLIENT,
      attributes: {
        'db.system': 'postgresql',
        'db.operation': operation,
        'db.sql.table': table,
        'db.statement': query || `SELECT * FROM ${table}`,
        'db.connection_string': 'postgresql://***@localhost:5432/finnexus'
      }
    });

    return span;
  }

  /**
   * Create HTTP request span
   */
  createHttpSpan(method, url, statusCode = null) {
    const span = this.createSpan(`http.${method.toLowerCase()}`, {
      kind: SpanKind.CLIENT,
      attributes: {
        'http.method': method,
        'http.url': url,
        'http.scheme': url.startsWith('https') ? 'https' : 'http',
        'http.status_code': statusCode
      }
    });

    return span;
  }

  /**
   * Create authentication span
   */
  createAuthSpan(operation, userId = null) {
    const span = this.createSpan(`auth.${operation}`, {
      kind: SpanKind.INTERNAL,
      attributes: {
        'auth.operation': operation,
        'auth.user.id': userId,
        'auth.service': 'finnexus-auth'
      }
    });

    return span;
  }

  /**
   * Create trading operation span
   */
  createTradingSpan(operation, symbol = null, amount = null) {
    const span = this.createSpan(`trading.${operation}`, {
      kind: SpanKind.INTERNAL,
      attributes: {
        'trading.operation': operation,
        'trading.symbol': symbol,
        'trading.amount': amount,
        'trading.service': 'finnexus-trading'
      }
    });

    return span;
  }

  /**
   * Create portfolio operation span
   */
  createPortfolioSpan(operation, userId = null) {
    const span = this.createSpan(`portfolio.${operation}`, {
      kind: SpanKind.INTERNAL,
      attributes: {
        'portfolio.operation': operation,
        'portfolio.user.id': userId,
        'portfolio.service': 'finnexus-portfolio'
      }
    });

    return span;
  }

  /**
   * Create compliance operation span
   */
  createComplianceSpan(operation, checkType = null) {
    const span = this.createSpan(`compliance.${operation}`, {
      kind: SpanKind.INTERNAL,
      attributes: {
        'compliance.operation': operation,
        'compliance.check.type': checkType,
        'compliance.service': 'finnexus-compliance'
      }
    });

    return span;
  }

  /**
   * Create external API call span
   */
  createExternalApiSpan(service, endpoint, method = 'GET') {
    const span = this.createSpan(`external.${service}`, {
      kind: SpanKind.CLIENT,
      attributes: {
        'external.service': service,
        'external.endpoint': endpoint,
        'external.method': method,
        'external.type': 'api'
      }
    });

    return span;
  }

  /**
   * Create blockchain operation span
   */
  createBlockchainSpan(operation, network = null, txHash = null) {
    const span = this.createSpan(`blockchain.${operation}`, {
      kind: SpanKind.CLIENT,
      attributes: {
        'blockchain.operation': operation,
        'blockchain.network': network,
        'blockchain.transaction.hash': txHash,
        'blockchain.service': 'finnexus-blockchain'
      }
    });

    return span;
  }

  /**
   * Create error span
   */
  createErrorSpan(error, context = {}) {
    const span = this.createSpan('error', {
      kind: SpanKind.INTERNAL,
      attributes: {
        'error.type': error.constructor.name,
        'error.message': error.message,
        'error.stack': error.stack,
        ...context
      }
    });

    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message
    });

    span.recordException(error);
    span.end();

    return span;
  }

  /**
   * Get tracing status
   */
  getStatus() {
    return {
      success: true,
      initialized: this.isInitialized,
      config: {
        serviceName: this.config.serviceName,
        serviceVersion: this.config.serviceVersion,
        environment: this.config.environment,
        samplingRatio: this.config.samplingRatio,
        autoInstrumentation: this.config.enableAutoInstrumentation
      },
      exporters: {
        jaeger: !!process.env.JAEGER_ENDPOINT,
        zipkin: !!process.env.ZIPKIN_ENDPOINT,
        otlp: !!process.env.OTLP_ENDPOINT
      }
    };
  }

  /**
   * Shutdown tracing service
   */
  async shutdown() {
    try {
      if (this.sdk) {
        await this.sdk.shutdown();
        logger.info('✅ Tracing service shutdown completed');
      }
    } catch (error) {
      logger.error('❌ Error during tracing shutdown:', error);
    }
  }

  /**
   * Generate unique instance ID
   */
  generateInstanceId() {
    const hostname = require('os').hostname();
    const logger = require('../../utils/logger');
    const pid = process.pid;
    const timestamp = Date.now();
    return `${hostname}-${pid}-${timestamp}`;
  }

  /**
   * Create correlation ID for request tracing
   */
  generateCorrelationId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Extract trace context from headers
   */
  extractTraceContext(headers) {
    // Extract trace context from HTTP headers
    const traceParent = headers['traceparent'];
    const traceState = headers['tracestate'];

    if (traceParent) {
      return {
        traceParent,
        traceState
      };
    }

    return null;
  }

  /**
   * Inject trace context into headers
   */
  injectTraceContext(headers = {}) {
    // Inject trace context into HTTP headers
    const activeSpan = trace.getActiveSpan();
    if (activeSpan) {
      const spanContext = activeSpan.spanContext();
      if (spanContext.traceFlags & 1) { // Check if trace is sampled
        headers['traceparent'] = `00-${spanContext.traceId}-${spanContext.spanId}-01`;
      }
    }

    return headers;
  }
}

module.exports = new TracingService();
