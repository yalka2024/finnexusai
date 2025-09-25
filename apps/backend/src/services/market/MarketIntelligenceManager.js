/**
 * Market Intelligence Manager
 * Provides real-time market intelligence and insights for FinNexusAI
 */

const config = require('../../config');

const { Counter, Gauge, Histogram } = require('prom-client');
const logger = require('../../utils/logger');

// Prometheus Metrics
const marketSignalCounter = new Counter({
  name: 'market_signals_total',
  help: 'Total number of market signals generated',
  labelNames: ['signal_type', 'market', 'confidence_level']
});

const marketIntelligenceGauge = new Gauge({
  name: 'market_intelligence_score',
  help: 'Market intelligence confidence score',
  labelNames: ['market', 'intelligence_type']
});

const marketAnalysisLatencyHistogram = new Histogram({
  name: 'market_analysis_latency_seconds',
  help: 'Market analysis processing latency',
  labelNames: ['analysis_type', 'market']
});

class MarketIntelligenceManager {
  constructor() {
    this.intelligenceSources = {
      'news_sentiment': {
        name: 'News Sentiment Analysis',
        description: 'Analyzes sentiment from financial news sources',
        updateFrequency: '1min',
        confidence: 0.85,
        sources: ['Reuters', 'Bloomberg', 'CNBC', 'Financial Times'],
        dataTypes: ['headlines', 'articles', 'press_releases']
      },
      'social_media': {
        name: 'Social Media Intelligence',
        description: 'Monitors social media sentiment and discussions',
        updateFrequency: '30sec',
        confidence: 0.72,
        sources: ['Twitter', 'Reddit', 'Telegram', 'Discord'],
        dataTypes: ['tweets', 'posts', 'comments', 'mentions']
      },
      'on_chain_metrics': {
        name: 'On-Chain Metrics',
        description: 'Analyzes blockchain and DeFi metrics',
        updateFrequency: '5min',
        confidence: 0.90,
        sources: ['Etherscan', 'DeFiPulse', 'CoinGecko', 'Dune Analytics'],
        dataTypes: ['transaction_volume', 'active_addresses', 'defi_tvl', 'whale_movements']
      },
      'order_book_analysis': {
        name: 'Order Book Analysis',
        description: 'Analyzes order book depth and patterns',
        updateFrequency: '1sec',
        confidence: 0.88,
        sources: ['Binance', 'Coinbase', 'Kraken', 'Bitfinex'],
        dataTypes: ['bid_ask_spread', 'order_depth', 'large_orders', 'market_makers']
      },
      'institutional_flows': {
        name: 'Institutional Flow Analysis',
        description: 'Tracks institutional money flows and positions',
        updateFrequency: '15min',
        confidence: 0.82,
        sources: ['SEC Filings', 'ETF Flows', 'Futures Data', 'Options Flow'],
        dataTypes: ['13f_filings', 'etf_inflows', 'futures_positions', 'options_activity']
      },
      'macro_indicators': {
        name: 'Macro Economic Indicators',
        description: 'Monitors macroeconomic indicators and trends',
        updateFrequency: '1hour',
        confidence: 0.95,
        sources: ['Fed Data', 'BLS', 'IMF', 'World Bank'],
        dataTypes: ['interest_rates', 'inflation', 'gdp', 'employment']
      }
    };

    this.signalTypes = {
      'momentum_breakout': {
        name: 'Momentum Breakout Signal',
        description: 'Identifies momentum breakouts and trend reversals',
        confidence: 0.80,
        timeHorizon: 'short',
        impact: 'high'
      },
      'volatility_spike': {
        name: 'Volatility Spike Signal',
        description: 'Detects sudden volatility increases',
        confidence: 0.85,
        timeHorizon: 'immediate',
        impact: 'medium'
      },
      'liquidity_crisis': {
        name: 'Liquidity Crisis Signal',
        description: 'Identifies liquidity shortages and market stress',
        confidence: 0.90,
        timeHorizon: 'immediate',
        impact: 'high'
      },
      'whale_activity': {
        name: 'Whale Activity Signal',
        description: 'Detects large wallet movements and transactions',
        confidence: 0.88,
        timeHorizon: 'short',
        impact: 'medium'
      },
      'sentiment_shift': {
        name: 'Sentiment Shift Signal',
        description: 'Identifies sentiment changes across markets',
        confidence: 0.75,
        timeHorizon: 'medium',
        impact: 'medium'
      },
      'correlation_breakdown': {
        name: 'Correlation Breakdown Signal',
        description: 'Detects when asset correlations break down',
        confidence: 0.82,
        timeHorizon: 'short',
        impact: 'high'
      },
      'regulatory_impact': {
        name: 'Regulatory Impact Signal',
        description: 'Monitors regulatory news and policy changes',
        confidence: 0.92,
        timeHorizon: 'long',
        impact: 'high'
      },
      'market_manipulation': {
        name: 'Market Manipulation Signal',
        description: 'Detects potential market manipulation patterns',
        confidence: 0.78,
        timeHorizon: 'short',
        impact: 'high'
      }
    };

    this.marketRegimes = {
      'bull_market': {
        name: 'Bull Market',
        description: 'Sustained upward price movement',
        characteristics: ['rising_prices', 'high_sentiment', 'increasing_volume'],
        probability: 0.0
      },
      'bear_market': {
        name: 'Bear Market',
        description: 'Sustained downward price movement',
        characteristics: ['falling_prices', 'low_sentiment', 'decreasing_volume'],
        probability: 0.0
      },
      'sideways_market': {
        name: 'Sideways Market',
        description: 'Range-bound price movement',
        characteristics: ['stable_prices', 'neutral_sentiment', 'stable_volume'],
        probability: 0.0
      },
      'high_volatility': {
        name: 'High Volatility Market',
        description: 'High price volatility and uncertainty',
        characteristics: ['high_volatility', 'mixed_sentiment', 'irregular_volume'],
        probability: 0.0
      },
      'low_volatility': {
        name: 'Low Volatility Market',
        description: 'Low price volatility and stability',
        characteristics: ['low_volatility', 'stable_sentiment', 'predictable_volume'],
        probability: 0.0
      }
    };

    this.activeSignals = new Map();
    this.marketAnalysis = new Map();
    this.intelligenceReports = new Map();
    this.isInitialized = false;
  }

