import { isProduction } from '../config/env.js';

class AppError extends Error {
  constructor(message, statusCode, errorCode = null) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true;
    this.timestamp = new Date().toISOString();

    Error.captureStackTrace(this, this.constructor);
  }
}

// Specific error types
export class ValidationError extends AppError {
  constructor(message, details = []) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND_ERROR');
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMIT_ERROR');
  }
}

// Global error handler
export const globalErrorHandler = (err, req, res, next) => {
  const error = err;
  error.statusCode = error.statusCode || 500;
  error.status = error.status || 'error';

  // Log error
  console.error('Error:', {
    message: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    timestamp: new Date().toISOString()
  });

  let handledError = error;

  // MongoDB errors (if applicable)
  if (handledError.name === 'CastError') {
    handledError = new ValidationError('Invalid resource ID');
  }

  if (handledError.code === 11000) {
    const field = Object.keys(handledError.keyValue || {})[0];
    handledError = new ValidationError(`${field} already exists`);
  }

  if (handledError.name === 'ValidationError' && !handledError.isOperational) {
    const errors = Object.values(handledError.errors || {}).map((el) => el.message);
    handledError = new ValidationError('Invalid input data', errors);
  }

  if (handledError.name === 'JsonWebTokenError') {
    handledError = new AuthenticationError('Invalid token');
  }

  if (handledError.name === 'TokenExpiredError') {
    handledError = new AuthenticationError('Token expired');
  }

  const responseBody = {
    success: false,
    error: handledError.isOperational ? handledError.message : 'Something went wrong'
  };

  if (handledError.isOperational && handledError.errorCode) {
    responseBody.errorCode = handledError.errorCode;
  }

  if (handledError.details) {
    responseBody.details = handledError.details;
  }

  if (!isProduction) {
    responseBody.stack = handledError.stack;
    if (handledError.isOperational) {
      responseBody.operational = true;
    }
  }

  res.status(handledError.statusCode).json(responseBody);
};

// Async error handler wrapper
export const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 404 handler
export const notFoundHandler = (req, res, next) => {
  next(new NotFoundError(`Route ${req.originalUrl} not found`));
};

export { AppError };
