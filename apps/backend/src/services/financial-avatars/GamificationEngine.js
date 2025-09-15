/**
 * FinAI Nexus - Gamification Engine
 * 
 * Handles gamification elements for financial education including:
 * - Achievement systems
 * - Progress tracking
 * - Reward mechanisms
 * - Leaderboards
 * - $NEXUS token rewards
 */

export class GamificationEngine {
  constructor() {
    this.achievements = {
      beginner: [
        { id: 'first_lesson', name: 'First Steps', description: 'Complete your first lesson', points: 100, tokenReward: 10 },
        { id: 'budget_master', name: 'Budget Master', description: 'Complete budgeting module', points: 500, tokenReward: 50 },
        { id: 'savings_hero', name: 'Savings Hero', description: 'Save $1000', points: 1000, tokenReward: 100 },
        { id: 'debt_free', name: 'Debt Free', description: 'Pay off all debt', points: 2000, tokenReward: 200 }
      ],
      intermediate: [
        { id: 'investor_novice', name: 'Investor Novice', description: 'Make first investment', points: 300, tokenReward: 30 },
        { id: 'portfolio_builder', name: 'Portfolio Builder', description: 'Build diversified portfolio', points: 800, tokenReward: 80 },
        { id: 'risk_manager', name: 'Risk Manager', description: 'Complete risk management course', points: 600, tokenReward: 60 },
        { id: 'market_analyst', name: 'Market Analyst', description: 'Analyze 10 market trends', points: 400, tokenReward: 40 }
      ],
      advanced: [
        { id: 'trading_pro', name: 'Trading Pro', description: 'Execute 100 successful trades', points: 1500, tokenReward: 150 },
        { id: 'defi_explorer', name: 'DeFi Explorer', description: 'Explore DeFi protocols', points: 1000, tokenReward: 100 },
        { id: 'yield_farmer', name: 'Yield Farmer', description: 'Earn yield from farming', points: 1200, tokenReward: 120 },
        { id: 'nft_collector', name: 'NFT Collector', description: 'Collect educational NFTs', points: 800, tokenReward: 80 }
      ]
    };

    this.levels = [
      { level: 1, name: 'Novice', minPoints: 0, maxPoints: 999, color: '#4A90E2' },
      { level: 2, name: 'Apprentice', minPoints: 1000, maxPoints: 2499, color: '#7ED321' },
      { level: 3, name: 'Practitioner', minPoints: 2500, maxPoints: 4999, color: '#F5A623' },
      { level: 4, name: 'Expert', minPoints: 5000, maxPoints: 9999, color: '#D0021B' },
      { level: 5, name: 'Master', minPoints: 10000, maxPoints: 19999, color: '#9013FE' },
      { level: 6, name: 'Grandmaster', minPoints: 20000, maxPoints: 49999, color: '#FF6B35' },
      { level: 7, name: 'Legend', minPoints: 50000, maxPoints: 99999, color: '#00D4FF' },
      { level: 8, name: 'Mythic', minPoints: 100000, maxPoints: Infinity, color: '#FF0080' }
    ];

    this.streaks = {
      daily: { name: 'Daily Learner', description: 'Learn every day', multiplier: 1.5 },
      weekly: { name: 'Weekly Warrior', description: 'Learn every week', multiplier: 2.0 },
      monthly: { name: 'Monthly Master', description: 'Learn every month', multiplier: 3.0 }
    };
  }

  /**
   * Create gamification for a lesson
   * @param {Object} lesson - Lesson object
   * @returns {Object} Gamification configuration
   */
  async createLessonGamification(lesson) {
    const difficulty = lesson.difficulty || 'beginner';
    const duration = this.parseDuration(lesson.estimatedDuration);
    
    return {
      points: this.calculateLessonPoints(difficulty, duration),
      tokenReward: this.calculateTokenReward(difficulty, duration),
      achievements: this.getRelevantAchievements(difficulty),
      challenges: this.createLessonChallenges(lesson),
      progress: this.createProgressTracking(lesson),
      leaderboard: this.createLessonLeaderboard(lesson)
    };
  }

