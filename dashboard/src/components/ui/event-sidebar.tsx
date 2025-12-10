import { Sidebar, SidebarContent, SidebarHeader } from './sidebar';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Separator } from './separator';
import { Button } from './button';
import { format, isSameDay } from 'date-fns';
import { Spinner } from './spinner';
import { useState } from 'react';
import type { CalendarEvent } from '../month-calendar';
import { Plus } from 'lucide-react';

function formatEventTime(event: CalendarEvent): string {
  const start = event.startTime;
  const end = event.endTime;

  if (!start) return '';

  const isAllDay = event.allDay;

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

function EventRawData({ event }: { event: CalendarEvent }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="space-y-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full justify-start text-xs text-muted-foreground h-auto py-1"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`mr-2 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
        Raw Data
      </Button>
      {isExpanded && (
        <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-96 border">
          {JSON.stringify(event, null, 2)}
        </pre>
      )}
    </div>
  );
}

export function EventSidebar(props: {
  selectedDate: Date | null;
  selectedCalendarIds: string[];
  isCreatingEvent: boolean;
  setIsCreatingEvent: () => void;
  onClose?: () => void;
}) {
  const selectedDate = props.selectedDate ?? new Date();
  // Format date as YYYY-MM-DD string to avoid timezone issues
  // This ensures the server interprets the date correctly regardless of client timezone
  const dateString = format(selectedDate, 'yyyy-MM-dd');
  const dayEventsResult = trpc.calendar.listEvents.useQuery({
    range: 'day',
    dates: [dateString],
    filters: {
      calendarIds: props.selectedCalendarIds,
    },
  });

  const events = dayEventsResult.data || [];
  const dateLabel = format(selectedDate, 'EEEE, MMMM d, yyyy');

  return (
    <Sidebar className="xl:w-96 lg:w-74 md:w-64 sm:w-64" side="right">
      <SidebarContent className="bg-white">
        <SidebarHeader className="p-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between w-full">
              <div className="flex flex-col gap-1">
                <h2 className="text-lg font-semibold">Events</h2>
                <p className="text-sm text-muted-foreground">{dateLabel}</p>
              </div>
              {props.onClose && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={props.onClose}
                  aria-label="Close sidebar"
                  className="shrink-0"
                >
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
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </Button>
              )}
            </div>
            <div className="flex">
              <Button
                onClick={props.setIsCreatingEvent}
                className="rounded-xl"
                size="sm"
                variant="outline"
              >
                <Plus />
                Add Event
              </Button>
            </div>
          </div>
        </SidebarHeader>

        <div className="flex flex-col justify-between overflow-y-auto px-4 py-4">
          {dayEventsResult.isLoading && (
            <div className="flex items-center justify-center py-8 h-full">
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
                  <CardHeader>
                    <CardTitle className="text-base leading-tight">{event.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 pt-0">
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

                    <Separator className="my-2" />
                    <EventRawData event={event} />
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
