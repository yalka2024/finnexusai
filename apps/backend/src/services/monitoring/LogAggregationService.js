/**
 * Log Aggregation Service
 * ELK/EFK stack integration for centralized logging
 */

const winston = require('winston');
const { ElasticsearchTransport } = require('winston-elasticsearch');
const { Client } = require('@elastic/elasticsearch');
const os = require('os');

class LogAggregationService {
  constructor() {
    this.logger = null;
    this.elasticsearchClient = null;
    this.isInitialized = false;
    this.config = {
      elasticsearchUrl: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
      elasticsearchIndex: process.env.ELASTICSEARCH_INDEX || 'finnexus-logs',
      elasticsearchUsername: process.env.ELASTICSEARCH_USERNAME,
      elasticsearchPassword: process.env.ELASTICSEARCH_PASSWORD,
      logstashUrl: process.env.LOGSTASH_URL || 'localhost:5000',
      fluentdUrl: process.env.FLUENTD_URL || 'localhost:24224',
      kibanaUrl: process.env.KIBANA_URL || 'http://localhost:5601',
      environment: process.env.NODE_ENV || 'development',
      serviceName: process.env.SERVICE_NAME || 'finnexus-backend',
      serviceVersion: process.env.SERVICE_VERSION || '1.0.0',
      enableElasticsearch: process.env.ENABLE_ELASTICSEARCH !== 'false',
      enableLogstash: process.env.ENABLE_LOGSTASH === 'true',
      enableFluentd: process.env.ENABLE_FLUENTD === 'true',
      logLevel: process.env.LOG_LEVEL || 'info',
      maxRetries: parseInt(process.env.LOG_MAX_RETRIES || '3'),
      retryDelay: parseInt(process.env.LOG_RETRY_DELAY || '1000')
    };
  }

  /**
   * Initialize the log aggregation service
   */
  async initialize() {
    try {
      if (this.isInitialized) {
        logger.info('⚠️ Log aggregation service already initialized');
        return;
      }

      logger.info('🔄 Initializing log aggregation service...');

      // Create Elasticsearch client
      if (this.config.enableElasticsearch) {
        await this.initializeElasticsearch();
      }

      // Create Winston logger with multiple transports
      await this.initializeWinstonLogger();

      this.isInitialized = true;
      logger.info('✅ Log aggregation service initialized successfully');

      return {
        success: true,
        message: 'Log aggregation service initialized successfully',
        config: {
          elasticsearch: this.config.enableElasticsearch,
          logstash: this.config.enableLogstash,
          fluentd: this.config.enableFluentd,
          logLevel: this.config.logLevel,
          serviceName: this.config.serviceName
        }
      };
    } catch (error) {
      logger.error('❌ Failed to initialize log aggregation service:', error);
      throw new Error(`Log aggregation initialization failed: ${error.message}`);
    }
  }

  /**
   * Initialize Elasticsearch client
   */
  async initializeElasticsearch() {
    try {
      const clientConfig = {
        node: this.config.elasticsearchUrl,
        maxRetries: this.config.maxRetries,
        requestTimeout: 30000,
        sniffOnStart: true,
        sniffOnConnectionFault: true
      };

      // Add authentication if provided
      if (this.config.elasticsearchUsername && this.config.elasticsearchPassword) {
        clientConfig.auth = {
          username: this.config.elasticsearchUsername,
          password: this.config.elasticsearchPassword
        };
      }

      this.elasticsearchClient = new Client(clientConfig);

      // Test connection
      await this.elasticsearchClient.ping();
      logger.info('✅ Elasticsearch connection established');

      // Create index template
      await this.createIndexTemplate();

    } catch (error) {
      logger.warn('⚠️ Elasticsearch connection failed:', error.message);
      this.config.enableElasticsearch = false;
    }
  }

  /**
   * Create Elasticsearch index template
   */
  async createIndexTemplate() {
    try {
      const template = {
        index_patterns: [`${this.config.elasticsearchIndex}-*`],
        template: {
          settings: {
            number_of_shards: 1,
            number_of_replicas: 1,
            'index.lifecycle.name': 'finnexus-logs-policy',
            'index.lifecycle.rollover_alias': this.config.elasticsearchIndex
          },
          mappings: {
            properties: {
              '@timestamp': { type: 'date' },
              level: { type: 'keyword' },
              message: { type: 'text' },
              service: {
                properties: {
                  name: { type: 'keyword' },
                  version: { type: 'keyword' },
                  environment: { type: 'keyword' }
                }
              },
              host: {
                properties: {
                  hostname: { type: 'keyword' },
                  ip: { type: 'ip' }
                }
              },
              process: {
                properties: {
                  pid: { type: 'integer' },
                  uptime: { type: 'float' }
                }
              },
              request: {
                properties: {
                  method: { type: 'keyword' },
                  url: { type: 'keyword' },
                  userAgent: { type: 'text' },
                  ip: { type: 'ip' },
                  correlationId: { type: 'keyword' }
                }
              },
              user: {
                properties: {
                  id: { type: 'keyword' },
                  email: { type: 'keyword' }
                }
              },
              error: {
                properties: {
                  name: { type: 'keyword' },
                  message: { type: 'text' },
                  stack: { type: 'text' }
                }
              },
              performance: {
                properties: {
                  duration: { type: 'integer' },
                  memory: { type: 'integer' },
                  cpu: { type: 'float' }
                }
              },
              tags: { type: 'keyword' }
            }
          }
        }
      };

      await this.elasticsearchClient.indices.putIndexTemplate({
        name: `${this.config.elasticsearchIndex}-template`,
        body: template
      });

      logger.info('✅ Elasticsearch index template created');
    } catch (error) {
      logger.warn('⚠️ Failed to create Elasticsearch index template:', error.message);
    }
  }

