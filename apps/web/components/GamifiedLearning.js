const logger = require('../../utils/logger');
/**
 * FinAI Nexus - Gamified Learning Interface
 * 
 * Advanced gamified learning system featuring:
 * - Interactive challenges and quests
 * - Leaderboards and achievements
 * - Progress tracking and rewards
 * - Social learning features
 * - Adaptive difficulty
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthProvider';

const GamifiedLearning = ({ onChallengeComplete, onAchievementUnlock }) => {
  const { user } = useAuth();
  const [userProgress, setUserProgress] = useState(null);
  const [challenges, setChallenges] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [experience, setExperience] = useState(0);
  const [streak, setStreak] = useState(0);
  const [selectedChallenge, setSelectedChallenge] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [challengeStartTime, setChallengeStartTime] = useState(null);

  useEffect(() => {
    loadUserProgress();
    loadChallenges();
    loadAchievements();
    loadLeaderboard();
  }, []);

  const loadUserProgress = async () => {
    try {
      const response = await fetch('/api/gamification/progress', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setUserProgress(data);
      setCurrentLevel(data.level || 1);
      setExperience(data.experience || 0);
      setStreak(data.streak || 0);
    } catch (error) {
      logger.error('Error loading user progress:', error);
    }
  };

  const loadChallenges = async () => {
    try {
      const response = await fetch('/api/gamification/challenges');
      const data = await response.json();
      setChallenges(data.challenges || []);
    } catch (error) {
      logger.error('Error loading challenges:', error);
    }
  };

  const loadAchievements = async () => {
    try {
      const response = await fetch('/api/gamification/achievements');
      const data = await response.json();
      setAchievements(data.achievements || []);
    } catch (error) {
      logger.error('Error loading achievements:', error);
    }
  };

  const loadLeaderboard = async () => {
    try {
      const response = await fetch('/api/gamification/leaderboard');
      const data = await response.json();
      setLeaderboard(data.leaderboard || []);
    } catch (error) {
      logger.error('Error loading leaderboard:', error);
    }
  };

  const startChallenge = (challenge) => {
    setSelectedChallenge(challenge);
    setIsPlaying(true);
    setChallengeStartTime(Date.now());
  };

  const completeChallenge = async (challengeId, score) => {
    try {
      const response = await fetch('/api/gamification/complete-challenge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          challengeId,
          score,
          timeSpent: Date.now() - challengeStartTime
        })
      });

      const result = await response.json();
      if (result.success) {
        // Update local state
        setExperience(prev => prev + result.experienceGained);
        setCurrentLevel(result.newLevel);
        setStreak(result.newStreak);
        
        // Check for level up
        if (result.levelUp) {
          showLevelUpNotification(result.newLevel);
        }

        // Check for achievements
        if (result.achievementsUnlocked.length > 0) {
          result.achievementsUnlocked.forEach(achievement => {
            showAchievementNotification(achievement);
            if (onAchievementUnlock) {
              onAchievementUnlock(achievement);
            }
          });
        }

        if (onChallengeComplete) {
          onChallengeComplete(result);
        }

        // Reload data
        loadUserProgress();
        loadLeaderboard();
      }
    } catch (error) {
      logger.error('Error completing challenge:', error);
    }
  };

  const showLevelUpNotification = (newLevel) => {
    // Show level up notification
    alert(`🎉 Level Up! You're now level ${newLevel}!`);
  };

  const showAchievementNotification = (achievement) => {
    // Show achievement notification
    alert(`🏆 Achievement Unlocked: ${achievement.name}!`);
  };

  const getLevelProgress = () => {
    const currentLevelExp = (currentLevel - 1) * 1000;
    const nextLevelExp = currentLevel * 1000;
    const progress = ((experience - currentLevelExp) / (nextLevelExp - currentLevelExp)) * 100;
    return Math.min(100, Math.max(0, progress));
  };

  const getRankIcon = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
    case 'easy': return 'text-green-400';
    case 'medium': return 'text-yellow-400';
    case 'hard': return 'text-red-400';
    case 'expert': return 'text-purple-400';
    default: return 'text-gray-400';
    }
  };

  const getCategoryIcon = (category) => {
    const icons = {
      'trading': '📈',
      'portfolio': '💼',
      'risk': '⚠️',
      'crypto': '₿',
      'defi': '🔄',
      'nft': '🖼️',
      'general': '🎯'
    };
    return icons[category] || '🎯';
  };

  return (
    <div className="gamified-learning bg-gray-800 p-6 rounded-lg">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-neon">Gamified Learning</h2>
        <div className="flex items-center space-x-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-neon">Level {currentLevel}</div>
            <div className="text-sm text-gray-400">Experience: {experience.toLocaleString()}</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-yellow-400">🔥 {streak}</div>
            <div className="text-sm text-gray-400">Day Streak</div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-400 mb-2">
          <span>Level {currentLevel}</span>
          <span>Level {currentLevel + 1}</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-3">
          <div 
            className="bg-gradient-to-r from-neon to-blue-400 h-3 rounded-full transition-all duration-500"
            style={{ width: `${getLevelProgress()}%` }}
          ></div>
        </div>
        <div className="text-center text-sm text-gray-400 mt-1">
          {Math.round(getLevelProgress())}% to next level
        </div>
      </div>

      {/* Main Content Tabs */}
      <div className="mb-6">
        <div className="flex space-x-1 bg-gray-700 p-1 rounded-lg">
          {['Challenges', 'Achievements', 'Leaderboard', 'Progress'].map((tab) => (
            <button
              key={tab}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                tab === 'Challenges'
                  ? 'bg-neon text-black'
                  : 'text-gray-400 hover:text-white hover:bg-gray-600'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Challenges Section */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold text-white mb-4">Available Challenges</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {challenges.map((challenge) => (
            <div
              key={challenge.id}
              className="bg-gray-700 p-4 rounded-lg border border-gray-600 hover:border-neon transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">{getCategoryIcon(challenge.category)}</span>
                  <div>
                    <h4 className="font-semibold text-white">{challenge.name}</h4>
                    <p className="text-sm text-gray-400">{challenge.description}</p>
                  </div>
                </div>
                <span className={`text-sm font-medium ${getDifficultyColor(challenge.difficulty)}`}>
                  {challenge.difficulty.toUpperCase()}
                </span>
              </div>

              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4 text-sm text-gray-400">
                  <span>⏱️ {challenge.estimatedTime}min</span>
                  <span>⭐ {challenge.experienceReward} XP</span>
                  <span>🏆 {challenge.achievementReward}</span>
                </div>
                <div className="flex items-center space-x-2">
                  {challenge.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-gray-600 text-xs text-gray-300 rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-400">
                  {challenge.completed ? '✅ Completed' : '⏳ Available'}
                </div>
                <button
                  onClick={() => startChallenge(challenge)}
                  disabled={challenge.completed}
                  className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                    challenge.completed
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : 'bg-neon text-black hover:bg-neon/90'
                  }`}
                >
                  {challenge.completed ? 'Completed' : 'Start Challenge'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Achievements Section */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold text-white mb-4">Achievements</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {achievements.map((achievement) => (
            <div
              key={achievement.id}
              className={`p-4 rounded-lg border-2 transition-all ${
                achievement.unlocked
                  ? 'border-yellow-400 bg-yellow-400/10'
                  : 'border-gray-600 bg-gray-700'
              }`}
            >
              <div className="text-center">
                <div className="text-4xl mb-2">
                  {achievement.unlocked ? achievement.icon : '🔒'}
                </div>
                <h4 className={`font-semibold mb-2 ${
                  achievement.unlocked ? 'text-yellow-400' : 'text-gray-400'
                }`}>
                  {achievement.name}
                </h4>
                <p className="text-sm text-gray-400 mb-3">
                  {achievement.description}
                </p>
                <div className="text-xs text-gray-500">
                  {achievement.unlocked ? 'Unlocked' : `${achievement.progress}% complete`}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Leaderboard Section */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold text-white mb-4">Leaderboard</h3>
        <div className="bg-gray-700 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-600">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Rank</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Player</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Level</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Experience</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Streak</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-600">
                {leaderboard.map((player, index) => (
                  <tr
                    key={player.id}
                    className={`${
                      player.id === user?.id ? 'bg-neon/20' : 'hover:bg-gray-600'
                    }`}
                  >
                    <td className="px-4 py-3 text-sm font-medium text-gray-300">
                      {getRankIcon(index + 1)}
                    </td>
                    <td className="px-4 py-3 text-sm text-white">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center">
                          <span className="text-xs font-bold">
                            {player.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span>{player.name}</span>
                        {player.id === user?.id && (
                          <span className="text-xs bg-neon text-black px-2 py-1 rounded">
                            You
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300">{player.level}</td>
                    <td className="px-4 py-3 text-sm text-gray-300">
                      {player.experience.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300">
                      <span className="flex items-center">
                        🔥 {player.streak}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Challenge Modal */}
      {selectedChallenge && isPlaying && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg max-w-2xl w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">
                {selectedChallenge.name}
              </h3>
              <button
                onClick={() => {
                  setIsPlaying(false);
                  setSelectedChallenge(null);
                }}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-300 mb-4">{selectedChallenge.description}</p>
              <div className="bg-gray-700 p-4 rounded">
                <h4 className="font-semibold text-white mb-2">Challenge Content</h4>
                <div className="text-gray-300">
                  {/* This would contain the actual challenge content */}
                  <p>Challenge content would be rendered here...</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              <button
                onClick={() => {
                  setIsPlaying(false);
                  setSelectedChallenge(null);
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  completeChallenge(selectedChallenge.id, Math.random() * 100);
                  setIsPlaying(false);
                  setSelectedChallenge(null);
                }}
                className="px-4 py-2 bg-neon text-black rounded hover:bg-neon/90"
              >
                Complete Challenge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GamifiedLearning;
