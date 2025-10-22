import pool from '../config/database.js';

export class Agent {
  static async create(agentData) {
    const {
      userId,
      agency = null,
      licenseNumber = null,
      experience = 0,
      specialization = [],
      rating = 0,
      reviewCount = 0,
      propertiesListed = 0,
      isPremium = false,
      subscriptionEnds = null
    } = agentData;

    const query = `
      INSERT INTO agents (
        user_id,
        agency,
        license_number,
        experience,
        specialization,
        rating,
        review_count,
        properties_listed,
        is_premium,
        subscription_ends
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const result = await pool.query(query, [
      userId,
      agency,
      licenseNumber,
      experience,
      specialization,
      rating,
      reviewCount,
      propertiesListed,
      isPremium,
      subscriptionEnds
    ]);

    return result.rows[0];
  }

  static async findByUserId(userId) {
    const query = 'SELECT * FROM agents WHERE user_id = $1 LIMIT 1';
    const result = await pool.query(query, [userId]);
    return result.rows[0] || null;
  }

  static async incrementPropertiesListed(agentId) {
    const query = `
      UPDATE agents
      SET properties_listed = properties_listed + 1
      WHERE id = $1
    `;
    await pool.query(query, [agentId]);
  }
}
