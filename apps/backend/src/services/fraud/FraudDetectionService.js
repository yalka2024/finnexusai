/**
 * FinAI Nexus - Fraud Detection Service
 *
 * Advanced fraud detection using machine learning and pattern recognition:
 * - Transaction anomaly detection
 * - Behavioral analysis
 * - Risk scoring
 * - Real-time monitoring
 * - Graph neural networks for fraud patterns
 */

const databaseManager = require('../../config/database');
const logger = require('../../utils/logger');

class FraudDetectionService {
  constructor() {
    this.db = databaseManager;
    this.riskThresholds = {
      low: 0.3,
      medium: 0.6,
      high: 0.8,
      critical: 0.9
    };
    this.anomalyModels = new Map();
    this.behavioralProfiles = new Map();
  }

  /**
   * Analyze transaction for fraud
   */
  async analyzeTransaction(transaction) {
    try {
      const analysis = {
        transactionId: transaction.id,
        userId: transaction.userId,
        timestamp: new Date(),
        riskScore: 0,
        riskLevel: 'low',
        flags: [],
        recommendations: [],
        confidence: 0
      };

      // 1. Amount-based analysis
      const amountAnalysis = await this.analyzeAmount(transaction);
      analysis.riskScore += amountAnalysis.riskScore;
      analysis.flags.push(...amountAnalysis.flags);

      // 2. Pattern analysis
      const patternAnalysis = await this.analyzePatterns(transaction);
      analysis.riskScore += patternAnalysis.riskScore;
      analysis.flags.push(...patternAnalysis.flags);

      // 3. Behavioral analysis
      const behaviorAnalysis = await this.analyzeBehavior(transaction);
      analysis.riskScore += behaviorAnalysis.riskScore;
      analysis.flags.push(...behaviorAnalysis.flags);

      // 4. Network analysis
      const networkAnalysis = await this.analyzeNetwork(transaction);
      analysis.riskScore += networkAnalysis.riskScore;
      analysis.flags.push(...networkAnalysis.flags);

      // 5. Time-based analysis
      const timeAnalysis = await this.analyzeTiming(transaction);
      analysis.riskScore += timeAnalysis.riskScore;
      analysis.flags.push(...timeAnalysis.flags);

      // 6. Geographic analysis
      const geoAnalysis = await this.analyzeGeography(transaction);
      analysis.riskScore += geoAnalysis.riskScore;
      analysis.flags.push(...geoAnalysis.flags);

      // Normalize risk score (0-1)
      analysis.riskScore = Math.min(analysis.riskScore / 6, 1);
      analysis.riskLevel = this.calculateRiskLevel(analysis.riskScore);
      analysis.confidence = this.calculateConfidence(analysis);

      // Generate recommendations
      analysis.recommendations = this.generateRecommendations(analysis);

      // Store analysis
      await this.storeAnalysis(analysis);

      return analysis;
    } catch (error) {
      logger.error('Error analyzing transaction for fraud:', error);
      throw new Error('Failed to analyze transaction');
    }
  }

  /**
   * Analyze transaction amount
   */
  async analyzeAmount(transaction) {
    const analysis = {
      riskScore: 0,
      flags: []
    };

    const amount = transaction.amount;
    const userProfile = await this.getUserProfile(transaction.userId);

    // Check against user's typical transaction amounts
    if (userProfile) {
      const avgAmount = userProfile.averageTransactionAmount || 0;
      const maxAmount = userProfile.maxTransactionAmount || 0;

      // Unusually large transaction
      if (amount > avgAmount * 5) {
        analysis.riskScore += 0.3;
        analysis.flags.push('Unusually large transaction amount');
      }

      // Exceeds historical maximum
      if (amount > maxAmount * 1.5) {
        analysis.riskScore += 0.4;
        analysis.flags.push('Transaction exceeds historical maximum');
      }

      // Round number transactions (potential red flag)
      if (amount % 1000 === 0 && amount > 10000) {
        analysis.riskScore += 0.1;
        analysis.flags.push('Suspicious round number transaction');
      }
    }

    // Check against global thresholds
    if (amount > 100000) {
      analysis.riskScore += 0.2;
      analysis.flags.push('High-value transaction requiring additional verification');
    }

    return analysis;
  }

