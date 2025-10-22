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

  static async upgradeToPremium(userId, subscriptionId, customerId, plan) {
    const subscriptionEnds = new Date();
    
    if (plan === 'premium_monthly') {
      subscriptionEnds.setMonth(subscriptionEnds.getMonth() + 1);
    } else if (plan === 'premium_yearly') {
      subscriptionEnds.setFullYear(subscriptionEnds.getFullYear() + 1);
    }

    const query = `
      UPDATE agents 
      SET is_premium = TRUE, 
          subscription_ends = $1,
          stripe_subscription_id = $2,
          stripe_customer_id = $3,
          subscription_plan = $4,
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $5
      RETURNING *
    `;

    const result = await pool.query(query, [
      subscriptionEnds,
      subscriptionId,
      customerId,
      plan,
      userId
    ]);

    return result.rows[0];
  }

  static async downgradeFromPremium(userId) {
    const query = `
      UPDATE agents 
      SET is_premium = FALSE, 
          subscription_ends = NULL,
          stripe_subscription_id = NULL,
          subscription_plan = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1
    `;

    await pool.query(query, [userId]);
  }

  static async renewSubscription(subscriptionId) {
    const agent = await this.findBySubscriptionId(subscriptionId);
    if (!agent) return;

    const subscriptionEnds = new Date();
    
    if (agent.subscription_plan === 'premium_monthly') {
      subscriptionEnds.setMonth(subscriptionEnds.getMonth() + 1);
    } else if (agent.subscription_plan === 'premium_yearly') {
      subscriptionEnds.setFullYear(subscriptionEnds.getFullYear() + 1);
    }

    const query = `
      UPDATE agents 
      SET subscription_ends = $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE stripe_subscription_id = $2
    `;

    await pool.query(query, [subscriptionEnds, subscriptionId]);
  }

  static async downgradeFromPremiumBySubscription(subscriptionId) {
    const query = `
      UPDATE agents 
      SET is_premium = FALSE, 
          subscription_ends = NULL,
          stripe_subscription_id = NULL,
          subscription_plan = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE stripe_subscription_id = $1
    `;

    await pool.query(query, [subscriptionId]);
  }

  static async findBySubscriptionId(subscriptionId) {
    const query = 'SELECT * FROM agents WHERE stripe_subscription_id = $1';
    const result = await pool.query(query, [subscriptionId]);
    return result.rows[0];
  }

  static async getPremiumAgents() {
    const query = `
      SELECT a.*, u.name, u.email, u.avatar, u.phone
      FROM agents a
      JOIN users u ON a.user_id = u.id
      WHERE a.is_premium = TRUE
      ORDER BY a.rating DESC, a.review_count DESC
    `;

    const result = await pool.query(query);
    return result.rows;
  }
}
