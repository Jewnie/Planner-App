import { NativeConnection, Worker } from '@temporalio/worker';
import * as syncActivities from './sync/activities.js';
import * as syncEventsActivities from './sync-events/activities.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import 'dotenv/config';
import { getTemporalConnectionConfig } from './temporal-connection-options.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Combine all activities from all workflows
// Note: calendar-watch/activities.ts is currently empty, so we skip it
const activities = {
  ...syncActivities,
  ...syncEventsActivities,
};

/**
 * Create and run a Temporal worker
 * 
 * In dev mode (NODE_ENV=dev), connects to local Docker instance
 * In prod mode, connects to Temporal Cloud
 * 
 * Dev mode:
 * - Uses local Temporal instance (default: localhost:7234)
 * - Uses default namespace if TEMPORAL_NAMESPACE not set
 * 
 * Prod mode requires:
 * - TEMPORAL_ADDRESS: Your Temporal Cloud address (e.g., europe-west3.gcp.api.temporal.io:7233)
 * - TEMPORAL_API_KEY: Your Temporal Cloud API key
 * - TEMPORAL_NAMESPACE: Your Temporal Cloud namespace
 */
async function run() {
  const taskQueue = process.env.TEMPORAL_TASK_QUEUE || 'calendar-sync-queue';
  
  // Get shared connection configuration
  const config = getTemporalConnectionConfig();
  
  if (config.isDev) {
    console.log(`Connecting to local Temporal instance at ${config.connectionOptions.address} (namespace: ${config.namespace})...`);
  } else {
    console.log('Connecting to Temporal Cloud...');
  }

  try {
    const connection = await NativeConnection.connect(config.connectionOptions as Parameters<typeof NativeConnection.connect>[0]);

    // Point to the workflows index file which exports all workflows
    // In development, use .ts files; in production, use compiled .js files
    const workflowsPath = !config.isDev
      ? join(__dirname, 'index.js')
      : join(__dirname, 'index.ts');

    const worker = await Worker.create({
      connection,
      namespace: config.namespace,
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

    if (config.isDev) {
      console.log(`Connected to local Temporal instance (namespace: ${config.namespace})`);
    } else {
      console.log('Connected to Temporal Cloud');
    }
    console.log('Worker started, listening for tasks...');

    await worker.run();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (config.isDev) {
      console.error('Failed to connect to local Temporal instance:', errorMessage);
      console.error('Make sure Docker containers are running: docker-compose up -d');
    } else {
      console.error('Failed to connect to Temporal Cloud:', errorMessage);
      
      if (errorMessage.includes('Jwt is missing') || errorMessage.includes('authentication credentials')) {
        console.error('Authentication failed. Please verify:');
        console.error('1. TEMPORAL_API_KEY is correct and has not expired');
        console.error('2. TEMPORAL_NAMESPACE matches your Temporal Cloud namespace');
        console.error('3. The API key has permissions for the specified namespace');
      }
    }
    
    throw error;
  }
}

run().catch((err) => {
  console.error('Worker failed to start:', err);
  process.exit(1);
});