  /**
   * Track user progress and award points
   * @param {string} userId - User ID
   * @param {Object} activity - User activity
   * @returns {Object} Progress update
   */
  async trackProgress(userId, activity) {
    const userStats = await this.getUserStats(userId);
    const progressUpdate = this.calculateProgress(userStats, activity);
    
    // Update user stats
    await this.updateUserStats(userId, progressUpdate);
    
    // Check for new achievements
    const newAchievements = await this.checkAchievements(userId, progressUpdate);
    
    // Check for level up
    const levelUp = this.checkLevelUp(userStats, progressUpdate);
    
    // Calculate streak
    const streakUpdate = await this.updateStreak(userId, activity);
    
    return {
      points: progressUpdate.points,
      level: progressUpdate.level,
      achievements: newAchievements,
      levelUp: levelUp,
      streak: streakUpdate,
      tokenReward: progressUpdate.tokenReward
    };
  }

  /**
   * Calculate lesson points based on difficulty and duration
   */
  calculateLessonPoints(difficulty, duration) {
    const basePoints = {
      beginner: 100,
      intermediate: 200,
      advanced: 300
    };
    
    const durationMultiplier = Math.min(2.0, duration / 30); // Max 2x for 60+ minutes
    const difficultyMultiplier = basePoints[difficulty] || 100;
    
    return Math.floor(difficultyMultiplier * durationMultiplier);
  }

  /**
   * Calculate token reward based on difficulty and duration
   */
  calculateTokenReward(difficulty, duration) {
    const baseTokens = {
      beginner: 10,
      intermediate: 20,
      advanced: 30
    };
    
    const durationMultiplier = Math.min(1.5, duration / 30); // Max 1.5x for 45+ minutes
    const difficultyMultiplier = baseTokens[difficulty] || 10;
    
    return Math.floor(difficultyMultiplier * durationMultiplier);
  }

  /**
   * Get relevant achievements for difficulty level
   */
  getRelevantAchievements(difficulty) {
    return this.achievements[difficulty] || this.achievements.beginner;
  }

  /**
   * Create lesson-specific challenges
   */
  createLessonChallenges(lesson) {
    const challenges = [];
    
    // Time-based challenges
    challenges.push({
      id: 'speed_demon',
      name: 'Speed Demon',
      description: 'Complete lesson in under 20 minutes',
      type: 'time',
      target: 20,
      reward: { points: 50, tokens: 5 }
    });
    
    // Accuracy challenges
    challenges.push({
      id: 'perfectionist',
      name: 'Perfectionist',
      description: 'Get 100% on all questions',
      type: 'accuracy',
      target: 100,
      reward: { points: 100, tokens: 10 }
    });
    
    // Engagement challenges
    challenges.push({
      id: 'active_learner',
      name: 'Active Learner',
      description: 'Interact with all interactive elements',
      type: 'engagement',
      target: 100,
      reward: { points: 75, tokens: 7 }
    });
    
    return challenges;
  }

  /**
   * Create progress tracking for lesson
   */
  createProgressTracking(lesson) {
    return {
      totalSteps: this.countLessonSteps(lesson),
      completedSteps: 0,
      currentStep: 0,
      timeSpent: 0,
      accuracy: 0,
      engagement: 0
    };
  }

  /**
   * Create lesson leaderboard
   */
  createLessonLeaderboard(lesson) {
    return {
      id: `leaderboard_${lesson.id}`,
      type: 'lesson',
      criteria: 'points',
      timeRange: 'weekly',
      participants: [],
      rewards: {
        first: { points: 500, tokens: 50, badge: 'gold' },
        second: { points: 300, tokens: 30, badge: 'silver' },
        third: { points: 200, tokens: 20, badge: 'bronze' }
      }
    };
  }

