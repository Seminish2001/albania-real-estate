import { config } from 'dotenv';

config();

const requiredEnvVars = [
  'JWT_SECRET',
  'DB_HOST',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'EMAIL_USER',
  'EMAIL_PASS',
  'NODE_ENV'
];

const optionalEnvVars = [
  'STRIPE_SECRET_KEY',
  'GOOGLE_MAPS_API_KEY',
  'SENTRY_DSN',
  'REDIS_URL'
];

export const validateEnv = () => {
  const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Validate JWT secret strength in production
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters long in production');
    }
  }

  // Validate database connection
  if (!process.env.DB_HOST || !process.env.DB_NAME || !process.env.DB_USER) {
    throw new Error('Database configuration is incomplete');
  }

  // Validate Cloudinary configuration
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new Error('Cloudinary configuration is incomplete');
  }

  console.log('✅ Environment validation passed');
};

export const getEnv = (key, defaultValue = null) => {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue !== null) return defaultValue;
    throw new Error(`Environment variable ${key} is not set`);
  }
  return value;
};

// Environment-specific configurations
export const isProduction = process.env.NODE_ENV === 'production';
export const isDevelopment = process.env.NODE_ENV === 'development';
export const isTest = process.env.NODE_ENV === 'test';
