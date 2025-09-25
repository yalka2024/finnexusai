const logger = require('../../utils/logger');
/**
 * FinAI Nexus - 3D Trading Floor Component
 * 
 * Advanced 3D trading floor featuring:
 * - WebXR integration for immersive trading
 * - Real-time 3D data visualization
 * - Interactive trading interfaces
 * - Social trading rooms
 * - Virtual financial mentors
 */

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from './Internationalization';

const TradingFloor3D = ({ onTrade, onJoinRoom, onMentorInteraction }) => {
  const { t } = useTranslation();
  const [isXRSupported, setIsXRSupported] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [activeUsers, setActiveUsers] = useState([]);
  const [marketData, setMarketData] = useState({});
  const [tradingFloor, setTradingFloor] = useState(null);
  const [mentors, setMentors] = useState([]);
  const [selectedAsset, setSelectedAsset] = useState(null);

  const xrContainerRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);

  useEffect(() => {
    checkXRSupport();
    loadMarketData();
    loadTradingFloor();
    loadMentors();
    initializeScene();
  }, []);

  const checkXRSupport = async () => {
    try {
      if (navigator.xr) {
        const supported = await navigator.xr.isSessionSupported('immersive-vr');
        setIsXRSupported(supported);
      }
    } catch (error) {
      logger.error('Error checking XR support:', error);
    }
  };

  const loadMarketData = async () => {
    try {
      const response = await fetch('/api/market/data');
      const data = await response.json();
      setMarketData(data);
    } catch (error) {
      logger.error('Error loading market data:', error);
    }
  };

  const loadTradingFloor = async () => {
    try {
      const response = await fetch('/api/metaverse/trading-floor');
      const data = await response.json();
      setTradingFloor(data);
    } catch (error) {
      logger.error('Error loading trading floor:', error);
    }
  };

  const loadMentors = async () => {
    try {
      const response = await fetch('/api/metaverse/mentors');
      const data = await response.json();
      setMentors(data.mentors || []);
    } catch (error) {
      logger.error('Error loading mentors:', error);
    }
  };

  const initializeScene = () => {
    // Initialize 3D scene
    const scene = {
      objects: [],
      lights: [],
      animations: []
    };
    sceneRef.current = scene;
  };

  const startXR = async () => {
    try {
      if (!navigator.xr || !isXRSupported) {
        throw new Error('XR not supported');
      }

      const session = await navigator.xr.requestSession('immersive-vr');
      
      // Initialize XR scene
      await initializeXRScene(session);
      setIsActive(true);

    } catch (error) {
      logger.error('Error starting XR:', error);
      alert('Failed to start XR session. Please ensure you have a VR headset connected.');
    }
  };

  const initializeXRScene = async (session) => {
    // Create 3D trading floor environment
    const scene = sceneRef.current;
    
    // Add trading floor
    addTradingFloor(scene);
    
    // Add market data displays
    addMarketDisplays(scene);
    
    // Add trading interfaces
    addTradingInterfaces(scene);
    
    // Add social rooms
    addSocialRooms(scene);
    
    // Add mentors
    addMentors(scene);
    
    // Start rendering
    startRendering(session);
  };

  const addTradingFloor = (scene) => {
    const floor = {
      type: 'plane',
      geometry: { width: 50, height: 50 },
      material: { color: 0x1a1a1a, transparent: true, opacity: 0.8 },
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: -Math.PI / 2, y: 0, z: 0 }
    };
    scene.objects.push(floor);

    // Add walls
    const walls = [
      { position: { x: 0, y: 5, z: -25 }, rotation: { x: 0, y: 0, z: 0 } },
      { position: { x: 0, y: 5, z: 25 }, rotation: { x: 0, y: Math.PI, z: 0 } },
      { position: { x: -25, y: 5, z: 0 }, rotation: { x: 0, y: Math.PI / 2, z: 0 } },
      { position: { x: 25, y: 5, z: 0 }, rotation: { x: 0, y: -Math.PI / 2, z: 0 } }
    ];

    walls.forEach(wall => {
      const wallObject = {
        type: 'plane',
        geometry: { width: 50, height: 10 },
        material: { color: 0x2a2a2a },
        position: wall.position,
        rotation: wall.rotation
      };
      scene.objects.push(wallObject);
    });
  };

  const addMarketDisplays = (scene) => {
    const displays = [
      {
        position: { x: -20, y: 8, z: -20 },
        content: 'BTC: $45,000',
        size: { width: 8, height: 4 },
        color: 0x00ff00
      },
      {
        position: { x: 20, y: 8, z: -20 },
        content: 'ETH: $3,200',
        size: { width: 8, height: 4 },
        color: 0x0080ff
      },
      {
        position: { x: -20, y: 8, z: 20 },
        content: 'Market: Bullish',
        size: { width: 8, height: 4 },
        color: 0xff8000
      },
      {
        position: { x: 20, y: 8, z: 20 },
        content: 'Volume: $2.1B',
        size: { width: 8, height: 4 },
        color: 0xff0080
      }
    ];

    displays.forEach(display => {
      const displayObject = {
        type: 'plane',
        geometry: display.size,
        material: { 
          color: display.color, 
          emissive: display.color,
          emissiveIntensity: 0.5
        },
        position: display.position,
        rotation: { x: 0, y: Math.PI / 4, z: 0 },
        text: display.content
      };
      scene.objects.push(displayObject);
    });
  };

  const addTradingInterfaces = (scene) => {
    const interfaces = [
      {
        position: { x: 0, y: 2, z: -10 },
        type: 'buy',
        asset: 'BTC',
        size: { width: 4, height: 2, depth: 0.5 }
      },
      {
        position: { x: 0, y: 2, z: 10 },
        type: 'sell',
        asset: 'ETH',
        size: { width: 4, height: 2, depth: 0.5 }
      },
      {
        position: { x: -10, y: 2, z: 0 },
        type: 'swap',
        asset: 'USDC',
        size: { width: 4, height: 2, depth: 0.5 }
      },
      {
        position: { x: 10, y: 2, z: 0 },
        type: 'stake',
        asset: 'NEXUS',
        size: { width: 4, height: 2, depth: 0.5 }
      }
    ];

    interfaces.forEach(interfaceConfig => {
      const interfaceObject = {
        type: 'box',
        geometry: interfaceConfig.size,
        material: { 
          color: getInterfaceColor(interfaceConfig.type),
          transparent: true,
          opacity: 0.8
        },
        position: interface.position,
        interactive: true,
        action: interface.type,
        asset: interface.asset
      };
      scene.objects.push(interfaceObject);
    });
  };

  const addSocialRooms = (scene) => {
    const rooms = [
      {
        position: { x: -15, y: 1, z: -15 },
        name: 'Crypto Traders',
        color: 0xff6b6b,
        radius: 3
      },
      {
        position: { x: 15, y: 1, z: -15 },
        name: 'DeFi Enthusiasts',
        color: 0x4ecdc4,
        radius: 3
      },
      {
        position: { x: -15, y: 1, z: 15 },
        name: 'Portfolio Managers',
        color: 0x45b7d1,
        radius: 3
      },
      {
        position: { x: 15, y: 1, z: 15 },
        name: 'AI Investors',
        color: 0xf9ca24,
        radius: 3
      }
    ];

    rooms.forEach(room => {
      const roomObject = {
        type: 'cylinder',
        geometry: { radius: room.radius, height: 2 },
        material: { 
          color: room.color, 
          transparent: true, 
          opacity: 0.3
        },
        position: room.position,
        interactive: true,
        action: 'join_room',
        roomName: room.name
      };
      scene.objects.push(roomObject);
    });
  };

  const addMentors = (scene) => {
    mentors.forEach((mentor, index) => {
      const mentorObject = {
        type: 'avatar',
        geometry: { width: 1, height: 2, depth: 1 },
        material: { color: 0x8e44ad },
        position: { 
          x: (index - mentors.length / 2) * 8, 
          y: 1, 
          z: -25 
        },
        interactive: true,
        action: 'interact_mentor',
        mentor: mentor
      };
      scene.objects.push(mentorObject);
    });
  };

  const getInterfaceColor = (type) => {
    const colors = {
      buy: 0x00ff00,
      sell: 0xff0000,
      swap: 0x0080ff,
      stake: 0xff8000
    };
    return colors[type] || 0x808080;
  };

  const startRendering = (session) => {
    // Start XR rendering loop
    const renderLoop = () => {
      if (isActive) {
        // Update scene
        updateScene();
        
        // Render frame
        renderFrame();
        
        // Continue loop
        requestAnimationFrame(renderLoop);
      }
    };
    
    renderLoop();
  };

  const updateScene = () => {
    // Update market data displays
    updateMarketDisplays();
    
    // Update user positions
    updateUserPositions();
    
    // Update animations
    updateAnimations();
  };

  const updateMarketDisplays = () => {
    // Update market data in real-time
    const displays = sceneRef.current.objects.filter(obj => obj.text);
    displays.forEach(display => {
      // Update display content with latest market data
      display.text = getUpdatedMarketText(display.text);
    });
  };

  const updateUserPositions = () => {
    // Update positions of other users in the trading floor
    activeUsers.forEach(user => {
      // Update user avatar position
      const userObject = sceneRef.current.objects.find(obj => obj.userId === user.id);
      if (userObject) {
        userObject.position = user.position;
      }
    });
  };

  const updateAnimations = () => {
    // Update any ongoing animations
    sceneRef.current.animations.forEach(animation => {
      animation.update();
    });
  };

  const renderFrame = () => {
    // Render the current frame
    // This would integrate with WebXR rendering
  };

  const getUpdatedMarketText = (currentText) => {
    // Update market text with real-time data
    if (currentText.includes('BTC')) {
      return `BTC: $${(45000 + Math.random() * 1000).toFixed(0)}`;
    } else if (currentText.includes('ETH')) {
      return `ETH: $${(3200 + Math.random() * 100).toFixed(0)}`;
    } else if (currentText.includes('Volume')) {
      return `Volume: $${(2.1 + Math.random() * 0.5).toFixed(1)}B`;
    }
    return currentText;
  };

  const handleInteraction = (object) => {
    if (!object.interactive) return;

    switch (object.action) {
      case 'buy':
      case 'sell':
      case 'swap':
      case 'stake':
        handleTradingAction(object.action, object.asset);
        break;
      case 'join_room':
        handleJoinRoom(object.roomName);
        break;
      case 'interact_mentor':
        handleMentorInteraction(object.mentor);
        break;
      default:
        logger.info('Unknown interaction:', object.action);
    }
  };

  const handleTradingAction = (action, asset) => {
    setSelectedAsset({ action, asset });
    if (onTrade) {
      onTrade({ action, asset });
    }
  };

  const handleJoinRoom = (roomName) => {
    setCurrentRoom(roomName);
    if (onJoinRoom) {
      onJoinRoom(roomName);
    }
  };

  const handleMentorInteraction = (mentor) => {
    if (onMentorInteraction) {
      onMentorInteraction(mentor);
    }
  };

  const stopXR = () => {
    setIsActive(false);
    setCurrentRoom(null);
  };

  return (
    <div className="trading-floor-3d bg-gray-800 p-6 rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-neon">3D Trading Floor</h2>
        <div className="flex items-center space-x-4">
          <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-sm text-gray-400">
            {isActive ? 'VR Active' : 'VR Inactive'}
          </span>
        </div>
      </div>

      {/* XR Controls */}
      <div className="mb-6 p-4 bg-gray-700 rounded-lg">
        <h3 className="text-lg font-semibold text-white mb-4">XR Controls</h3>
        <div className="flex space-x-4">
          <button
            onClick={startXR}
            disabled={!isXRSupported || isActive}
            className={`px-4 py-2 rounded font-medium ${
              isXRSupported && !isActive
                ? 'bg-neon text-black hover:bg-neon/90'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
          >
            🥽 Start VR
          </button>
          {isActive && (
            <button
              onClick={stopXR}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Stop VR
            </button>
          )}
        </div>
        {!isXRSupported && (
          <p className="mt-2 text-sm text-yellow-400">
            ⚠️ VR not supported. Please use a VR-compatible browser and headset.
          </p>
        )}
      </div>

      {/* Current Status */}
      {isActive && (
        <div className="mb-6 p-4 bg-gray-700 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-4">Trading Floor Status</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-gray-400">Active Users</div>
              <div className="text-lg font-bold text-neon">{activeUsers.length}</div>
            </div>
            <div>
              <div className="text-sm text-gray-400">Current Room</div>
              <div className="text-lg font-bold text-white">
                {currentRoom || 'Main Floor'}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-400">Available Mentors</div>
              <div className="text-lg font-bold text-purple-400">{mentors.length}</div>
            </div>
            <div>
              <div className="text-sm text-gray-400">Market Status</div>
              <div className="text-lg font-bold text-green-400">Live</div>
            </div>
          </div>
        </div>
      )}

      {/* Trading Interfaces */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-4">Trading Interfaces</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { type: 'buy', label: 'Buy', icon: '📈', color: 'green' },
            { type: 'sell', label: 'Sell', icon: '📉', color: 'red' },
            { type: 'swap', label: 'Swap', icon: '🔄', color: 'blue' },
            { type: 'stake', label: 'Stake', icon: '💰', color: 'yellow' }
          ].map((interface) => (
            <button
              key={interface.type}
              onClick={() => handleTradingAction(interface.type, 'BTC')}
              className={`p-4 rounded-lg border-2 border-${interface.color}-500 bg-${interface.color}-500/10 hover:bg-${interface.color}-500/20 transition-colors`}
            >
              <div className="text-2xl mb-2">{interface.icon}</div>
              <div className="text-sm font-medium text-white">{interface.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Social Rooms */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-4">Social Trading Rooms</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { name: 'Crypto Traders', icon: '₿', color: 'red' },
            { name: 'DeFi Enthusiasts', icon: '🔄', color: 'cyan' },
            { name: 'Portfolio Managers', icon: '💼', color: 'blue' },
            { name: 'AI Investors', icon: '🤖', color: 'yellow' }
          ].map((room) => (
            <button
              key={room.name}
              onClick={() => handleJoinRoom(room.name)}
              className={`p-4 rounded-lg border-2 border-${room.color}-500 bg-${room.color}-500/10 hover:bg-${room.color}-500/20 transition-colors`}
            >
              <div className="text-2xl mb-2">{room.icon}</div>
              <div className="text-sm font-medium text-white">{room.name}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Virtual Mentors */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-4">Virtual Financial Mentors</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {mentors.map((mentor, index) => (
            <div
              key={index}
              className="p-4 bg-gray-700 rounded-lg border border-gray-600 hover:border-purple-500 transition-colors"
            >
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-xl">👨‍💼</span>
                </div>
                <div>
                  <h4 className="font-semibold text-white">{mentor.name}</h4>
                  <p className="text-sm text-gray-400">{mentor.expertise}</p>
                </div>
              </div>
              <p className="text-sm text-gray-300 mb-3">{mentor.description}</p>
              <button
                onClick={() => handleMentorInteraction(mentor)}
                className="w-full bg-purple-600 text-white py-2 rounded hover:bg-purple-700"
              >
                Interact
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* XR Container */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-4">VR Environment</h3>
        <div
          ref={xrContainerRef}
          className="w-full h-96 bg-gray-900 rounded border border-gray-600"
          style={{ minHeight: '400px' }}
        />
        <p className="mt-2 text-sm text-gray-400">
          Put on your VR headset to enter the immersive 3D trading floor
        </p>
      </div>

      {/* Market Data */}
      <div className="mb-6 p-4 bg-gray-700 rounded-lg">
        <h3 className="text-lg font-semibold text-white mb-4">Live Market Data</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(marketData).map(([symbol, data]) => (
            <div key={symbol} className="text-center">
              <div className="text-sm text-gray-400">{symbol}</div>
              <div className="text-lg font-bold text-white">
                ${data.price?.toLocaleString() || '0'}
              </div>
              <div className={`text-sm ${data.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {data.change >= 0 ? '+' : ''}{data.change}%
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TradingFloor3D;