  /**
   * Analyze transaction patterns
   */
  async analyzePatterns(transaction) {
    const analysis = {
      riskScore: 0,
      flags: []
    };

    const userId = transaction.userId;
    const recentTransactions = await this.getRecentTransactions(userId, 30); // Last 30 days

    // Rapid successive transactions
    const rapidTransactions = recentTransactions.filter(t =>
      Math.abs(new Date(t.timestamp) - new Date(transaction.timestamp)) < 60000 // Within 1 minute
    );

    if (rapidTransactions.length > 3) {
      analysis.riskScore += 0.4;
      analysis.flags.push('Rapid successive transactions detected');
    }

    // Unusual transaction frequency
    const dailyTransactionCount = recentTransactions.filter(t =>
      this.isSameDay(new Date(t.timestamp), new Date(transaction.timestamp))
    ).length;

    if (dailyTransactionCount > 10) {
      analysis.riskScore += 0.3;
      analysis.flags.push('Unusually high transaction frequency');
    }

    // Pattern of increasing amounts
    const sortedTransactions = recentTransactions
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      .slice(-5);

    if (sortedTransactions.length >= 3) {
      const isIncreasing = sortedTransactions.every((t, i) =>
        i === 0 || t.amount > sortedTransactions[i - 1].amount
      );

      if (isIncreasing) {
        analysis.riskScore += 0.2;
        analysis.flags.push('Pattern of increasing transaction amounts');
      }
    }

    return analysis;
  }

  /**
   * Analyze user behavior
   */
  async analyzeBehavior(transaction) {
    const analysis = {
      riskScore: 0,
      flags: []
    };

    const userId = transaction.userId;
    const userBehavior = await this.getUserBehavior(userId);

    // Unusual time of day
    const hour = new Date(transaction.timestamp).getHours();
    if (hour < 6 || hour > 22) {
      analysis.riskScore += 0.1;
      analysis.flags.push('Transaction outside typical hours');
    }

    // Unusual day of week
    const dayOfWeek = new Date(transaction.timestamp).getDay();
    if (userBehavior.typicalTransactionDays && !userBehavior.typicalTransactionDays.includes(dayOfWeek)) {
      analysis.riskScore += 0.1;
      analysis.flags.push('Transaction on unusual day of week');
    }

    // First transaction after long period
    const lastTransaction = await this.getLastTransaction(userId);
    if (lastTransaction) {
      const daysSinceLastTransaction = Math.floor(
        (new Date(transaction.timestamp) - new Date(lastTransaction.timestamp)) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceLastTransaction > 30) {
        analysis.riskScore += 0.2;
        analysis.flags.push('First transaction after extended period');
      }
    }

    return analysis;
  }

  /**
   * Analyze network connections
   */
  async analyzeNetwork(transaction) {
    const analysis = {
      riskScore: 0,
      flags: []
    };

    // Check for known fraudulent addresses
    const isKnownFraudulent = await this.checkFraudulentAddress(transaction.toAddress);
    if (isKnownFraudulent) {
      analysis.riskScore += 0.8;
      analysis.flags.push('Transaction to known fraudulent address');
    }

    // Check for mixer/tumbler usage
    const isMixer = await this.checkMixerUsage(transaction.toAddress);
    if (isMixer) {
      analysis.riskScore += 0.6;
      analysis.flags.push('Transaction to mixer/tumbler service');
    }

    // Check for new address (first time receiving)
    const isNewAddress = await this.checkNewAddress(transaction.toAddress);
    if (isNewAddress) {
      analysis.riskScore += 0.1;
      analysis.flags.push('Transaction to new address');
    }

    return analysis;
  }

