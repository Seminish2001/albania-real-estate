import { body, param, query, validationResult } from 'express-validator';
import { ValidationError } from '../middleware/errorHandler.js';

// Common validation rules
export const validateObjectId = (field = 'id') =>
  param(field).isUUID().withMessage('Invalid ID format');

export const validatePagination = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
];

export const validatePropertyCreation = [
  body('title')
    .isLength({ min: 10, max: 200 })
    .withMessage('Title must be between 10 and 200 characters')
    .trim()
    .escape(),

  body('description')
    .isLength({ min: 50, max: 2000 })
    .withMessage('Description must be between 50 and 2000 characters')
    .trim()
    .escape(),

  body('type')
    .isIn(['sale', 'rent'])
    .withMessage('Type must be sale or rent'),

  body('category')
    .isIn(['residential', 'commercial', 'land'])
    .withMessage('Category must be residential, commercial, or land'),

  body('price')
    .isFloat({ min: 0, max: 100000000 })
    .withMessage('Price must be between 0 and 100,000,000'),

  body('currency')
    .optional()
    .isIn(['ALL', 'EUR'])
    .withMessage('Currency must be ALL or EUR'),

  body('city')
    .isLength({ min: 2, max: 100 })
    .withMessage('City must be between 2 and 100 characters')
    .trim()
    .escape(),

  body('municipality')
    .isLength({ min: 2, max: 100 })
    .withMessage('Municipality must be between 2 and 100 characters')
    .trim()
    .escape(),

  body('address')
    .isLength({ min: 5, max: 200 })
    .withMessage('Address must be between 5 and 200 characters')
    .trim()
    .escape(),

  body('latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Invalid latitude'),

  body('longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Invalid longitude'),

  body('bedrooms')
    .optional()
    .isInt({ min: 0, max: 50 })
    .withMessage('Bedrooms must be between 0 and 50'),

  body('bathrooms')
    .optional()
    .isInt({ min: 0, max: 20 })
    .withMessage('Bathrooms must be between 0 and 20'),

  body('area')
    .isFloat({ min: 1, max: 100000 })
    .withMessage('Area must be between 1 and 100,000 m²'),

  body('features')
    .optional()
    .isArray()
    .withMessage('Features must be an array'),

  body('features.*')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Each feature must be a string under 50 characters')
];

export const validateUserRegistration = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage('Invalid email address'),

  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),

  body('name')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
    .trim()
    .escape(),

  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Invalid phone number'),

  body('role')
    .optional()
    .isIn(['user', 'agent', 'admin'])
    .withMessage('Invalid role provided')
];

// File validation
export const validateFileUpload = (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return next(new ValidationError('At least one image is required'));
  }

  const maxSize = 5 * 1024 * 1024; // 5MB
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

  for (const file of req.files) {
    if (file.size > maxSize) {
      return next(new ValidationError(`File ${file.originalname} is too large. Maximum size is 5MB`));
    }

    if (!allowedTypes.includes(file.mimetype)) {
      return next(new ValidationError(`File ${file.originalname} must be JPEG, PNG, or WebP`));
    }
  }

  next();
};

// Coordinate validation
export const validateCoordinates = (lat, lng) => {
  const albaniaBounds = {
    minLat: 39.6, maxLat: 42.7,
    minLng: 19.2, maxLng: 21.1
  };

  if (lat < albaniaBounds.minLat || lat > albaniaBounds.maxLat ||
      lng < albaniaBounds.minLng || lng > albaniaBounds.maxLng) {
    throw new ValidationError('Coordinates must be within Albania boundaries');
  }
};

export const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new ValidationError('Validation failed', errors.array()));
  }
  next();
};
