import { useMemo, useState } from 'react';
import { trpc } from '@/lib/trpc';
import FullCalendar, { type CalendarEvent } from '@/components/full-calendar';
import { startOfMonth, format } from 'date-fns';
import { EventSidebar } from '@/components/ui/event-sidebar';

type GoogleEvent = {
  id?: string | null;
  summary?: string | null;
  location?: string | null;
  start?: { dateTime?: string | null; date?: string | null } | null;
  end?: { dateTime?: string | null; date?: string | null } | null;
};

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  // Send date as YYYY-MM-DD string to avoid timezone issues
  // This ensures the server interprets the date correctly regardless of client timezone
  const dateString = format(currentMonth, 'yyyy-MM-dd');

  const eventsQuery = trpc.calendar.listEvents.useQuery({
    range: 'month',
    date: dateString,
  });

  // Transform Google Calendar events to FullCalendar format
  const calendarEvents = useMemo<CalendarEvent[]>(() => {
    if (!eventsQuery.data || !Array.isArray(eventsQuery.data)) {
      return [];
    }

    const items = (eventsQuery.data as unknown as GoogleEvent[]) || [];
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

  return (
    <div className="flex w-full h-full relative">
      <section className="flex-1 flex flex-col min-w-0 w-full">
        {eventsQuery.isLoading && (
          <div className="text-sm text-muted-foreground mb-4">Loading events…</div>
        )}

        {eventsQuery.error && (
          <div className="text-sm text-red-600 mb-4">Failed to load events.</div>
        )}

        {!eventsQuery.isLoading && !eventsQuery.error && (
          <div className="flex-1 min-h-0 min-w-0 w-full">
            <FullCalendar
              events={calendarEvents}
              selectionMode="single"
              initialMonth={currentMonth}
              onMonthChange={(month) => {
                setCurrentMonth(startOfMonth(month));
              }}
              onSelect={(selection) => {
                setSelectedDate(selection.start);
              }}
            />
          </div>
        )}
      </section>
      {selectedDate && <EventSidebar selectedDate={selectedDate} />}
    </div>
  );
}
