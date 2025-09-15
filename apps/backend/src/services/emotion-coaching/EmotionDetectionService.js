/**
 * FinAI Nexus - Emotion Detection Service
 * 
 * This service detects user emotions through multiple modalities:
 * - Voice tone analysis
 * - Facial expression recognition
 * - Biometric stress indicators
 * - Behavioral patterns
 */

import { AffectivaSDK } from 'affectiva-sdk';
import { VoiceEmotionAnalyzer } from './VoiceEmotionAnalyzer.js';
import { BiometricSensor } from './BiometricSensor.js';
import { BehavioralAnalyzer } from './BehavioralAnalyzer.js';

export class EmotionDetectionService {
  constructor() {
    this.affectiva = new AffectivaSDK({
      appId: process.env.AFFECTIVA_APP_ID,
      appSecret: process.env.AFFECTIVA_APP_SECRET
    });
    
    this.voiceAnalyzer = new VoiceEmotionAnalyzer();
    this.biometricSensor = new BiometricSensor();
    this.behavioralAnalyzer = new BehavioralAnalyzer();
    
    this.emotionHistory = new Map();
    this.stressThresholds = {
      low: 0.3,
      medium: 0.6,
      high: 0.8,
      critical: 0.9
    };
  }

  /**
   * Detect user emotion from multiple input sources
   * @param {Object} userInput - User input data
   * @param {Buffer} userInput.audio - Audio data for voice analysis
   * @param {Buffer} userInput.video - Video data for facial analysis
   * @param {Object} userInput.biometrics - Biometric data (heart rate, etc.)
   * @param {Object} userInput.behavior - User behavior patterns
   * @returns {Promise<EmotionState>} Detected emotion state
   */
  async detectEmotion(userInput) {
    try {
      const [voiceEmotion, facialEmotion, biometricStress, behavioralPattern] = await Promise.all([
        this.analyzeVoiceEmotion(userInput.audio),
        this.analyzeFacialEmotion(userInput.video),
        this.analyzeBiometricStress(userInput.biometrics),
        this.analyzeBehavioralPattern(userInput.behavior)
      ]);

      const emotionState = this.aggregateEmotionData({
        voice: voiceEmotion,
        facial: facialEmotion,
        biometric: biometricStress,
        behavioral: behavioralPattern
      });

      // Store emotion history for pattern analysis
      this.updateEmotionHistory(userInput.userId, emotionState);

      return emotionState;
    } catch (error) {
      console.error('Emotion detection failed:', error);
      return this.getDefaultEmotionState();
    }
  }

  /**
   * Analyze voice emotion using advanced NLP and acoustic features
   */
  async analyzeVoiceEmotion(audioData) {
    if (!audioData) return { confidence: 0, emotions: {} };

    const voiceFeatures = await this.voiceAnalyzer.extractFeatures(audioData);
    
    return {
      confidence: voiceFeatures.confidence,
      emotions: {
        stress: voiceFeatures.stressLevel,
        confidence: voiceFeatures.confidenceLevel,
        excitement: voiceFeatures.excitementLevel,
        frustration: voiceFeatures.frustrationLevel
      },
      timestamp: Date.now()
    };
  }

  /**
   * Analyze facial emotions using Affectiva SDK
   */
  async analyzeFacialEmotion(videoData) {
    if (!videoData) return { confidence: 0, emotions: {} };

    const facialData = await this.affectiva.analyzeFrame(videoData);
    
    return {
      confidence: facialData.confidence,
      emotions: {
        joy: facialData.joy,
        anger: facialData.anger,
        fear: facialData.fear,
        sadness: facialData.sadness,
        surprise: facialData.surprise,
        disgust: facialData.disgust,
        contempt: facialData.contempt
      },
      timestamp: Date.now()
    };
  }

  /**
   * Analyze biometric stress indicators
   */
  async analyzeBiometricStress(biometricData) {
    if (!biometricData) return { stressLevel: 0, confidence: 0 };

    const stressMetrics = await this.biometricSensor.calculateStress(biometricData);
    
    return {
      stressLevel: stressMetrics.overallStress,
      confidence: stressMetrics.confidence,
      indicators: {
        heartRate: stressMetrics.heartRateVariability,
        skinConductance: stressMetrics.skinConductance,
        bloodPressure: stressMetrics.bloodPressure
      },
      timestamp: Date.now()
    };
  }

  /**
   * Analyze behavioral patterns for emotion indicators
   */
  async analyzeBehavioralPattern(behaviorData) {
    if (!behaviorData) return { patterns: {}, confidence: 0 };

    const patterns = await this.behavioralAnalyzer.analyzePatterns(behaviorData);
    
    return {
      patterns: {
        tradingFrequency: patterns.tradingFrequency,
        riskTolerance: patterns.riskTolerance,
        decisionSpeed: patterns.decisionSpeed,
        errorRate: patterns.errorRate
      },
      confidence: patterns.confidence,
      timestamp: Date.now()
    };
  }

