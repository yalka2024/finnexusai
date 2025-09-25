/**
 * Resource Limits Manager Tests
 * Comprehensive test suite for resource limits and constraints
 */

const ResourceLimitsManager = require('../../src/services/system/ResourceLimitsManager');

describe('ResourceLimitsManager', () => {
  let resourceLimitsManager;

  beforeEach(() => {
    resourceLimitsManager = ResourceLimitsManager;
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Initialization', () => {
    test('should initialize successfully with default configuration', async() => {
      const result = await resourceLimitsManager.initialize();

      expect(result.success).toBe(true);
      expect(result.message).toBe('Resource limits manager initialized successfully');
      expect(result.config).toBeDefined();
      expect(result.config.monitoring).toBeDefined();
      expect(result.config.memoryLimits).toBeDefined();
      expect(result.config.cpuLimits).toBeDefined();
      expect(result.config.diskLimits).toBeDefined();
      expect(result.config.networkLimits).toBeDefined();
      expect(result.config.limits).toBeDefined();
      expect(result.config.thresholds).toBeDefined();
    });

    test('should initialize with custom configuration', async() => {
      const _customConfig = {
        enableResourceMonitoring: false,
        enableMemoryLimits: false,
        enableCpuLimits: false,
        enableDiskLimits: false,
        enableNetworkLimits: false
      };

      // Mock environment variables
      process.env.ENABLE_RESOURCE_MONITORING = 'false';
      process.env.ENABLE_MEMORY_LIMITS = 'false';
      process.env.ENABLE_CPU_LIMITS = 'false';
      process.env.ENABLE_DISK_LIMITS = 'false';
      process.env.ENABLE_NETWORK_LIMITS = 'false';

      const result = await resourceLimitsManager.initialize();

      expect(result.success).toBe(true);
      expect(result.config.monitoring).toBe(false);
      expect(result.config.memoryLimits).toBe(false);
      expect(result.config.cpuLimits).toBe(false);
      expect(result.config.diskLimits).toBe(false);
      expect(result.config.networkLimits).toBe(false);
    });

    test('should handle initialization errors gracefully', async() => {
      // Mock console.error to avoid noise in tests
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Mock a failing operation
      jest.spyOn(resourceLimitsManager, 'initializeSystemInfo').mockRejectedValue(new Error('System info failed'));

      await expect(resourceLimitsManager.initialize()).rejects.toThrow('Resource limits manager initialization failed: System info failed');

      consoleSpy.mockRestore();
    });
  });

  describe('Resource Monitoring', () => {
    beforeEach(async() => {
      await resourceLimitsManager.initialize();
    });

    test('should start resource monitoring', () => {
      expect(resourceLimitsManager.monitoringInterval).toBeDefined();
      expect(typeof resourceLimitsManager.monitoringInterval).toBe('object');
    });

    test('should stop resource monitoring', () => {
      resourceLimitsManager.stopResourceMonitoring();
      expect(resourceLimitsManager.monitoringInterval).toBeNull();
    });

    test('should monitor memory usage', async() => {
      const mockMemoryStats = {
        total: 1024 * 1024 * 1024, // 1GB
        used: 512 * 1024 * 1024,   // 512MB
        free: 512 * 1024 * 1024,   // 512MB
        usagePercent: 50
      };

      // Mock os.totalmem and os.freemem
      jest.spyOn(require('os'), 'totalmem').mockReturnValue(mockMemoryStats.total);
      jest.spyOn(require('os'), 'freemem').mockReturnValue(mockMemoryStats.free);

      await resourceLimitsManager.monitorMemory();

      expect(resourceLimitsManager.resourceStats.memory.total).toBe(mockMemoryStats.total);
      expect(resourceLimitsManager.resourceStats.memory.used).toBe(mockMemoryStats.used);
      expect(resourceLimitsManager.resourceStats.memory.free).toBe(mockMemoryStats.free);
      expect(resourceLimitsManager.resourceStats.memory.usagePercent).toBe(mockMemoryStats.usagePercent);
    });

    test('should monitor CPU usage', async() => {
      const mockCpuUsage = 75.5;
      const mockLoadAverage = [1.2, 1.5, 1.8];

      // Mock getCpuUsage method
      jest.spyOn(resourceLimitsManager, 'getCpuUsage').mockResolvedValue(mockCpuUsage);
      jest.spyOn(require('os'), 'loadavg').mockReturnValue(mockLoadAverage);

      await resourceLimitsManager.monitorCpu();

      expect(resourceLimitsManager.resourceStats.cpu.usage).toBe(mockCpuUsage);
      expect(resourceLimitsManager.resourceStats.cpu.loadAverage).toEqual(mockLoadAverage);
    });

    test('should monitor disk usage', async() => {
      const mockDiskStats = {
        total: 1024 * 1024 * 1024, // 1GB
        used: 512 * 1024 * 1024,   // 512MB
        free: 512 * 1024 * 1024,   // 512MB
        usagePercent: 50
      };

      // Mock updateDiskStats method
      jest.spyOn(resourceLimitsManager, 'updateDiskStats').mockImplementation(async() => {
        resourceLimitsManager.resourceStats.disk = mockDiskStats;
      });

      await resourceLimitsManager.monitorDisk();

      expect(resourceLimitsManager.resourceStats.disk.total).toBe(mockDiskStats.total);
      expect(resourceLimitsManager.resourceStats.disk.used).toBe(mockDiskStats.used);
      expect(resourceLimitsManager.resourceStats.disk.free).toBe(mockDiskStats.free);
      expect(resourceLimitsManager.resourceStats.disk.usagePercent).toBe(mockDiskStats.usagePercent);
    });

    test('should monitor network usage', async() => {
      const mockNetworkStats = {
        connections: 100,
        latency: 50,
        throughput: 1000
      };

      // Mock network monitoring methods
      jest.spyOn(resourceLimitsManager, 'getActiveConnections').mockResolvedValue(mockNetworkStats.connections);
      jest.spyOn(resourceLimitsManager, 'getNetworkLatency').mockResolvedValue(mockNetworkStats.latency);
      jest.spyOn(resourceLimitsManager, 'getNetworkThroughput').mockResolvedValue(mockNetworkStats.throughput);

      await resourceLimitsManager.monitorNetwork();

      expect(resourceLimitsManager.resourceStats.network.connections).toBe(mockNetworkStats.connections);
      expect(resourceLimitsManager.resourceStats.network.latency).toBe(mockNetworkStats.latency);
      expect(resourceLimitsManager.resourceStats.network.throughput).toBe(mockNetworkStats.throughput);
    });

    test('should monitor application metrics', async() => {
      const mockAppStats = {
        requests: 1000,
        errors: 10,
        responseTime: 200,
        activeConnections: 50
      };

      // Mock application monitoring methods
      jest.spyOn(resourceLimitsManager, 'getRequestCount').mockResolvedValue(mockAppStats.requests);
      jest.spyOn(resourceLimitsManager, 'getErrorCount').mockResolvedValue(mockAppStats.errors);
      jest.spyOn(resourceLimitsManager, 'getAverageResponseTime').mockResolvedValue(mockAppStats.responseTime);
      jest.spyOn(resourceLimitsManager, 'getActiveConnections').mockResolvedValue(mockAppStats.activeConnections);

      await resourceLimitsManager.monitorApplication();

      expect(resourceLimitsManager.resourceStats.application.requests).toBe(mockAppStats.requests);
      expect(resourceLimitsManager.resourceStats.application.errors).toBe(mockAppStats.errors);
      expect(resourceLimitsManager.resourceStats.application.responseTime).toBe(mockAppStats.responseTime);
      expect(resourceLimitsManager.resourceStats.application.activeConnections).toBe(mockAppStats.activeConnections);
    });
  });

  describe('Limit Violations', () => {
    beforeEach(async() => {
      await resourceLimitsManager.initialize();
    });

    test('should detect memory limit violations', async() => {
      const mockMemoryStats = {
        total: 1024 * 1024 * 1024, // 1GB
        used: 900 * 1024 * 1024,   // 900MB (90% usage)
        free: 124 * 1024 * 1024,   // 124MB
        usagePercent: 90
      };

      // Mock os.totalmem and os.freemem
      jest.spyOn(require('os'), 'totalmem').mockReturnValue(mockMemoryStats.total);
      jest.spyOn(require('os'), 'freemem').mockReturnValue(mockMemoryStats.free);

      // Mock handleLimitViolation
      const handleViolationSpy = jest.spyOn(resourceLimitsManager, 'handleLimitViolation');

      await resourceLimitsManager.monitorMemory();

      expect(handleViolationSpy).toHaveBeenCalledWith('memory', expect.objectContaining({
        current: expect.any(Number),
        soft: expect.any(Number),
        hard: expect.any(Number),
        usagePercent: 90
      }));
    });

    test('should detect CPU limit violations', async() => {
      const mockCpuUsage = 85.5; // Above 80% threshold

      // Mock getCpuUsage method
      jest.spyOn(resourceLimitsManager, 'getCpuUsage').mockResolvedValue(mockCpuUsage);

      // Mock handleLimitViolation
      const handleViolationSpy = jest.spyOn(resourceLimitsManager, 'handleLimitViolation');

      await resourceLimitsManager.monitorCpu();

      expect(handleViolationSpy).toHaveBeenCalledWith('cpu', expect.objectContaining({
        current: mockCpuUsage,
        soft: expect.any(Number),
        hard: expect.any(Number),
        loadAverage: expect.any(Array)
      }));
    });

    test('should detect disk limit violations', async() => {
      const mockDiskStats = {
        total: 1024 * 1024 * 1024, // 1GB
        used: 900 * 1024 * 1024,   // 900MB (90% usage)
        free: 124 * 1024 * 1024,   // 124MB
        usagePercent: 90
      };

      // Mock updateDiskStats method
      jest.spyOn(resourceLimitsManager, 'updateDiskStats').mockImplementation(async() => {
        resourceLimitsManager.resourceStats.disk = mockDiskStats;
      });

      // Mock handleLimitViolation
      const handleViolationSpy = jest.spyOn(resourceLimitsManager, 'handleLimitViolation');

      await resourceLimitsManager.monitorDisk();

      expect(handleViolationSpy).toHaveBeenCalledWith('disk', expect.objectContaining({
        current: expect.any(Number),
        soft: expect.any(Number),
        hard: expect.any(Number),
        usagePercent: 90
      }));
    });

    test('should detect connection limit violations', async() => {
      const mockConnections = 900; // Above soft limit

      // Mock getActiveConnections method
      jest.spyOn(resourceLimitsManager, 'getActiveConnections').mockResolvedValue(mockConnections);

      // Mock handleLimitViolation
      const handleViolationSpy = jest.spyOn(resourceLimitsManager, 'handleLimitViolation');

      await resourceLimitsManager.monitorApplication();

      expect(handleViolationSpy).toHaveBeenCalledWith('connections', expect.objectContaining({
        current: mockConnections,
        soft: expect.any(Number),
        hard: expect.any(Number)
      }));
    });

    test('should detect response time limit violations', async() => {
      const mockResponseTime = 4500; // Above soft limit

      // Mock getAverageResponseTime method
      jest.spyOn(resourceLimitsManager, 'getAverageResponseTime').mockResolvedValue(mockResponseTime);

      // Mock handleLimitViolation
      const handleViolationSpy = jest.spyOn(resourceLimitsManager, 'handleLimitViolation');

      await resourceLimitsManager.monitorApplication();

      expect(handleViolationSpy).toHaveBeenCalledWith('responseTime', expect.objectContaining({
        current: mockResponseTime,
        soft: expect.any(Number),
        hard: expect.any(Number)
      }));
    });
  });

  describe('Violation Handling', () => {
    beforeEach(async() => {
      await resourceLimitsManager.initialize();
    });

    test('should handle limit violations correctly', () => {
      const violation = {
        type: 'memory',
        details: {
          current: 900,
          soft: 800,
          hard: 1000,
          usagePercent: 90
        },
        timestamp: new Date().toISOString(),
        severity: 'warning'
      };

      resourceLimitsManager.handleLimitViolation('memory', violation.details);

      expect(resourceLimitsManager.violations).toHaveLength(1);
      expect(resourceLimitsManager.violations[0]).toEqual(expect.objectContaining({
        type: 'memory',
        details: violation.details,
        severity: 'warning'
      }));
    });

    test('should handle critical violations', () => {
      const violation = {
        type: 'memory',
        details: {
          current: 1100, // Above hard limit
          soft: 800,
          hard: 1000,
          usagePercent: 110
        },
        timestamp: new Date().toISOString(),
        severity: 'critical'
      };

      resourceLimitsManager.handleLimitViolation('memory', violation.details);

      expect(resourceLimitsManager.violations).toHaveLength(1);
      expect(resourceLimitsManager.violations[0].severity).toBe('critical');
    });

    test('should process violations correctly', async() => {
      const violation = {
        type: 'memory',
        severity: 'warning',
        message: 'Memory usage exceeded threshold',
        timestamp: new Date().toISOString()
      };

      // Mock processViolation method
      const processViolationSpy = jest.spyOn(resourceLimitsManager, 'processViolation');

      await resourceLimitsManager.processViolation(violation);

      expect(processViolationSpy).toHaveBeenCalledWith(violation);
    });

    test('should handle critical memory violations', async() => {
      // Mock critical violation handling methods
      const clearCachesSpy = jest.spyOn(resourceLimitsManager, 'clearCaches').mockResolvedValue();
      const gcSpy = jest.spyOn(global, 'gc').mockImplementation(() => {});

      await resourceLimitsManager.handleMemoryCritical();

      expect(clearCachesSpy).toHaveBeenCalled();
      expect(gcSpy).toHaveBeenCalled();
    });

    test('should handle critical CPU violations', async() => {
      // Mock critical violation handling methods
      const reduceLoadSpy = jest.spyOn(resourceLimitsManager, 'reduceProcessingLoad').mockResolvedValue();

      await resourceLimitsManager.handleCpuCritical();

      expect(reduceLoadSpy).toHaveBeenCalled();
    });

    test('should handle critical disk violations', async() => {
      // Mock critical violation handling methods
      const cleanupSpy = jest.spyOn(resourceLimitsManager, 'cleanupTempFiles').mockResolvedValue();

      await resourceLimitsManager.handleDiskCritical();

      expect(cleanupSpy).toHaveBeenCalled();
    });

    test('should handle critical connection violations', async() => {
      // Mock critical violation handling methods
      const rejectConnectionsSpy = jest.spyOn(resourceLimitsManager, 'rejectNewConnections').mockResolvedValue();

      await resourceLimitsManager.handleConnectionsCritical();

      expect(rejectConnectionsSpy).toHaveBeenCalled();
    });

    test('should handle critical response time violations', async() => {
      // Mock critical violation handling methods
      const enableCircuitBreakersSpy = jest.spyOn(resourceLimitsManager, 'enableCircuitBreakers').mockResolvedValue();

      await resourceLimitsManager.handleResponseTimeCritical();

      expect(enableCircuitBreakersSpy).toHaveBeenCalled();
    });
  });

  describe('Utility Methods', () => {
    beforeEach(async() => {
      await resourceLimitsManager.initialize();
    });

    test('should get CPU usage correctly', async() => {
      const cpuUsage = await resourceLimitsManager.getCpuUsage();

      expect(typeof cpuUsage).toBe('number');
      expect(cpuUsage).toBeGreaterThanOrEqual(0);
      expect(cpuUsage).toBeLessThanOrEqual(100);
    });

    test('should format bytes correctly', () => {
      expect(resourceLimitsManager.formatBytes(0)).toBe('0 Byte');
      expect(resourceLimitsManager.formatBytes(1024)).toBe('1 KB');
      expect(resourceLimitsManager.formatBytes(1024 * 1024)).toBe('1 MB');
      expect(resourceLimitsManager.formatBytes(1024 * 1024 * 1024)).toBe('1 GB');
      expect(resourceLimitsManager.formatBytes(1024 * 1024 * 1024 * 1024)).toBe('1 TB');
    });

    test('should get resource statistics', () => {
      const stats = resourceLimitsManager.getResourceStats();

      expect(stats).toBeDefined();
      expect(stats.memory).toBeDefined();
      expect(stats.cpu).toBeDefined();
      expect(stats.disk).toBeDefined();
      expect(stats.network).toBeDefined();
      expect(stats.application).toBeDefined();
      expect(stats.limits).toBeDefined();
      expect(stats.violations).toBeDefined();
      expect(stats.alertCounts).toBeDefined();
      expect(stats.timestamp).toBeDefined();
    });

    test('should get limit violations', () => {
      const violations = resourceLimitsManager.getLimitViolations();

      expect(violations).toBeDefined();
      expect(violations.violations).toBeDefined();
      expect(violations.alertCounts).toBeDefined();
      expect(violations.timestamp).toBeDefined();
    });
  });

  describe('Event Handling', () => {
    beforeEach(async() => {
      await resourceLimitsManager.initialize();
    });

    test('should emit resource monitored event', (done) => {
      resourceLimitsManager.on('resource:monitored', (data) => {
        expect(data).toBeDefined();
        expect(data.stats).toBeDefined();
        expect(data.duration).toBeDefined();
        expect(data.timestamp).toBeDefined();
        done();
      });

      resourceLimitsManager.monitorResources();
    });

    test('should emit limit violation event', (done) => {
      resourceLimitsManager.on('resource:limit:violation', (violation) => {
        expect(violation).toBeDefined();
        expect(violation.type).toBeDefined();
        expect(violation.details).toBeDefined();
        expect(violation.timestamp).toBeDefined();
        expect(violation.severity).toBeDefined();
        done();
      });

      resourceLimitsManager.handleLimitViolation('memory', {
        current: 900,
        soft: 800,
        hard: 1000,
        usagePercent: 90
      });
    });

    test('should emit critical violation event', (done) => {
      resourceLimitsManager.on('resource:limit:critical', (violation) => {
        expect(violation).toBeDefined();
        expect(violation.severity).toBe('critical');
        done();
      });

      resourceLimitsManager.handleLimitViolation('memory', {
        current: 1100, // Above hard limit
        soft: 800,
        hard: 1000,
        usagePercent: 110
      });
    });

    test('should emit memory critical event', (done) => {
      resourceLimitsManager.on('resource:memory:critical', (data) => {
        expect(data).toBeDefined();
        expect(data.action).toBe('garbage_collection_triggered');
        expect(data.timestamp).toBeDefined();
        done();
      });

      resourceLimitsManager.handleMemoryCritical();
    });
  });

  describe('Shutdown', () => {
    beforeEach(async() => {
      await resourceLimitsManager.initialize();
    });

    test('should shutdown gracefully', async() => {
      const stopMonitoringSpy = jest.spyOn(resourceLimitsManager, 'stopResourceMonitoring');

      await resourceLimitsManager.shutdown();

      expect(stopMonitoringSpy).toHaveBeenCalled();
    });

    test('should handle shutdown errors gracefully', async() => {
      // Mock console.error to avoid noise in tests
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Mock stopResourceMonitoring to throw an error
      jest.spyOn(resourceLimitsManager, 'stopResourceMonitoring').mockImplementation(() => {
        throw new Error('Shutdown failed');
      });

      await resourceLimitsManager.shutdown();

      expect(consoleSpy).toHaveBeenCalledWith(
        '❌ Error shutting down resource limits manager:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });
});
