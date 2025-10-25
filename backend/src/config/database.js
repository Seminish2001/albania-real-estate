import pg from 'pg';

const { Pool } = pg;

const isProduction = process.env.NODE_ENV === 'production';

const getEnv = (primary, ...fallbacks) => {
  for (const key of [primary, ...fallbacks]) {
    const value = process.env[key];
    if (value) {
      return value;
    }
  }
  return undefined;
};

const connectionConfig = getEnv('DATABASE_URL', 'POSTGRES_URL', 'PGURL')
  ? {
      connectionString: getEnv('DATABASE_URL', 'POSTGRES_URL', 'PGURL'),
      ssl: isProduction ? { rejectUnauthorized: false } : false,
    }
  : {
      host: getEnv('DB_HOST', 'DATABASE_HOST', 'PGHOST', 'POSTGRES_HOST') || '127.0.0.1',
      port: Number(getEnv('DB_PORT', 'DATABASE_PORT', 'PGPORT', 'POSTGRES_PORT')) || 5432,
      database: getEnv('DB_NAME', 'DATABASE_NAME', 'PGDATABASE', 'POSTGRES_DB') || 'immo_albania',
      user: getEnv('DB_USER', 'DATABASE_USER', 'PGUSER', 'POSTGRES_USER') || 'postgres',
      password:
        getEnv('DB_PASSWORD', 'DATABASE_PASSWORD', 'PGPASSWORD', 'POSTGRES_PASSWORD') ||
        'password',
      ssl: isProduction ? { rejectUnauthorized: false } : false,
    };

const pool = new Pool({
  ...connectionConfig,
  max: Number(process.env.DB_POOL_MAX) || 20,
  idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT) || 30000,
  connectionTimeoutMillis: Number(process.env.DB_CONNECTION_TIMEOUT) || 2000,
});

export default pool;
