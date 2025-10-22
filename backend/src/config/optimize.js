import pool from './database.js';

export const createIndexes = async () => {
  const indexes = [
    // Property search performance
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_properties_search 
     ON properties USING gin(
       to_tsvector('english', title || ' ' || description),
       city,
       type,
       category,
       status
     )`,

    // Location-based searches
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_properties_location 
     ON properties USING gist (point(longitude, latitude))`,

    // Chat performance
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_chat_created 
     ON messages(chat_id, created_at DESC)`,

    // User activity
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_verified 
     ON users(email_verified, created_at) WHERE email_verified = true`
  ];

  for (const indexQuery of indexes) {
    try {
      await pool.query(indexQuery);
      console.log('Index created successfully');
    } catch (error) {
      console.error('Error creating index:', error);
    }
  }
};
