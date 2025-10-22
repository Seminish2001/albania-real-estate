import request from 'supertest';
import { jest } from '@jest/globals';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-token-value-should-be-long';
process.env.DB_HOST = 'localhost';
process.env.DB_NAME = 'testdb';
process.env.DB_USER = 'test';
process.env.CLOUDINARY_CLOUD_NAME = 'test';
process.env.CLOUDINARY_API_KEY = 'test';
process.env.CLOUDINARY_API_SECRET = 'test';
process.env.EMAIL_USER = 'test@example.com';
process.env.EMAIL_PASS = 'password';

const users = new Map();

jest.unstable_mockModule('../src/models/User.js', () => ({
  User: {
    findByEmail: jest.fn(async (email) => users.get(email) || null),
    create: jest.fn(async ({ email, password, name, role }) => {
      const user = {
        id: `user-${users.size + 1}`,
        email,
        name,
        role,
        password,
        is_verified: true,
        email_verified: true
      };
      users.set(email, user);
      return user;
    }),
    comparePassword: jest.fn(async (plainPassword, storedPassword) => plainPassword === storedPassword),
    updateLastLogin: jest.fn(async () => {})
  }
}));

jest.unstable_mockModule('../src/utils/emailService.js', () => ({
  sendVerificationEmail: jest.fn(async () => {}),
  sendPasswordResetEmail: jest.fn(async () => {})
}));

const { createServer } = await import('../src/server.js');

describe('Authentication API', () => {
  let app;

  beforeAll(async () => {
    app = await createServer();
  });

  beforeEach(() => {
    users.clear();
  });

  test('POST /api/auth/register should create new user', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        role: 'user'
      })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.user.email).toBe('test@example.com');
  });

  test('POST /api/auth/login should return token', async () => {
    users.set('test@example.com', {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'user',
      password: 'password123',
      is_verified: true,
      email_verified: true
    });

    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123'
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.token).toBeDefined();
  });
});
