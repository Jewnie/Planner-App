import { Connection, Client } from '@temporalio/client';
import 'dotenv/config';

let connection: Connection | null = null;
let client: Client | null = null;

/**
 * Get or create a Temporal connection
 * 
 * In dev mode (NODE_ENV=dev), connects to local Docker instance
 * In prod mode, connects to Temporal Cloud
 * 
 * Dev mode requires:
 * - Local Temporal instance running (default: localhost:7234)
 * 
 * Prod mode requires:
 * - TEMPORAL_ADDRESS: Your Temporal Cloud address
 * - TEMPORAL_API_KEY: Your Temporal Cloud API key
 * - TEMPORAL_NAMESPACE: Your Temporal Cloud namespace
 */
export async function getTemporalConnection(): Promise<Connection> {
  if (connection) {
    return connection;
  }
  
  const isDev = process.env.NODE_ENV === 'dev';
  
  if (isDev) {
    // Local Docker Temporal instance - always use localhost:7234 and 'default' namespace in dev
    const temporalAddress = 'localhost:7234';
    const namespace = 'default'; // Always use 'default' namespace in dev, ignore TEMPORAL_NAMESPACE
    
    console.log(`Connecting to local Temporal instance at ${temporalAddress} (namespace: ${namespace})...`);
    
    const connectionOptions: Parameters<typeof Connection.connect>[0] = {
      address: temporalAddress,
      // No TLS for local development
      // No API key needed for local development
    };
    
    try {
      connection = await Connection.connect(connectionOptions);
      console.log(`Connected to local Temporal instance (namespace: ${namespace})`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Failed to connect to local Temporal instance:', errorMessage);
      throw error;
    }
  } else {
    // Temporal Cloud connection
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

    console.log('Connecting to Temporal Cloud...');

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
      console.log('Connected to Temporal Cloud');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Failed to connect to Temporal Cloud:', errorMessage);
      throw error;
    }
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
  const isDev = process.env.NODE_ENV === 'dev';
  const namespace = isDev 
    ? 'default' // Always use 'default' namespace in dev, ignore TEMPORAL_NAMESPACE
    : process.env.TEMPORAL_NAMESPACE;
    
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

