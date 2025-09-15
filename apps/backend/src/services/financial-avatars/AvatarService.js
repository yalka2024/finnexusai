/**
 * FinAI Nexus - Financial Avatar Service
 * 
 * Creates and manages AI-driven financial avatars for personalized
 * education, mentoring, and gamified learning experiences.
 */

import { xAIGrokAPI } from '../ai/xAIGrokAPI.js';
import { ElevenLabsAPI } from '../ai/ElevenLabsAPI.js';
import { ARRenderer } from '../ar/ARRenderer.js';
import { GamificationEngine } from './GamificationEngine.js';

export class AvatarService {
  constructor() {
    this.grokAPI = new xAIGrokAPI();
    this.voiceAPI = new ElevenLabsAPI();
    this.arRenderer = new ARRenderer();
    this.gamification = new GamificationEngine();
    
    this.avatarTemplates = {
      conservative: {
        personality: 'conservative',
        teachingStyle: 'methodical',
        voiceType: 'calm',
        appearance: 'professional',
        expertise: ['budgeting', 'savings', 'low_risk_investing']
      },
      aggressive: {
        personality: 'aggressive',
        teachingStyle: 'dynamic',
        voiceType: 'energetic',
        appearance: 'bold',
        expertise: ['trading', 'crypto', 'high_risk_investing']
      },
      balanced: {
        personality: 'balanced',
        teachingStyle: 'adaptive',
        voiceType: 'friendly',
        appearance: 'approachable',
        expertise: ['portfolio_diversification', 'risk_management', 'long_term_investing']
      },
      beginner: {
        personality: 'patient',
        teachingStyle: 'step_by_step',
        voiceType: 'encouraging',
        appearance: 'welcoming',
        expertise: ['financial_literacy', 'basic_investing', 'debt_management']
      }
    };

    this.learningModules = {
      budgeting: {
        title: 'Personal Budgeting',
        difficulty: 'beginner',
        duration: '30 minutes',
        topics: ['income_tracking', 'expense_categorization', 'savings_goals']
      },
      investing: {
        title: 'Investment Basics',
        difficulty: 'intermediate',
        duration: '45 minutes',
        topics: ['asset_classes', 'risk_return', 'portfolio_construction']
      },
      trading: {
        title: 'Active Trading',
        difficulty: 'advanced',
        duration: '60 minutes',
        topics: ['technical_analysis', 'market_timing', 'risk_management']
      },
      defi: {
        title: 'Decentralized Finance',
        difficulty: 'intermediate',
        duration: '40 minutes',
        topics: ['yield_farming', 'liquidity_pools', 'smart_contracts']
      }
    };
  }

  /**
   * Create a personalized financial avatar
   * @param {Object} userProfile - User profile and preferences
   * @param {Object} avatarPreferences - Avatar customization options
   * @returns {Promise<Object>} Created avatar
   */
  async createAvatar(userProfile, avatarPreferences = {}) {
    try {
      const avatarConfig = await this.generateAvatarConfig(userProfile, avatarPreferences);
      const avatar = await this.buildAvatar(avatarConfig);
      
      // Store avatar in database
      await this.saveAvatar(userProfile.userId, avatar);
      
      return avatar;
    } catch (error) {
      console.error('Avatar creation failed:', error);
      throw new Error('Failed to create financial avatar');
    }
  }

  /**
   * Generate avatar configuration based on user profile
   */
  async generateAvatarConfig(userProfile, avatarPreferences) {
    const baseTemplate = this.selectBaseTemplate(userProfile);
    const personality = await this.generatePersonality(userProfile, baseTemplate);
    const voice = await this.generateVoice(personality, avatarPreferences);
    const appearance = await this.generateAppearance(personality, avatarPreferences);
    
    return {
      userId: userProfile.userId,
      name: avatarPreferences.name || await this.generateName(personality),
      personality: personality,
      voice: voice,
      appearance: appearance,
      expertise: this.selectExpertise(userProfile, baseTemplate),
      teachingStyle: personality.teachingStyle,
      preferences: avatarPreferences,
      createdAt: new Date(),
      isActive: true
    };
  }

  /**
   * Select base template based on user profile
   */
  selectBaseTemplate(userProfile) {
    const { experienceLevel, riskTolerance, goals } = userProfile;
    
    if (experienceLevel === 'beginner') {
      return this.avatarTemplates.beginner;
    }
    
    if (riskTolerance === 'high' && experienceLevel === 'advanced') {
      return this.avatarTemplates.aggressive;
    }
    
    if (riskTolerance === 'low') {
      return this.avatarTemplates.conservative;
    }
    
    return this.avatarTemplates.balanced;
  }

