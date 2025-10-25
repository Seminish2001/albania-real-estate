import { createTables } from '../config/migrate.js';
import { createIndexes, analyzeTables } from '../config/optimize.js';

const shouldRunOptimizations = () => {
  const flag = process.env.ENABLE_DB_OPTIMIZATIONS;
  return flag && flag.toLowerCase() === 'true';
};

export const ensureDatabaseSchema = async () => {
  try {
    console.log('Running database migrations to ensure schema is up to date...');
    await createTables();
    console.log('✅ Database migrations completed');
  } catch (error) {
    console.error('❌ Failed to run database migrations:', error);
    throw error;
  }
};

export const scheduleDatabaseOptimizations = () => {
  if (!shouldRunOptimizations()) {
    console.log(
      'Skipping database optimization tasks (set ENABLE_DB_OPTIMIZATIONS=true to enable them).'
    );
    return;
  }

  console.log('Scheduling database optimization tasks...');

  createIndexes()
    .then(() => analyzeTables())
    .catch((error) => {
      console.error('Database optimization task failed:', error);
    });
};