  /**
   * Aggregate emotion data from all sources
   */
  aggregateEmotionData(sources) {
    const weights = {
      voice: 0.3,
      facial: 0.25,
      biometric: 0.25,
      behavioral: 0.2
    };

    const aggregatedEmotion = {
      overallStress: 0,
      confidence: 0,
      excitement: 0,
      frustration: 0,
      joy: 0,
      fear: 0,
      anger: 0,
      sadness: 0,
      surprise: 0,
      disgust: 0,
      contempt: 0,
      sources: sources,
      timestamp: Date.now()
    };

    // Weighted aggregation
    Object.keys(weights).forEach(source => {
      const data = sources[source];
      if (data && data.confidence > 0.5) {
        const weight = weights[source];
        
        // Aggregate stress indicators
        if (data.emotions?.stress) {
          aggregatedEmotion.overallStress += data.emotions.stress * weight;
        }
        
        // Aggregate other emotions
        Object.keys(aggregatedEmotion).forEach(emotion => {
          if (data.emotions?.[emotion] && typeof data.emotions[emotion] === 'number') {
            aggregatedEmotion[emotion] += data.emotions[emotion] * weight;
          }
        });
        
        // Update confidence
        aggregatedEmotion.confidence += data.confidence * weight;
      }
    });

    // Normalize values
    aggregatedEmotion.overallStress = Math.min(1, Math.max(0, aggregatedEmotion.overallStress));
    aggregatedEmotion.confidence = Math.min(1, Math.max(0, aggregatedEmotion.confidence));

    return aggregatedEmotion;
  }

  /**
   * Update emotion history for pattern analysis
   */
  updateEmotionHistory(userId, emotionState) {
    if (!this.emotionHistory.has(userId)) {
      this.emotionHistory.set(userId, []);
    }

    const history = this.emotionHistory.get(userId);
    history.push(emotionState);

    // Keep only last 100 entries
    if (history.length > 100) {
      history.shift();
    }

    this.emotionHistory.set(userId, history);
  }

  /**
   * Get emotion patterns for a user
   */
  getEmotionPatterns(userId) {
    const history = this.emotionHistory.get(userId) || [];
    
    if (history.length < 5) {
      return { patterns: [], confidence: 0 };
    }

    // Analyze patterns over time
    const patterns = this.behavioralAnalyzer.identifyPatterns(history);
    
    return {
      patterns: patterns,
      confidence: patterns.length > 0 ? 0.8 : 0.2,
      trend: this.calculateEmotionTrend(history),
      recommendations: this.generateEmotionRecommendations(patterns)
    };
  }

  /**
   * Calculate emotion trend over time
   */
  calculateEmotionTrend(history) {
    if (history.length < 3) return 'stable';

    const recent = history.slice(-3);
    const older = history.slice(-6, -3);

    const recentAvg = recent.reduce((sum, h) => sum + h.overallStress, 0) / recent.length;
    const olderAvg = older.length > 0 ? 
      older.reduce((sum, h) => sum + h.overallStress, 0) / older.length : recentAvg;

    const change = recentAvg - olderAvg;

    if (change > 0.1) return 'increasing';
    if (change < -0.1) return 'decreasing';
    return 'stable';
  }

  /**
   * Generate emotion-based recommendations
   */
  generateEmotionRecommendations(patterns) {
    const recommendations = [];

    patterns.forEach(pattern => {
      if (pattern.type === 'high_stress_trading') {
        recommendations.push({
          type: 'stress_management',
          message: 'Consider taking a break from trading when stressed',
          priority: 'high',
          action: 'suggest_break'
        });
      }

      if (pattern.type === 'frustration_pattern') {
        recommendations.push({
          type: 'emotional_support',
          message: 'Your portfolio is performing well - stay positive!',
          priority: 'medium',
          action: 'encourage'
        });
      }

      if (pattern.type === 'confidence_boost') {
        recommendations.push({
          type: 'positive_reinforcement',
          message: 'Great job! Your recent decisions show good judgment',
          priority: 'low',
          action: 'praise'
        });
      }
    });

    return recommendations;
  }

  /**
   * Get default emotion state when detection fails
   */
  getDefaultEmotionState() {
    return {
      overallStress: 0.3,
      confidence: 0.5,
      excitement: 0.2,
      frustration: 0.1,
      joy: 0.4,
      fear: 0.1,
      anger: 0.05,
      sadness: 0.1,
      surprise: 0.1,
      disgust: 0.05,
      contempt: 0.05,
      sources: {},
      timestamp: Date.now()
    };
  }

  /**
   * Determine if user needs emotional support
   */
  needsEmotionalSupport(emotionState) {
    return emotionState.overallStress > this.stressThresholds.high ||
           emotionState.frustration > 0.7 ||
           emotionState.fear > 0.6 ||
           emotionState.anger > 0.5;
  }

  /**
   * Get appropriate interface adaptation based on emotion
   */
  getInterfaceAdaptation(emotionState) {
    if (emotionState.overallStress > this.stressThresholds.high) {
      return {
        mode: 'simplified',
        features: ['basic_trading', 'portfolio_view'],
        hideFeatures: ['advanced_analytics', 'complex_options'],
        message: 'We\'ve simplified the interface to help you focus'
      };
    }

    if (emotionState.confidence > 0.8) {
      return {
        mode: 'advanced',
        features: ['all_features'],
        hideFeatures: [],
        message: 'You\'re doing great! Here are some advanced options'
      };
    }

    return {
      mode: 'standard',
      features: ['standard_features'],
      hideFeatures: [],
      message: 'Welcome back! Here\'s your dashboard'
    };
  }
}

export default EmotionDetectionService;
