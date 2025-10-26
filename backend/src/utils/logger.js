import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import winston from 'winston';
import 'winston-daily-rotate-file';
import { randomUUID } from 'crypto';
import { isProduction } from '../config/env.js';
import pool from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logsDir = path.join(__dirname, '../../logs');

if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log formats
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;

    if (Object.keys(meta).length > 0) {
      log += ` | ${JSON.stringify(meta)}`;
    }

    return log;
  })
);

const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json()
);

// Create logger instance
export const logger = winston.createLogger({
  level: isProduction ? 'info' : 'debug',
  defaultMeta: { service: 'immo-albania-api' },
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: consoleFormat
    }),

    // Daily rotate file for errors
    new winston.transports.DailyRotateFile({
      filename: path.join(logsDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      format: fileFormat,
      maxFiles: '30d',
      maxSize: '20m'
    }),

    // Daily rotate file for all logs
    new winston.transports.DailyRotateFile({
      filename: path.join(logsDir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      format: fileFormat,
      maxFiles: '14d',
      maxSize: '50m'
    }),

    // Audit log for security events
    new winston.transports.DailyRotateFile({
      filename: path.join(logsDir, 'audit-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'info',
      format: fileFormat,
      maxFiles: '90d'
    })
  ],

  // Handle exceptions
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'exceptions.log'),
      format: fileFormat
    })
  ],

  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'rejections.log'),
      format: fileFormat
    })
  ]
});

// Custom log methods
export class ApplicationLogger {
  static info(message, meta = {}) {
    logger.info(message, meta);
  }

  static error(message, error = null, meta = {}) {
    const logData = { ...meta };

    if (error) {
      logData.error = {
        message: error.message,
        stack: error.stack,
        name: error.name
      };
    }

    logger.error(message, logData);
  }

  static warn(message, meta = {}) {
    logger.warn(message, meta);
  }

  static debug(message, meta = {}) {
    logger.debug(message, meta);
  }

  // Security logging
  static securityEvent(event, user = null, meta = {}) {
    const securityMeta = {
      ...meta,
      event,
      userId: user?.id,
      ip: meta.ip,
      userAgent: meta.userAgent,
      timestamp: new Date().toISOString()
    };

    logger.info(`SECURITY: ${event}`, securityMeta);

    // Also log to database for audit trail
    this.logToDatabase('security', event, securityMeta).catch((err) => {
      logger.error('Failed to log security event to database', {
        error: err.message
      });
    });
  }

  // Business event logging
  static businessEvent(event, data = {}) {
    logger.info(`BUSINESS: ${event}`, data);
  }

  // Performance logging
  static performance(operation, duration, meta = {}) {
    logger.debug(`PERFORMANCE: ${operation} took ${duration}ms`, meta);
  }

  // Database logging
  static async logToDatabase(type, message, details = {}) {
    try {
      const query = `
        INSERT INTO system_logs (id, type, message, details, user_id, ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;

      await pool.query(query, [
        randomUUID(),
        type,
        message,
        details,
        details.userId || null,
        details.ip || null,
        details.userAgent || null
      ]);
    } catch (error) {
      // Fallback to file logging if database is unavailable
      logger.error('Failed to log to database', {
        error: error.message
      });
    }
  }
}

// Request logging middleware
export const requestLogger = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;

    ApplicationLogger.info('HTTP Request', {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id,
      contentLength: res.get('Content-Length')
    });

    // Log slow requests
    if (duration > 1000) {
      ApplicationLogger.warn('Slow request', {
        method: req.method,
        url: req.originalUrl,
        duration: `${duration}ms`,
        userId: req.user?.id
      });
    }

    // Log errors
    if (res.statusCode >= 400) {
      ApplicationLogger.error('Request error', null, {
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        userId: req.user?.id
      });
    }
  });

  next();
};

// Security event logging
export const securityLogger = (req, res, next) => {
  const originalSend = res.send;

  res.send = function (data) {
    // Log authentication events
    if (req.originalUrl.includes('/auth/login') && res.statusCode === 200) {
      ApplicationLogger.securityEvent('USER_LOGIN_SUCCESS', req.user, {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
    }

    if (req.originalUrl.includes('/auth/login') && res.statusCode === 401) {
      ApplicationLogger.securityEvent('USER_LOGIN_FAILED', null, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        email: req.body.email
      });
    }

    // Log password changes
    if (req.originalUrl.includes('/auth/change-password') && res.statusCode === 200) {
      ApplicationLogger.securityEvent('PASSWORD_CHANGED', req.user, {
        ip: req.ip
      });
    }

    return originalSend.call(this, data);
  };

  next();
};
