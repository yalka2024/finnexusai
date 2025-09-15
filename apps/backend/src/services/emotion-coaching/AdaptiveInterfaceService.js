/**
 * FinAI Nexus - Adaptive Interface Service
 * 
 * Adapts the user interface based on detected emotional states
 * to provide optimal user experience and reduce stress.
 */

export class AdaptiveInterfaceService {
  constructor() {
    this.interfaceModes = {
      simplified: {
        name: 'Simplified Mode',
        description: 'Minimal interface for high-stress situations',
        features: ['basic_trading', 'portfolio_view', 'simple_charts'],
        hiddenFeatures: ['advanced_analytics', 'complex_options', 'derivatives'],
        colorScheme: 'calm',
        animations: 'reduced',
        notifications: 'essential_only'
      },
      standard: {
        name: 'Standard Mode',
        description: 'Normal interface with all standard features',
        features: ['all_standard_features'],
        hiddenFeatures: ['experimental_features'],
        colorScheme: 'default',
        animations: 'normal',
        notifications: 'normal'
      },
      advanced: {
        name: 'Advanced Mode',
        description: 'Full interface for confident users',
        features: ['all_features'],
        hiddenFeatures: [],
        colorScheme: 'vibrant',
        animations: 'enhanced',
        notifications: 'comprehensive'
      }
    };

    this.colorSchemes = {
      calm: {
        primary: '#4A90E2',
        secondary: '#7ED321',
        accent: '#50E3C2',
        background: '#F8F9FA',
        text: '#2C3E50',
        success: '#27AE60',
        warning: '#F39C12',
        error: '#E74C3C'
      },
      default: {
        primary: '#00D4FF',
        secondary: '#FF6B35',
        accent: '#7B68EE',
        background: '#0A0A0A',
        text: '#FFFFFF',
        success: '#00FF88',
        warning: '#FFB800',
        error: '#FF3B30'
      },
      vibrant: {
        primary: '#FF0080',
        secondary: '#00FF80',
        accent: '#8000FF',
        background: '#000000',
        text: '#FFFFFF',
        success: '#00FF00',
        warning: '#FFFF00',
        error: '#FF0000'
      }
    };

    this.animationSettings = {
      reduced: {
        duration: 0.1,
        easing: 'ease-out',
        scale: 0.95
      },
      normal: {
        duration: 0.3,
        easing: 'ease-in-out',
        scale: 1.0
      },
      enhanced: {
        duration: 0.5,
        easing: 'ease-in-out',
        scale: 1.05
      }
    };
  }

  /**
   * Adapt interface based on emotion state
   * @param {Object} emotionState - Current emotion state
   * @param {Object} userPreferences - User interface preferences
   * @returns {Object} Adapted interface configuration
   */
  adaptInterface(emotionState, userPreferences = {}) {
    const mode = this.determineInterfaceMode(emotionState, userPreferences);
    const configuration = this.buildInterfaceConfiguration(mode, emotionState, userPreferences);
    
    return {
      mode: mode,
      configuration: configuration,
      recommendations: this.generateInterfaceRecommendations(emotionState),
      timestamp: Date.now()
    };
  }

  /**
   * Determine appropriate interface mode based on emotion
   */
  determineInterfaceMode(emotionState, userPreferences) {
    const { overallStress, confidence, frustration, fear } = emotionState;
    
    // High stress or negative emotions -> Simplified mode
    if (overallStress > 0.7 || frustration > 0.6 || fear > 0.5) {
      return 'simplified';
    }
    
    // High confidence -> Advanced mode
    if (confidence > 0.8 && overallStress < 0.3) {
      return 'advanced';
    }
    
    // User preference override
    if (userPreferences.preferredMode) {
      return userPreferences.preferredMode;
    }
    
    // Default to standard mode
    return 'standard';
  }

