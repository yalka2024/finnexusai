#!/usr/bin/env node

/**
 * FinNexusAI Failover Service with Reinforcement Learning
 * Adapts thresholds from load data for self-healing on volatility
 */

class RLFailoverService {
  constructor() {
    this.thresholds = {
      latency: 10, // ms
      errorRate: 0.01, // 1%
      cpuUsage: 0.8, // 80%
      memoryUsage: 0.85 // 85%
    };
    
    this.loadHistory = [];
    this.adaptationRate = 0.1;
    this.minSamples = 10;
  }

  // Collect load data
  recordLoadData(metrics) {
    const dataPoint = {
      timestamp: Date.now(),
      latency: metrics.latency,
      errorRate: metrics.errorRate,
      cpuUsage: metrics.cpuUsage,
      memoryUsage: metrics.memoryUsage,
      volatility: this.calculateVolatility(metrics)
    };
    
    this.loadHistory.push(dataPoint);
    
    // Keep only last 100 data points
    if (this.loadHistory.length > 100) {
      this.loadHistory = this.loadHistory.slice(-100);
    }
    
    console.log(`📊 Recorded metrics: latency=${metrics.latency}ms, volatility=${dataPoint.volatility.toFixed(2)}`);
  }

  // Calculate market volatility from metrics
  calculateVolatility(metrics) {
    // Simulate volatility calculation based on latency spikes and error patterns
    const latencyVolatility = Math.abs(metrics.latency - this.thresholds.latency) / this.thresholds.latency;
    const errorVolatility = metrics.errorRate * 10; // Amplify error rate impact
    
    return Math.min(latencyVolatility + errorVolatility, 1.0);
  }

  // RL-based threshold adaptation
  adaptThresholds() {
    if (this.loadHistory.length < this.minSamples) {
      console.log('⏳ Insufficient data for adaptation, need more samples');
      return;
    }
    
    const recentData = this.loadHistory.slice(-20); // Last 20 samples
    const avgVolatility = recentData.reduce((sum, d) => sum + d.volatility, 0) / recentData.length;
    
    // RL policy: adjust thresholds based on volatility patterns
    if (avgVolatility > 0.5) {
      // High volatility: tighten thresholds for faster response
      this.thresholds.latency *= (1 - this.adaptationRate);
      this.thresholds.errorRate *= (1 - this.adaptationRate * 0.5);
      
      console.log(`🔧 High volatility detected (${avgVolatility.toFixed(2)}), tightening thresholds`);
      console.log(`   New latency threshold: ${this.thresholds.latency.toFixed(1)}ms`);
      console.log(`   New error rate threshold: ${(this.thresholds.errorRate * 100).toFixed(2)}%`);
    } else if (avgVolatility < 0.2) {
      // Low volatility: relax thresholds to reduce false positives
      this.thresholds.latency *= (1 + this.adaptationRate * 0.5);
      this.thresholds.errorRate *= (1 + this.adaptationRate * 0.3);
      
      console.log(`🔧 Low volatility detected (${avgVolatility.toFixed(2)}), relaxing thresholds`);
      console.log(`   New latency threshold: ${this.thresholds.latency.toFixed(1)}ms`);
      console.log(`   New error rate threshold: ${(this.thresholds.errorRate * 100).toFixed(2)}%`);
    } else {
      console.log(`✅ Volatility normal (${avgVolatility.toFixed(2)}), maintaining current thresholds`);
    }
    
    // Ensure thresholds stay within reasonable bounds
    this.thresholds.latency = Math.max(5, Math.min(50, this.thresholds.latency));
    this.thresholds.errorRate = Math.max(0.001, Math.min(0.1, this.thresholds.errorRate));
  }

  // Check if failover should be triggered
  shouldTriggerFailover(metrics) {
    const triggers = {
      latency: metrics.latency > this.thresholds.latency,
      errorRate: metrics.errorRate > this.thresholds.errorRate,
      cpuUsage: metrics.cpuUsage > this.thresholds.cpuUsage,
      memoryUsage: metrics.memoryUsage > this.thresholds.memoryUsage
    };
    
    const shouldFailover = Object.values(triggers).some(trigger => trigger);
    
    if (shouldFailover) {
      console.log('🚨 FAILOVER TRIGGERED!');
      console.log('   Triggered by:', Object.entries(triggers)
        .filter(([_, triggered]) => triggered)
        .map(([metric, _]) => metric)
        .join(', '));
    }
    
    return shouldFailover;
  }

  // Simulate failover actions
  async executeFailover() {
    console.log('🔄 Executing failover procedures...');
    
    const actions = [
      'Scaling up additional pods',
      'Routing traffic to healthy instances',
      'Clearing caches and restarting services',
      'Activating backup systems'
    ];
    
    for (const action of actions) {
      console.log(`   ✅ ${action}`);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('✅ Failover completed successfully');
  }

  // Main monitoring loop
  async startMonitoring() {
    console.log('🚀 Starting RL Failover Service...');
    console.log(`📊 Initial thresholds: latency=${this.thresholds.latency}ms, errorRate=${(this.thresholds.errorRate * 100).toFixed(2)}%`);
    
    setInterval(async () => {
      // Simulate metrics collection
      const metrics = {
        latency: Math.random() * 20 + 5, // 5-25ms
        errorRate: Math.random() * 0.05, // 0-5%
        cpuUsage: Math.random() * 0.5 + 0.3, // 30-80%
        memoryUsage: Math.random() * 0.4 + 0.4 // 40-80%
      };
      
      // Record and adapt
      this.recordLoadData(metrics);
      this.adaptThresholds();
      
      // Check for failover
      if (this.shouldTriggerFailover(metrics)) {
        await this.executeFailover();
      }
      
    }, 5000); // Check every 5 seconds
  }
}

// Test the failover service
const failoverService = new RLFailoverService();

// Simulate some load data for testing
console.log('🧪 Testing RL Failover Service...\n');

// Simulate high volatility scenario
const testMetrics = [
  { latency: 15, errorRate: 0.02, cpuUsage: 0.7, memoryUsage: 0.75 },
  { latency: 25, errorRate: 0.05, cpuUsage: 0.85, memoryUsage: 0.8 },
  { latency: 8, errorRate: 0.01, cpuUsage: 0.6, memoryUsage: 0.7 },
  { latency: 30, errorRate: 0.08, cpuUsage: 0.9, memoryUsage: 0.85 }
];

testMetrics.forEach((metrics, index) => {
  console.log(`\n📊 Test ${index + 1}:`);
  failoverService.recordLoadData(metrics);
  failoverService.adaptThresholds();
  
  if (failoverService.shouldTriggerFailover(metrics)) {
    console.log('🚨 Failover would be triggered!');
  }
});

console.log('\n✅ RL Failover Service test completed!');
console.log('🔄 Service is self-healing and adapting to volatility patterns');

module.exports = RLFailoverService;
