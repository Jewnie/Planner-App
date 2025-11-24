import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import outlookLogo from '@/assets/outlook-logo.png';

export default function IntegrationsPage() {
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
    onError: (error) => {
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
    <div className="p-4">
      <section className="rounded-lg bg-card p-6">
        <h2 className="text-lg font-semibold text-card-foreground mb-6">Integrations</h2>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col rounded-lg border p-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-white border shrink-0">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                </div>
                <h3 className="text-sm font-medium text-card-foreground">Google Calendar Sync</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Sync your Google Calendar events to your planner
              </p>
              {syncStatus?.error && (
                <div className="mb-4 text-xs text-destructive">{syncStatus.error}</div>
              )}
            </div>
            <Button
              onClick={handleSync}
              disabled={syncMutation.isPending}
              variant="outline"
              className="w-full"
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
          <div className="flex flex-col rounded-lg border p-4 opacity-60">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-white border shrink-0 overflow-hidden">
                  <img src={outlookLogo} alt="Outlook" className="w-full h-full object-contain" />
                </div>
                <h3 className="text-sm font-medium text-card-foreground">Outlook Calendar Sync</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Sync your Outlook Calendar events to your planner
              </p>
            </div>
            <Button disabled variant="outline" className="w-full">
              <span>Coming Soon</span>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
