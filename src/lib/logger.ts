type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: any;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  private formatLog(entry: LogEntry): string {
    return JSON.stringify(entry);
  }

  private log(level: LogLevel, message: string, context?: any) {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
    };

    if (this.isDevelopment) {
      // Pretty print in development
      console[level === 'error' ? 'error' : 'log'](
        `[${entry.timestamp}] ${level.toUpperCase()}: ${message}`,
        context || ''
      );
    } else {
      // Structured logging in production
      console.log(this.formatLog(entry));
    }
  }

  info(message: string, context?: any) {
    this.log('info', message, context);
  }

  warn(message: string, context?: any) {
    this.log('warn', message, context);
  }

  error(message: string, error?: Error | any) {
    this.log('error', message, {
      error: error?.message,
      stack: error?.stack,
      ...error,
    });
  }

  debug(message: string, context?: any) {
    if (this.isDevelopment) {
      this.log('debug', message, context);
    }
  }
}

export const logger = new Logger();