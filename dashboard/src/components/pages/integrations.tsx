import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import outlookLogo from '@/assets/outlook-logo.png';
import { Badge } from '@/components/ui/badge';
import { useSyncStatus } from '@/hooks/use-sync-status';
import { Spinner } from '@/components/ui/spinner';

export default function IntegrationsPage() {
  const syncMutation = trpc.calendar.syncCalendar.useMutation();
  const integrationsQuery = trpc.integration.getIntegrations.useQuery();

  console.log(integrationsQuery.data);

  const calendarProvidersQuery = trpc.calendar.getCalendarProviders.useQuery();
  const hasGoogleCalendarLink = calendarProvidersQuery.data?.some((p) => p.name === 'google');
  const hasOutlookCalendarLink = calendarProvidersQuery.data?.some((p) => p.name === 'outlook');

  // Check if syncs are running
  const googleSyncStatus = useSyncStatus('google');
  // const outlookSyncStatus = useSyncStatus('outlook'); // TODO

  const handleSync = (type: 'google' | 'outlook') => {
    syncMutation.mutate({ calendarType: type });
  };

  return (
    <div className="p-4">
      <section className="rounded-lg bg-card p-6">
        <h2 className="text-lg font-semibold text-card-foreground mb-6">Integrations</h2>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col rounded-lg border p-4 bg-gray-50">
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
                <h3 className="text-sm font-medium text-card-foreground">Google Calendar</h3>
                <div className="flex items-center gap-2">
                  {googleSyncStatus.isRunning && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Spinner className="w-3 h-3" />
                      <span>Syncing...</span>
                    </div>
                  )}
                  {hasGoogleCalendarLink && !googleSyncStatus.isRunning && (
                    <Badge variant="outline" className="border-green-400">
                      {integrationsQuery.data?.find((i) => i.type === 'google')?.status}
                    </Badge>
                  )}
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Sync your Google Calendar events to your planner
              </p>
              {syncMutation.error && (
                <div className="mb-4 text-xs text-destructive">{syncMutation.error.message}</div>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => handleSync('google')}
                variant="outline"
                className="flex-1"
                disabled={googleSyncStatus.isRunning || syncMutation.isPending}
              >
                {googleSyncStatus.isRunning || syncMutation.isPending ? (
                  <>
                    <Spinner className="w-4 h-4 mr-2" />
                    Syncing...
                  </>
                ) : hasGoogleCalendarLink ? (
                  'Re-sync'
                ) : (
                  'Link Google Calendar'
                )}
              </Button>
            </div>
          </div>
          <div className="flex flex-col rounded-lg border p-4 opacity-60">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-white border shrink-0 overflow-hidden">
                  <img src={outlookLogo} alt="Outlook" className="w-full h-full object-contain" />
                </div>
                <h3 className="text-sm font-medium text-card-foreground">Outlook Calendar Sync</h3>
                {hasOutlookCalendarLink ? (
                  <Badge variant="outline" className="border-green-400">
                    Linked
                  </Badge>
                ) : null}
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Sync your Outlook Calendar events to your planner
              </p>
            </div>
            <Button
              onClick={() => handleSync('outlook')}
              disabled
              variant="outline"
              className="w-full"
            >
              <span>Coming Soon</span>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
