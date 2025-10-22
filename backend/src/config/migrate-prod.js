import pool from './database.js';
import { createIndexes, analyzeTables } from './optimize.js';
import { createTables } from './migrate.js';

const migrateProduction = async () => {
  try {
    console.log('Starting production database migration...');

    // Ensure migrations tracking table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Run the standard table creation routines
    await createTables();

    // Mark migration as complete
    await pool.query(`
      INSERT INTO schema_migrations (version)
      VALUES ('1.0.0')
      ON CONFLICT (version) DO NOTHING;
    `);

    // Create indexes for performance and analyze tables
    await createIndexes();
    await analyzeTables();

    console.log('✅ Production database migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Production migration failed:', error);
    process.exit(1);
  }
};

migrateProduction();
