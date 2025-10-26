import pool from './database.js';

export const createTables = async () => {
  try {
    // Users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('user', 'agent', 'admin')),
        avatar VARCHAR(500),
        phone VARCHAR(50),
        is_verified BOOLEAN DEFAULT FALSE,
        email_verified BOOLEAN DEFAULT FALSE,
        verification_token VARCHAR(255),
        reset_token VARCHAR(255),
        reset_token_expiry TIMESTAMP,
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query('ALTER TABLE users ALTER COLUMN id DROP DEFAULT;');

    // Agents table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS agents (
        id UUID PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        agency VARCHAR(255),
        license_number VARCHAR(100),
        experience INTEGER DEFAULT 0,
        specialization TEXT[],
        rating DECIMAL(3,2) DEFAULT 0.0,
        review_count INTEGER DEFAULT 0,
        properties_listed INTEGER DEFAULT 0,
        is_premium BOOLEAN DEFAULT FALSE,
        subscription_id VARCHAR(255),
        subscription_ends TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query('ALTER TABLE agents ADD COLUMN IF NOT EXISTS subscription_id VARCHAR(255);');
    await pool.query('ALTER TABLE agents ALTER COLUMN id DROP DEFAULT;');

    // Properties table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS properties (
        id UUID PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        description TEXT NOT NULL,
        type VARCHAR(50) CHECK (type IN ('sale', 'rent')) NOT NULL,
        category VARCHAR(50) CHECK (category IN ('residential', 'commercial', 'land')) NOT NULL,
        price DECIMAL(15,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'ALL' CHECK (currency IN ('ALL', 'EUR')),
        city VARCHAR(100) NOT NULL,
        municipality VARCHAR(100),
        address TEXT NOT NULL,
        latitude DECIMAL(10,8),
        longitude DECIMAL(11,8),
        bedrooms INTEGER,
        bathrooms INTEGER,
        area DECIMAL(10,2) NOT NULL,
        floor INTEGER,
        total_floors INTEGER,
        year_built INTEGER,
        features TEXT[],
        images TEXT[],
        status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'sold', 'rented', 'inactive')),
        agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
        is_verified BOOLEAN DEFAULT FALSE,
        views INTEGER DEFAULT 0,
        featured BOOLEAN DEFAULT FALSE,
        featured_until TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query('ALTER TABLE properties ALTER COLUMN id DROP DEFAULT;');

    // Chats table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chats (
        id UUID PRIMARY KEY,
        property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
        last_message TEXT,
        last_message_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query('ALTER TABLE chats ALTER COLUMN id DROP DEFAULT;');

    await pool.query(`
      ALTER TABLE chats
      ADD COLUMN IF NOT EXISTS last_message TEXT,
      ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMP;
    `);

    // Chat participants table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chat_participants (
        chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (chat_id, user_id)
      );
    `);

    // Messages table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY,
        chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
        sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'text' CHECK (type IN ('text', 'image', 'file')),
        read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query('ALTER TABLE messages ALTER COLUMN id DROP DEFAULT;');

    // Favorites table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS favorites (
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, property_id)
      );
    `);

    // Reviews table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id UUID PRIMARY KEY,
        agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query('ALTER TABLE reviews ALTER COLUMN id DROP DEFAULT;');

    // Indexes for performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_properties_city ON properties(city);
      CREATE INDEX IF NOT EXISTS idx_properties_type ON properties(type);
      CREATE INDEX IF NOT EXISTS idx_properties_price ON properties(price);
      CREATE INDEX IF NOT EXISTS idx_properties_location ON properties(latitude, longitude);
      CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);
      CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
      CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
    `);

    // System logs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS system_logs (
        id UUID PRIMARY KEY,
        type VARCHAR(50) NOT NULL CHECK (type IN ('error', 'warning', 'info', 'security')),
        message TEXT NOT NULL,
        details JSONB,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query('ALTER TABLE system_logs ALTER COLUMN id DROP DEFAULT;');

    // Add suspension fields to users table
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS suspended_until TIMESTAMP,
      ADD COLUMN IF NOT EXISTS suspension_reason TEXT
    `);

    // Add rejection reason to properties table
    await pool.query(`
      ALTER TABLE properties 
      ADD COLUMN IF NOT EXISTS rejection_reason TEXT
    `);

    // Create indexes for admin queries
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_system_logs_type_created 
      ON system_logs(type, created_at DESC);
      
      CREATE INDEX IF NOT EXISTS idx_users_suspended 
      ON users(suspended_until) WHERE suspended_until IS NOT NULL;
      
      CREATE INDEX IF NOT EXISTS idx_properties_verification 
      ON properties(is_verified, status, created_at DESC);
    `);

    console.log('✅ Database tables created successfully');
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    throw error;
  }
};

const run = async () => {
  try {
    await createTables();
    process.exit(0);
  } catch (error) {
    process.exit(1);
  }
};

if (import.meta.url === `file://${process.argv[1]}`) {
  run();
}
