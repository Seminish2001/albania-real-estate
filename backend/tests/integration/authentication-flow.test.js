import request from 'supertest';
import { app, clearTestData, pool } from '../setup.js';

describe('Authentication Flow Integration', () => {
  beforeEach(async () => {
    await clearTestData();
  });

  test('Complete auth flow: register → verify email → login → refresh token → logout', async () => {
    // 1. Register
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Auth Test User',
        email: 'auth@test.com',
        password: 'Password123!',
        phone: '+355123456789'
      })
      .expect(201);

    expect(registerRes.body.data.user.emailVerified).toBe(false);
    const authToken = registerRes.body.data.token;

    // 2. Try to login before verification (should fail)
    await request(app)
      .post('/api/auth/login')
      .send({
        email: 'auth@test.com',
        password: 'Password123!'
      })
      .expect(403);

    // 3. Manually verify email (simulate email verification)
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', ['auth@test.com']);
    const user = userResult.rows[0];

    await pool.query('UPDATE users SET email_verified = TRUE, is_verified = TRUE WHERE id = $1', [user.id]);

    // 4. Login after verification
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'auth@test.com',
        password: 'Password123!'
      })
      .expect(200);

    const newToken = loginRes.body.data.token;
    expect(newToken).not.toBe(authToken);

    // 5. Access protected route
    await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${newToken}`)
      .expect(200);

    // 6. Test password reset flow
    await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'auth@test.com' })
      .expect(200);

    const tokenResult = await pool.query('SELECT reset_token FROM users WHERE email = $1', ['auth@test.com']);
    const resetToken = tokenResult.rows[0].reset_token;

    await request(app)
      .post('/api/auth/reset-password')
      .send({ token: resetToken, password: 'NewPassword123!' })
      .expect(200);

    // 7. Test rate limiting
    for (let i = 0; i < 6; i++) {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'auth@test.com',
          password: 'wrongpassword'
        });

      if (i >= 5) {
        expect(res.status).toBe(429);
      }
    }
  });

  test('Security: SQL injection attempts', async () => {
    const injectionAttempts = [
      { email: "test'; DROP TABLE users;--", password: 'password', name: 'Injected User' },
      { email: 'test@test.com', password: "' OR '1'='1", name: 'SQL User' },
      { name: "Test'; DELETE FROM properties;--", email: 'test2@test.com', password: 'Password123!' }
    ];

    for (const attempt of injectionAttempts) {
      const res = await request(app)
        .post('/api/auth/register')
        .send(attempt);

      expect(res.status).not.toBe(500);
      if (res.status === 400) {
        expect(res.body.error).toContain('Validation failed');
      }
    }
  });

  test('Edge case: Concurrent user registration', async () => {
    const userData = {
      name: 'Concurrent User',
      email: 'concurrent@test.com',
      password: 'Password123!'
    };

    const promises = Array(3)
      .fill(null)
      .map(() => request(app).post('/api/auth/register').send(userData));

    const results = await Promise.allSettled(promises);

    const successful = results.filter((r) => r.status === 'fulfilled' && r.value.status === 201);
    const conflicts = results.filter((r) => r.status === 'fulfilled' && r.value.status === 409);

    expect(successful).toHaveLength(1);
    expect(conflicts.length).toBeGreaterThan(0);
  });
});
