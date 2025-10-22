import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { AuthenticationError, AuthorizationError } from './errorHandler.js';

export const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return next(new AuthenticationError('Access denied. No token provided.'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return next(new AuthenticationError('Invalid token'));
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(new AuthenticationError('Token expired'));
    }

    return next(new AuthenticationError('Invalid token'));
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AuthorizationError('Access denied. Insufficient permissions.'));
    }
    next();
  };
};
