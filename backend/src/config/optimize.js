import pool from './database.js';

export const createIndexes = async () => {
  console.log('Creating database indexes for performance...');

  const indexes = [
    // Property search performance
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_properties_search_composite 
     ON properties(city, type, category, status, price, created_at DESC)`,

    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_properties_title_gin 
     ON properties USING gin(to_tsvector('english', title))`,

    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_properties_description_gin 
     ON properties USING gin(to_tsvector('english', description))`,

    // Location-based searches
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_properties_location_gist 
     ON properties USING gist (point(longitude, latitude))`,

    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_properties_city_type 
     ON properties(city, type) WHERE status = 'active'`,

    // Chat performance
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_chat_created 
     ON messages(chat_id, created_at DESC)`,

    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chat_participants_user 
     ON chat_participants(user_id)`,

    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chats_last_message 
     ON chats(last_message_at DESC) WHERE last_message_at IS NOT NULL`,

    // User activity and authentication
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_verified 
     ON users(email, email_verified) WHERE email_verified = true`,

    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_created 
     ON users(created_at DESC)`,

    // Agent performance
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agents_premium_rating 
     ON agents(is_premium, rating DESC) WHERE is_premium = true`,

    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agents_user_id 
     ON agents(user_id)`,

    // Favorites and reviews
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_favorites_user 
     ON favorites(user_id, created_at DESC)`,

    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_agent 
     ON reviews(agent_id, created_at DESC)`,

    // Full-text search index for advanced search
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_properties_search_fulltext
     ON properties USING gin(search_vector)`
  ];

  for (const indexQuery of indexes) {
    try {
      await pool.query(indexQuery);
      console.log(`✅ Created index: ${indexQuery.split('IF NOT EXISTS')[1]?.split(' ON')[0] || 'index'}`);
    } catch (error) {
      console.error('❌ Failed to create index:', error.message);
    }
  }

  console.log('Database indexing completed');
};

export const analyzeTables = async () => {
  console.log('Running database analysis for query optimization...');

  const tables = [
    'users', 'agents', 'properties', 'chats', 'messages', 
    'favorites', 'reviews', 'chat_participants'
  ];

  for (const table of tables) {
    try {
      await pool.query(`ANALYZE ${table}`);
      console.log(`✅ Analyzed table: ${table}`);
    } catch (error) {
      console.error(`❌ Failed to analyze table ${table}:`, error.message);
    }
  }

  console.log('Database analysis completed');
};

export const createPerformanceViews = async () => {
  console.log('Creating performance monitoring views...');

  const views = [
    `CREATE OR REPLACE VIEW property_performance AS
     SELECT 
       p.id,
       p.title,
       p.city,
       p.type,
       p.category,
       p.price,
       p.views,
       p.created_at,
       COUNT(f.property_id) as favorite_count,
       COUNT(r.property_id) as review_count,
       EXTRACT(DAYS FROM NOW() - p.created_at) as days_listed,
       p.views / GREATEST(EXTRACT(DAYS FROM NOW() - p.created_at), 1) as views_per_day
     FROM properties p
     LEFT JOIN favorites f ON p.id = f.property_id
     LEFT JOIN reviews r ON p.id = r.property_id
     WHERE p.status = 'active'
     GROUP BY p.id, p.title, p.city, p.type, p.category, p.price, p.views, p.created_at`,

    `CREATE OR REPLACE VIEW agent_performance AS
     SELECT 
       a.id,
       u.name as agent_name,
       a.agency,
       a.rating,
       a.review_count,
       a.properties_listed,
       a.is_premium,
       COUNT(p.id) as active_properties,
       AVG(p.views) as avg_property_views,
       SUM(p.views) as total_views,
       COUNT(DISTINCT c.id) as total_chats
     FROM agents a
     JOIN users u ON a.user_id = u.id
     LEFT JOIN properties p ON a.id = p.agent_id AND p.status = 'active'
     LEFT JOIN chats c ON p.id = c.property_id
     GROUP BY a.id, u.name, a.agency, a.rating, a.review_count, a.properties_listed, a.is_premium`
  ];

  for (const viewQuery of views) {
    try {
      await pool.query(viewQuery);
      console.log('✅ Created performance view');
    } catch (error) {
      console.error('❌ Failed to create performance view:', error.message);
    }
  }

  console.log('Performance views created');
};

const runOptimization = async () => {
  try {
    await createIndexes();
    await analyzeTables();
    await createPerformanceViews();
    console.log('Database optimization tasks completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Optimization failed:', error);
    process.exit(1);
  }
};

if (import.meta.url === `file://${process.argv[1]}`) {
  runOptimization();
}
