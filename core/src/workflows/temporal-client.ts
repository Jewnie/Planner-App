import { Connection, Client } from '@temporalio/client';
import 'dotenv/config';
import { getTemporalConnectionConfig } from './temporal-connection-options.js';

let connection: Connection | null = null;
let client: Client | null = null;

/**
 * Get or create a Temporal connection
 * 
 * Uses shared connection configuration logic from temporal-connection-options.ts
 */
export async function getTemporalConnection(): Promise<Connection> {
  if (connection) {
    return connection;
  }
  
  const config = getTemporalConnectionConfig();
  
  if (config.isDev) {
    console.log(`Connecting to local Temporal instance at ${config.connectionOptions.address} (namespace: ${config.namespace})...`);
  } else {
    console.log('Connecting to Temporal Cloud...');
  }
  
  try {
    connection = await Connection.connect(config.connectionOptions as Parameters<typeof Connection.connect>[0]);
    if (config.isDev) {
      console.log(`Connected to local Temporal instance (namespace: ${config.namespace})`);
    } else {
      console.log('Connected to Temporal Cloud');
    }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
    if (config.isDev) {
      console.error('Failed to connect to local Temporal instance:', errorMessage);
    } else {
      console.error('Failed to connect to Temporal Cloud:', errorMessage);
    }
    throw error;
  }

  return connection;
}

/**
 * Get or create a Temporal client
 */
export async function getTemporalClient(): Promise<Client> {
  if (client) {
    return client;
  }

  const connection = await getTemporalConnection();
  const config = getTemporalConnectionConfig();
  const namespace = config.namespace;

  client = new Client({
    connection,
    namespace,
  });

  return client;
}

/**
 * Close Temporal connection (useful for cleanup)
 */
export async function closeTemporalConnection(): Promise<void> {
  if (connection) {
    await connection.close();
    connection = null;
  }
  client = null;
}

