import { config } from 'dotenv';
import { randomBytes } from 'crypto';

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
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'production';
    console.warn(
      '⚠️ NODE_ENV is not set. Defaulting to production for deployment environments. Set NODE_ENV explicitly to avoid this fallback.'
    );
  }

  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    const generatedSecret = randomBytes(32).toString('hex');
    process.env.JWT_SECRET = generatedSecret;
    console.warn(
      '⚠️ JWT_SECRET is missing or too short. Generated a temporary secret for this runtime. Provide a persistent JWT_SECRET of at least 32 characters to avoid invalidating sessions on restart.'
    );
  }

  const missing = requiredEnvVars.filter((envVar) => !process.env[envVar]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
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
