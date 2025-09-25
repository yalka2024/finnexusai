#!/usr/bin/env node

/**
 * Load Test for FinNexusAI
 * Simulates high-frequency trading load to test HPA scaling
 */

const http = require('http');

class LoadTest {
  constructor() {
    this.baseUrl = 'http://localhost:3000';
    this.results = {
      total: 0,
      success: 0,
      errors: 0,
      latency: []
    };
  }

  async makeRequest(endpoint) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      const req = http.get(`${this.baseUrl}${endpoint}`, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          const latency = Date.now() - startTime;
          this.results.latency.push(latency);
          
          if (res.statusCode === 200) {
            this.results.success++;
            resolve({ success: true, latency, status: res.statusCode });
          } else {
            this.results.errors++;
            resolve({ success: false, latency, status: res.statusCode });
          }
        });
      });
      
      req.on('error', (err) => {
        const latency = Date.now() - startTime;
        this.results.errors++;
        this.results.latency.push(latency);
        resolve({ success: false, latency, error: err.message });
      });
      
      req.setTimeout(5000, () => {
        req.destroy();
        const latency = Date.now() - startTime;
        this.results.errors++;
        this.results.latency.push(latency);
        resolve({ success: false, latency, error: 'timeout' });
      });
    });
  }

  async runLoadTest() {
    console.log('🚀 Starting Load Test for FinNexusAI...\n');
    
    const endpoints = [
      '/health',
      '/trade/buy?symbol=BTC',
      '/ai/predict?symbol=ETH',
      '/sharia/validate?trade=USD-SWAP'
    ];
    
    const totalRequests = 100;
    const concurrent = 10;
    
    console.log(`📊 Target: ${totalRequests} requests with ${concurrent} concurrent`);
    console.log(`🎯 Endpoints: ${endpoints.length} different endpoints\n`);
    
    const promises = [];
    
    for (let i = 0; i < totalRequests; i++) {
      const endpoint = endpoints[i % endpoints.length];
      promises.push(this.makeRequest(endpoint));
      this.results.total++;
      
      // Simulate concurrent requests
      if (promises.length >= concurrent) {
        await Promise.all(promises);
        promises.length = 0;
        
        // Show progress
        if ((i + 1) % 20 === 0) {
          console.log(`📈 Progress: ${i + 1}/${totalRequests} requests completed`);
        }
      }
    }
    
    // Wait for remaining requests
    if (promises.length > 0) {
      await Promise.all(promises);
    }
    
    this.printResults();
  }

  printResults() {
    const avgLatency = this.results.latency.reduce((a, b) => a + b, 0) / this.results.latency.length;
    const maxLatency = Math.max(...this.results.latency);
    const minLatency = Math.min(...this.results.latency);
    const successRate = (this.results.success / this.results.total) * 100;
    
    console.log('\n📊 LOAD TEST RESULTS');
    console.log('====================');
    console.log(`📈 Total Requests: ${this.results.total}`);
    console.log(`✅ Successful: ${this.results.success} (${successRate.toFixed(1)}%)`);
    console.log(`❌ Errors: ${this.results.errors}`);
    console.log(`⏱️  Avg Latency: ${avgLatency.toFixed(1)}ms`);
    console.log(`⚡ Min Latency: ${minLatency}ms`);
    console.log(`🐌 Max Latency: ${maxLatency}ms`);
    
    // Check if performance meets requirements
    const meetsRequirements = avgLatency < 10 && this.results.errors === 0;
    
    console.log('\n🎯 PERFORMANCE CHECK');
    console.log('====================');
    console.log(`⏱️  Latency < 10ms: ${avgLatency < 10 ? '✅ PASS' : '❌ FAIL'} (${avgLatency.toFixed(1)}ms)`);
    console.log(`🚫 Zero Errors: ${this.results.errors === 0 ? '✅ PASS' : '❌ FAIL'} (${this.results.errors} errors)`);
    
    if (meetsRequirements) {
      console.log('\n🎉 ALL REQUIREMENTS MET!');
      console.log('✅ HPA would scale pods based on this load');
      console.log('✅ System ready for production traffic');
    } else {
      console.log('\n⚠️  REQUIREMENTS NOT MET');
      console.log('❌ System needs optimization before production');
    }
    
    return meetsRequirements;
  }
}

// Run the load test
const loadTest = new LoadTest();
loadTest.runLoadTest().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ Load test failed:', error);
  process.exit(1);
});

module.exports = LoadTest;
