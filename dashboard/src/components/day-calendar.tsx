import { useMemo } from 'react';
import { format, isSameDay, startOfDay, differenceInMinutes } from 'date-fns';
import { cn } from '@/lib/utils';
import { getDeterministicColor } from '@/utils/colors';
import { trpc } from '@/lib/trpc';
import type { CalendarEvent } from './month-calendar';

export interface DayCalendarProps {
  selectedDate?: Date;
  onSelect?: (selection: { start: Date; end: Date | null }) => void;
  filterCalendarIds?: string[];
}

const HOUR_HEIGHT = 80; // Height of each hour row in pixels

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

  const dayEvents = useMemo<CalendarEvent[]>(() => {
    if (!eventsQuery.data || !Array.isArray(eventsQuery.data)) {
      return [];
    }

    return eventsQuery.data;
  }, [eventsQuery.data]);

  // Filter events to only those that occur on the selected day and calculate their positions
  const positionedEvents = useMemo(() => {
    const selectedDayStart = startOfDay(selectedDate);
    const selectedDayEnd = new Date(selectedDayStart);
    selectedDayEnd.setHours(23, 59, 59, 999);

    // First, calculate basic positions for all events
    const eventsWithPositions = dayEvents
      .filter((event) => {
        const start = new Date(event.startTime);
        const end = new Date(event.endTime);

        // Check if event overlaps with the selected day
        return start <= selectedDayEnd && end >= selectedDayStart;
      })
      .map((event) => {
        const start = new Date(event.startTime);
        const end = new Date(event.endTime);

        // Clamp start and end to the selected day
        const eventStart = start < selectedDayStart ? selectedDayStart : start;
        const eventEnd = end > selectedDayEnd ? selectedDayEnd : end;

        // Calculate position relative to the start of the day
        const startHour = eventStart.getHours();
        const startMinutes = eventStart.getMinutes();
        const startSeconds = eventStart.getSeconds();

        // Calculate top position: (hour * HOUR_HEIGHT) + (minutes/60 * HOUR_HEIGHT) + (seconds/3600 * HOUR_HEIGHT)
        const topOffset =
          startHour * HOUR_HEIGHT +
          (startMinutes / 60) * HOUR_HEIGHT +
          (startSeconds / 3600) * HOUR_HEIGHT;

        // Calculate duration in minutes
        const durationMinutes = differenceInMinutes(eventEnd, eventStart);
        const height = (durationMinutes / 60) * HOUR_HEIGHT;

        // Ensure minimum height for visibility
        const minHeight = 20;
        const finalHeight = Math.max(height, minHeight);

        return {
          event,
          top: topOffset,
          height: finalHeight,
          start: eventStart,
          end: eventEnd,
          bottom: topOffset + finalHeight,
        };
      })
      .sort((a, b) => {
        // Sort by start time, then by duration (longer events first)
        if (a.top !== b.top) return a.top - b.top;
        return b.height - a.height;
      });

    // Function to check if two events overlap
    const eventsOverlap = (
      a: { top: number; bottom: number },
      b: { top: number; bottom: number },
    ) => {
      return a.top < b.bottom && b.top < a.bottom;
    };

    // Group overlapping events and assign columns
    const eventsWithColumns = eventsWithPositions.map((event) => ({
      ...event,
      column: 0,
      totalColumns: 1,
    }));

    // For each event, find all overlapping events and assign columns
    for (let i = 0; i < eventsWithColumns.length; i++) {
      const currentEvent = eventsWithColumns[i];
      const overlappingEvents: typeof eventsWithColumns = [currentEvent];

      // Find all events that overlap with the current event
      for (let j = 0; j < eventsWithColumns.length; j++) {
        if (i !== j && eventsOverlap(currentEvent, eventsWithColumns[j])) {
          overlappingEvents.push(eventsWithColumns[j]);
        }
      }

      // Sort overlapping events by start time (top), then by duration (height descending)
      overlappingEvents.sort((a, b) => {
        if (a.top !== b.top) return a.top - b.top;
        return b.height - a.height;
      });

      // Assign columns to overlapping events
      const maxColumns = overlappingEvents.length;
      for (let k = 0; k < overlappingEvents.length; k++) {
        const overlappingEvent = overlappingEvents[k];
        const eventIndex = eventsWithColumns.findIndex(
          (e) => e.event.id === overlappingEvent.event.id,
        );

        if (eventIndex !== -1) {
          // Find the first available column that doesn't conflict
          const usedColumns = new Set<number>();
          for (let m = 0; m < eventsWithColumns.length; m++) {
            if (
              m !== eventIndex &&
              eventsOverlap(eventsWithColumns[m], overlappingEvent) &&
              eventsWithColumns[m].column !== undefined
            ) {
              usedColumns.add(eventsWithColumns[m].column);
            }
          }

          // Find the first available column
          let column = 0;
          while (usedColumns.has(column)) {
            column++;
          }

          eventsWithColumns[eventIndex].column = column;
          eventsWithColumns[eventIndex].totalColumns = Math.max(
            eventsWithColumns[eventIndex].totalColumns || 1,
            maxColumns,
          );

          // Update totalColumns for all overlapping events
          for (let m = 0; m < overlappingEvents.length; m++) {
            const overlappingEventIndex = eventsWithColumns.findIndex(
              (e) => e.event.id === overlappingEvents[m].event.id,
            );
            if (overlappingEventIndex !== -1) {
              eventsWithColumns[overlappingEventIndex].totalColumns = Math.max(
                eventsWithColumns[overlappingEventIndex].totalColumns || 1,
                maxColumns,
              );
            }
          }
        }
      }
    }

    return eventsWithColumns;
  }, [dayEvents, selectedDate]);

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
        <div className="flex-1 overflow-auto relative">
          {/* Events container - positioned absolutely to span across hours */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="relative w-full" style={{ height: `${24 * HOUR_HEIGHT}px` }}>
              {positionedEvents.map(({ event, top, height, start, end }, index) => {
                const calendarId = event.calendarId || event.id?.toString() || `event-${index}`;
                const backgroundColor = getDeterministicColor(calendarId, 'bg');
                const borderColor = getDeterministicColor(calendarId, 'border', 500);
                const isAllDay = event.allDay;

                return (
                  <div
                    key={event.id || index}
                    className={cn(
                      'absolute rounded px-2 py-1 border text-sm cursor-pointer hover:opacity-80 pointer-events-auto',
                      backgroundColor,
                      borderColor,
                    )}
                    style={{
                      top: `${top}px`,
                      left: '5.5rem', // Account for hour label width (w-20 = 5rem) + left padding (0.5rem)
                      right: '0.5rem',
                      height: `${height}px`,
                      minHeight: '20px',
                    }}
                    onClick={() => onSelect({ start, end: null })}
                  >
                    <div className="font-medium truncate">{event.title}</div>
                    {!isAllDay && height >= 40 && (
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

          {/* Hour rows */}
          {Array.from({ length: 24 }, (_, hour) => (
            <div
              key={hour}
              className="border-b border-border flex"
              style={{ minHeight: `${HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}
            >
              {/* Hour label */}
              <div className="w-20 shrink-0 p-2 text-xs text-muted-foreground border-r border-border">
                {formatHour(hour)}
              </div>

              {/* Spacer for events area */}
              <div className="flex-1 relative" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
