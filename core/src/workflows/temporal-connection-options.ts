/**
 * Shared utility for creating Temporal connection options
 * Used by both workers (NativeConnection) and clients (Connection)
 */

export interface TemporalConnectionOptions {
  address: string;
  tls?: boolean;
  apiKey?: string;
  metadata?: Record<string, string>;
}

export interface TemporalConnectionConfig {
  connectionOptions: TemporalConnectionOptions;
  namespace: string;
  isDev: boolean;
}

/**
 * Get Temporal connection configuration based on environment
 *
 * In dev mode (NODE_ENV=dev and TEMPORAL_ADDRESS not set):
 * - Connects to local Docker instance at localhost:7234
 * - Uses 'default' namespace
 *
 * In prod mode (TEMPORAL_ADDRESS is set):
 * - Connects to Temporal Cloud using TEMPORAL_ADDRESS
 * - Requires TEMPORAL_API_KEY and TEMPORAL_NAMESPACE
 */
export function getTemporalConnectionConfig(): TemporalConnectionConfig {
  // Determine if we should use local Docker or Temporal Cloud
  // Use local Docker ONLY if NODE_ENV is explicitly 'dev' AND TEMPORAL_ADDRESS is not set
  // This prevents production from accidentally connecting to localhost
  const TEMPORAL_ADDRESS = process.env.TEMPORAL_ADDRESS || 'localhost:7234';
  const TEMPORAL_NAMESPACE = process.env.TEMPORAL_NAMESPACE || 'default';
  const isDev = process.env.NODE_ENV === 'dev' || !TEMPORAL_ADDRESS;

  if (isDev) {
    // Local Docker Temporal instance

    return {
      connectionOptions: {
        address: TEMPORAL_ADDRESS,
        // No TLS for local development
        // No API key needed for local development
      },
      namespace: TEMPORAL_NAMESPACE,
      isDev: true,
    };
  } else {
    // Temporal Cloud connection
    const temporalAddress = process.env.TEMPORAL_ADDRESS;
    const apiKey = process.env.TEMPORAL_API_KEY;
    const namespace = process.env.TEMPORAL_NAMESPACE;

    // Validate required environment variables
    if (!temporalAddress) {
      throw new Error(
        'TEMPORAL_ADDRESS environment variable is required for Temporal Cloud connection.',
      );
    }

    if (!apiKey) {
      throw new Error(
        'TEMPORAL_API_KEY environment variable is required for Temporal Cloud connection.',
      );
    }

    if (!namespace) {
      throw new Error(
        'TEMPORAL_NAMESPACE environment variable is required for Temporal Cloud connection.',
      );
    }

    return {
      connectionOptions: {
        address: temporalAddress,
        tls: true, // Temporal Cloud requires TLS
        apiKey: apiKey.trim(), // API key as direct property
        metadata: {
          'temporal-namespace': namespace, // Namespace in metadata
        },
      },
      namespace,
      isDev: false,
    };
  }
}
