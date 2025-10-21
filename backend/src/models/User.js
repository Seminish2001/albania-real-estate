import pool from '../config/database.js';
import bcrypt from 'bcryptjs';

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
      INSERT INTO users (email, password, name, role, phone, verification_token)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, email, name, role, phone, is_verified, created_at
    `;

    const result = await pool.query(query, [
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
    const query = 'SELECT id, email, name, role, avatar, phone, is_verified, created_at FROM users WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async updateVerification(userId) {
    const query = 'UPDATE users SET is_verified = TRUE, verification_token = NULL WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [userId]);
    return result.rows[0];
  }

  static async updatePassword(userId, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    const query = 'UPDATE users SET password = $1 WHERE id = $2';
    await pool.query(query, [hashedPassword, userId]);
  }

  static async comparePassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }
}