  /**
   * Calculate user progress
   */
  calculateProgress(userStats, activity) {
    const points = this.calculateActivityPoints(activity);
    const newTotalPoints = userStats.totalPoints + points;
    const newLevel = this.calculateLevel(newTotalPoints);
    const tokenReward = this.calculateTokenReward(activity.difficulty, activity.duration);
    
    return {
      points: points,
      totalPoints: newTotalPoints,
      level: newLevel,
      tokenReward: tokenReward,
      timestamp: new Date()
    };
  }

  /**
   * Calculate points for specific activity
   */
  calculateActivityPoints(activity) {
    let points = 0;
    
    // Base points for activity type
    const basePoints = {
      lesson_completed: 100,
      quiz_passed: 50,
      exercise_completed: 25,
      achievement_unlocked: 200,
      streak_maintained: 50
    };
    
    points += basePoints[activity.type] || 0;
    
    // Difficulty multiplier
    const difficultyMultiplier = {
      beginner: 1.0,
      intermediate: 1.5,
      advanced: 2.0
    };
    
    points *= difficultyMultiplier[activity.difficulty] || 1.0;
    
    // Accuracy multiplier
    if (activity.accuracy) {
      points *= (activity.accuracy / 100);
    }
    
    // Time bonus
    if (activity.timeBonus) {
      points += activity.timeBonus;
    }
    
    return Math.floor(points);
  }

  /**
   * Calculate user level based on total points
   */
  calculateLevel(totalPoints) {
    for (let i = this.levels.length - 1; i >= 0; i--) {
      if (totalPoints >= this.levels[i].minPoints) {
        return this.levels[i];
      }
    }
    return this.levels[0];
  }

  /**
   * Check for new achievements
   */
  async checkAchievements(userId, progressUpdate) {
    const userStats = await this.getUserStats(userId);
    const newAchievements = [];
    
    // Check each achievement category
    Object.keys(this.achievements).forEach(category => {
      this.achievements[category].forEach(achievement => {
        if (this.isAchievementEarned(userStats, achievement, progressUpdate)) {
          newAchievements.push(achievement);
        }
      });
    });
    
    return newAchievements;
  }

  /**
   * Check if achievement is earned
   */
  isAchievementEarned(userStats, achievement, progressUpdate) {
    // Check if user already has this achievement
    if (userStats.achievements.includes(achievement.id)) {
      return false;
    }
    
    // Check achievement conditions
    switch (achievement.id) {
      case 'first_lesson':
        return progressUpdate.totalPoints >= 100;
      case 'budget_master':
        return userStats.completedModules.includes('budgeting');
      case 'savings_hero':
        return userStats.totalSavings >= 1000;
      case 'debt_free':
        return userStats.totalDebt <= 0;
      case 'investor_novice':
        return userStats.investments.length > 0;
      case 'portfolio_builder':
        return userStats.portfolioDiversification >= 5;
      case 'trading_pro':
        return userStats.successfulTrades >= 100;
      case 'defi_explorer':
        return userStats.defiProtocols.length >= 3;
      default:
        return false;
    }
  }

  /**
   * Check for level up
   */
  checkLevelUp(userStats, progressUpdate) {
    const oldLevel = userStats.level;
    const newLevel = progressUpdate.level;
    
    return {
      leveledUp: newLevel.level > oldLevel.level,
      oldLevel: oldLevel,
      newLevel: newLevel,
      rewards: this.getLevelUpRewards(newLevel)
    };
  }

  /**
   * Get level up rewards
   */
  getLevelUpRewards(newLevel) {
    return {
      points: newLevel.level * 1000,
      tokens: newLevel.level * 100,
      badge: `level_${newLevel.level}`,
      title: newLevel.name,
      color: newLevel.color
    };
  }

