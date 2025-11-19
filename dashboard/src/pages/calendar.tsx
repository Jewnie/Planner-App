import { useMemo, useState } from 'react';
import { trpc } from '@/lib/trpc';
import FullCalendar, { type CalendarEvent } from '@/components/full-calendar';
import { startOfMonth, format, subMonths, addMonths } from 'date-fns';
import { EventSidebar } from '@/components/ui/event-sidebar';

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Calculate dates for previous month, current month, and next month
  // This ensures we fetch events for all months that might be visible in the calendar grid
  const previousMonth = startOfMonth(subMonths(currentMonth, 1));
  const currentMonthDate = startOfMonth(currentMonth);
  const nextMonth = startOfMonth(addMonths(currentMonth, 1));

  // Send dates as YYYY-MM-DD strings to avoid timezone issues
  const dates = [
    format(previousMonth, 'yyyy-MM-dd'),
    format(currentMonthDate, 'yyyy-MM-dd'),
    format(nextMonth, 'yyyy-MM-dd'),
  ];

  const eventsQuery = trpc.calendar.listEvents.useQuery(
    {
      range: 'month',
      dates,
    },
    {
      placeholderData: (previousData) => previousData,
    },
  );

  // Transform Google Calendar events to FullCalendar format
  const calendarEvents = useMemo<CalendarEvent[]>(() => {
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

  return (
    <div className="flex w-full h-full relative">
      <section className="flex-1 flex flex-col min-w-0 w-full">
        {
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
                setIsSidebarOpen(true);
              }}
            />
          </div>
        }
      </section>
      {isSidebarOpen && (
        <EventSidebar selectedDate={selectedDate} onClose={() => setIsSidebarOpen(false)} />
      )}
    </div>
  );
}
