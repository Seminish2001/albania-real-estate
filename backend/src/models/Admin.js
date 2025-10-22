import pool from '../config/database.js';

export class Admin {
  static async getPlatformStats() {
    const query = `
      SELECT
        (SELECT COUNT(*) FROM users) AS total_users,
        (SELECT COUNT(*) FROM users WHERE role = 'agent') AS total_agents,
        (SELECT COUNT(*) FROM properties) AS total_properties,
        (SELECT COUNT(*) FROM properties WHERE status = 'active') AS active_listings,
        (SELECT COUNT(*) FROM properties WHERE is_verified = TRUE) AS verified_properties,
        (SELECT COUNT(*) FROM messages) AS total_messages
    `;

    const result = await pool.query(query);
    const stats = result.rows[0] || {};

    return Object.fromEntries(
      Object.entries(stats).map(([key, value]) => [key, Number(value) || 0])
    );
  }

  static async getUsers(params = {}) {
    const { role, search, page = 1, limit = 20 } = params;
    const conditions = [];
    const values = [];
    let index = 1;

    if (role) {
      conditions.push(`role = $${index}`);
      values.push(role);
      index += 1;
    }

    if (search) {
      conditions.push(`(email ILIKE $${index} OR name ILIKE $${index})`);
      values.push(`%${search}%`);
      index += 1;
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (Number(page) - 1) * Number(limit);

    const dataQuery = `
      SELECT id, email, name, role, avatar, phone, is_verified, email_verified, created_at, updated_at
      FROM users
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${index} OFFSET $${index + 1}
    `;

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM users
      ${whereClause}
    `;

    const [dataResult, countResult] = await Promise.all([
      pool.query(dataQuery, [...values, limit, offset]),
      pool.query(countQuery, values)
    ]);

    const total = Number(countResult.rows[0]?.total || 0);

    return {
      users: dataResult.rows,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit || 1)) || 1
      }
    };
  }
}