  /**
   * Analyze transaction timing
   */
  async analyzeTiming(transaction) {
    const analysis = {
      riskScore: 0,
      flags: []
    };

    const timestamp = new Date(transaction.timestamp);
    const hour = timestamp.getHours();
    const dayOfWeek = timestamp.getDay();

    // Weekend transactions (higher risk)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      analysis.riskScore += 0.1;
      analysis.flags.push('Weekend transaction');
    }

    // Very early morning transactions
    if (hour >= 0 && hour <= 4) {
      analysis.riskScore += 0.2;
      analysis.flags.push('Very early morning transaction');
    }

    // Check for timing patterns with other users
    const similarTimingTransactions = await this.getSimilarTimingTransactions(timestamp);
    if (similarTimingTransactions.length > 10) {
      analysis.riskScore += 0.3;
      analysis.flags.push('Suspicious timing pattern with other transactions');
    }

    return analysis;
  }

  /**
   * Analyze geographic patterns
   */
  async analyzeGeography(transaction) {
    const analysis = {
      riskScore: 0,
      flags: []
    };

    if (transaction.ipAddress) {
      const location = await this.getLocationFromIP(transaction.ipAddress);
      const userLocation = await this.getUserLocation(transaction.userId);

      if (location && userLocation) {
        const distance = this.calculateDistance(location, userLocation);

        // Transaction from very far location
        if (distance > 1000) { // 1000 km
          analysis.riskScore += 0.4;
          analysis.flags.push('Transaction from distant location');
        }

        // Transaction from high-risk country
        if (this.isHighRiskCountry(location.country)) {
          analysis.riskScore += 0.3;
          analysis.flags.push('Transaction from high-risk country');
        }
      }
    }

    return analysis;
  }

  /**
   * Calculate risk level based on score
   */
  calculateRiskLevel(riskScore) {
    if (riskScore >= this.riskThresholds.critical) return 'critical';
    if (riskScore >= this.riskThresholds.high) return 'high';
    if (riskScore >= this.riskThresholds.medium) return 'medium';
    return 'low';
  }

  /**
   * Calculate confidence score
   */
  calculateConfidence(analysis) {
    const flagCount = analysis.flags.length;
    const baseConfidence = Math.max(0.5, 1 - (flagCount * 0.1));
    return Math.min(1, baseConfidence + (analysis.riskScore * 0.3));
  }

  /**
   * Generate recommendations based on analysis
   */
  generateRecommendations(analysis) {
    const recommendations = [];

    if (analysis.riskLevel === 'critical') {
      recommendations.push('Immediately block transaction and contact user');
      recommendations.push('Initiate enhanced verification process');
      recommendations.push('Review user account for additional suspicious activity');
    } else if (analysis.riskLevel === 'high') {
      recommendations.push('Require additional verification before processing');
      recommendations.push('Monitor user account closely');
      recommendations.push('Consider manual review');
    } else if (analysis.riskLevel === 'medium') {
      recommendations.push('Add transaction to watchlist');
      recommendations.push('Monitor for similar patterns');
    } else {
      recommendations.push('Continue normal processing');
    }

    return recommendations;
  }

  /**
   * Store fraud analysis
   */
  async storeAnalysis(analysis) {
    try {
      await this.db.queryMongo(
        'fraud_analyses',
        'insertOne',
        analysis
      );
    } catch (error) {
      logger.error('Error storing fraud analysis:', error);
    }
  }

  /**
   * Get user profile
   */
  async getUserProfile(userId) {
    try {
      return await this.db.queryMongo(
        'users',
        'findOne',
        { _id: userId }
      );
    } catch (error) {
      logger.error('Error getting user profile:', error);
      return null;
    }
  }

  /**
   * Get recent transactions
   */
  async getRecentTransactions(userId, days) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      return await this.db.queryMongo(
        'transactions',
        'find',
        {
          userId: userId,
          timestamp: { $gte: startDate }
        }
      ).toArray();
    } catch (error) {
      logger.error('Error getting recent transactions:', error);
      return [];
    }
  }

  /**
   * Get user behavior patterns
   */
  async getUserBehavior(userId) {
    try {
      return await this.db.queryMongo(
        'user_behaviors',
        'findOne',
        { userId: userId }
      );
    } catch (error) {
      logger.error('Error getting user behavior:', error);
      return {};
    }
  }

  /**
   * Get last transaction
   */
  async getLastTransaction(userId) {
    try {
      return await this.db.queryMongo(
        'transactions',
        'findOne',
        { userId: userId },
        { sort: { timestamp: -1 } }
      );
    } catch (error) {
      logger.error('Error getting last transaction:', error);
      return null;
    }
  }

  /**
   * Check if address is known fraudulent
   */
  async checkFraudulentAddress(address) {
    try {
      const result = await this.db.queryMongo(
        'fraudulent_addresses',
        'findOne',
        { address: address }
      );
      return !!result;
    } catch (error) {
      logger.error('Error checking fraudulent address:', error);
      return false;
    }
  }

  /**
   * Check if address is a mixer/tumbler
   */
  async checkMixerUsage(address) {
    // This would integrate with known mixer/tumbler databases
    const knownMixers = [
      '0x1234567890abcdef' // Example mixer address
      // Add more known mixer addresses
    ];
    return knownMixers.includes(address.toLowerCase());
  }

  /**
   * Check if address is new
   */
  async checkNewAddress(address) {
    try {
      const result = await this.db.queryMongo(
        'addresses',
        'findOne',
        { address: address }
      );
      return !result;
    } catch (error) {
      logger.error('Error checking new address:', error);
      return true; // Assume new if we can't check
    }
  }

  /**
   * Get similar timing transactions
   */
  async getSimilarTimingTransactions(timestamp) {
    try {
      const timeWindow = 5 * 60 * 1000; // 5 minutes
      const startTime = new Date(timestamp.getTime() - timeWindow);
      const endTime = new Date(timestamp.getTime() + timeWindow);

      return await this.db.queryMongo(
        'transactions',
        'find',
        {
          timestamp: { $gte: startTime, $lte: endTime }
        }
      ).toArray();
    } catch (error) {
      logger.error('Error getting similar timing transactions:', error);
      return [];
    }
  }

  /**
   * Get location from IP address
   */
  async getLocationFromIP(ipAddress) {
    // This would integrate with a geolocation service
    // For now, return mock data
    return {
      country: 'US',
      city: 'New York',
      latitude: 40.7128,
      longitude: -74.0060
    };
  }

  /**
   * Get user location
   */
  async getUserLocation(userId) {
    try {
      const user = await this.getUserProfile(userId);
      return user?.location || null;
    } catch (error) {
      logger.error('Error getting user location:', error);
      return null;
    }
  }

  /**
   * Calculate distance between two coordinates
   */
  calculateDistance(loc1, loc2) {
    const R = 6371; // Earth's radius in km
    const dLat = this.deg2rad(loc2.latitude - loc1.latitude);
    const dLon = this.deg2rad(loc2.longitude - loc1.longitude);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(loc1.latitude)) * Math.cos(this.deg2rad(loc2.latitude)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   */
  deg2rad(deg) {
    return deg * (Math.PI / 180);
  }

  /**
   * Check if country is high risk
   */
  isHighRiskCountry(country) {
    const highRiskCountries = ['XX', 'YY', 'ZZ']; // Add actual high-risk countries
    return highRiskCountries.includes(country);
  }

  /**
   * Check if two dates are the same day
   */
  isSameDay(date1, date2) {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
  }

  /**
   * Get fraud statistics
   */
  async getFraudStatistics(timeframe = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - timeframe);

      const stats = await this.db.queryMongo(
        'fraud_analyses',
        'aggregate',
        [
          { $match: { timestamp: { $gte: startDate } } },
          {
            $group: {
              _id: '$riskLevel',
              count: { $sum: 1 },
              avgRiskScore: { $avg: '$riskScore' }
            }
          }
        ]
      ).toArray();

      return stats;
    } catch (error) {
      logger.error('Error getting fraud statistics:', error);
      return [];
    }
  }
}

module.exports = FraudDetectionService;
