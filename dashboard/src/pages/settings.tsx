import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

export default function SettingsPage() {
  const [syncStatus, setSyncStatus] = useState<{
    workflowId?: string;
    status?: string;
    error?: string;
  } | null>(null);

  const syncMutation = trpc.calendar.syncCalendar.useMutation({
    onSuccess: (data: { workflowId: string; runId: string; status: string }) => {
      setSyncStatus({
        workflowId: data.workflowId,
        status: data.status,
        error: undefined,
      });
    },
    onError: (error: Error) => {
      console.error('Sync failed:', error);
      setSyncStatus({
        error: error.message || 'Failed to start sync',
      });
    },
  });

  const handleSync = () => {
    syncMutation.mutate(undefined);
  };

  return (
    <section className="rounded-lg border bg-card p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-card-foreground mb-6">Settings</h2>

      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="flex-1">
            <h3 className="text-sm font-medium text-card-foreground mb-1">Google Calendar Sync</h3>
            <p className="text-sm text-muted-foreground">
              Sync your Google Calendar events to your planner
            </p>
            {syncStatus && (
              <div className="mt-2 space-y-1">
                {syncStatus.error ? (
                  <div className="text-xs text-destructive">{syncStatus.error}</div>
                ) : (
                  <div className="text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2 py-0.5 text-primary">
                      {syncStatus.status === 'started' && (
                        <>
                          <Spinner className="size-3" />
                          Syncing...
                        </>
                      )}
                      {syncStatus.status && syncStatus.status !== 'started' && 'Sync started'}
                    </span>
                    {syncStatus.workflowId && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        ID: {syncStatus.workflowId.slice(-8)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          <Button
            onClick={handleSync}
            disabled={syncMutation.isPending}
            variant="outline"
            className="shrink-0"
          >
            {syncMutation.isPending ? (
              <>
                <Spinner className="size-4" />
                <span>Syncing...</span>
              </>
            ) : (
              <>
                <svg
                  className="size-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                <span>Sync Now</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </section>
  );
}