  /**
   * Build interface configuration for the determined mode
   */
  buildInterfaceConfiguration(mode, emotionState, userPreferences) {
    const baseConfig = this.interfaceModes[mode];
    const colorScheme = this.getColorScheme(mode, emotionState);
    const animations = this.getAnimationSettings(mode, emotionState);
    
    return {
      ...baseConfig,
      colorScheme: colorScheme,
      animations: animations,
      layout: this.adaptLayout(emotionState),
      typography: this.adaptTypography(emotionState),
      spacing: this.adaptSpacing(emotionState),
      interactions: this.adaptInteractions(emotionState),
      notifications: this.adaptNotifications(emotionState),
      accessibility: this.adaptAccessibility(emotionState)
    };
  }

  /**
   * Get color scheme based on mode and emotion
   */
  getColorScheme(mode, emotionState) {
    const baseScheme = this.colorSchemes[mode];
    
    // Adjust colors based on emotion
    if (emotionState.overallStress > 0.6) {
      return {
        ...baseScheme,
        primary: this.darkenColor(baseScheme.primary, 0.2),
        background: this.lightenColor(baseScheme.background, 0.1)
      };
    }
    
    if (emotionState.confidence > 0.8) {
      return {
        ...baseScheme,
        primary: this.brightenColor(baseScheme.primary, 0.1),
        accent: this.brightenColor(baseScheme.accent, 0.1)
      };
    }
    
    return baseScheme;
  }

  /**
   * Get animation settings based on mode and emotion
   */
  getAnimationSettings(mode, emotionState) {
    const baseAnimations = this.animationSettings[mode];
    
    // Reduce animations for high stress
    if (emotionState.overallStress > 0.7) {
      return {
        ...baseAnimations,
        duration: baseAnimations.duration * 0.5,
        scale: Math.max(0.9, baseAnimations.scale - 0.1)
      };
    }
    
    // Enhance animations for high confidence
    if (emotionState.confidence > 0.8) {
      return {
        ...baseAnimations,
        duration: baseAnimations.duration * 1.2,
        scale: baseAnimations.scale + 0.05
      };
    }
    
    return baseAnimations;
  }

  /**
   * Adapt layout based on emotion state
   */
  adaptLayout(emotionState) {
    const layout = {
      density: 'normal',
      orientation: 'vertical',
      grouping: 'logical',
      hierarchy: 'clear'
    };
    
    // High stress -> simplified layout
    if (emotionState.overallStress > 0.7) {
      layout.density = 'sparse';
      layout.grouping = 'minimal';
      layout.hierarchy = 'flat';
    }
    
    // High confidence -> complex layout
    if (emotionState.confidence > 0.8) {
      layout.density = 'compact';
      layout.grouping = 'advanced';
      layout.hierarchy = 'detailed';
    }
    
    return layout;
  }

  /**
   * Adapt typography based on emotion state
   */
  adaptTypography(emotionState) {
    const typography = {
      fontSize: 'medium',
      fontWeight: 'normal',
      lineHeight: 'normal',
      letterSpacing: 'normal'
    };
    
    // High stress -> larger, clearer text
    if (emotionState.overallStress > 0.7) {
      typography.fontSize = 'large';
      typography.fontWeight = 'medium';
      typography.lineHeight = 'relaxed';
      typography.letterSpacing = 'wide';
    }
    
    // High confidence -> smaller, denser text
    if (emotionState.confidence > 0.8) {
      typography.fontSize = 'small';
      typography.fontWeight = 'light';
      typography.lineHeight = 'tight';
      typography.letterSpacing = 'narrow';
    }
    
    return typography;
  }

  /**
   * Adapt spacing based on emotion state
   */
  adaptSpacing(emotionState) {
    const spacing = {
      padding: 'normal',
      margin: 'normal',
      gap: 'normal'
    };
    
    // High stress -> more spacing
    if (emotionState.overallStress > 0.7) {
      spacing.padding = 'large';
      spacing.margin = 'large';
      spacing.gap = 'large';
    }
    
    // High confidence -> less spacing
    if (emotionState.confidence > 0.8) {
      spacing.padding = 'small';
      spacing.margin = 'small';
      spacing.gap = 'small';
    }
    
    return spacing;
  }

