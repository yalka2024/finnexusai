/**
 * Logger Utility for Mobile App
 * 
 * Provides structured logging with different levels,
 * file persistence, and remote logging capabilities
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import DeviceInfo from 'react-native-device-info';

class Logger {
  constructor() {
    this.logs = [];
    this.maxLogs = 1000;
    this.remoteLoggingEnabled = false;
    this.logLevel = __DEV__ ? 'debug' : 'info';
    
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3
    };
  }

  log(level, message, data = null) {
    if (this.levels[level] > this.levels[this.logLevel]) {
      return;
    }

    const logEntry = {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      message,
      data,
      device: {
        model: DeviceInfo.getModel(),
        version: DeviceInfo.getVersion(),
        buildNumber: DeviceInfo.getBuildNumber(),
        systemName: DeviceInfo.getSystemName(),
        systemVersion: DeviceInfo.getSystemVersion()
      }
    };

    // Add to memory
    this.logs.push(logEntry);
    
    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console output
    if (__DEV__) {
      console.log(`[${logEntry.level}] ${message}`, data || '');
    }

    // Persist to storage
    this.persistLogs();

    // Remote logging
    if (this.remoteLoggingEnabled) {
      this.sendToRemote(logEntry);
    }
  }

  error(message, data = null) {
    this.log('error', message, data);
  }

  warn(message, data = null) {
    this.log('warn', message, data);
  }

  info(message, data = null) {
    this.log('info', message, data);
  }

  debug(message, data = null) {
    this.log('debug', message, data);
  }

  async persistLogs() {
    try {
      await AsyncStorage.setItem('finnexusai_logs', JSON.stringify(this.logs));
    } catch (error) {
      console.error('Failed to persist logs:', error);
    }
  }

  async loadLogs() {
    try {
      const logs = await AsyncStorage.getItem('finnexusai_logs');
      if (logs) {
        this.logs = JSON.parse(logs);
      }
    } catch (error) {
      console.error('Failed to load logs:', error);
    }
  }

  async sendToRemote(logEntry) {
    try {
      // In real implementation, send to remote logging service
      // await fetch('https://api.finnexusai.com/logs', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(logEntry)
      // });
    } catch (error) {
      console.error('Failed to send log to remote:', error);
    }
  }

  getLogs(level = null, limit = 100) {
    let filteredLogs = this.logs;
    
    if (level) {
      filteredLogs = this.logs.filter(log => log.level === level.toUpperCase());
    }
    
    return filteredLogs.slice(-limit);
  }

  clearLogs() {
    this.logs = [];
    AsyncStorage.removeItem('finnexusai_logs');
  }
}

export const logger = new Logger();

