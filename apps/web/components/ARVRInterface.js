const logger = require('../../utils/logger');
/**
 * FinAI Nexus - AR/VR Interface Component
 * 
 * Advanced AR/VR integration featuring:
 * - AR portfolio visualization using AR.js
 * - WebXR 3D trading floor
 * - Gesture-based trading controls
 * - Immersive financial data visualization
 * - Virtual financial mentors
 */

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthProvider';
import { useWeb3 } from './Web3Provider';

const ARVRInterface = ({ onTrade, onAnalysis, onMentorInteraction }) => {
  const { user } = useAuth();
  const { isConnected } = useWeb3();
  const [isARSupported, setIsARSupported] = useState(false);
  const [isVRSupported, setIsVRSupported] = useState(false);
  const [currentMode, setCurrentMode] = useState('ar'); // ar, vr, mixed
  const [isActive, setIsActive] = useState(false);
  const [portfolioData, setPortfolioData] = useState(null);
  const [gestureData, setGestureData] = useState(null);
  const [mentorAvatar, setMentorAvatar] = useState(null);

  const arContainerRef = useRef(null);
  const vrContainerRef = useRef(null);
  const gestureRecognitionRef = useRef(null);
  const webXRRef = useRef(null);

  useEffect(() => {
    checkARVRSupport();
    initializeGestureRecognition();
    loadPortfolioData();
    initializeMentorAvatar();
  }, []);

  const checkARVRSupport = async () => {
    try {
      // Check AR support
      if (navigator.xr) {
        const arSupported = await navigator.xr.isSessionSupported('immersive-ar');
        setIsARSupported(arSupported);
      }

      // Check VR support
      if (navigator.xr) {
        const vrSupported = await navigator.xr.isSessionSupported('immersive-vr');
        setIsVRSupported(vrSupported);
      }
    } catch (error) {
      logger.error('Error checking AR/VR support:', error);
    }
  };

  const initializeGestureRecognition = () => {
    // Initialize gesture recognition for AR/VR interactions
    if ('mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
          // Initialize gesture recognition
          gestureRecognitionRef.current = new GestureRecognizer(stream);
          gestureRecognitionRef.current.onGesture = handleGesture;
        })
        .catch(error => {
          logger.error('Error accessing camera for gesture recognition:', error);
        });
    }
  };

  const loadPortfolioData = async () => {
    try {
      const response = await fetch('/api/portfolio', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setPortfolioData(data);
    } catch (error) {
      logger.error('Error loading portfolio data:', error);
    }
  };

  const initializeMentorAvatar = () => {
    // Initialize AI mentor avatar for AR/VR
    setMentorAvatar({
      id: 'mentor-1',
      name: 'Alex',
      personality: 'professional',
      expertise: 'portfolio-optimization',
      avatar: '/avatars/alex-3d.glb',
      voice: 'natural',
      animations: ['idle', 'talking', 'pointing', 'thinking']
    });
  };

  const startARSession = async () => {
    try {
      if (!navigator.xr || !isARSupported) {
        throw new Error('AR not supported');
      }

      const session = await navigator.xr.requestSession('immersive-ar', {
        requiredFeatures: ['local', 'hit-test'],
        optionalFeatures: ['dom-overlay']
      });

      // Initialize AR scene
      await initializeARScene(session);
      setIsActive(true);
      setCurrentMode('ar');

    } catch (error) {
      logger.error('Error starting AR session:', error);
      alert('Failed to start AR session. Please ensure your device supports AR.');
    }
  };

  const startVRSession = async () => {
    try {
      if (!navigator.xr || !isVRSupported) {
        throw new Error('VR not supported');
      }

      const session = await navigator.xr.requestSession('immersive-vr');
      
      // Initialize VR scene
      await initializeVRScene(session);
      setIsActive(true);
      setCurrentMode('vr');

    } catch (error) {
      logger.error('Error starting VR session:', error);
      alert('Failed to start VR session. Please ensure you have a VR headset connected.');
    }
  };

  const initializeARScene = async (session) => {
    // Initialize AR.js scene for portfolio visualization
    const scene = document.createElement('a-scene');
    scene.setAttribute('vr-mode-ui', 'enabled: false');
    scene.setAttribute('renderer', 'logarithmicDepthBuffer: true');
    scene.setAttribute('arjs', 'trackingMethod: best; sourceType: webcam; debugUIEnabled: false');

    // Add AR markers and 3D objects
    addARMarkers(scene);
    addPortfolioVisualization(scene);
    addTradingInterface(scene);
    addMentorAvatar(scene);

    arContainerRef.current.appendChild(scene);
  };

  const initializeVRScene = async (session) => {
    // Initialize WebXR VR scene for 3D trading floor
    const scene = document.createElement('a-scene');
    scene.setAttribute('vr-mode-ui', 'enabled: true');
    scene.setAttribute('renderer', 'logarithmicDepthBuffer: true');

    // Add VR environment
    addVREnvironment(scene);
    addTradingFloor(scene);
    addDataVisualization(scene);
    addSocialTradingRooms(scene);

    vrContainerRef.current.appendChild(scene);
  };

  const addARMarkers = (scene) => {
    // Add AR markers for different financial instruments
    const markers = [
      { id: 'btc-marker', pattern: 'btc', asset: 'Bitcoin' },
      { id: 'eth-marker', pattern: 'eth', asset: 'Ethereum' },
      { id: 'portfolio-marker', pattern: 'portfolio', asset: 'Portfolio' }
    ];

    markers.forEach(marker => {
      const markerElement = document.createElement('a-marker');
      markerElement.setAttribute('id', marker.id);
      markerElement.setAttribute('type', 'pattern');
      markerElement.setAttribute('url', `/markers/${marker.pattern}.patt`);

      // Add 3D asset on marker
      const assetElement = document.createElement('a-entity');
      assetElement.setAttribute('gltf-model', `/models/${marker.asset.toLowerCase()}.glb`);
      assetElement.setAttribute('scale', '0.5 0.5 0.5');
      assetElement.setAttribute('animation', 'property: rotation; to: 0 360 0; loop: true; dur: 10000');

      markerElement.appendChild(assetElement);
      scene.appendChild(markerElement);
    });
  };

  const addPortfolioVisualization = (scene) => {
    // Create 3D portfolio visualization
    const portfolioGroup = document.createElement('a-entity');
    portfolioGroup.setAttribute('id', 'portfolio-visualization');

    // Add pie chart for asset allocation
    const pieChart = document.createElement('a-entity');
    pieChart.setAttribute('geometry', 'primitive: cylinder; radius: 2; height: 0.1');
    pieChart.setAttribute('material', 'color: #00D4AA; transparent: true; opacity: 0.8');
    pieChart.setAttribute('position', '0 1.5 0');

    portfolioGroup.appendChild(pieChart);

    // Add individual asset representations
    if (portfolioData && portfolioData.assets) {
      portfolioData.assets.forEach((asset, index) => {
        const assetElement = document.createElement('a-entity');
        assetElement.setAttribute('geometry', 'primitive: box');
        assetElement.setAttribute('material', `color: ${getAssetColor(asset.type)}`);
        assetElement.setAttribute('position', `${Math.cos(index * Math.PI / 3) * 3} 0.5 ${Math.sin(index * Math.PI / 3) * 3}`);
        assetElement.setAttribute('scale', `${asset.percentage / 10} 0.5 ${asset.percentage / 10}`);

        // Add click interaction
        assetElement.addEventListener('click', () => handleAssetClick(asset));

        portfolioGroup.appendChild(assetElement);
      });
    }

    scene.appendChild(portfolioGroup);
  };

  const addTradingInterface = (scene) => {
    // Add floating trading interface
    const tradingInterface = document.createElement('a-entity');
    tradingInterface.setAttribute('id', 'trading-interface');
    tradingInterface.setAttribute('position', '0 2 0');

    // Buy button
    const buyButton = document.createElement('a-entity');
    buyButton.setAttribute('geometry', 'primitive: box; width: 1; height: 0.5; depth: 0.1');
    buyButton.setAttribute('material', 'color: #4CAF50');
    buyButton.setAttribute('position', '-0.6 0 0');
    buyButton.setAttribute('text', 'value: BUY; align: center; color: white');
    buyButton.addEventListener('click', () => handleTradeAction('buy'));

    // Sell button
    const sellButton = document.createElement('a-entity');
    sellButton.setAttribute('geometry', 'primitive: box; width: 1; height: 0.5; depth: 0.1');
    sellButton.setAttribute('material', 'color: #F44336');
    sellButton.setAttribute('position', '0.6 0 0');
    sellButton.setAttribute('text', 'value: SELL; align: center; color: white');
    sellButton.addEventListener('click', () => handleTradeAction('sell'));

    tradingInterface.appendChild(buyButton);
    tradingInterface.appendChild(sellButton);
    scene.appendChild(tradingInterface);
  };

  const addMentorAvatar = (scene) => {
    if (!mentorAvatar) return;

    const mentorElement = document.createElement('a-entity');
    mentorElement.setAttribute('id', 'mentor-avatar');
    mentorElement.setAttribute('gltf-model', mentorAvatar.avatar);
    mentorElement.setAttribute('position', '0 1.5 -2');
    mentorElement.setAttribute('scale', '1 1 1');
    mentorElement.setAttribute('animation', 'property: rotation; to: 0 360 0; loop: true; dur: 20000');

    // Add mentor interaction
    mentorElement.addEventListener('click', () => handleMentorInteraction());

    scene.appendChild(mentorElement);
  };

  const addVREnvironment = (scene) => {
    // Add VR trading floor environment
    const environment = document.createElement('a-entity');
    environment.setAttribute('id', 'vr-environment');

    // Floor
    const floor = document.createElement('a-plane');
    floor.setAttribute('position', '0 0 0');
    floor.setAttribute('rotation', '-90 0 0');
    floor.setAttribute('width', '20');
    floor.setAttribute('height', '20');
    floor.setAttribute('material', 'color: #1a1a1a');
    environment.appendChild(floor);

    // Walls
    const walls = [
      { position: '0 2.5 -10', rotation: '0 0 0', width: '20', height: '5' },
      { position: '0 2.5 10', rotation: '0 180 0', width: '20', height: '5' },
      { position: '-10 2.5 0', rotation: '0 90 0', width: '20', height: '5' },
      { position: '10 2.5 0', rotation: '0 -90 0', width: '20', height: '5' }
    ];

    walls.forEach(wall => {
      const wallElement = document.createElement('a-plane');
      wallElement.setAttribute('position', wall.position);
      wallElement.setAttribute('rotation', wall.rotation);
      wallElement.setAttribute('width', wall.width);
      wallElement.setAttribute('height', wall.height);
      wallElement.setAttribute('material', 'color: #2a2a2a');
      environment.appendChild(wallElement);
    });

    scene.appendChild(environment);
  };

  const addTradingFloor = (scene) => {
    // Add 3D trading floor with market data displays
    const tradingFloor = document.createElement('a-entity');
    tradingFloor.setAttribute('id', 'trading-floor');

    // Market data screens
    const screens = [
      { position: '-8 3 -8', rotation: '0 45 0', content: 'BTC: $45,000' },
      { position: '8 3 -8', rotation: '0 -45 0', content: 'ETH: $3,200' },
      { position: '-8 3 8', rotation: '0 135 0', content: 'Portfolio: +5.2%' },
      { position: '8 3 8', rotation: '0 -135 0', content: 'Market: Bullish' }
    ];

    screens.forEach(screen => {
      const screenElement = document.createElement('a-entity');
      screenElement.setAttribute('geometry', 'primitive: plane; width: 4; height: 2');
      screenElement.setAttribute('material', 'color: #000; emissive: #00D4AA');
      screenElement.setAttribute('position', screen.position);
      screenElement.setAttribute('rotation', screen.rotation);
      screenElement.setAttribute('text', `value: ${screen.content}; align: center; color: white; width: 8`);
      tradingFloor.appendChild(screenElement);
    });

    scene.appendChild(tradingFloor);
  };

  const addDataVisualization = (scene) => {
    // Add 3D data visualization
    const dataViz = document.createElement('a-entity');
    dataViz.setAttribute('id', 'data-visualization');

    // Create 3D chart
    const chartData = [1, 2, 1.5, 3, 2.5, 4, 3.5, 5];
    chartData.forEach((value, index) => {
      const bar = document.createElement('a-entity');
      bar.setAttribute('geometry', `primitive: box; width: 0.5; height: ${value}; depth: 0.5`);
      bar.setAttribute('material', 'color: #00D4AA');
      bar.setAttribute('position', `${index * 0.6 - 2} ${value / 2} 0`);
      dataViz.appendChild(bar);
    });

    scene.appendChild(dataViz);
  };

  const addSocialTradingRooms = (scene) => {
    // Add virtual social trading rooms
    const socialRooms = document.createElement('a-entity');
    socialRooms.setAttribute('id', 'social-rooms');

    const rooms = [
      { position: '-5 1 -5', name: 'Crypto Traders' },
      { position: '5 1 -5', name: 'DeFi Enthusiasts' },
      { position: '-5 1 5', name: 'Portfolio Managers' },
      { position: '5 1 5', name: 'AI Investors' }
    ];

    rooms.forEach(room => {
      const roomElement = document.createElement('a-entity');
      roomElement.setAttribute('geometry', 'primitive: cylinder; radius: 2; height: 3');
      roomElement.setAttribute('material', 'color: #4CAF50; transparent: true; opacity: 0.3');
      roomElement.setAttribute('position', room.position);
      roomElement.setAttribute('text', `value: ${room.name}; align: center; color: white`);
      roomElement.addEventListener('click', () => handleRoomJoin(room.name));
      socialRooms.appendChild(roomElement);
    });

    scene.appendChild(socialRooms);
  };

  const handleGesture = (gesture) => {
    setGestureData(gesture);
    
    switch (gesture.type) {
    case 'swipe_left':
      // Previous chart
      break;
    case 'swipe_right':
      // Next chart
      break;
    case 'pinch_in':
      // Zoom out
      break;
    case 'pinch_out':
      // Zoom in
      break;
    case 'double_tap':
      // Select asset
      break;
    case 'wave':
      // Activate voice commands
      break;
    default:
      break;
    }
  };

  const handleAssetClick = (asset) => {
    if (onAnalysis) {
      onAnalysis(asset);
    }
  };

  const handleTradeAction = (action) => {
    if (onTrade) {
      onTrade(action);
    }
  };

  const handleMentorInteraction = () => {
    if (onMentorInteraction) {
      onMentorInteraction(mentorAvatar);
    }
  };

  const handleRoomJoin = (roomName) => {
    logger.info(`Joining room: ${roomName}`);
    // Implement room joining logic
  };

  const getAssetColor = (assetType) => {
    const colors = {
      'crypto': '#00D4AA',
      'stocks': '#4CAF50',
      'bonds': '#2196F3',
      'commodities': '#FF9800',
      'real-estate': '#9C27B0'
    };
    return colors[assetType] || '#666';
  };

  const stopSession = () => {
    setIsActive(false);
    setCurrentMode(null);
    
    // Clean up AR/VR scenes
    if (arContainerRef.current) {
      arContainerRef.current.innerHTML = '';
    }
    if (vrContainerRef.current) {
      vrContainerRef.current.innerHTML = '';
    }
  };

  return (
    <div className="arvr-interface bg-gray-800 p-6 rounded-lg">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-neon">AR/VR Trading Interface</h2>
        <div className="flex space-x-2">
          <button
            onClick={startARSession}
            disabled={!isARSupported || isActive}
            className={`px-4 py-2 rounded ${
              isARSupported && !isActive
                ? 'bg-neon text-black hover:bg-neon/90'
                : 'bg-gray-700 text-gray-400 cursor-not-allowed'
            }`}
          >
            🥽 Start AR
          </button>
          <button
            onClick={startVRSession}
            disabled={!isVRSupported || isActive}
            className={`px-4 py-2 rounded ${
              isVRSupported && !isActive
                ? 'bg-neon text-black hover:bg-neon/90'
                : 'bg-gray-700 text-gray-400 cursor-not-allowed'
            }`}
          >
            🥽 Start VR
          </button>
          {isActive && (
            <button
              onClick={stopSession}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Stop Session
            </button>
          )}
        </div>
      </div>

      {/* AR Container */}
      {currentMode === 'ar' && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-3">AR Portfolio Visualization</h3>
          <div
            ref={arContainerRef}
            className="w-full h-96 bg-gray-900 rounded border border-gray-600"
            style={{ minHeight: '400px' }}
          />
          <p className="mt-2 text-sm text-gray-400">
            Point your camera at AR markers to visualize your portfolio in 3D
          </p>
        </div>
      )}

      {/* VR Container */}
      {currentMode === 'vr' && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-3">VR Trading Floor</h3>
          <div
            ref={vrContainerRef}
            className="w-full h-96 bg-gray-900 rounded border border-gray-600"
            style={{ minHeight: '400px' }}
          />
          <p className="mt-2 text-sm text-gray-400">
            Put on your VR headset to enter the 3D trading floor
          </p>
        </div>
      )}

      {/* Gesture Recognition Status */}
      <div className="mb-6 p-4 bg-gray-700 rounded">
        <h3 className="text-lg font-semibold text-white mb-3">Gesture Recognition</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Swipe Left/Right:</span>
            <span className="text-white ml-2">Navigate charts</span>
          </div>
          <div>
            <span className="text-gray-400">Pinch In/Out:</span>
            <span className="text-white ml-2">Zoom in/out</span>
          </div>
          <div>
            <span className="text-gray-400">Double Tap:</span>
            <span className="text-white ml-2">Select asset</span>
          </div>
          <div>
            <span className="text-gray-400">Wave:</span>
            <span className="text-white ml-2">Voice commands</span>
          </div>
        </div>
        {gestureData && (
          <div className="mt-3 p-2 bg-gray-600 rounded">
            <span className="text-neon">Last Gesture: {gestureData.type}</span>
          </div>
        )}
      </div>

      {/* Support Status */}
      <div className="mb-6 p-4 bg-gray-700 rounded">
        <h3 className="text-lg font-semibold text-white mb-3">Device Support</h3>
        <div className="flex space-x-4">
          <div className="flex items-center">
            <span className={`w-3 h-3 rounded-full mr-2 ${isARSupported ? 'bg-green-500' : 'bg-red-500'}`}></span>
            <span className="text-gray-300">AR Support: {isARSupported ? 'Yes' : 'No'}</span>
          </div>
          <div className="flex items-center">
            <span className={`w-3 h-3 rounded-full mr-2 ${isVRSupported ? 'bg-green-500' : 'bg-red-500'}`}></span>
            <span className="text-gray-300">VR Support: {isVRSupported ? 'Yes' : 'No'}</span>
          </div>
        </div>
      </div>

      {/* Mentor Avatar Info */}
      {mentorAvatar && (
        <div className="mb-6 p-4 bg-gray-700 rounded">
          <h3 className="text-lg font-semibold text-white mb-3">AI Mentor: {mentorAvatar.name}</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Personality:</span>
              <span className="text-white ml-2 capitalize">{mentorAvatar.personality}</span>
            </div>
            <div>
              <span className="text-gray-400">Expertise:</span>
              <span className="text-white ml-2 capitalize">{mentorAvatar.expertise}</span>
            </div>
            <div>
              <span className="text-gray-400">Voice:</span>
              <span className="text-white ml-2 capitalize">{mentorAvatar.voice}</span>
            </div>
            <div>
              <span className="text-gray-400">Status:</span>
              <span className="text-neon ml-2">Ready to assist</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Gesture Recognizer Class
class GestureRecognizer {
  constructor(videoStream) {
    this.videoStream = videoStream;
    this.onGesture = null;
    this.isRunning = false;
    this.init();
  }

  init() {
    // Initialize gesture recognition
    this.isRunning = true;
    this.startRecognition();
  }

  startRecognition() {
    // Simulate gesture recognition
    setInterval(() => {
      if (this.isRunning && this.onGesture) {
        const gestures = ['swipe_left', 'swipe_right', 'pinch_in', 'pinch_out', 'double_tap', 'wave'];
        const randomGesture = gestures[Math.floor(Math.random() * gestures.length)];
        
        // Only trigger occasionally for demo
        if (Math.random() < 0.1) {
          this.onGesture({
            type: randomGesture,
            confidence: Math.random() * 0.5 + 0.5,
            timestamp: new Date()
          });
        }
      }
    }, 1000);
  }

  stop() {
    this.isRunning = false;
  }
}

export default ARVRInterface;
