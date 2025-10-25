import { config } from 'dotenv';
import { randomBytes } from 'crypto';

config();

const requiredEnvVars = ['JWT_SECRET', 'NODE_ENV'];

const optionalEnvVars = [
  'DB_HOST',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
  'DATABASE_HOST',
  'DATABASE_NAME',
  'DATABASE_USER',
  'DATABASE_PASSWORD',
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

  const isProductionEnv = process.env.NODE_ENV === 'production';

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
  const hasConnectionString =
    process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.PGURL;

  if (!hasConnectionString) {
    const dbKeys = [
      'DB_HOST',
      'DB_NAME',
      'DB_USER',
      'DB_PASSWORD',
      'DB_PORT',
      'DATABASE_HOST',
      'DATABASE_NAME',
      'DATABASE_USER',
      'DATABASE_PASSWORD',
      'DATABASE_PORT',
      'POSTGRES_HOST',
      'POSTGRES_DB',
      'POSTGRES_USER',
      'POSTGRES_PASSWORD',
      'POSTGRES_PORT',
      'PGPORT',
      'PGHOST',
      'PGDATABASE',
      'PGUSER',
      'PGPASSWORD'
    ];

    const missingDbVars = dbKeys.filter((envVar) => !process.env[envVar]);

    if (missingDbVars.length > 0) {
      const baseMessage = `Database configuration is incomplete. Missing variables: ${missingDbVars.join(', ')}.`;

      if (isProductionEnv) {
        throw new Error(
          `${baseMessage} Set DATABASE_URL or the individual DB_HOST, DB_PORT, DB_NAME, DB_USER, and DB_PASSWORD variables for production deployments.`
        );
      }

      console.warn(
        `⚠️ ${baseMessage} Using default local development values.`
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
