import { useRef, useEffect } from 'react';
import { trpc } from '@/lib/trpc';

/**
 * Hook to check if a sync workflow is currently running for a given integration type
 * 
 * This hook polls the backend to check if a sync workflow is running and automatically
 * updates when the sync status changes. It's designed to be reusable across multiple pages.
 * 
 * @param calendarType - The integration type to check ('google' | 'outlook')
 * @param options - Configuration options
 * @param options.enabled - Whether to enable polling (default: true)
 * @param options.refetchInterval - Base interval for polling in milliseconds (default: 2000ms)
 * 
 * @returns Object containing:
 * - isRunning: boolean indicating if sync is running
 * - isLoading: boolean indicating if the query is loading
 * - workflowId: string | null - the workflow ID if running
 * - status: string | null - the workflow status if running
 * - error: Error | null - any error that occurred
 * 
 * @example
 * // Basic usage in a component
 * function MyComponent() {
 *   const { isRunning, isLoading } = useSyncStatus('google');
 *   
 *   if (isRunning) {
 *     return <div>Syncing...</div>;
 *   }
 *   
 *   return <div>Not syncing</div>;
 * }
 * 
 * @example
 * // Usage with custom polling interval
 * function MyComponent() {
 *   const { isRunning } = useSyncStatus('google', { 
 *     refetchInterval: 3000 // Poll every 3 seconds
 *   });
 *   
 *   return <Button disabled={isRunning}>Sync</Button>;
 * }
 * 
**/
export function useSyncStatus(
  calendarType: 'google' | 'outlook',
  options?: {
    enabled?: boolean;
    refetchInterval?: number;
  }
) {
  const { enabled = true, refetchInterval = 2000 } = options || {};
  const dataRef = useRef<{ isRunning: boolean } | null>(null);

  const query = trpc.calendar.isSyncRunning.useQuery(
    { calendarType },
    {
      enabled,
      refetchInterval: () => {
        // If sync is running, poll more frequently
        // If sync is not running, poll less frequently
        const data = dataRef.current;
        if (data?.isRunning) {
          return refetchInterval; // Poll every 2 seconds when running
        }
        return refetchInterval * 2; // Poll every 4 seconds when not running
      },
      // Keep previous data while refetching to avoid flickering
      placeholderData: (previousData) => previousData,
    }
  );

  // Update ref when data changes
  useEffect(() => {
    if (query.data) {
      dataRef.current = query.data;
    }
  }, [query.data]);

  return {
    isRunning: query.data?.isRunning ?? false,
    isLoading: query.isLoading,
    workflowId: query.data?.workflowId ?? null,
    status: query.data?.status ?? null,
    error: query.error,
  };
}