  /**
   * Adapt interactions based on emotion state
   */
  adaptInteractions(emotionState) {
    const interactions = {
      hoverEffects: true,
      clickAnimations: true,
      dragAndDrop: true,
      keyboardShortcuts: true,
      voiceCommands: true
    };
    
    // High stress -> reduce interactions
    if (emotionState.overallStress > 0.7) {
      interactions.hoverEffects = false;
      interactions.clickAnimations = false;
      interactions.dragAndDrop = false;
    }
    
    // High confidence -> enable all interactions
    if (emotionState.confidence > 0.8) {
      interactions.hoverEffects = true;
      interactions.clickAnimations = true;
      interactions.dragAndDrop = true;
      interactions.keyboardShortcuts = true;
      interactions.voiceCommands = true;
    }
    
    return interactions;
  }

  /**
   * Adapt notifications based on emotion state
   */
  adaptNotifications(emotionState) {
    const notifications = {
      frequency: 'normal',
      priority: 'medium',
      sound: true,
      vibration: true,
      popup: true
    };
    
    // High stress -> reduce notifications
    if (emotionState.overallStress > 0.7) {
      notifications.frequency = 'low';
      notifications.priority = 'high';
      notifications.sound = false;
      notifications.vibration = false;
      notifications.popup = false;
    }
    
    // High confidence -> more notifications
    if (emotionState.confidence > 0.8) {
      notifications.frequency = 'high';
      notifications.priority = 'low';
      notifications.sound = true;
      notifications.vibration = true;
      notifications.popup = true;
    }
    
    return notifications;
  }

  /**
   * Adapt accessibility features based on emotion state
   */
  adaptAccessibility(emotionState) {
    const accessibility = {
      highContrast: false,
      largeText: false,
      screenReader: false,
      voiceOver: false,
      reducedMotion: false
    };
    
    // High stress -> enhance accessibility
    if (emotionState.overallStress > 0.7) {
      accessibility.highContrast = true;
      accessibility.largeText = true;
      accessibility.screenReader = true;
      accessibility.voiceOver = true;
      accessibility.reducedMotion = true;
    }
    
    return accessibility;
  }

  /**
   * Generate interface recommendations based on emotion
   */
  generateInterfaceRecommendations(emotionState) {
    const recommendations = [];
    
    if (emotionState.overallStress > 0.7) {
      recommendations.push({
        type: 'stress_reduction',
        message: 'We\'ve simplified your interface to reduce stress',
        action: 'interface_simplified',
        priority: 'high'
      });
    }
    
    if (emotionState.frustration > 0.6) {
      recommendations.push({
        type: 'frustration_support',
        message: 'Take a break - your portfolio is safe',
        action: 'suggest_break',
        priority: 'medium'
      });
    }
    
    if (emotionState.confidence > 0.8) {
      recommendations.push({
        type: 'confidence_boost',
        message: 'You\'re doing great! Try some advanced features',
        action: 'show_advanced_features',
        priority: 'low'
      });
    }
    
    return recommendations;
  }

  /**
   * Utility functions for color manipulation
   */
  darkenColor(color, amount) {
    // Simple color darkening (in real implementation, use proper color library)
    return color;
  }

  lightenColor(color, amount) {
    // Simple color lightening (in real implementation, use proper color library)
    return color;
  }

  brightenColor(color, amount) {
    // Simple color brightening (in real implementation, use proper color library)
    return color;
  }

  /**
   * Get interface state for frontend
   */
  getInterfaceState(emotionState, userPreferences) {
    const adaptation = this.adaptInterface(emotionState, userPreferences);
    
    return {
      mode: adaptation.mode,
      colors: adaptation.configuration.colorScheme,
      animations: adaptation.configuration.animations,
      layout: adaptation.configuration.layout,
      typography: adaptation.configuration.typography,
      spacing: adaptation.configuration.spacing,
      interactions: adaptation.configuration.interactions,
      notifications: adaptation.configuration.notifications,
      accessibility: adaptation.configuration.accessibility,
      recommendations: adaptation.recommendations,
      timestamp: adaptation.timestamp
    };
  }
}

export default AdaptiveInterfaceService;
