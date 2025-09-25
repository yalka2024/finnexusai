const logger = require('../../utils/logger');
/**
 * FinAI Nexus - Multimodal Interface Component
 * 
 * Advanced multimodal interface supporting:
 * - Voice input and commands
 * - Text input with natural language processing
 * - Image input for document analysis
 * - Gesture recognition
 * - Emotion detection
 */

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthProvider';
import { useWeb3 } from './Web3Provider';

const MultimodalInterface = ({ onCommand, onAnalysis, onEmotionChange }) => {
  const { user } = useAuth();
  const { isConnected } = useWeb3();
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentMode, setCurrentMode] = useState('text'); // text, voice, image, gesture
  const [transcript, setTranscript] = useState('');
  const [imagePreview, setImagePreview] = useState(null);
  const [emotion, setEmotion] = useState('neutral');
  const [confidence, setConfidence] = useState(0);
  const [suggestions, setSuggestions] = useState([]);

  const recognitionRef = useRef(null);
  const cameraRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    initializeVoiceRecognition();
    initializeCamera();
    initializeEmotionDetection();
  }, []);

  const initializeVoiceRecognition = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onstart = () => {
        setIsListening(true);
        setCurrentMode('voice');
      };

      recognitionRef.current.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        setTranscript(finalTranscript);
        processVoiceCommand(finalTranscript);
      };

      recognitionRef.current.onerror = (event) => {
        logger.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  };

  const initializeCamera = () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
          if (cameraRef.current) {
            cameraRef.current.srcObject = stream;
          }
        })
        .catch(error => {
          logger.error('Camera access error:', error);
        });
    }
  };

  const initializeEmotionDetection = () => {
    // Initialize emotion detection using computer vision
    if (cameraRef.current) {
      detectEmotion();
    }
  };

  const startVoiceRecognition = () => {
    if (recognitionRef.current && !isListening) {
      recognitionRef.current.start();
    }
  };

  const stopVoiceRecognition = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  const processVoiceCommand = async (command) => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          prompt: `Process this voice command: "${command}". Provide trading instructions, portfolio analysis, or financial advice.`,
          context: {
            userId: user?.id,
            mode: 'voice',
            timestamp: new Date().toISOString()
          }
        })
      });

      const result = await response.json();
      if (result.success) {
        onCommand(result.analysis);
        generateSuggestions(result.analysis);
      }
    } catch (error) {
      logger.error('Voice command processing error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const processTextInput = async (text) => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          prompt: `Process this text input: "${text}". Provide financial analysis, trading recommendations, or portfolio insights.`,
          context: {
            userId: user?.id,
            mode: 'text',
            timestamp: new Date().toISOString()
          }
        })
      });

      const result = await response.json();
      if (result.success) {
        onCommand(result.analysis);
        generateSuggestions(result.analysis);
      }
    } catch (error) {
      logger.error('Text processing error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const processImageInput = async (imageFile) => {
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      formData.append('userId', user?.id);

      const response = await fetch('/api/ai/analyze-image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      const result = await response.json();
      if (result.success) {
        onAnalysis(result.analysis);
        generateSuggestions(result.analysis);
      }
    } catch (error) {
      logger.error('Image processing error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const detectEmotion = () => {
    // Simulate emotion detection
    const emotions = ['happy', 'sad', 'angry', 'surprised', 'fearful', 'disgusted', 'neutral'];
    const randomEmotion = emotions[Math.floor(Math.random() * emotions.length)];
    const randomConfidence = Math.random();
    
    setEmotion(randomEmotion);
    setConfidence(randomConfidence);
    
    if (onEmotionChange) {
      onEmotionChange(randomEmotion, randomConfidence);
    }
  };

  const generateSuggestions = (analysis) => {
    const suggestions = [
      'Buy more stocks',
      'Sell some bonds',
      'Check portfolio balance',
      'View market trends',
      'Get AI insights'
    ];
    setSuggestions(suggestions);
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setImagePreview(URL.createObjectURL(file));
      processImageInput(file);
    }
  };

  const handleGesture = (gesture) => {
    switch (gesture) {
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
    default:
      break;
    }
  };

  const speakResponse = (text) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.8;
      utterance.pitch = 1;
      speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="multimodal-interface bg-gray-800 p-6 rounded-lg">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-neon">Multimodal Interface</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setCurrentMode('text')}
            className={`px-4 py-2 rounded ${
              currentMode === 'text' ? 'bg-neon text-black' : 'bg-gray-700 text-white'
            }`}
          >
            📝 Text
          </button>
          <button
            onClick={() => setCurrentMode('voice')}
            className={`px-4 py-2 rounded ${
              currentMode === 'voice' ? 'bg-neon text-black' : 'bg-gray-700 text-white'
            }`}
          >
            🎤 Voice
          </button>
          <button
            onClick={() => setCurrentMode('image')}
            className={`px-4 py-2 rounded ${
              currentMode === 'image' ? 'bg-neon text-black' : 'bg-gray-700 text-white'
            }`}
          >
            📷 Image
          </button>
          <button
            onClick={() => setCurrentMode('gesture')}
            className={`px-4 py-2 rounded ${
              currentMode === 'gesture' ? 'bg-neon text-black' : 'bg-gray-700 text-white'
            }`}
          >
            👋 Gesture
          </button>
        </div>
      </div>

      {/* Emotion Detection */}
      <div className="mb-6 p-4 bg-gray-700 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">Emotion Detection</h3>
            <p className="text-gray-300">
              Current emotion: <span className="text-neon font-bold">{emotion}</span>
            </p>
            <p className="text-gray-300">
              Confidence: <span className="text-neon font-bold">{(confidence * 100).toFixed(1)}%</span>
            </p>
          </div>
          <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center">
            <span className="text-2xl">
              {emotion === 'happy' && '😊'}
              {emotion === 'sad' && '😢'}
              {emotion === 'angry' && '😠'}
              {emotion === 'surprised' && '😲'}
              {emotion === 'fearful' && '😨'}
              {emotion === 'disgusted' && '🤢'}
              {emotion === 'neutral' && '😐'}
            </span>
          </div>
        </div>
      </div>

      {/* Text Input */}
      {currentMode === 'text' && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Enter your financial query or command:
          </label>
          <div className="flex space-x-2">
            <input
              type="text"
              placeholder="e.g., 'Show me my portfolio performance' or 'Buy 100 shares of AAPL'"
              className="flex-1 p-3 bg-gray-700 text-white rounded border border-gray-600 focus:border-neon focus:outline-none"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  processTextInput(e.target.value);
                  e.target.value = '';
                }
              }}
            />
            <button
              onClick={() => {
                const input = document.querySelector('input[type="text"]');
                if (input.value) {
                  processTextInput(input.value);
                  input.value = '';
                }
              }}
              className="px-6 py-3 bg-neon text-black rounded font-bold hover:bg-neon/90"
            >
              Send
            </button>
          </div>
        </div>
      )}

      {/* Voice Input */}
      {currentMode === 'voice' && (
        <div className="mb-6">
          <div className="text-center">
            <button
              onClick={isListening ? stopVoiceRecognition : startVoiceRecognition}
              className={`w-24 h-24 rounded-full flex items-center justify-center text-2xl font-bold ${
                isListening 
                  ? 'bg-red-500 text-white animate-pulse' 
                  : 'bg-neon text-black hover:bg-neon/90'
              }`}
            >
              {isListening ? '⏹️' : '🎤'}
            </button>
            <p className="mt-4 text-gray-300">
              {isListening ? 'Listening... Speak your command' : 'Click to start voice recognition'}
            </p>
            {transcript && (
              <div className="mt-4 p-4 bg-gray-700 rounded">
                <p className="text-white">Transcript: {transcript}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Image Input */}
      {currentMode === 'image' && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Upload an image for analysis (charts, documents, receipts):
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-neon file:text-black hover:file:bg-neon/90"
          />
          {imagePreview && (
            <div className="mt-4">
              <img
                src={imagePreview}
                alt="Preview"
                className="max-w-full h-64 object-contain rounded border border-gray-600"
              />
            </div>
          )}
        </div>
      )}

      {/* Gesture Recognition */}
      {currentMode === 'gesture' && (
        <div className="mb-6">
          <div className="text-center">
            <div className="w-64 h-48 bg-gray-700 rounded border-2 border-dashed border-gray-500 flex items-center justify-center">
              <span className="text-gray-400">Gesture Recognition Area</span>
            </div>
            <p className="mt-4 text-gray-300">
              Use gestures to interact with the interface
            </p>
            <div className="mt-4 flex justify-center space-x-4">
              <button
                onClick={() => handleGesture('swipe_left')}
                className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
              >
                ← Swipe Left
              </button>
              <button
                onClick={() => handleGesture('swipe_right')}
                className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
              >
                Swipe Right →
              </button>
              <button
                onClick={() => handleGesture('pinch_in')}
                className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
              >
                Pinch In
              </button>
              <button
                onClick={() => handleGesture('pinch_out')}
                className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
              >
                Pinch Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Processing Status */}
      {isProcessing && (
        <div className="mb-6 p-4 bg-blue-900/20 border border-blue-500 rounded">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mr-3"></div>
            <span className="text-blue-400">Processing your input...</span>
          </div>
        </div>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-3">Suggestions</h3>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => processTextInput(suggestion)}
                className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 text-sm"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Camera Feed for Emotion Detection */}
      <div className="hidden">
        <video
          ref={cameraRef}
          autoPlay
          muted
          className="w-32 h-24 bg-gray-700 rounded"
        />
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
};

export default MultimodalInterface;
