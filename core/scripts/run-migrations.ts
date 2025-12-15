/**
 * Run database migrations in production
 * This script applies all pending migrations to the database
 */
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import 'dotenv/config';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigrations() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  console.log('Connecting to database...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') 
      ? undefined 
      : { rejectUnauthorized: false },
  });

  const db = drizzle(pool);

  // Resolve migrations folder path relative to the script location
  // Script is in core/scripts/, migrations are in core/drizzle/
  const migrationsFolder = join(__dirname, '..', 'drizzle');
  
  console.log(`Running migrations from: ${migrationsFolder}`);
  
  try {
    await migrate(db, { migrationsFolder });
    console.log('✅ Migrations completed successfully');
  } catch (error: any) {
    // If migration fails because tables already exist, it might mean:
    // 1. Migrations were applied via db:push instead of migrate
    // 2. Migration tracking table is missing or out of sync
    if (error?.code === '42P07' || error?.message?.includes('already exists')) {
      console.warn('⚠️  Warning: Some tables already exist. This might mean:');
      console.warn('   - Database was initialized with db:push instead of migrations');
      console.warn('   - Migration tracking table needs to be initialized');
      console.warn('   - Check if __drizzle_migrations table exists and has correct records');
      throw new Error('Migration failed: Tables already exist. Please ensure migration tracking is properly initialized.');
    }
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

runMigrations()
  .then(() => {
    console.log('Migration script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration script failed:', error);
    process.exit(1);
  });

