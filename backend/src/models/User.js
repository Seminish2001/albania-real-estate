import pool from '../config/database.js';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

export class User {
  static async create(userData) {
    const {
      email,
      password,
      name,
      role = 'user',
      phone,
      verificationToken
    } = userData;

    const hashedPassword = await bcrypt.hash(password, 12);

    const query = `
      INSERT INTO users (id, email, password, name, role, phone, verification_token)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, email, name, role, phone, avatar, is_verified, email_verified, created_at, updated_at, last_login
    `;

    const result = await pool.query(query, [
      randomUUID(),
      email,
      hashedPassword,
      name,
      role,
      phone,
      verificationToken
    ]);

    return result.rows[0];
  }

  static async findByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await pool.query(query, [email]);
    return result.rows[0];
  }

  static async findById(id) {
    const query = `
      SELECT id, email, name, role, avatar, phone, is_verified, email_verified, created_at, updated_at, last_login
      FROM users
      WHERE id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async updateLastLogin(userId) {
    const query = 'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1';
    await pool.query(query, [userId]);
  }

  static async verifyEmail(userId) {
    const query = `
      UPDATE users
      SET is_verified = TRUE,
          email_verified = TRUE,
          verification_token = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const result = await pool.query(query, [userId]);
    return result.rows[0];
  }

  static async setResetToken(userId, resetToken) {
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);
    const query = `
      UPDATE users
      SET reset_token = $1,
          reset_token_expiry = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `;
    await pool.query(query, [resetToken, resetTokenExpiry, userId]);
  }

  static async clearResetToken(userId) {
    const query = `
      UPDATE users
      SET reset_token = NULL,
          reset_token_expiry = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;
    await pool.query(query, [userId]);
  }

  static async updateProfile(userId, updateData) {
    const setClauses = [];
    const values = [];
    let paramCount = 1;

    Object.entries(updateData).forEach(([key, value]) => {
      if (value !== undefined) {
        setClauses.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount += 1;
      }
    });

    if (setClauses.length === 0) {
      return this.findById(userId);
    }

    setClauses.push('updated_at = CURRENT_TIMESTAMP');
    values.push(userId);

    const query = `
      UPDATE users
      SET ${setClauses.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, email, name, role, avatar, phone, is_verified, email_verified, created_at, updated_at, last_login
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async updateVerificationToken(userId, verificationToken) {
    const query = `
      UPDATE users
      SET verification_token = $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `;
    await pool.query(query, [verificationToken, userId]);
  }

  static async updatePassword(userId, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    const query = `
      UPDATE users
      SET password = $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `;
    await pool.query(query, [hashedPassword, userId]);
  }

  static async comparePassword(plainPassword, hashedPassword) {
    return bcrypt.compare(plainPassword, hashedPassword);
  }
}
