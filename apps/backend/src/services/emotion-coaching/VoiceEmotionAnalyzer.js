/**
 * FinAI Nexus - Voice Emotion Analyzer
 * 
 * Analyzes voice tone, pitch, rhythm, and other acoustic features
 * to detect emotional states during financial interactions.
 */

import { AudioContext } from 'web-audio-api';
import { MFCC } from 'mfcc';
import { PitchDetector } from 'pitch-detection';

export class VoiceEmotionAnalyzer {
  constructor() {
    this.audioContext = new AudioContext();
    this.mfcc = new MFCC();
    this.pitchDetector = new PitchDetector();
    
    // Emotion detection thresholds
    this.thresholds = {
      stress: {
        pitchVariation: 0.3,
        speakingRate: 0.4,
        volumeVariation: 0.25
      },
      confidence: {
        pitchStability: 0.7,
        speakingRate: 0.6,
        volumeConsistency: 0.8
      },
      excitement: {
        pitchIncrease: 0.2,
        speakingRate: 0.8,
        volumeIncrease: 0.3
      },
      frustration: {
        pitchVariation: 0.5,
        speakingRate: 0.3,
        volumeSpikes: 0.4
      }
    };
  }

  /**
   * Extract acoustic features from audio data
   * @param {Buffer} audioData - Raw audio buffer
   * @returns {Promise<Object>} Extracted features
   */
  async extractFeatures(audioData) {
    try {
      const audioBuffer = await this.audioContext.decodeAudioData(audioData);
      const features = await this.analyzeAudioBuffer(audioBuffer);
      
      return {
        confidence: features.confidence,
        stressLevel: features.stressLevel,
        confidenceLevel: features.confidenceLevel,
        excitementLevel: features.excitementLevel,
        frustrationLevel: features.frustrationLevel,
        rawFeatures: features.rawFeatures
      };
    } catch (error) {
      console.error('Voice analysis failed:', error);
      return this.getDefaultFeatures();
    }
  }

  /**
   * Analyze audio buffer for emotional features
   */
  async analyzeAudioBuffer(audioBuffer) {
    const samples = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    
    // Extract basic features
    const pitch = await this.extractPitch(samples, sampleRate);
    const mfccFeatures = await this.extractMFCC(samples, sampleRate);
    const rhythm = await this.extractRhythm(samples, sampleRate);
    const volume = await this.extractVolume(samples, sampleRate);
    
    // Calculate emotion indicators
    const stressLevel = this.calculateStressLevel(pitch, rhythm, volume);
    const confidenceLevel = this.calculateConfidenceLevel(pitch, rhythm, volume);
    const excitementLevel = this.calculateExcitementLevel(pitch, rhythm, volume);
    const frustrationLevel = this.calculateFrustrationLevel(pitch, rhythm, volume);
    
    return {
      confidence: this.calculateOverallConfidence(pitch, mfccFeatures, rhythm, volume),
      stressLevel,
      confidenceLevel,
      excitementLevel,
      frustrationLevel,
      rawFeatures: {
        pitch,
        mfcc: mfccFeatures,
        rhythm,
        volume
      }
    };
  }

  /**
   * Extract pitch information from audio
   */
  async extractPitch(samples, sampleRate) {
    const pitchData = await this.pitchDetector.detect(samples, sampleRate);
    
    return {
      fundamental: pitchData.fundamental,
      harmonics: pitchData.harmonics,
      variation: this.calculatePitchVariation(pitchData.fundamental),
      stability: this.calculatePitchStability(pitchData.fundamental),
      range: this.calculatePitchRange(pitchData.fundamental)
    };
  }

  /**
   * Extract MFCC features for speech characteristics
   */
  async extractMFCC(samples, sampleRate) {
    const mfccData = await this.mfcc.extract(samples, sampleRate);
    
    return {
      coefficients: mfccData.coefficients,
      energy: mfccData.energy,
      spectralCentroid: mfccData.spectralCentroid,
      spectralRolloff: mfccData.spectralRolloff
    };
  }

