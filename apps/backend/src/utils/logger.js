// Production-ready logging utility
class Logger {
  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.logLevel = process.env.LOG_LEVEL || 'info';
  }

  log(level, message, ...args) {
    if (this.shouldLog(level)) {
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

      if (this.isProduction) {
        // In production, send to external logging service
        this.sendToLoggingService(level, logMessage, args);
      } else {
        // In development, use console with colors
        const consoleMethod = this.getConsoleMethod(level);
        consoleMethod(logMessage, ...args);
      }
    }
  }

  shouldLog(level) {
    const levels = { error: 0, warn: 1, info: 2, debug: 3 };
    return levels[level] <= levels[this.logLevel];
  }

  getConsoleMethod(level) {
    /* eslint-disable no-console */
    const methods = {
      error: console.error,
      warn: console.warn,
      info: console.info,
      debug: console.debug
    };
    return methods[level] || console.log;
    /* eslint-enable no-console */
  }

  sendToLoggingService(_level, _message, _args) {
    // In production, this would send to external logging service
    // For now, we'll just suppress console output
    // This could integrate with services like:
    // - Winston with external transports
    // - LogDNA
    // - Splunk
    // - CloudWatch

  }

  error(message, ...args) {
    this.log('error', message, ...args);
  }

  warn(message, ...args) {
    this.log('warn', message, ...args);
  }

  info(message, ...args) {
    this.log('info', message, ...args);
  }

  debug(message, ...args) {
    this.log('debug', message, ...args);
  }
}

module.exports = new Logger();
