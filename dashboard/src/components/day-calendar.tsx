import { useMemo } from 'react';
import { format, isSameDay, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { getDeterministicColor } from '@/utils/colors';
import { trpc } from '@/lib/trpc';
import type { CalendarEvent } from './month-calendar';

export interface DayCalendarProps {
  selectedDate?: Date;
  onSelect?: (selection: { start: Date; end: Date | null }) => void;
  filterCalendarIds?: string[];
}

export default function DayCalendar({
  selectedDate = new Date(),
  onSelect = () => {},
  filterCalendarIds,
}: DayCalendarProps) {
  const dayStart = startOfDay(selectedDate);
  const dayEnd = new Date(dayStart);
  dayEnd.setHours(23, 59, 59, 999);

  // Format date for API call
  const dateString = format(selectedDate, 'yyyy-MM-dd');

  // Fetch events for the selected day
  const eventsQuery = trpc.calendar.listEvents.useQuery(
    {
      range: 'day',
      dates: [dateString],
      filters:
        filterCalendarIds && filterCalendarIds.length > 0
          ? { calendarIds: filterCalendarIds }
          : undefined,
    },
    {
      placeholderData: (previousData) => previousData,
    },
  );

  // Transform API events to CalendarEvent format
  const dayEvents = useMemo<CalendarEvent[]>(() => {
    if (!eventsQuery.data || !Array.isArray(eventsQuery.data)) {
      return [];
    }

    const items = eventsQuery.data;
    const events: CalendarEvent[] = [];

    for (const event of items) {
      const startRaw = event?.start?.dateTime || event?.start?.date;
      const endRaw = event?.end?.dateTime || event?.end?.date;

      if (!startRaw) {
        console.warn('Event missing start date:', event);
        continue;
      }

      // Parse dates - handle both ISO datetime strings and date-only strings
      let start: Date;
      let end: Date;

      try {
        start = new Date(startRaw);
        if (isNaN(start.getTime())) {
          console.warn('Invalid start date:', startRaw);
          continue;
        }

        if (endRaw) {
          end = new Date(endRaw);
          if (isNaN(end.getTime())) {
            console.warn('Invalid end date:', endRaw);
            end = start;
          }
        } else {
          end = start;
        }

        // For all-day events (date-only), ensure end date is at end of day
        if (event?.start?.date && !event?.start?.dateTime) {
          // All-day event - end should be end of the end date
          end = new Date(end);
          end.setHours(23, 59, 59, 999);
        }

        events.push({
          id: event.id || `event-${Math.random()}`,
          calendarId: event.calendarId,
          title: event.summary || 'Untitled event',
          start,
          end,
        });
      } catch (error) {
        console.error('Error parsing event dates:', error, event);
        continue;
      }
    }

    return events;
  }, [eventsQuery.data]);

  // Group events by hour
  const eventsByHour = useMemo(() => {
    const hours: Record<number, CalendarEvent[]> = {};

    // Initialize all 24 hours
    for (let i = 0; i < 24; i++) {
      hours[i] = [];
    }

    dayEvents.forEach((event) => {
      const start = typeof event.start === 'string' ? new Date(event.start) : event.start;
      const hour = start.getHours();

      if (hour >= 0 && hour < 24) {
        hours[hour] = hours[hour] || [];
        hours[hour].push(event);
      }
    });

    return hours;
  }, [dayEvents]);

  function formatTime(date: Date): string {
    return format(date, 'h:mm a');
  }

  function formatHour(hour: number): string {
    if (hour === 0) return '12 AM';
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return '12 PM';
    return `${hour - 12} PM`;
  }

  return (
    <div className="w-full h-full flex min-w-0 flex-col overflow-hidden">
      <div className="flex flex-col w-full h-full">
        {/* Time slots */}
        <div className="flex-1 overflow-auto">
          {Array.from({ length: 24 }, (_, hour) => (
            <div key={hour} className="border-b border-border min-h-[80px] flex">
              {/* Hour label */}
              <div className="w-20 shrink-0 p-2 text-xs text-muted-foreground border-r border-border">
                {formatHour(hour)}
              </div>

              {/* Events for this hour */}
              <div className="flex-1 p-2 relative">
                {eventsByHour[hour]?.map((event, index) => {
                  const start =
                    typeof event.start === 'string' ? new Date(event.start) : event.start;
                  const end = event.end
                    ? typeof event.end === 'string'
                      ? new Date(event.end)
                      : event.end
                    : start;

                  const calendarId = event.calendarId || event.id?.toString() || `event-${index}`;
                  const backgroundColor = getDeterministicColor(calendarId, 'bg');

                  const isAllDay =
                    event.start && typeof event.start === 'string'
                      ? event.start.includes('T') === false
                      : false;

                  return (
                    <div
                      key={event.id || index}
                      className={cn(
                        'rounded px-2 py-1 mb-1 border text-sm cursor-pointer hover:opacity-80',
                        backgroundColor,
                      )}
                      onClick={() => onSelect({ start, end: null })}
                    >
                      <div className="font-medium truncate">{event.title}</div>
                      {!isAllDay && (
                        <div className="text-xs text-muted-foreground">
                          {formatTime(start)}
                          {end && !isSameDay(start, end) && ` - ${formatTime(end)}`}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