  /**
   * Extract rhythm and timing features
   */
  async extractRhythm(samples, sampleRate) {
    const windowSize = Math.floor(sampleRate * 0.025); // 25ms windows
    const hopSize = Math.floor(sampleRate * 0.01); // 10ms hop
    
    const energyFrames = [];
    for (let i = 0; i < samples.length - windowSize; i += hopSize) {
      const frame = samples.slice(i, i + windowSize);
      const energy = frame.reduce((sum, sample) => sum + sample * sample, 0) / windowSize;
      energyFrames.push(energy);
    }
    
    // Detect speech segments
    const speechSegments = this.detectSpeechSegments(energyFrames);
    
    return {
      speakingRate: this.calculateSpeakingRate(speechSegments),
      pauseFrequency: this.calculatePauseFrequency(speechSegments),
      rhythmRegularity: this.calculateRhythmRegularity(energyFrames),
      speechSegments
    };
  }

  /**
   * Extract volume and intensity features
   */
  async extractVolume(samples, sampleRate) {
    const windowSize = Math.floor(sampleRate * 0.1); // 100ms windows
    const volumeFrames = [];
    
    for (let i = 0; i < samples.length - windowSize; i += windowSize) {
      const frame = samples.slice(i, i + windowSize);
      const rms = Math.sqrt(frame.reduce((sum, sample) => sum + sample * sample, 0) / windowSize);
      volumeFrames.push(rms);
    }
    
    return {
      average: this.calculateAverage(volumeFrames),
      variation: this.calculateVariation(volumeFrames),
      peaks: this.detectVolumePeaks(volumeFrames),
      consistency: this.calculateVolumeConsistency(volumeFrames)
    };
  }

  /**
   * Calculate stress level from acoustic features
   */
  calculateStressLevel(pitch, rhythm, volume) {
    const pitchStress = pitch.variation > this.thresholds.stress.pitchVariation ? 1 : 0;
    const rhythmStress = rhythm.speakingRate < this.thresholds.stress.speakingRate ? 1 : 0;
    const volumeStress = volume.variation > this.thresholds.stress.volumeVariation ? 1 : 0;
    
    return (pitchStress + rhythmStress + volumeStress) / 3;
  }

  /**
   * Calculate confidence level from acoustic features
   */
  calculateConfidenceLevel(pitch, rhythm, volume) {
    const pitchConfidence = pitch.stability > this.thresholds.confidence.pitchStability ? 1 : 0;
    const rhythmConfidence = rhythm.speakingRate > this.thresholds.confidence.speakingRate ? 1 : 0;
    const volumeConfidence = volume.consistency > this.thresholds.confidence.volumeConsistency ? 1 : 0;
    
    return (pitchConfidence + rhythmConfidence + volumeConfidence) / 3;
  }

  /**
   * Calculate excitement level from acoustic features
   */
  calculateExcitementLevel(pitch, rhythm, volume) {
    const pitchExcitement = pitch.range > this.thresholds.excitement.pitchIncrease ? 1 : 0;
    const rhythmExcitement = rhythm.speakingRate > this.thresholds.excitement.speakingRate ? 1 : 0;
    const volumeExcitement = volume.average > this.thresholds.excitement.volumeIncrease ? 1 : 0;
    
    return (pitchExcitement + rhythmExcitement + volumeExcitement) / 3;
  }

  /**
   * Calculate frustration level from acoustic features
   */
  calculateFrustrationLevel(pitch, rhythm, volume) {
    const pitchFrustration = pitch.variation > this.thresholds.frustration.pitchVariation ? 1 : 0;
    const rhythmFrustration = rhythm.speakingRate < this.thresholds.frustration.speakingRate ? 1 : 0;
    const volumeFrustration = volume.peaks.length > this.thresholds.frustration.volumeSpikes ? 1 : 0;
    
    return (pitchFrustration + rhythmFrustration + volumeFrustration) / 3;
  }

