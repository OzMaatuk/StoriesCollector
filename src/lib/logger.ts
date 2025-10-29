type LogLevel = 'info' | 'warn' | 'error' | 'debug';

type LogContext = Record<string, unknown>;

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: LogContext;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  private formatLog(entry: LogEntry): string {
    return JSON.stringify(entry);
  }

  private log(level: LogLevel, message: string, context?: LogContext) {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
    };

    if (this.isDevelopment) {
      // Pretty print in development
      // eslint-disable-next-line no-console
      console[level === 'error' ? 'error' : 'log'](
        `[${entry.timestamp}] ${level.toUpperCase()}: ${message}`,
        context || ''
      );
    } else {
      // Structured logging in production
      // eslint-disable-next-line no-console
      console.log(this.formatLog(entry));
    }
  }

  info(message: string, context?: LogContext) {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext) {
    this.log('warn', message, context);
  }

  error(message: string, error?: Error) {
    this.log('error', message, {
      error: error?.message,
      stack: error?.stack,
      ...error,
    });
  }

  debug(message: string, context?: LogContext) {
    if (this.isDevelopment) {
      this.log('debug', message, context);
    }
  }
}

export const logger = new Logger();