  /**
   * Initialize Winston logger with multiple transports
   */
  async initializeWinstonLogger() {
    const transports = [];

    // Console transport
    transports.push(new winston.transports.Console({
      level: this.config.logLevel,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
        })
      )
    }));

    // File transport
    transports.push(new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    }));

    transports.push(new winston.transports.File({
      filename: 'logs/combined.log',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    }));

    // Elasticsearch transport
    if (this.config.enableElasticsearch && this.elasticsearchClient) {
      transports.push(new ElasticsearchTransport({
        level: this.config.logLevel,
        client: this.elasticsearchClient,
        index: this.config.elasticsearchIndex,
        indexPrefix: this.config.elasticsearchIndex,
        indexSuffixPattern: 'YYYY-MM-DD',
        messageType: 'log',
        transformer: (logData) => {
          return {
            '@timestamp': logData.timestamp,
            level: logData.level,
            message: logData.message,
            service: {
              name: this.config.serviceName,
              version: this.config.serviceVersion,
              environment: this.config.environment
            },
            host: {
              hostname: os.hostname(),
              ip: this.getLocalIP()
            },
            process: {
              pid: process.pid,
              uptime: process.uptime()
            },
            ...logData.meta
          };
        }
      }));
    }

    // Logstash transport (if enabled)
    if (this.config.enableLogstash) {
      const LogstashTransport = require('winston-logstash');
      transports.push(new LogstashTransport({
        host: this.config.logstashUrl.split(':')[0],
        port: parseInt(this.config.logstashUrl.split(':')[1]) || 5000,
        node_name: this.config.serviceName,
        pid: process.pid
      }));
    }

    // Fluentd transport (if enabled)
    if (this.config.enableFluentd) {
      const FluentTransport = require('winston-fluent');
      const logger = require('../../utils/logger');
      transports.push(new FluentTransport('finnexus.log', {
        host: this.config.fluentdUrl.split(':')[0],
        port: parseInt(this.config.fluentdUrl.split(':')[1]) || 24224,
        timeout: 3.0,
        requireAckResponse: true
      }));
    }

    // Create logger
    this.logger = winston.createLogger({
      level: this.config.logLevel,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: {
        service: {
          name: this.config.serviceName,
          version: this.config.serviceVersion,
          environment: this.config.environment
        },
        host: {
          hostname: os.hostname(),
          ip: this.getLocalIP()
        },
        process: {
          pid: process.pid,
          uptime: process.uptime()
        }
      },
      transports
    });

    logger.info('✅ Winston logger initialized with transports');
  }

  /**
   * Get logger instance
   */
  getLogger() {
    if (!this.isInitialized) {
      logger.warn('⚠️ Log aggregation service not initialized, using console logger');
      return console;
    }
    return this.logger;
  }

  /**
   * Log with structured data
   */
  log(level, message, meta = {}) {
    if (!this.isInitialized) {
      logger.info(`[${level.toUpperCase()}] ${message}`, meta);
      return;
    }

    this.logger.log(level, message, meta);
  }

  /**
   * Log error with stack trace
   */
  error(message, error = null, meta = {}) {
    const errorMeta = {
      ...meta,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : null
    };

    this.log('error', message, errorMeta);
  }

  /**
   * Log warning
   */
  warn(message, meta = {}) {
    this.log('warn', message, meta);
  }

  /**
   * Log info
   */
  info(message, meta = {}) {
    this.log('info', message, meta);
  }

  /**
   * Log debug
   */
  debug(message, meta = {}) {
    this.log('debug', message, meta);
  }

  /**
   * Log HTTP request
   */
  logHttpRequest(req, res, duration, meta = {}) {
    const requestMeta = {
      ...meta,
      request: {
        method: req.method,
        url: req.url,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        correlationId: req.headers['x-correlation-id']
      },
      response: {
        statusCode: res.statusCode,
        duration: duration
      },
      user: req.user ? {
        id: req.user.userId,
        email: req.user.email
      } : null,
      performance: {
        duration: duration,
        memory: process.memoryUsage().heapUsed,
        cpu: process.cpuUsage()
      }
    };

    const level = res.statusCode >= 400 ? 'error' : 'info';
    this.log(level, `${req.method} ${req.url} - ${res.statusCode}`, requestMeta);
  }

  /**
   * Log database operation
   */
  logDatabaseOperation(operation, table, query, duration, meta = {}) {
    const dbMeta = {
      ...meta,
      database: {
        operation: operation,
        table: table,
        query: query,
        duration: duration
      },
      performance: {
        duration: duration,
        memory: process.memoryUsage().heapUsed
      }
    };

    this.log('info', `DB ${operation} on ${table}`, dbMeta);
  }

  /**
   * Log authentication event
   */
  logAuthEvent(event, userId, success, meta = {}) {
    const authMeta = {
      ...meta,
      auth: {
        event: event,
        userId: userId,
        success: success,
        timestamp: new Date().toISOString()
      },
      user: {
        id: userId
      }
    };

    const level = success ? 'info' : 'warn';
    this.log(level, `Auth ${event}`, authMeta);
  }

  /**
   * Log trading operation
   */
  logTradingOperation(operation, symbol, amount, userId, meta = {}) {
    const tradingMeta = {
      ...meta,
      trading: {
        operation: operation,
        symbol: symbol,
        amount: amount,
        timestamp: new Date().toISOString()
      },
      user: {
        id: userId
      }
    };

    this.log('info', `Trading ${operation}`, tradingMeta);
  }

  /**
   * Log compliance check
   */
  logComplianceCheck(checkType, result, userId, meta = {}) {
    const complianceMeta = {
      ...meta,
      compliance: {
        checkType: checkType,
        result: result,
        timestamp: new Date().toISOString()
      },
      user: {
        id: userId
      }
    };

    const level = result.passed ? 'info' : 'warn';
    this.log(level, `Compliance ${checkType}`, complianceMeta);
  }

  /**
   * Log security event
   */
  logSecurityEvent(event, severity, meta = {}) {
    const securityMeta = {
      ...meta,
      security: {
        event: event,
        severity: severity,
        timestamp: new Date().toISOString()
      }
    };

    const level = severity === 'critical' ? 'error' :
      severity === 'high' ? 'warn' : 'info';
    this.log(level, `Security ${event}`, securityMeta);
  }

  /**
   * Log performance metrics
   */
  logPerformanceMetrics(metrics, meta = {}) {
    const performanceMeta = {
      ...meta,
      performance: {
        ...metrics,
        timestamp: new Date().toISOString()
      }
    };

    this.log('info', 'Performance metrics', performanceMeta);
  }

  /**
   * Get local IP address
   */
  getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }
    return '127.0.0.1';
  }

  /**
   * Get log aggregation status
   */
  getStatus() {
    return {
      success: true,
      initialized: this.isInitialized,
      config: {
        elasticsearch: this.config.enableElasticsearch,
        logstash: this.config.enableLogstash,
        fluentd: this.config.enableFluentd,
        logLevel: this.config.logLevel,
        serviceName: this.config.serviceName
      },
      elasticsearch: {
        connected: !!this.elasticsearchClient,
        url: this.config.elasticsearchUrl,
        index: this.config.elasticsearchIndex
      }
    };
  }

  /**
   * Search logs
   */
  async searchLogs(query, filters = {}) {
    if (!this.elasticsearchClient) {
      throw new Error('Elasticsearch client not initialized');
    }

    try {
      const searchQuery = {
        index: `${this.config.elasticsearchIndex}-*`,
        body: {
          query: {
            bool: {
              must: [
                {
                  query_string: {
                    query: query || '*'
                  }
                }
              ],
              filter: Object.keys(filters).map(key => ({
                term: { [key]: filters[key] }
              }))
            }
          },
          sort: [
            { '@timestamp': { order: 'desc' } }
          ],
          size: 100
        }
      };

      const response = await this.elasticsearchClient.search(searchQuery);
      return response.body.hits;
    } catch (error) {
      this.error('Failed to search logs', error);
      throw error;
    }
  }

  /**
   * Get log statistics
   */
  async getLogStatistics(timeRange = '1h') {
    if (!this.elasticsearchClient) {
      throw new Error('Elasticsearch client not initialized');
    }

    try {
      const statsQuery = {
        index: `${this.config.elasticsearchIndex}-*`,
        body: {
          aggs: {
            logs_over_time: {
              date_histogram: {
                field: '@timestamp',
                fixed_interval: '1m',
                time_zone: 'UTC'
              }
            },
            by_level: {
              terms: {
                field: 'level.keyword'
              }
            },
            by_service: {
              terms: {
                field: 'service.name.keyword'
              }
            }
          },
          query: {
            range: {
              '@timestamp': {
                gte: `now-${timeRange}`,
                lte: 'now'
              }
            }
          }
        }
      };

      const response = await this.elasticsearchClient.search(statsQuery);
      return response.body.aggregations;
    } catch (error) {
      this.error('Failed to get log statistics', error);
      throw error;
    }
  }

  /**
   * Shutdown log aggregation service
   */
  async shutdown() {
    try {
      if (this.logger) {
        this.logger.close();
      }
      if (this.elasticsearchClient) {
        await this.elasticsearchClient.close();
      }
      logger.info('✅ Log aggregation service shutdown completed');
    } catch (error) {
      logger.error('❌ Error during log aggregation shutdown:', error);
    }
  }
}

module.exports = new LogAggregationService();
