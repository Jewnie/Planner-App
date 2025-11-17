import { Connection, Client } from '@temporalio/client';
import 'dotenv/config';

let connection: Connection | null = null;
let client: Client | null = null;

/**
 * Get or create a Temporal Cloud connection
 * 
 * Requires:
 * - TEMPORAL_ADDRESS: Your Temporal Cloud address
 * - TEMPORAL_API_KEY: Your Temporal Cloud API key
 */
export async function getTemporalConnection(): Promise<Connection> {
  if (connection) {
    return connection;
  }
  
  const temporalAddress = process.env.TEMPORAL_ADDRESS;
  const apiKey = process.env.TEMPORAL_API_KEY;
  const namespace = process.env.TEMPORAL_NAMESPACE;

  // Validate required environment variables
  if (!temporalAddress) {
    throw new Error('TEMPORAL_ADDRESS environment variable is required for Temporal Cloud connection.');
  }

  if (!apiKey) {
    throw new Error('TEMPORAL_API_KEY environment variable is required for Temporal Cloud connection.');
  }

  if (!namespace) {
    throw new Error('TEMPORAL_NAMESPACE environment variable is required for Temporal Cloud connection.');
  }

  // Use official Temporal Cloud authentication pattern
  const connectionOptions: Parameters<typeof Connection.connect>[0] = {
    address: temporalAddress,
    tls: true, // Temporal Cloud requires TLS
    apiKey: apiKey.trim(), // API key as direct property (not in metadata)
    metadata: {
      'temporal-namespace': namespace, // Namespace in metadata
    },
  };
  
  try {
    connection = await Connection.connect(connectionOptions);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Failed to connect to Temporal Cloud:', errorMessage);
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
  const namespace = process.env.TEMPORAL_NAMESPACE;
  if (!namespace) {
    throw new Error('TEMPORAL_NAMESPACE environment variable is required.');
  }

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