  /**
   * Generate personality using AI
   */
  async generatePersonality(userProfile, baseTemplate) {
    const prompt = `
      Create a financial advisor personality for a user with:
      - Experience: ${userProfile.experienceLevel}
      - Risk Tolerance: ${userProfile.riskTolerance}
      - Goals: ${userProfile.goals.join(', ')}
      - Base Template: ${baseTemplate.personality}
      
      Generate a personality that includes:
      - Communication style
      - Teaching approach
      - Motivational techniques
      - Expertise areas
      - Interaction preferences
    `;
    
    const personalityData = await this.grokAPI.generateResponse(prompt);
    
    return {
      ...baseTemplate,
      communicationStyle: personalityData.communicationStyle,
      teachingApproach: personalityData.teachingApproach,
      motivationalTechniques: personalityData.motivationalTechniques,
      interactionPreferences: personalityData.interactionPreferences,
      aiGenerated: true
    };
  }

  /**
   * Generate voice characteristics
   */
  async generateVoice(personality, avatarPreferences) {
    const voiceConfig = {
      type: avatarPreferences.voiceType || personality.voiceType,
      gender: avatarPreferences.gender || 'neutral',
      age: avatarPreferences.age || 'adult',
      accent: avatarPreferences.accent || 'neutral',
      speed: personality.teachingStyle === 'step_by_step' ? 'slow' : 'normal',
      pitch: personality.personality === 'aggressive' ? 'high' : 'medium'
    };
    
    // Generate voice using ElevenLabs
    const voiceId = await this.voiceAPI.createVoice(voiceConfig);
    
    return {
      voiceId: voiceId,
      config: voiceConfig,
      samples: await this.voiceAPI.generateSamples(voiceId, [
        'Welcome to your financial journey!',
        'Let\'s start with the basics.',
        'Great job! You\'re making progress.',
        'Remember, investing is a marathon, not a sprint.'
      ])
    };
  }

  /**
   * Generate appearance characteristics
   */
  async generateAppearance(personality, avatarPreferences) {
    const appearanceConfig = {
      style: avatarPreferences.appearanceStyle || personality.appearance,
      gender: avatarPreferences.gender || 'neutral',
      age: avatarPreferences.age || 'adult',
      clothing: this.selectClothing(personality),
      accessories: this.selectAccessories(personality),
      expressions: this.generateExpressions(personality)
    };
    
    return {
      config: appearanceConfig,
      arModel: await this.arRenderer.generateAvatarModel(appearanceConfig),
      animations: await this.generateAnimations(personality)
    };
  }

  /**
   * Build complete avatar from configuration
   */
  async buildAvatar(avatarConfig) {
    return {
      id: this.generateAvatarId(),
      userId: avatarConfig.userId,
      name: avatarConfig.name,
      personality: avatarConfig.personality,
      voice: avatarConfig.voice,
      appearance: avatarConfig.appearance,
      expertise: avatarConfig.expertise,
      teachingStyle: avatarConfig.teachingStyle,
      preferences: avatarConfig.preferences,
      stats: {
        lessonsCompleted: 0,
        totalTimeSpent: 0,
        userRating: 0,
        lastActive: new Date()
      },
      createdAt: avatarConfig.createdAt,
      isActive: avatarConfig.isActive
    };
  }

  /**
   * Create a financial lesson with avatar
   */
  async createLesson(avatar, moduleType, userLevel) {
    const module = this.learningModules[moduleType];
    if (!module) {
      throw new Error(`Unknown learning module: ${moduleType}`);
    }
    
    const lesson = await this.generateLessonContent(avatar, module, userLevel);
    const interactiveElements = await this.createInteractiveElements(lesson, avatar);
    const gamification = await this.gamification.createLessonGamification(lesson);
    
    return {
      id: this.generateLessonId(),
      avatarId: avatar.id,
      module: module,
      content: lesson,
      interactiveElements: interactiveElements,
      gamification: gamification,
      estimatedDuration: module.duration,
      difficulty: module.difficulty,
      createdAt: new Date()
    };
  }

  /**
   * Generate lesson content using AI
   */
  async generateLessonContent(avatar, module, userLevel) {
    const prompt = `
      Create a financial lesson about ${module.title} for a ${userLevel} level user.
      The lesson should be taught by an avatar with personality: ${avatar.personality.personality}
      and teaching style: ${avatar.personality.teachingStyle}.
      
      Include:
      - Learning objectives
      - Step-by-step content
      - Examples and analogies
      - Interactive questions
      - Practical exercises
      - Key takeaways
      
      Make it engaging and personalized to the avatar's personality.
    `;
    
    const content = await this.grokAPI.generateResponse(prompt);
    
    return {
      title: module.title,
      objectives: content.objectives,
      content: content.steps,
      examples: content.examples,
      questions: content.questions,
      exercises: content.exercises,
      takeaways: content.takeaways,
      personalizedFor: avatar.name
    };
  }

