const logger = require('../../utils/logger');
/**
 * FinAI Nexus - Emotion-Aware Interface Component
 * 
 * Advanced emotion-aware UX featuring:
 * - Real-time emotion detection
 * - Adaptive interface based on emotions
 * - Personalized user experience
 * - Emotional state tracking
 * - Contextual recommendations
 */

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from './Internationalization';

const EmotionAwareInterface = ({ onEmotionChange, onRecommendation }) => {
  const { t } = useTranslation();
  const [currentEmotion, setCurrentEmotion] = useState('neutral');
  const [emotionHistory, setEmotionHistory] = useState([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const [userPreferences, setUserPreferences] = useState({});
  const [adaptiveSettings, setAdaptiveSettings] = useState({});
  const [recommendations, setRecommendations] = useState([]);
  const [emotionalContext, setEmotionalContext] = useState({});

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const emotionDetectionRef = useRef(null);

  useEffect(() => {
    initializeEmotionDetection();
    loadUserPreferences();
    loadEmotionHistory();
  }, []);

  useEffect(() => {
    if (currentEmotion !== 'neutral') {
      adaptInterfaceToEmotion(currentEmotion);
      generateRecommendations(currentEmotion);
    }
  }, [currentEmotion]);

  const initializeEmotionDetection = async () => {
    try {
      // Check if camera access is available
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: 640, 
            height: 480,
            facingMode: 'user'
          } 
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        
        // Start emotion detection
        startEmotionDetection();
      } else {
        logger.warn('Camera access not available for emotion detection');
        // Fallback to mock emotion detection
        startMockEmotionDetection();
      }
    } catch (error) {
      logger.error('Error initializing emotion detection:', error);
      startMockEmotionDetection();
    }
  };

  const startEmotionDetection = () => {
    setIsDetecting(true);
    
    // This would integrate with a real emotion detection API
    // For now, we'll use a mock implementation
    const detectionInterval = setInterval(() => {
      const detectedEmotion = detectEmotionFromVideo();
      if (detectedEmotion && detectedEmotion !== currentEmotion) {
        setCurrentEmotion(detectedEmotion);
        updateEmotionHistory(detectedEmotion);
        
        if (onEmotionChange) {
          onEmotionChange(detectedEmotion);
        }
      }
    }, 1000);

    emotionDetectionRef.current = detectionInterval;
  };

  const startMockEmotionDetection = () => {
    setIsDetecting(true);
    
    // Mock emotion detection for demo purposes
    const emotions = ['happy', 'sad', 'angry', 'fearful', 'surprised', 'disgusted', 'neutral'];
    const detectionInterval = setInterval(() => {
      const randomEmotion = emotions[Math.floor(Math.random() * emotions.length)];
      if (randomEmotion !== currentEmotion) {
        setCurrentEmotion(randomEmotion);
        updateEmotionHistory(randomEmotion);
        
        if (onEmotionChange) {
          onEmotionChange(randomEmotion);
        }
      }
    }, 5000); // Change emotion every 5 seconds for demo

    emotionDetectionRef.current = detectionInterval;
  };

  const detectEmotionFromVideo = () => {
    // This would use computer vision to detect emotions from video
    // For now, return a mock emotion
    const emotions = ['happy', 'sad', 'angry', 'fearful', 'surprised', 'disgusted', 'neutral'];
    return emotions[Math.floor(Math.random() * emotions.length)];
  };

  const updateEmotionHistory = (emotion) => {
    const newEntry = {
      emotion,
      timestamp: new Date(),
      confidence: Math.random() * 0.3 + 0.7 // Mock confidence score
    };
    
    setEmotionHistory(prev => [...prev.slice(-9), newEntry]); // Keep last 10 entries
  };

  const adaptInterfaceToEmotion = (emotion) => {
    const adaptations = {
      happy: {
        theme: 'bright',
        colors: { primary: '#10B981', secondary: '#F59E0B' },
        animations: 'bounce',
        recommendations: 'aggressive_investing'
      },
      sad: {
        theme: 'calm',
        colors: { primary: '#3B82F6', secondary: '#8B5CF6' },
        animations: 'gentle',
        recommendations: 'conservative_investing'
      },
      angry: {
        theme: 'cool',
        colors: { primary: '#EF4444', secondary: '#F97316' },
        animations: 'minimal',
        recommendations: 'risk_management'
      },
      fearful: {
        theme: 'warm',
        colors: { primary: '#F59E0B', secondary: '#10B981' },
        animations: 'smooth',
        recommendations: 'safe_investments'
      },
      surprised: {
        theme: 'vibrant',
        colors: { primary: '#8B5CF6', secondary: '#EC4899' },
        animations: 'playful',
        recommendations: 'explore_options'
      },
      disgusted: {
        theme: 'clean',
        colors: { primary: '#6B7280', secondary: '#9CA3AF' },
        animations: 'subtle',
        recommendations: 'review_portfolio'
      },
      neutral: {
        theme: 'balanced',
        colors: { primary: '#00D4AA', secondary: '#3B82F6' },
        animations: 'standard',
        recommendations: 'maintain_strategy'
      }
    };

    const adaptation = adaptations[emotion] || adaptations.neutral;
    setAdaptiveSettings(adaptation);
    
    // Apply visual adaptations
    applyVisualAdaptations(adaptation);
  };

  const applyVisualAdaptations = (adaptation) => {
    // Apply CSS custom properties for dynamic theming
    const root = document.documentElement;
    root.style.setProperty('--emotion-primary', adaptation.colors.primary);
    root.style.setProperty('--emotion-secondary', adaptation.colors.secondary);
    root.style.setProperty('--emotion-theme', adaptation.theme);
    root.style.setProperty('--emotion-animation', adaptation.animations);
  };

  const generateRecommendations = (emotion) => {
    const emotionRecommendations = {
      happy: [
        { type: 'investment', message: 'Great mood! Consider exploring growth opportunities', action: 'explore_growth' },
        { type: 'portfolio', message: 'Your positive energy might be perfect for rebalancing', action: 'rebalance_portfolio' },
        { type: 'learning', message: 'Channel this energy into learning new investment strategies', action: 'start_learning' }
      ],
      sad: [
        { type: 'support', message: 'We understand you might be feeling down. Let\'s focus on stable investments', action: 'stable_investments' },
        { type: 'review', message: 'Take time to review your portfolio with a clear mind', action: 'review_portfolio' },
        { type: 'consultation', message: 'Consider speaking with a financial advisor', action: 'schedule_consultation' }
      ],
      angry: [
        { type: 'caution', message: 'Take a deep breath. Avoid making impulsive financial decisions', action: 'pause_trading' },
        { type: 'risk', message: 'Focus on risk management and portfolio protection', action: 'risk_management' },
        { type: 'break', message: 'Consider taking a break from active trading', action: 'take_break' }
      ],
      fearful: [
        { type: 'reassurance', message: 'It\'s okay to be cautious. Let\'s focus on safe, stable investments', action: 'safe_investments' },
        { type: 'education', message: 'Knowledge reduces fear. Learn about risk management', action: 'learn_risk_management' },
        { type: 'diversification', message: 'Diversification can help reduce investment anxiety', action: 'diversify_portfolio' }
      ],
      surprised: [
        { type: 'opportunity', message: 'Surprise! This might be a good time to explore new opportunities', action: 'explore_new_options' },
        { type: 'research', message: 'Use this moment to research new investment trends', action: 'research_trends' },
        { type: 'experiment', message: 'Consider small experiments with new investment strategies', action: 'small_experiments' }
      ],
      disgusted: [
        { type: 'cleanup', message: 'Time for a portfolio cleanup. Remove underperforming assets', action: 'cleanup_portfolio' },
        { type: 'review', message: 'Review and eliminate any investments that don\'t align with your values', action: 'review_values' },
        { type: 'fresh_start', message: 'Consider a fresh approach to your investment strategy', action: 'fresh_strategy' }
      ],
      neutral: [
        { type: 'maintain', message: 'Steady as you go. Continue with your current strategy', action: 'maintain_strategy' },
        { type: 'monitor', message: 'Keep monitoring your portfolio performance', action: 'monitor_performance' },
        { type: 'plan', message: 'Good time to plan for future financial goals', action: 'plan_goals' }
      ]
    };

    const emotionRecs = emotionRecommendations[emotion] || emotionRecommendations.neutral;
    setRecommendations(emotionRecs);
    
    if (onRecommendation) {
      onRecommendation(emotionRecs);
    }
  };

  const loadUserPreferences = async () => {
    try {
      const response = await fetch('/api/emotion/preferences');
      const data = await response.json();
      setUserPreferences(data.preferences || {});
    } catch (error) {
      logger.error('Error loading user preferences:', error);
    }
  };

  const loadEmotionHistory = async () => {
    try {
      const response = await fetch('/api/emotion/history');
      const data = await response.json();
      setEmotionHistory(data.history || []);
    } catch (error) {
      logger.error('Error loading emotion history:', error);
    }
  };

  const getEmotionIcon = (emotion) => {
    const icons = {
      happy: '😊',
      sad: '😢',
      angry: '😠',
      fearful: '😨',
      surprised: '😲',
      disgusted: '🤢',
      neutral: '😐'
    };
    return icons[emotion] || '😐';
  };

  const getEmotionColor = (emotion) => {
    const colors = {
      happy: 'text-green-400',
      sad: 'text-blue-400',
      angry: 'text-red-400',
      fearful: 'text-yellow-400',
      surprised: 'text-purple-400',
      disgusted: 'text-gray-400',
      neutral: 'text-gray-300'
    };
    return colors[emotion] || 'text-gray-300';
  };

  const getEmotionDescription = (emotion) => {
    const descriptions = {
      happy: 'Feeling positive and optimistic',
      sad: 'Feeling down or melancholic',
      angry: 'Feeling frustrated or irritated',
      fearful: 'Feeling anxious or worried',
      surprised: 'Feeling astonished or amazed',
      disgusted: 'Feeling repulsed or displeased',
      neutral: 'Feeling calm and balanced'
    };
    return descriptions[emotion] || 'Emotional state detected';
  };

  const stopEmotionDetection = () => {
    if (emotionDetectionRef.current) {
      clearInterval(emotionDetectionRef.current);
      emotionDetectionRef.current = null;
    }
    setIsDetecting(false);
  };

  const startEmotionDetectionHandler = () => {
    if (!isDetecting) {
      initializeEmotionDetection();
    }
  };

  return (
    <div className="emotion-aware-interface bg-gray-800 p-6 rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-neon">Emotion-Aware Interface</h2>
        <div className="flex items-center space-x-4">
          <div className={`w-3 h-3 rounded-full ${isDetecting ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-sm text-gray-400">
            {isDetecting ? 'Detecting' : 'Stopped'}
          </span>
        </div>
      </div>

      {/* Current Emotion Display */}
      <div className="mb-6 p-4 bg-gray-700 rounded-lg">
        <h3 className="text-lg font-semibold text-white mb-4">Current Emotional State</h3>
        <div className="flex items-center space-x-4">
          <div className="text-4xl">{getEmotionIcon(currentEmotion)}</div>
          <div>
            <div className={`text-xl font-bold capitalize ${getEmotionColor(currentEmotion)}`}>
              {currentEmotion}
            </div>
            <div className="text-sm text-gray-400">
              {getEmotionDescription(currentEmotion)}
            </div>
          </div>
          <div className="ml-auto">
            <button
              onClick={isDetecting ? stopEmotionDetection : startEmotionDetectionHandler}
              className={`px-4 py-2 rounded font-medium ${
                isDetecting
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-neon text-black hover:bg-neon/90'
              }`}
            >
              {isDetecting ? 'Stop Detection' : 'Start Detection'}
            </button>
          </div>
        </div>
      </div>

      {/* Emotion History */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-4">Emotion History</h3>
        <div className="flex space-x-2 overflow-x-auto">
          {emotionHistory.map((entry, index) => (
            <div
              key={index}
              className="flex-shrink-0 p-3 bg-gray-700 rounded-lg text-center min-w-[80px]"
            >
              <div className="text-2xl mb-1">{getEmotionIcon(entry.emotion)}</div>
              <div className="text-xs text-gray-400">
                {new Date(entry.timestamp).toLocaleTimeString()}
              </div>
              <div className="text-xs text-gray-300">
                {Math.round(entry.confidence * 100)}%
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Adaptive Settings */}
      {adaptiveSettings.theme && (
        <div className="mb-6 p-4 bg-gray-700 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-4">Adaptive Settings</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-gray-400">Theme</div>
              <div className="text-white font-medium capitalize">{adaptiveSettings.theme}</div>
            </div>
            <div>
              <div className="text-sm text-gray-400">Primary Color</div>
              <div className="flex items-center space-x-2">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: adaptiveSettings.colors?.primary }}
                ></div>
                <span className="text-white text-sm">{adaptiveSettings.colors?.primary}</span>
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-400">Animation</div>
              <div className="text-white font-medium capitalize">{adaptiveSettings.animations}</div>
            </div>
            <div>
              <div className="text-sm text-gray-400">Recommendation</div>
              <div className="text-white font-medium capitalize">
                {adaptiveSettings.recommendations?.replace('_', ' ')}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">Emotion-Based Recommendations</h3>
          <div className="space-y-3">
            {recommendations.map((rec, index) => (
              <div
                key={index}
                className="p-4 bg-gray-700 rounded-lg border border-gray-600 hover:border-neon transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-sm font-medium text-neon uppercase">
                        {rec.type}
                      </span>
                      <span className="text-xs text-gray-400">
                        {getEmotionIcon(currentEmotion)}
                      </span>
                    </div>
                    <p className="text-white mb-3">{rec.message}</p>
                    <button
                      onClick={() => {
                        // Handle recommendation action
                        logger.info('Action:', rec.action);
                      }}
                      className="bg-neon text-black px-4 py-2 rounded text-sm font-medium hover:bg-neon/90"
                    >
                      {rec.action.replace('_', ' ').toUpperCase()}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Video Feed (Hidden) */}
      <div className="hidden">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-auto"
        />
        <canvas
          ref={canvasRef}
          className="w-full h-auto"
        />
      </div>

      {/* Emotional Context */}
      <div className="mb-6 p-4 bg-gray-700 rounded-lg">
        <h3 className="text-lg font-semibold text-white mb-4">Emotional Context</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="text-sm text-gray-400">Current Mood</div>
            <div className={`text-lg font-bold ${getEmotionColor(currentEmotion)}`}>
              {currentEmotion.toUpperCase()}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-400">Detection Status</div>
            <div className="text-lg font-bold text-white">
              {isDetecting ? 'ACTIVE' : 'INACTIVE'}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-400">Recommendations</div>
            <div className="text-lg font-bold text-white">
              {recommendations.length} AVAILABLE
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmotionAwareInterface;
