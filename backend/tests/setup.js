let app;
let server;
let pool;

export const getApp = () => app;
export const getPool = () => pool;

export const clearTestDatabase = async () => {
  if (!pool) return;

  const tables = [
    'messages',
    'chat_participants',
    'chats',
    'favorites',
    'reviews',
    'properties',
    'agents',
    'users'
  ];

  for (const table of tables) {
    try {
      await pool.query(`DELETE FROM ${table}`);
    } catch (error) {
      // Table might not exist yet
    }
  }
};

export const clearTestData = async () => {
  if (!pool) return;

  await pool.query('DELETE FROM messages');
  await pool.query('DELETE FROM chat_participants');
  await pool.query('DELETE FROM chats');
  await pool.query('DELETE FROM favorites');
  await pool.query('DELETE FROM reviews');
  await pool.query('DELETE FROM properties');
  await pool.query('DELETE FROM agents');
  await pool.query('DELETE FROM users');
};

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.DB_HOST = process.env.DB_HOST || 'localhost';
  process.env.DB_PORT = process.env.DB_PORT || 5432;
  process.env.DB_NAME = process.env.DB_NAME || 'immo_albania_test';
  process.env.DB_USER = process.env.DB_USER || 'postgres';
  process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'password';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-token-value-should-be-long';
  process.env.CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'test';
  process.env.CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || 'test';
  process.env.CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || 'test';
  process.env.EMAIL_USER = process.env.EMAIL_USER || 'test@example.com';
  process.env.EMAIL_PASS = process.env.EMAIL_PASS || 'password';

  const databaseModule = await import('../src/config/database.js');
  pool = databaseModule.default;

  const { createTables } = await import('../src/config/migrate.js');
  await createTables();

  const serverModule = await import('../src/server.js');
  const { createServer } = serverModule;
  const created = await createServer();
  app = created.app;
  server = created.server;

  await clearTestDatabase();
});

afterAll(async () => {
  if (server && server.listening) {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }

  if (pool) {
    await pool.end();
  }
});

beforeEach(async () => {
  await clearTestData();
});

export { app, pool };
