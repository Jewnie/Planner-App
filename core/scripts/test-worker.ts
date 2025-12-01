/**
 * Simple test script to verify worker can start
 * Run this to check if your worker configuration is correct
 */
import 'dotenv/config';

console.log('🧪 Testing worker configuration...\n');

// Check environment variables
const requiredVars = {
  TEMPORAL_ADDRESS: process.env.TEMPORAL_ADDRESS,
  TEMPORAL_API_KEY: process.env.TEMPORAL_API_KEY,
  TEMPORAL_NAMESPACE: process.env.TEMPORAL_NAMESPACE,
  DATABASE_URL: process.env.DATABASE_URL,
};

console.log('Environment Variables:');
let allSet = true;
for (const [key, value] of Object.entries(requiredVars)) {
  const isSet = value !== undefined && value !== '';
  console.log(`  ${key}: ${isSet ? '✅ set' : '❌ NOT SET'}`);
  if (!isSet) allSet = false;
}

console.log(`\nNODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
console.log(`TEMPORAL_TASK_QUEUE: ${process.env.TEMPORAL_TASK_QUEUE || 'calendar-sync-queue (default)'}`);

if (!allSet) {
  console.error('\n❌ Missing required environment variables!');
  process.exit(1);
}

console.log('\n✅ All required environment variables are set');
console.log('\nTo start the worker:');
console.log('  Development: npm run worker');
console.log('  Production: npm run build && npm run worker:prod');
console.log('\nNote: The worker must run as a separate long-running process.');
console.log('It cannot run on Vercel (serverless). Use Railway, Render, or a VPS.');

