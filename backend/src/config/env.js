import { config } from 'dotenv';

config();

const requiredEnvVars = [
  'JWT_SECRET',
  'NODE_ENV'
];

const optionalEnvVars = [
  'DB_HOST',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
  'DATABASE_URL',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'EMAIL_USER',
  'EMAIL_PASS',
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
  if (!process.env.DATABASE_URL) {
    const missingDbVars = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'].filter(
      (envVar) => !process.env[envVar]
    );

    if (missingDbVars.length > 0) {
      console.warn(
        `⚠️ Database configuration is incomplete. Missing variables: ${missingDbVars.join(', ')}. ` +
          'Using default local development values.'
      );
    }
  }

  // Validate Cloudinary configuration
  const missingCloudinaryVars = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'].filter(
    (envVar) => !process.env[envVar]
  );

  if (missingCloudinaryVars.length > 0) {
    console.warn(
      '⚠️ Cloudinary configuration is incomplete. Image upload features will be disabled until these variables are set.'
    );
  }

  // Validate email configuration
  const missingEmailVars = ['EMAIL_USER', 'EMAIL_PASS'].filter((envVar) => !process.env[envVar]);

  if (missingEmailVars.length > 0) {
    console.warn(
      '⚠️ Email configuration is incomplete. Email delivery features will be disabled until these variables are set.'
    );
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