  /**
   * Create interactive elements for the lesson
   */
  async createInteractiveElements(lesson, avatar) {
    const elements = [];
    
    // Interactive questions
    lesson.questions.forEach((question, index) => {
      elements.push({
        type: 'question',
        id: `question_${index}`,
        content: question,
        avatarResponse: await this.generateAvatarResponse(avatar, question),
        correctAnswer: question.correctAnswer,
        explanation: question.explanation
      });
    });
    
    // Interactive exercises
    lesson.exercises.forEach((exercise, index) => {
      elements.push({
        type: 'exercise',
        id: `exercise_${index}`,
        content: exercise,
        avatarGuidance: await this.generateAvatarGuidance(avatar, exercise),
        solution: exercise.solution,
        hints: exercise.hints
      });
    });
    
    // AR/VR elements
    if (lesson.arElements) {
      elements.push({
        type: 'ar_element',
        content: lesson.arElements,
        avatarModel: avatar.appearance.arModel,
        animations: avatar.appearance.animations
      });
    }
    
    return elements;
  }

  /**
   * Generate avatar response to user input
   */
  async generateAvatarResponse(avatar, userInput) {
    const prompt = `
      Respond as ${avatar.name}, a financial advisor with personality: ${avatar.personality.personality}
      and teaching style: ${avatar.personality.teachingStyle}.
      
      User input: ${userInput}
      
      Respond in character, being helpful and educational while maintaining the avatar's personality.
    `;
    
    return await this.grokAPI.generateResponse(prompt);
  }

  /**
   * Generate avatar guidance for exercises
   */
  async generateAvatarGuidance(avatar, exercise) {
    const prompt = `
      Provide guidance for this financial exercise as ${avatar.name}:
      Exercise: ${exercise.description}
      
      Give helpful hints and encouragement while maintaining the avatar's personality.
    `;
    
    return await this.grokAPI.generateResponse(prompt);
  }

  /**
   * Utility functions
   */
  selectExpertise(userProfile, baseTemplate) {
    const allExpertise = baseTemplate.expertise;
    const userGoals = userProfile.goals || [];
    
    // Prioritize expertise based on user goals
    const prioritizedExpertise = userGoals.reduce((expertise, goal) => {
      if (goal.includes('budget') && allExpertise.includes('budgeting')) {
        expertise.unshift('budgeting');
      }
      if (goal.includes('invest') && allExpertise.includes('low_risk_investing')) {
        expertise.unshift('low_risk_investing');
      }
      if (goal.includes('trade') && allExpertise.includes('trading')) {
        expertise.unshift('trading');
      }
      return expertise;
    }, [...allExpertise]);
    
    return [...new Set(prioritizedExpertise)];
  }

  selectClothing(personality) {
    const clothingStyles = {
      conservative: 'business_suit',
      aggressive: 'casual_modern',
      balanced: 'smart_casual',
      patient: 'friendly_casual'
    };
    
    return clothingStyles[personality.personality] || 'smart_casual';
  }

  selectAccessories(personality) {
    const accessories = {
      conservative: ['glasses', 'watch'],
      aggressive: ['headphones', 'smartwatch'],
      balanced: ['glasses', 'watch'],
      patient: ['glasses', 'friendly_smile']
    };
    
    return accessories[personality.personality] || ['glasses'];
  }

  generateExpressions(personality) {
    return {
      encouraging: 'smile',
      explaining: 'thoughtful',
      celebrating: 'excited',
      concerned: 'worried',
      confident: 'determined'
    };
  }

  async generateAnimations(personality) {
    return {
      idle: 'gentle_breathing',
      talking: 'natural_gestures',
      explaining: 'pointing_gestures',
      celebrating: 'clapping',
      thinking: 'chin_stroke'
    };
  }

  async generateName(personality) {
    const names = {
      conservative: ['Alexander', 'Victoria', 'Robert', 'Elizabeth'],
      aggressive: ['Max', 'Alex', 'Sam', 'Jordan'],
      balanced: ['Chris', 'Taylor', 'Morgan', 'Casey'],
      patient: ['David', 'Sarah', 'Michael', 'Lisa']
    };
    
    const nameList = names[personality.personality] || names.balanced;
    return nameList[Math.floor(Math.random() * nameList.length)];
  }

  generateAvatarId() {
    return `avatar_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateLessonId() {
    return `lesson_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async saveAvatar(userId, avatar) {
    // In real implementation, save to database
    console.log(`Saving avatar ${avatar.id} for user ${userId}`);
  }
}

export default AvatarService;
