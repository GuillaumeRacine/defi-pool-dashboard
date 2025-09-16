/**
 * Structured Logging for DeFi Data Sync Jobs
 */

import winston from 'winston';

const { combine, timestamp, errors, json, printf, colorize } = winston.format;

// Custom format for console output
const consoleFormat = printf(({ level, message, timestamp, ...meta }) => {
  let log = `${timestamp} [${level}]: ${message}`;

  if (Object.keys(meta).length > 0) {
    log += ` ${JSON.stringify(meta, null, 2)}`;
  }

  return log;
});

// Create logger instance
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    json()
  ),
  transports: [
    // Console output for development
    new winston.transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: 'HH:mm:ss' }),
        consoleFormat
      )
    }),

    // File output for production
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),

    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ],

  // Handle uncaught exceptions
  exceptionHandlers: [
    new winston.transports.File({ filename: 'logs/exceptions.log' })
  ],

  // Handle unhandled promise rejections
  rejectionHandlers: [
    new winston.transports.File({ filename: 'logs/rejections.log' })
  ]
});

// Helper functions for common logging patterns
export const logJobStart = (jobName, metadata = {}) => {
  logger.info(`🚀 Starting job: ${jobName}`, { job: jobName, ...metadata });
};

export const logJobComplete = (jobName, stats = {}) => {
  logger.info(`✅ Completed job: ${jobName}`, { job: jobName, ...stats });
};

export const logJobError = (jobName, error, metadata = {}) => {
  logger.error(`❌ Job failed: ${jobName}`, {
    job: jobName,
    error: error.message,
    stack: error.stack,
    ...metadata
  });
};

export const logApiCall = (endpoint, responseTime, statusCode) => {
  const level = statusCode >= 400 ? 'warn' : 'debug';
  logger.log(level, `API call: ${endpoint}`, {
    endpoint,
    responseTime,
    statusCode
  });
};

export const logDataQuality = (dataType, qualityMetrics) => {
  logger.info(`📊 Data quality check: ${dataType}`, {
    dataType,
    ...qualityMetrics
  });
};