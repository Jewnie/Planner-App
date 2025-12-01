import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"
import "dotenv/config"

import * as schema from "./db/schema.js"

// Ensure DATABASE_URL is loaded
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set. Please check your .env file.');
}

// Determine SSL configuration based on DATABASE_URL
const getSSLConfig = () => {
  const dbUrl = process.env.DATABASE_URL || '';
  
  // If localhost, no SSL
  if (dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1')) {
    return undefined;
  }
  
  // Check if sslmode is explicitly set in the connection string
  if (dbUrl.includes('sslmode=')) {
    const sslMode = dbUrl.match(/sslmode=([^&]+)/)?.[1];
    if (sslMode === 'disable' || sslMode === 'prefer') {
      return undefined;
    }
    if (sslMode === 'require' || sslMode === 'verify-ca' || sslMode === 'verify-full') {
      return { rejectUnauthorized: sslMode.includes('verify') };
    }
  }
  
  // For cloud databases (like Supabase, Neon, etc.), try SSL but allow fallback
  // If the server doesn't support SSL, we'll get an error and can handle it
  // For now, default to no SSL to avoid the error
  return undefined;
};

// Parse DATABASE_URL to ensure password is properly handled
const connectionString = process.env.DATABASE_URL;

// Validate connection string format
try {
  const url = new URL(connectionString);
  // If password exists, ensure it's a string
  if (url.password && typeof url.password !== 'string') {
    throw new Error('Database password must be a string. Check your DATABASE_URL format.');
  }
} catch (error) {
  if (error instanceof TypeError) {
    throw new Error(`Invalid DATABASE_URL format: ${error.message}. Please check your connection string.`);
  }
  throw error;
}

const pool = new Pool({
  connectionString,
  ssl: getSSLConfig(),
})
// Handle unexpected errors on idle client
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  // Don't crash the app, just log it
});

export const db = drizzle(pool, { schema })