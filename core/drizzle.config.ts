import { defineConfig } from 'drizzle-kit';
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set in the .env file');
}
export default defineConfig({
  schema: [
    './src/db/auth-schema.ts',
    './src/db/calendar-schema.ts',
    './src/db/integration-schema.ts',
  ], // All schema files
  out: './drizzle', // Your migrations folder
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});