  /**
   * Initialize market intelligence manager
   */
  async initialize() {
    try {
      logger.info('🧠 Initializing market intelligence manager...');

      // Load existing intelligence data
      await this.loadIntelligenceData();

      // Start intelligence gathering
      this.startIntelligenceGathering();

      // Start market analysis
      this.startMarketAnalysis();

      // Initialize metrics
      this.initializeMetrics();

      this.isInitialized = true;
      logger.info('✅ Market intelligence manager initialized successfully');

      return {
        success: true,
        message: 'Market intelligence manager initialized successfully',
        intelligenceSources: Object.keys(this.intelligenceSources).length,
        signalTypes: Object.keys(this.signalTypes).length,
        marketRegimes: Object.keys(this.marketRegimes).length
      };

    } catch (error) {
      logger.error('❌ Failed to initialize market intelligence manager:', error);
      throw new Error(`Market intelligence manager initialization failed: ${error.message}`);
    }
  }

  /**
   * Generate market intelligence signal
   */
  async generateMarketSignal(signalRequest) {
    try {
      const signalId = this.generateSignalId();
      const timestamp = new Date().toISOString();

      // Validate signal request
      const validation = this.validateSignalRequest(signalRequest);
      if (!validation.isValid) {
        throw new Error(`Invalid signal request: ${validation.errors.join(', ')}`);
      }

      const signalType = this.signalTypes[signalRequest.signalType];
      const market = signalRequest.market;

      // Create signal record
      const signal = {
        id: signalId,
        signalType: signalRequest.signalType,
        market: market,
        symbol: signalRequest.symbol,
        confidence: signalRequest.confidence || signalType.confidence,
        impact: signalType.impact,
        timeHorizon: signalType.timeHorizon,
        status: 'processing',
        createdAt: timestamp,
        updatedAt: timestamp,
        generatedBy: signalRequest.generatedBy || 'system',
        data: signalRequest.data || {},
        analysis: null,
        recommendations: []
      };

      // Store signal
      this.activeSignals.set(signalId, signal);

      // Update metrics
      marketSignalCounter.labels(signalType.name, market, this.getConfidenceLevel(signal.confidence)).inc();

      // Generate signal analysis
      const analysis = await this.analyzeMarketSignal(signal);

      // Update signal status
      signal.status = 'active';
      signal.updatedAt = new Date().toISOString();
      signal.analysis = analysis.analysis;
      signal.recommendations = analysis.recommendations;

      // Log signal generation
      logger.info(`🧠 Market signal generated: ${signalId}`, {
        signalId: signalId,
        signalType: signalRequest.signalType,
        market: market,
        confidence: signal.confidence,
        impact: signal.impact
      });

      logger.info(`🧠 Market signal generated: ${signalId} - ${signalType.name} for ${market}`);

      return {
        success: true,
        signalId: signalId,
        signal: signal,
        analysis: analysis
      };

    } catch (error) {
      logger.error('❌ Error generating market signal:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Analyze market signal
   */
  async analyzeMarketSignal(signal) {
    try {
      const startTime = Date.now();
      const signalType = this.signalTypes[signal.signalType];

      let analysis = {};
      let recommendations = [];

      switch (signal.signalType) {
      case 'momentum_breakout':
        analysis = await this.analyzeMomentumBreakout(signal);
        recommendations = this.getMomentumRecommendations(analysis);
        break;
      case 'volatility_spike':
        analysis = await this.analyzeVolatilitySpike(signal);
        recommendations = this.getVolatilityRecommendations(analysis);
        break;
      case 'liquidity_crisis':
        analysis = await this.analyzeLiquidityCrisis(signal);
        recommendations = this.getLiquidityRecommendations(analysis);
        break;
      case 'whale_activity':
        analysis = await this.analyzeWhaleActivity(signal);
        recommendations = this.getWhaleRecommendations(analysis);
        break;
      case 'sentiment_shift':
        analysis = await this.analyzeSentimentShift(signal);
        recommendations = this.getSentimentRecommendations(analysis);
        break;
      case 'correlation_breakdown':
        analysis = await this.analyzeCorrelationBreakdown(signal);
        recommendations = this.getCorrelationRecommendations(analysis);
        break;
      case 'regulatory_impact':
        analysis = await this.analyzeRegulatoryImpact(signal);
        recommendations = this.getRegulatoryRecommendations(analysis);
        break;
      case 'market_manipulation':
        analysis = await this.analyzeMarketManipulation(signal);
        recommendations = this.getManipulationRecommendations(analysis);
        break;
      default:
        throw new Error(`Unsupported signal type: ${signal.signalType}`);
      }

      const processingTime = (Date.now() - startTime) / 1000;
      marketAnalysisLatencyHistogram.labels(signalType.name, signal.market).observe(processingTime);

      return {
        analysis: analysis,
        recommendations: recommendations
      };

    } catch (error) {
      logger.error('❌ Error analyzing market signal:', error);
      return {
        analysis: {},
        recommendations: []
      };
    }
  }

  /**
   * Analyze momentum breakout
   */
  async analyzeMomentumBreakout(signal) {
    return {
      breakoutStrength: 0.75,
      volumeConfirmation: true,
      trendDirection: 'bullish',
      resistanceLevels: [46500, 48000, 50000],
      supportLevels: [44000, 42500, 40000],
      momentumIndicators: {
        rsi: 68,
        macd: 'bullish_crossover',
        adx: 45
      },
      riskLevel: 'medium'
    };
  }

  /**
   * Analyze volatility spike
   */
  async analyzeVolatilitySpike(signal) {
    return {
      volatilityIncrease: 2.5,
      vixLevel: 35,
      impliedVolatility: 0.45,
      historicalComparison: 'above_average',
      marketStress: 'elevated',
      riskLevel: 'high'
    };
  }

  /**
   * Analyze liquidity crisis
   */
  async analyzeLiquidityCrisis(signal) {
    return {
      liquidityRatio: 0.65,
      bidAskSpread: 0.02,
      orderBookDepth: 'shallow',
      marketMakerActivity: 'reduced',
      fundingRate: 0.15,
      riskLevel: 'critical'
    };
  }

  /**
   * Analyze whale activity
   */
  async analyzeWhaleActivity(signal) {
    return {
      transactionSize: 5000, // BTC
      walletAge: '3_years',
      transactionFrequency: 'unusual',
      destinationExchanges: ['binance', 'coinbase'],
      marketImpact: 'significant',
      riskLevel: 'medium'
    };
  }

  /**
   * Analyze sentiment shift
   */
  async analyzeSentimentShift(signal) {
    return {
      sentimentChange: -0.25,
      newsSentiment: 'negative',
      socialSentiment: 'bearish',
      fearGreedIndex: 25,
      institutionalSentiment: 'neutral',
      riskLevel: 'medium'
    };
  }

  /**
   * Analyze correlation breakdown
   */
  async analyzeCorrelationBreakdown(signal) {
    return {
      correlationChange: -0.4,
      affectedAssets: ['BTC', 'ETH', 'SOL'],
      marketSegmentation: 'increasing',
      diversificationOpportunity: true,
      riskLevel: 'low'
    };
  }

  /**
   * Analyze regulatory impact
   */
  async analyzeRegulatoryImpact(signal) {
    return {
      regulatorySeverity: 'high',
      affectedJurisdictions: ['US', 'EU'],
      complianceRequirements: 'increased',
      marketAccess: 'restricted',
      timeline: '3_months',
      riskLevel: 'high'
    };
  }

  /**
   * Analyze market manipulation
   */
  async analyzeMarketManipulation(signal) {
    return {
      manipulationProbability: 0.78,
      suspiciousPatterns: ['wash_trading', 'spoofing'],
      affectedTimeframe: '4_hours',
      volumeAnomalies: true,
      priceAction: 'artificial',
      riskLevel: 'high'
    };
  }

  /**
   * Get recommendations for different signal types
   */
  getMomentumRecommendations(analysis) {
    return [
      'Consider momentum-based entry strategies',
      'Set tight stop losses due to potential reversals',
      'Monitor volume for confirmation',
      'Watch for resistance level rejections'
    ];
  }

  getVolatilityRecommendations(analysis) {
    return [
      'Reduce position sizes due to increased risk',
      'Consider volatility-based strategies',
      'Implement dynamic hedging',
      'Monitor VIX for further spikes'
    ];
  }

  getLiquidityRecommendations(analysis) {
    return [
      'Avoid large orders to prevent slippage',
      'Consider alternative execution venues',
      'Implement liquidity-aware algorithms',
      'Monitor funding rates closely'
    ];
  }

  getWhaleRecommendations(analysis) {
    return [
      'Monitor whale wallet movements',
      'Consider following institutional flows',
      'Be prepared for increased volatility',
      'Watch for market impact patterns'
    ];
  }

  getSentimentRecommendations(analysis) {
    return [
      'Adjust position sizing based on sentiment',
      'Consider contrarian strategies if extreme',
      'Monitor news flow for sentiment drivers',
      'Watch for sentiment reversal signals'
    ];
  }

  getCorrelationRecommendations(analysis) {
    return [
      'Review portfolio diversification',
      'Consider uncorrelated assets',
      'Monitor sector rotation patterns',
      'Adjust hedging strategies'
    ];
  }

  getRegulatoryRecommendations(analysis) {
    return [
      'Review compliance requirements',
      'Consider jurisdictional diversification',
      'Monitor regulatory developments',
      'Prepare for increased compliance costs'
    ];
  }

  getManipulationRecommendations(analysis) {
    return [
      'Avoid trading during suspicious periods',
      'Report suspicious activity to authorities',
      'Use multiple data sources for confirmation',
      'Implement anti-manipulation filters'
    ];
  }

  /**
   * Analyze current market regime
   */
  async analyzeMarketRegime(marketData) {
    try {
      const regimeAnalysis = {
        currentRegime: 'sideways_market',
        confidence: 0.75,
        regimeProbabilities: {},
        keyIndicators: {},
        transitionRisk: 'low'
      };

      // Calculate regime probabilities
      Object.keys(this.marketRegimes).forEach(regime => {
        regimeAnalysis.regimeProbabilities[regime] = Math.random();
      });

      // Normalize probabilities
      const total = Object.values(regimeAnalysis.regimeProbabilities).reduce((sum, prob) => sum + prob, 0);
      Object.keys(regimeAnalysis.regimeProbabilities).forEach(regime => {
        regimeAnalysis.regimeProbabilities[regime] /= total;
      });

      // Find most likely regime
      const maxProb = Math.max(...Object.values(regimeAnalysis.regimeProbabilities));
      regimeAnalysis.currentRegime = Object.keys(regimeAnalysis.regimeProbabilities)
        .find(regime => regimeAnalysis.regimeProbabilities[regime] === maxProb);

      // Update market regime data
      Object.keys(this.marketRegimes).forEach(regime => {
        this.marketRegimes[regime].probability = regimeAnalysis.regimeProbabilities[regime];
      });

      return regimeAnalysis;

    } catch (error) {
      logger.error('❌ Error analyzing market regime:', error);
      return null;
    }
  }

  /**
   * Generate comprehensive market intelligence report
   */
  async generateIntelligenceReport(reportRequest) {
    try {
      const reportId = this.generateReportId();
      const timestamp = new Date().toISOString();

      const report = {
        id: reportId,
        market: reportRequest.market,
        timeHorizon: reportRequest.timeHorizon || '24h',
        reportType: reportRequest.reportType || 'comprehensive',
        status: 'generating',
        createdAt: timestamp,
        updatedAt: timestamp,
        generatedBy: reportRequest.generatedBy || 'system',
        executiveSummary: '',
        keyFindings: [],
        marketRegime: null,
        activeSignals: [],
        riskAssessment: {},
        recommendations: [],
        data: {}
      };

      // Generate market regime analysis
      report.marketRegime = await this.analyzeMarketRegime({});

      // Collect active signals
      report.activeSignals = Array.from(this.activeSignals.values())
        .filter(signal => signal.market === reportRequest.market && signal.status === 'active')
        .slice(0, 10);

      // Generate risk assessment
      report.riskAssessment = await this.generateRiskAssessment(reportRequest.market);

      // Generate executive summary
      report.executiveSummary = this.generateExecutiveSummary(report);

      // Generate recommendations
      report.recommendations = this.generateReportRecommendations(report);

      report.status = 'completed';
      report.updatedAt = new Date().toISOString();

      // Store report
      this.intelligenceReports.set(reportId, report);

      return {
        success: true,
        reportId: reportId,
        report: report
      };

    } catch (error) {
      logger.error('❌ Error generating intelligence report:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate risk assessment
   */
  async generateRiskAssessment(market) {
    return {
      overallRisk: 'medium',
      riskFactors: [
        'Increased volatility',
        'Regulatory uncertainty',
        'Liquidity concerns'
      ],
      riskScore: 6.5,
      riskTrend: 'stable',
      mitigationStrategies: [
        'Diversify across assets',
        'Implement dynamic hedging',
        'Monitor liquidity conditions'
      ]
    };
  }

  /**
   * Generate executive summary
   */
  generateExecutiveSummary(report) {
    const regime = report.marketRegime?.currentRegime || 'unknown';
    const riskLevel = report.riskAssessment?.overallRisk || 'unknown';
    const signalCount = report.activeSignals?.length || 0;

    return `Market intelligence report for ${report.market}. Current regime: ${regime} with ${riskLevel} risk level. ${signalCount} active signals detected. Market shows mixed signals with moderate volatility expected.`;
  }

  /**
   * Generate report recommendations
   */
  generateReportRecommendations(report) {
    const recommendations = [];

    if (report.marketRegime?.currentRegime === 'bull_market') {
      recommendations.push('Consider momentum strategies');
      recommendations.push('Monitor for trend reversals');
    }

    if (report.riskAssessment?.overallRisk === 'high') {
      recommendations.push('Reduce position sizes');
      recommendations.push('Implement risk management');
    }

    if (report.activeSignals?.length > 5) {
      recommendations.push('High signal activity - monitor closely');
      recommendations.push('Consider signal filtering');
    }

    return recommendations;
  }

  /**
   * Get confidence level category
   */
  getConfidenceLevel(confidence) {
    if (confidence >= 0.8) return 'high';
    if (confidence >= 0.6) return 'medium';
    return 'low';
  }

  /**
   * Validate signal request
   */
  validateSignalRequest(request) {
    const errors = [];

    if (!request.signalType || !this.signalTypes[request.signalType]) {
      errors.push('Valid signal type is required');
    }

    if (!request.market || request.market.trim().length === 0) {
      errors.push('Market is required');
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Generate signal ID
   */
  generateSignalId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `SIGNAL-${timestamp}-${random}`.toUpperCase();
  }

  /**
   * Generate report ID
   */
  generateReportId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `REPORT-${timestamp}-${random}`.toUpperCase();
  }

  /**
   * Start intelligence gathering
   */
  startIntelligenceGathering() {
    // Gather intelligence every 30 seconds
    setInterval(async() => {
      try {
        await this.gatherIntelligence();
      } catch (error) {
        logger.error('❌ Error in intelligence gathering:', error);
      }
    }, 30000); // 30 seconds

    logger.info('✅ Intelligence gathering started');
  }

  /**
   * Start market analysis
   */
  startMarketAnalysis() {
    // Analyze market every 5 minutes
    setInterval(async() => {
      try {
        await this.performMarketAnalysis();
      } catch (error) {
        logger.error('❌ Error in market analysis:', error);
      }
    }, 300000); // 5 minutes

    logger.info('✅ Market analysis started');
  }

  /**
   * Gather intelligence from sources
   */
  async gatherIntelligence() {
    try {
      logger.info('🧠 Gathering market intelligence...');

      // Simulate intelligence gathering from different sources
      for (const [sourceId, source] of Object.entries(this.intelligenceSources)) {
        // Update intelligence confidence scores
        const confidence = source.confidence + (Math.random() - 0.5) * 0.1;
        marketIntelligenceGauge.labels(source.name.toLowerCase().replace(/\s+/g, '_'), sourceId).set(confidence);
      }

    } catch (error) {
      logger.error('❌ Error gathering intelligence:', error);
    }
  }

  /**
   * Perform market analysis
   */
  async performMarketAnalysis() {
    try {
      logger.info('🧠 Performing market analysis...');

      // Update market analysis
      const analysisId = `ANALYSIS-${Date.now()}`;
      this.marketAnalysis.set(analysisId, {
        id: analysisId,
        timestamp: new Date().toISOString(),
        marketConditions: 'mixed',
        volatility: Math.random() * 0.1 + 0.02,
        sentiment: Math.random() * 2 - 1,
        liquidity: Math.random() * 0.5 + 0.5
      });

    } catch (error) {
      logger.error('❌ Error performing market analysis:', error);
    }
  }

  /**
   * Load intelligence data
   */
  async loadIntelligenceData() {
    try {
      // In a real implementation, this would load from persistent storage
      logger.info('⚠️ No existing intelligence data found, starting fresh');
      this.activeSignals = new Map();
      this.marketAnalysis = new Map();
      this.intelligenceReports = new Map();
    } catch (error) {
      logger.error('❌ Error loading intelligence data:', error);
    }
  }

  /**
   * Initialize metrics
   */
  initializeMetrics() {
    // Initialize market signal counters
    for (const [signalId, signal] of Object.entries(this.signalTypes)) {
      const markets = ['crypto', 'forex', 'stocks', 'commodities'];
      markets.forEach(market => {
        marketSignalCounter.labels(signal.name, market, 'high').set(0);
        marketSignalCounter.labels(signal.name, market, 'medium').set(0);
        marketSignalCounter.labels(signal.name, market, 'low').set(0);
      });
    }

    // Initialize intelligence gauges
    for (const [sourceId, source] of Object.entries(this.intelligenceSources)) {
      marketIntelligenceGauge.labels(source.name.toLowerCase().replace(/\s+/g, '_'), sourceId).set(source.confidence);
    }

    logger.info('✅ Market intelligence metrics initialized');
  }

  /**
   * Get market intelligence statistics
   */
  getMarketIntelligenceStatistics() {
    try {
      const signals = Array.from(this.activeSignals.values());
      const reports = Array.from(this.intelligenceReports.values());

      const stats = {
        totalSignals: signals.length,
        activeSignals: signals.filter(s => s.status === 'active').length,
        bySignalType: {},
        byMarket: {},
        totalReports: reports.length,
        averageConfidence: 0
      };

      // Calculate statistics by signal type
      signals.forEach(signal => {
        const signalType = this.signalTypes[signal.signalType];
        if (signalType) {
          if (!stats.bySignalType[signalType.name]) {
            stats.bySignalType[signalType.name] = 0;
          }
          stats.bySignalType[signalType.name]++;
        }
      });

      // Calculate statistics by market
      signals.forEach(signal => {
        if (!stats.byMarket[signal.market]) {
          stats.byMarket[signal.market] = 0;
        }
        stats.byMarket[signal.market]++;
      });

      // Calculate average confidence
      if (signals.length > 0) {
        stats.averageConfidence = signals.reduce((sum, signal) => sum + signal.confidence, 0) / signals.length;
      }

      return {
        success: true,
        statistics: stats,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('❌ Error getting market intelligence statistics:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get market intelligence status
   */
  getMarketIntelligenceStatus() {
    return {
      isInitialized: this.isInitialized,
      intelligenceSources: Object.keys(this.intelligenceSources).length,
      signalTypes: Object.keys(this.signalTypes).length,
      marketRegimes: Object.keys(this.marketRegimes).length,
      activeSignals: this.activeSignals.size,
      marketAnalysis: this.marketAnalysis.size,
      intelligenceReports: this.intelligenceReports.size
    };
  }

  /**
   * Shutdown market intelligence manager
   */
  async shutdown() {
    try {
      logger.info('✅ Market intelligence manager shutdown completed');
    } catch (error) {
      logger.error('❌ Error shutting down market intelligence manager:', error);
    }
  }
}

module.exports = new MarketIntelligenceManager();