  /**
   * Calculate overall confidence in the analysis
   */
  calculateOverallConfidence(pitch, mfcc, rhythm, volume) {
    const pitchConfidence = pitch.fundamental > 0 ? 0.8 : 0.2;
    const mfccConfidence = mfcc.coefficients.length > 0 ? 0.9 : 0.1;
    const rhythmConfidence = rhythm.speechSegments.length > 0 ? 0.7 : 0.3;
    const volumeConfidence = volume.average > 0 ? 0.8 : 0.2;
    
    return (pitchConfidence + mfccConfidence + rhythmConfidence + volumeConfidence) / 4;
  }

  /**
   * Detect speech segments from energy frames
   */
  detectSpeechSegments(energyFrames) {
    const threshold = this.calculateEnergyThreshold(energyFrames);
    const segments = [];
    let inSpeech = false;
    let startFrame = 0;
    
    energyFrames.forEach((energy, index) => {
      if (energy > threshold && !inSpeech) {
        inSpeech = true;
        startFrame = index;
      } else if (energy <= threshold && inSpeech) {
        inSpeech = false;
        segments.push({
          start: startFrame,
          end: index,
          duration: index - startFrame,
          averageEnergy: this.calculateAverage(energyFrames.slice(startFrame, index))
        });
      }
    });
    
    return segments;
  }

  /**
   * Calculate energy threshold for speech detection
   */
  calculateEnergyThreshold(energyFrames) {
    const sorted = [...energyFrames].sort((a, b) => a - b);
    const percentile = Math.floor(sorted.length * 0.3);
    return sorted[percentile];
  }

  /**
   * Calculate speaking rate (words per minute)
   */
  calculateSpeakingRate(speechSegments) {
    if (speechSegments.length === 0) return 0;
    
    const totalDuration = speechSegments.reduce((sum, seg) => sum + seg.duration, 0);
    const averageSegmentDuration = totalDuration / speechSegments.length;
    
    // Estimate words per minute (rough approximation)
    return Math.min(1, averageSegmentDuration / 10);
  }

  /**
   * Calculate pause frequency
   */
  calculatePauseFrequency(speechSegments) {
    return speechSegments.length / 10; // Normalized pause frequency
  }

  /**
   * Calculate rhythm regularity
   */
  calculateRhythmRegularity(energyFrames) {
    if (energyFrames.length < 10) return 0;
    
    const intervals = [];
    for (let i = 1; i < energyFrames.length; i++) {
      intervals.push(Math.abs(energyFrames[i] - energyFrames[i-1]));
    }
    
    const averageInterval = this.calculateAverage(intervals);
    const variance = this.calculateVariance(intervals, averageInterval);
    
    return Math.max(0, 1 - (variance / averageInterval));
  }

  /**
   * Detect volume peaks
   */
  detectVolumePeaks(volumeFrames) {
    const threshold = this.calculateAverage(volumeFrames) * 1.5;
    return volumeFrames.filter(volume => volume > threshold);
  }

  /**
   * Calculate volume consistency
   */
  calculateVolumeConsistency(volumeFrames) {
    if (volumeFrames.length < 2) return 0;
    
    const average = this.calculateAverage(volumeFrames);
    const variance = this.calculateVariance(volumeFrames, average);
    
    return Math.max(0, 1 - (variance / average));
  }

  /**
   * Utility functions
   */
  calculateAverage(values) {
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  calculateVariance(values, mean) {
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return this.calculateAverage(squaredDiffs);
  }

  calculatePitchVariation(pitchValues) {
    if (pitchValues.length < 2) return 0;
    const mean = this.calculateAverage(pitchValues);
    return this.calculateVariance(pitchValues, mean);
  }

  calculatePitchStability(pitchValues) {
    const variation = this.calculatePitchVariation(pitchValues);
    return Math.max(0, 1 - variation);
  }

  calculatePitchRange(pitchValues) {
    if (pitchValues.length === 0) return 0;
    const min = Math.min(...pitchValues);
    const max = Math.max(...pitchValues);
    return max - min;
  }

  /**
   * Get default features when analysis fails
   */
  getDefaultFeatures() {
    return {
      confidence: 0.5,
      stressLevel: 0.3,
      confidenceLevel: 0.5,
      excitementLevel: 0.2,
      frustrationLevel: 0.1,
      rawFeatures: {}
    };
  }
}

export default VoiceEmotionAnalyzer;
