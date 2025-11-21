import { NativeConnection, Worker } from '@temporalio/worker';
import * as activities from './sync/activities.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Create and run a Temporal worker
 * 
 * Requires Temporal Cloud configuration:
 * - TEMPORAL_ADDRESS: Your Temporal Cloud address (e.g., europe-west3.gcp.api.temporal.io:7233)
 * - TEMPORAL_API_KEY: Your Temporal Cloud API key
 * - TEMPORAL_NAMESPACE: Your Temporal Cloud namespace
 */
async function run() {
  const temporalAddress = process.env.TEMPORAL_ADDRESS;
  const temporalNamespace = process.env.TEMPORAL_NAMESPACE;
  const taskQueue = process.env.TEMPORAL_TASK_QUEUE || 'calendar-sync-queue';
  const apiKey = process.env.TEMPORAL_API_KEY;

  // Validate required environment variables
  if (!temporalAddress) {
    console.error('TEMPORAL_ADDRESS environment variable is required.');
    process.exit(1);
  }

  if (!apiKey) {
    console.error('TEMPORAL_API_KEY environment variable is required for Temporal Cloud.');
    process.exit(1);
  }

  if (!temporalNamespace) {
    console.error('TEMPORAL_NAMESPACE environment variable is required.');
    process.exit(1);
  }

  console.log('Connecting to Temporal Cloud...');

  // Use official Temporal Cloud authentication pattern
  // API key goes as direct property, namespace in metadata
  const trimmedApiKey = apiKey.trim();
  
  const connectionOptions: Parameters<typeof NativeConnection.connect>[0] = {
    address: temporalAddress,
    tls: true, // Temporal Cloud requires TLS (use true, not {})
    apiKey: trimmedApiKey, // API key as direct property (not in metadata)
    metadata: {
      'temporal-namespace': temporalNamespace, // Namespace in metadata
    },
  };
  

  try {
    const connection = await NativeConnection.connect(connectionOptions);

    // For ES modules, we need to use the compiled workflow path
    // In development, this will point to the source, but in production it should point to dist
    const workflowsPath = process.env.NODE_ENV !== "dev"
      ? join(__dirname, 'sync', 'workflow.js')
      : join(__dirname, 'sync', 'workflow.ts');

    const worker = await Worker.create({
      connection,
      namespace: temporalNamespace,
      workflowsPath,
      activities,
      taskQueue,
      // Add activity interceptors to log errors
      // interceptors: {
      //   activityInbound: [
      //     (ctx) => ({
      //       async execute(input, next) {
      //         const activityName = ctx.info.activityType;
      //         console.log(`[Worker] Executing activity: ${activityName}`, {
      //           activityType: activityName,
      //           attempt: ctx.info.attempt,
      //         });
      //         try {
      //           const result = await next(input);
      //           console.log(`[Worker] Activity ${activityName} completed successfully`);
      //           return result;
      //         } catch (error) {
      //           const errorMessage = error instanceof Error ? error.message : String(error);
      //           const errorStack = error instanceof Error ? error.stack : undefined;
      //           console.error(`[Worker] Activity ${activityName} failed:`, {
      //             error: errorMessage,
      //             stack: errorStack,
      //             input: JSON.stringify(input, null, 2),
      //             activityType: activityName,
      //           });
      //           throw error;
      //         }
      //       },
      //     }),
      //   ],
      // },
    });

    console.log('Worker started, listening for tasks...');

    await worker.run();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Failed to connect to Temporal Cloud:', errorMessage);
    
    if (errorMessage.includes('Jwt is missing') || errorMessage.includes('authentication credentials')) {
      console.error('Authentication failed. Please verify:');
      console.error('1. TEMPORAL_API_KEY is correct and has not expired');
      console.error('2. TEMPORAL_NAMESPACE matches your Temporal Cloud namespace');
      console.error('3. The API key has permissions for the specified namespace');
    }
    
    throw error;
  }
}

run().catch((err) => {
  console.error('Worker failed to start:', err);
  process.exit(1);
});

