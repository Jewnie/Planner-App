import { Sidebar, SidebarContent, SidebarHeader } from './sidebar';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Separator } from './separator';
import { format, isSameDay } from 'date-fns';
import { Spinner } from './spinner';
import type { AppRouter } from '@/types/app-router';

type CalendarEvent = AppRouter['calendar']['listEvents']['output'][number];

function formatEventTime(event: CalendarEvent): string {
  const start = event.start?.dateTime || event.start?.date;
  const end = event.end?.dateTime || event.end?.date;

  if (!start) return '';

  const isAllDay = !!event.start?.date && !event.start?.dateTime;

  if (isAllDay) {
    return 'All day';
  }

  try {
    const startDate = new Date(start);
    const endDate = end ? new Date(end) : null;

    const startTime = format(startDate, 'h:mm a');

    if (endDate && !isSameDay(startDate, endDate)) {
      const endTime = format(endDate, 'MMM d, h:mm a');
      return `${startTime} - ${endTime}`;
    } else if (endDate) {
      const endTime = format(endDate, 'h:mm a');
      return `${startTime} - ${endTime}`;
    }

    return startTime;
  } catch {
    return '';
  }
}

export function EventSidebar(props: { selectedDate: Date | null }) {
  const selectedDate = props.selectedDate ?? new Date();
  const dayEventsResult = trpc.calendar.listEvents.useQuery({
    range: 'day',
    date: selectedDate,
  });

  const events = dayEventsResult.data || [];
  const dateLabel = format(selectedDate, 'EEEE, MMMM d, yyyy');

  return (
    <Sidebar className="w-96" side="right">
      <SidebarContent>
        <SidebarHeader>
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold">Events</h2>
            <p className="text-sm text-muted-foreground">{dateLabel}</p>
          </div>
        </SidebarHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {dayEventsResult.isLoading && (
            <div className="flex items-center justify-center py-8">
              <Spinner />
            </div>
          )}

          {dayEventsResult.error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
              Failed to load events. Please try again.
            </div>
          )}

          {!dayEventsResult.isLoading && !dayEventsResult.error && events.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-muted-foreground">No events scheduled for this day</p>
            </div>
          )}

          {!dayEventsResult.isLoading && !dayEventsResult.error && events.length > 0 && (
            <div className="flex flex-col gap-3">
              {events.map((event: CalendarEvent) => (
                <Card key={event.id || `event-${Math.random()}`} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base leading-tight">
                      {event.summary || 'Untitled Event'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 pt-0">
                    {formatEventTime(event) && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                        <span>{formatEventTime(event)}</span>
                      </div>
                    )}

                    {event.location && (
                      <div className="flex items-start gap-2 text-sm text-muted-foreground">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="mt-0.5 shrink-0"
                        >
                          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                        <span className="line-clamp-2">{event.location}</span>
                      </div>
                    )}

                    {event.description && (
                      <>
                        {event.location && <Separator className="my-2" />}
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {event.description}
                        </p>
                      </>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