  /**
   * Update user streak
   */
  async updateStreak(userId, activity) {
    const userStats = await this.getUserStats(userId);
    const lastActivity = userStats.lastActivity;
    const now = new Date();
    
    let streakType = 'none';
    let streakCount = 0;
    
    // Check daily streak
    if (this.isSameDay(lastActivity, now)) {
      streakType = 'daily';
      streakCount = userStats.dailyStreak + 1;
    } else if (this.isNextDay(lastActivity, now)) {
      streakType = 'daily';
      streakCount = userStats.dailyStreak + 1;
    } else {
      streakType = 'daily';
      streakCount = 1;
    }
    
    // Check weekly streak
    if (this.isSameWeek(lastActivity, now)) {
      streakType = 'weekly';
      streakCount = userStats.weeklyStreak + 1;
    } else if (this.isNextWeek(lastActivity, now)) {
      streakType = 'weekly';
      streakCount = userStats.weeklyStreak + 1;
    }
    
    return {
      type: streakType,
      count: streakCount,
      multiplier: this.streaks[streakType]?.multiplier || 1.0,
      nextMilestone: this.getNextStreakMilestone(streakType, streakCount)
    };
  }

  /**
   * Get next streak milestone
   */
  getNextStreakMilestone(streakType, currentCount) {
    const milestones = {
      daily: [7, 14, 30, 60, 90, 180, 365],
      weekly: [4, 8, 12, 24, 52],
      monthly: [3, 6, 12, 24, 36]
    };
    
    const streakMilestones = milestones[streakType] || [];
    const nextMilestone = streakMilestones.find(milestone => milestone > currentCount);
    
    return nextMilestone ? {
      target: nextMilestone,
      remaining: nextMilestone - currentCount,
      reward: this.calculateStreakReward(streakType, nextMilestone)
    } : null;
  }

  /**
   * Calculate streak reward
   */
  calculateStreakReward(streakType, milestone) {
    const baseRewards = {
      daily: { points: 100, tokens: 10 },
      weekly: { points: 500, tokens: 50 },
      monthly: { points: 2000, tokens: 200 }
    };
    
    const baseReward = baseRewards[streakType] || { points: 100, tokens: 10 };
    const multiplier = Math.floor(milestone / 7); // Increase reward with milestone
    
    return {
      points: baseReward.points * multiplier,
      tokens: baseReward.tokens * multiplier,
      badge: `${streakType}_${milestone}`
    };
  }

  /**
   * Utility functions
   */
  parseDuration(durationString) {
    const match = durationString.match(/(\d+)\s*minutes?/);
    return match ? parseInt(match[1]) : 30;
  }

  countLessonSteps(lesson) {
    let steps = 0;
    if (lesson.content) steps += lesson.content.length;
    if (lesson.questions) steps += lesson.questions.length;
    if (lesson.exercises) steps += lesson.exercises.length;
    return steps;
  }

  isSameDay(date1, date2) {
    return date1.toDateString() === date2.toDateString();
  }

  isNextDay(date1, date2) {
    const nextDay = new Date(date1);
    nextDay.setDate(nextDay.getDate() + 1);
    return this.isSameDay(nextDay, date2);
  }

  isSameWeek(date1, date2) {
    const week1 = this.getWeekNumber(date1);
    const week2 = this.getWeekNumber(date2);
    return week1 === week2;
  }

  isNextWeek(date1, date2) {
    const week1 = this.getWeekNumber(date1);
    const week2 = this.getWeekNumber(date2);
    return week2 === week1 + 1;
  }

  getWeekNumber(date) {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }

  async getUserStats(userId) {
    // In real implementation, fetch from database
    return {
      userId: userId,
      totalPoints: 0,
      level: this.levels[0],
      achievements: [],
      dailyStreak: 0,
      weeklyStreak: 0,
      monthlyStreak: 0,
      lastActivity: new Date(),
      completedModules: [],
      totalSavings: 0,
      totalDebt: 0,
      investments: [],
      portfolioDiversification: 0,
      successfulTrades: 0,
      defiProtocols: []
    };
  }

  async updateUserStats(userId, progressUpdate) {
    // In real implementation, update database
    console.log(`Updating stats for user ${userId}:`, progressUpdate);
  }
}

export default GamificationEngine;
