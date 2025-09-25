const logger = require('../../utils/logger');
/**
 * FinAI Nexus - Educational Platform Component
 * 
 * Main educational platform interface with:
 * - Educational disclaimers and positioning
 * - Portfolio simulation (educational only)
 * - AI educational mentors (not advisors)
 * - Learning courses and progress tracking
 * - Community features and gamification
 * - Compliance with educational service regulations
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthProvider';

const EducationalPlatform = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [userProgress, setUserProgress] = useState(null);
  const [courses, setCourses] = useState([]);
  const [simulations, setSimulations] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const auth = useAuth();

  useEffect(() => {
    if (auth?.user) {
      fetchUserProgress();
      fetchCourses();
      fetchSimulations();
      fetchAchievements();
    }
  }, [auth?.user]);

  const fetchUserProgress = async () => {
    try {
      // Simulate API call to get user educational progress
      setUserProgress({
        overallProgress: 0.45,
        coursesCompleted: 2,
        coursesEnrolled: 5,
        currentCourse: 'AI in Finance',
        learningStreak: 12,
        totalLearningTime: 2340,
        level: 'Intermediate Learner',
        points: 1250,
        rank: 'Advanced Student'
      });
    } catch (error) {
      logger.error('Failed to fetch user progress:', error);
    }
  };

  const fetchCourses = async () => {
    // Simulate educational courses
    setCourses([
      {
        id: 'intro_to_investing',
        title: 'Introduction to Investing',
        level: 'Beginner',
        duration: '2 hours',
        progress: 1.0,
        status: 'completed',
        rating: 4.8,
        description: 'Learn the fundamentals of investing and portfolio management'
      },
      {
        id: 'ai_in_finance',
        title: 'AI in Finance: The Future of Financial Technology',
        level: 'Intermediate',
        duration: '3 hours',
        progress: 0.6,
        status: 'in_progress',
        rating: 4.9,
        description: 'Explore how artificial intelligence is revolutionizing financial services'
      },
      {
        id: 'quantum_finance',
        title: 'Quantum Computing in Finance',
        level: 'Advanced',
        duration: '4 hours',
        progress: 0.0,
        status: 'available',
        rating: 4.7,
        description: 'Master quantum computing applications in financial optimization'
      }
    ]);
  };

  const fetchSimulations = async () => {
    // Simulate educational portfolio simulations
    setSimulations([
      {
        id: 'basic_sim',
        name: 'Basic Portfolio Simulation',
        virtualCapital: 100000,
        currentValue: 108750,
        return: 0.0875,
        duration: '30 days',
        status: 'active',
        trades: 12,
        type: 'educational_simulation'
      },
      {
        id: 'ai_sim',
        name: 'AI-Enhanced Portfolio Simulation',
        virtualCapital: 250000,
        currentValue: 267500,
        return: 0.07,
        duration: '45 days',
        status: 'active',
        trades: 18,
        type: 'educational_simulation'
      }
    ]);
  };

  const fetchAchievements = async () => {
    // Simulate educational achievements
    setAchievements([
      {
        id: 'first_course',
        title: 'Learning Journey Begins',
        description: 'Complete your first educational course',
        earned: true,
        earnedAt: '2024-11-15',
        points: 100,
        badge: 'bronze_learner'
      },
      {
        id: 'simulation_master',
        title: 'Portfolio Simulation Master',
        description: 'Complete 100 educational portfolio simulations',
        earned: false,
        progress: 0.45,
        points: 750,
        badge: 'simulation_expert'
      }
    ]);
  };

  const EducationalDisclaimer = () => (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-yellow-800">Educational Platform Notice</h3>
          <div className="mt-2 text-sm text-yellow-700">
            <p><strong>FOR EDUCATIONAL PURPOSES ONLY</strong> - This platform provides financial education and simulation tools. We do not provide investment advice or financial services. All portfolio simulations use virtual money only. Consult licensed financial professionals for investment decisions.</p>
          </div>
        </div>
      </div>
    </div>
  );

  const Dashboard = () => (
    <div className="space-y-6">
      <EducationalDisclaimer />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Learning Progress */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Learning Progress</h3>
          {userProgress && (
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm">
                  <span>Overall Progress</span>
                  <span>{Math.round(userProgress.overallProgress * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${userProgress.overallProgress * 100}%` }}
                  ></div>
                </div>
              </div>
              <div className="text-sm text-gray-600">
                <p>Courses Completed: {userProgress.coursesCompleted}/{userProgress.coursesEnrolled}</p>
                <p>Learning Streak: {userProgress.learningStreak} days</p>
                <p>Total Points: {userProgress.points}</p>
              </div>
            </div>
          )}
        </div>

        {/* Current Course */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Course</h3>
          {userProgress && (
            <div>
              <h4 className="font-medium text-blue-600">{userProgress.currentCourse}</h4>
              <p className="text-sm text-gray-600 mt-2">Continue learning about AI applications in finance</p>
              <button className="mt-3 bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700">
                Continue Learning
              </button>
            </div>
          )}
        </div>

        {/* Educational Simulations */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Educational Simulations</h3>
          <div className="space-y-2">
            {simulations.slice(0, 2).map(sim => (
              <div key={sim.id} className="text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">{sim.name}</span>
                  <span className={sim.return > 0 ? 'text-green-600' : 'text-red-600'}>
                    {(sim.return * 100).toFixed(1)}%
                  </span>
                </div>
                <p className="text-gray-500">Virtual Capital: ${sim.virtualCapital.toLocaleString()}</p>
              </div>
            ))}
            <p className="text-xs text-yellow-600 mt-2">
              ⚠️ Educational simulations only - No real money involved
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const Courses = () => (
    <div className="space-y-6">
      <EducationalDisclaimer />
      
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Educational Courses</h3>
          <p className="text-sm text-gray-600">Learn financial concepts through interactive courses</p>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map(course => (
              <div key={course.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold text-gray-900">{course.title}</h4>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    course.level === 'Beginner' ? 'bg-green-100 text-green-800' :
                      course.level === 'Intermediate' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                  }`}>
                    {course.level}
                  </span>
                </div>
                
                <p className="text-sm text-gray-600 mb-3">{course.description}</p>
                
                <div className="flex justify-between items-center text-sm text-gray-500 mb-3">
                  <span>Duration: {course.duration}</span>
                  <span>Rating: ⭐ {course.rating}</span>
                </div>

                {course.progress > 0 && (
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>Progress</span>
                      <span>{Math.round(course.progress * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1">
                      <div 
                        className="bg-blue-600 h-1 rounded-full" 
                        style={{ width: `${course.progress * 100}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                <button className={`w-full py-2 px-4 rounded-md text-sm font-medium ${
                  course.status === 'completed' ? 'bg-green-100 text-green-800' :
                    course.status === 'in_progress' ? 'bg-blue-600 text-white hover:bg-blue-700' :
                      'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}>
                  {course.status === 'completed' ? 'Completed ✓' :
                    course.status === 'in_progress' ? 'Continue Learning' :
                      'Start Course'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const Simulations = () => (
    <div className="space-y-6">
      <EducationalDisclaimer />
      
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Educational Portfolio Simulations</h3>
          <p className="text-sm text-gray-600">Practice portfolio management with virtual money</p>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {simulations.map(sim => (
              <div key={sim.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <h4 className="font-semibold text-gray-900">{sim.name}</h4>
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                    Educational Only
                  </span>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Virtual Capital:</span>
                    <span className="font-medium">${sim.virtualCapital.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Current Value:</span>
                    <span className="font-medium">${sim.currentValue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Educational Return:</span>
                    <span className={`font-medium ${sim.return > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {(sim.return * 100).toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Simulation Period:</span>
                    <span>{sim.duration}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Educational Trades:</span>
                    <span>{sim.trades}</span>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-yellow-50 rounded-md">
                  <p className="text-xs text-yellow-700">
                    ⚠️ <strong>Educational Simulation Only</strong> - No real money involved. 
                    This is for learning purposes only and does not constitute investment advice.
                  </p>
                </div>

                <button className="w-full mt-3 bg-blue-600 text-white py-2 px-4 rounded-md text-sm hover:bg-blue-700">
                  View Educational Simulation
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const Achievements = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Learning Achievements</h3>
          <p className="text-sm text-gray-600">Track your educational progress and milestones</p>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {achievements.map(achievement => (
              <div key={achievement.id} className={`border rounded-lg p-4 ${
                achievement.earned ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-start space-x-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    achievement.earned ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                    <span className="text-2xl">
                      {achievement.earned ? '🏆' : '🔒'}
                    </span>
                  </div>
                  
                  <div className="flex-1">
                    <h4 className={`font-semibold ${
                      achievement.earned ? 'text-green-900' : 'text-gray-700'
                    }`}>
                      {achievement.title}
                    </h4>
                    <p className="text-sm text-gray-600">{achievement.description}</p>
                    
                    {achievement.earned ? (
                      <p className="text-xs text-green-600 mt-1">
                        Earned on {achievement.earnedAt} • {achievement.points} points
                      </p>
                    ) : (
                      <div className="mt-2">
                        <div className="flex justify-between text-xs text-gray-600 mb-1">
                          <span>Progress</span>
                          <span>{Math.round((achievement.progress || 0) * 100)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1">
                          <div 
                            className="bg-blue-600 h-1 rounded-full" 
                            style={{ width: `${(achievement.progress || 0) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const AIEducationalMentor = () => (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Educational Mentor</h3>
      
      <div className="bg-blue-50 rounded-lg p-4 mb-4">
        <div className="flex items-start space-x-3">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-blue-600">🤖</span>
          </div>
          <div className="flex-1">
            <p className="text-sm text-blue-800">
              <strong>Educational AI Mentor:</strong> "Hello! I'm here to help you learn about finance and investing. 
              I can explain concepts, guide you through simulations, and answer educational questions. 
              Remember, I'm an educational tool - not a financial advisor!"
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <input 
          type="text" 
          placeholder="Ask me about financial concepts (e.g., 'What is diversification?')"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700">
          Ask Educational Question
        </button>
      </div>

      <div className="mt-4 p-3 bg-yellow-50 rounded-md">
        <p className="text-xs text-yellow-700">
          ⚠️ <strong>Educational AI Mentor Only</strong> - Provides educational content and explanations. 
          Not financial advice or investment recommendations.
        </p>
      </div>
    </div>
  );

  const Community = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Educational Community</h3>
          <p className="text-sm text-gray-600">Learn together with fellow students</p>
        </div>
        
        <div className="p-6">
          <div className="space-y-4">
            <div className="border rounded-lg p-4">
              <h4 className="font-medium text-gray-900">💡 Study Groups</h4>
              <p className="text-sm text-gray-600">Join study groups for collaborative learning</p>
              <button className="mt-2 text-blue-600 text-sm hover:text-blue-800">Join Study Group →</button>
            </div>
            
            <div className="border rounded-lg p-4">
              <h4 className="font-medium text-gray-900">📚 Discussion Forums</h4>
              <p className="text-sm text-gray-600">Ask questions and share educational insights</p>
              <button className="mt-2 text-blue-600 text-sm hover:text-blue-800">Visit Forums →</button>
            </div>
            
            <div className="border rounded-lg p-4">
              <h4 className="font-medium text-gray-900">🎯 Learning Challenges</h4>
              <p className="text-sm text-gray-600">Participate in educational challenges and competitions</p>
              <button className="mt-2 text-blue-600 text-sm hover:text-blue-800">View Challenges →</button>
            </div>
          </div>

          <div className="mt-6 p-3 bg-blue-50 rounded-md">
            <p className="text-xs text-blue-700">
              💬 <strong>Educational Community Guidelines</strong> - All discussions must be educational in nature. 
              No investment advice or financial recommendations allowed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const tabs = [
    { id: 'dashboard', name: 'Learning Dashboard', component: Dashboard },
    { id: 'courses', name: 'Educational Courses', component: Courses },
    { id: 'simulations', name: 'Portfolio Simulations', component: Simulations },
    { id: 'achievements', name: 'Achievements', component: Achievements },
    { id: 'mentor', name: 'AI Educational Mentor', component: AIEducationalMentor },
    { id: 'community', name: 'Learning Community', component: Community }
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || Dashboard;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">FinAI Nexus</h1>
              <p className="text-sm text-gray-600">Educational Financial Technology Platform</p>
            </div>
            
            {auth?.user && (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-700">Welcome, {auth.user.firstName || auth.user.email}</span>
                <button 
                  onClick={auth.logout}
                  className="bg-red-600 text-white px-4 py-2 rounded-md text-sm hover:bg-red-700"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <ActiveComponent />
        </div>
      </main>

      {/* Footer Disclaimer */}
      <footer className="bg-gray-800 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">Educational Technology Platform</h3>
            <p className="text-sm text-gray-300 max-w-3xl mx-auto">
              FinAI Nexus is an educational technology platform providing financial education, 
              market research tools, and portfolio simulation software. We do not provide investment advice, 
              financial planning, or brokerage services. All simulations use virtual money only. 
              Consult licensed financial professionals for investment decisions.
            </p>
            <div className="mt-4 text-xs text-gray-400">
              <p>© 2024 FinAI Nexus Educational Technology LLC. All rights reserved.</p>
              <p>Educational Platform • Not Financial Services • For Learning Purposes Only</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default EducationalPlatform;
