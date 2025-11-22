import React, { useMemo, useState } from 'react';
import {
  add,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  format,
  isSameMonth,
  isSameDay,
  differenceInDays,
  subMonths,
  addMonths,
} from 'date-fns';

// shadcn/ui primitives (assume you have shadcn/ui installed)
import { cn } from '@/lib/utils';
import { getDeterministicColor } from '@/utils/colors';
import { trpc } from '@/lib/trpc';

// --- Types ---
export interface CalendarEvent {
  id: string | number;
  calendarId?: string;
  title: string;
  start: Date | string;
  end?: Date | string;
  color?: string;
}

export type CalendarView = 'month' | 'week' | 'day';

export interface MonthCalendarProps {
  initialMonth?: Date;
  selectionMode?: 'single' | 'range' | 'none';
  onSelect?: (selection: { start: Date; end: Date | null }) => void;
  onMonthChange?: (month: Date) => void;
  filterCalendarIds?: string[];
}

export default function MonthCalendar({
  initialMonth = new Date(),
  selectionMode = 'single',
  onSelect = () => {},
  filterCalendarIds,
}: MonthCalendarProps) {
  const [cursorMonth, setCursorMonth] = useState(() => startOfMonth(initialMonth));

  // Sync cursorMonth when initialMonth prop changes
  React.useEffect(() => {
    setCursorMonth(startOfMonth(initialMonth));
  }, [initialMonth]);
  const [selectedStart, setSelectedStart] = useState<Date | null>(() => new Date());
  const [selectedEnd, setSelectedEnd] = useState<Date | null>(null);

  // Calculate dates for previous month, current month, and next month
  // This ensures we fetch events for all months that might be visible in the calendar grid
  const previousMonth = startOfMonth(subMonths(cursorMonth, 1));
  const currentMonthDate = startOfMonth(cursorMonth);
  const nextMonth = startOfMonth(addMonths(cursorMonth, 1));

  // Send dates as YYYY-MM-DD strings to avoid timezone issues
  const dates = [
    format(previousMonth, 'yyyy-MM-dd'),
    format(currentMonthDate, 'yyyy-MM-dd'),
    format(nextMonth, 'yyyy-MM-dd'),
  ];

  // Fetch events for the visible months
  const eventsQuery = trpc.calendar.listEvents.useQuery(
    {
      range: 'month',
      dates,
      filters: {
        calendarIds: filterCalendarIds,
      },
    },
    {
      placeholderData: (previousData) => previousData,
    },
  );

  // Transform API events to CalendarEvent format
  const events = useMemo<CalendarEvent[]>(() => {
    if (!eventsQuery.data || !Array.isArray(eventsQuery.data)) {
      return [];
    }

    const items = eventsQuery.data;
    const calendarEvents: CalendarEvent[] = [];

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

        calendarEvents.push({
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

    return calendarEvents;
  }, [eventsQuery.data]);

  const monthGrid = useMemo(() => {
    const monthStart = startOfMonth(cursorMonth);
    const monthEnd = endOfMonth(cursorMonth);

    // Always start from the Monday of the week that contains the month start
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday start
    // Always end on the Sunday of the week that contains the month end
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 }); // Sunday end

    // Calculate the number of days needed to show all days of the month
    const totalDays = differenceInDays(gridEnd, gridStart) + 1; // +1 to include both start and end

    // Ensure we show at least 5 weeks (35 days), but more if needed to include all month days
    const minDays = 35; // 5 weeks minimum
    const daysToShow = Math.max(totalDays, minDays);

    // Generate the days array
    const days: Date[] = [];
    for (let i = 0; i < daysToShow; i++) {
      days.push(add(gridStart, { days: i }));
    }

    // Group days into weeks (arrays of 7)
    const weeks = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }
    return weeks;
  }, [cursorMonth]);

  const eventsByDate = useMemo(() => {
    // naive bucketing by ISO date (yyyy-MM-dd)
    const map: Record<string, CalendarEvent[]> = {};
    events.forEach((event) => {
      const start = typeof event.start === 'string' ? new Date(event.start) : event.start;
      const end = event.end
        ? typeof event.end === 'string'
          ? new Date(event.end)
          : event.end
        : start;

      // iterate days between start and end and add reference
      let day = startOfDay(start);
      const lastDay = startOfDay(end);
      while (day <= lastDay) {
        const key = format(day, 'yyyy-MM-dd');
        map[key] = map[key] || [];
        map[key].push(event);
        day = add(day, { days: 1 });
      }
    });
    return map;
  }, [events]);

  function startOfDay(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function handleDateClick(date: Date) {
    if (selectionMode === 'none') return;

    if (selectionMode === 'single') {
      setSelectedStart(date);
      setSelectedEnd(null);
      onSelect({ start: date, end: null });
      return;
    }

    // range mode
    if (!selectedStart || (selectedStart && selectedEnd)) {
      setSelectedStart(date);
      setSelectedEnd(null);
      onSelect({ start: date, end: null });
      return;
    }

    // selectedStart exists but selectedEnd is empty -> complete range
    if (selectedStart && !selectedEnd) {
      const start = selectedStart;
      const end = date;
      if (end < start) {
        setSelectedStart(end);
        setSelectedEnd(start);
        onSelect({ start: end, end: start });
      } else {
        setSelectedEnd(end);
        onSelect({ start: start, end: end });
      }
      return;
    }
  }

  function isInSelection(date: Date) {
    if (!selectedStart) return false;
    const day = startOfDay(date);
    const start = startOfDay(selectedStart);
    if (!selectedEnd) return isSameDay(day, start);
    const end = startOfDay(selectedEnd);
    return day >= start && day <= end;
  }

  return (
    <div className="w-full h-full flex min-w-0 flex-col">
      <div className="flex w-full min-w-0 h-full overflow-auto flex-col">
        <div className="grid grid-cols-7 w-full text-sm border-t shrink-0" style={{ gap: 0 }}>
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((dayName) => (
            <div
              key={dayName}
              className="flex items-center justify-center font-medium text-xs border-r border-border px-2 last:border-r-0"
              style={{ height: '2rem', minHeight: '2rem', maxHeight: '2rem', lineHeight: '2rem' }}
            >
              {dayName}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 w-full text-sm flex-1 " style={{ gap: 0, marginTop: 0 }}>
          {monthGrid.map((week, weekIndex) => (
            <React.Fragment key={weekIndex}>
              {week.map((day, dayIndex) => {
                const inMonth = isSameMonth(day, cursorMonth);
                const isoDate = format(day, 'yyyy-MM-dd');
                const dayEvents = eventsByDate[isoDate] || [];
                const dayOfWeek = day.getDay(); // 0 = Sunday, 6 = Saturday
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

                // Ensure all classes are always present as string literals for Tailwind scanning
                const borderTopClass = weekIndex === 0 ? 'border-t' : '';
                const monthClass = !inMonth ? 'bg-gray-100 opacity-50' : '';
                const selectionClass = isInSelection(day) ? 'bg-green-50' : '';
                const weekendClass = isWeekend && inMonth ? 'bg-blue-50' : '';

                return (
                  <button
                    key={isoDate}
                    onClick={() => handleDateClick(day)}
                    className={cn(
                      'text-left flex flex-col justify-start overflow-visible min-h-[100px] border-r border-b [&:nth-child(7n)]:border-r-0 border-border',
                      borderTopClass,
                      monthClass,
                      selectionClass,
                      weekendClass,
                    )}
                    aria-pressed={isInSelection(day)}
                  >
                    <div className="flex items-start justify-between p-2">
                      <div className={cn('text-sm font-semibold')}>{format(day, 'd')}</div>
                      <div className="text-xs font-medium">
                        {isSameDay(day, new Date()) ? 'Today' : ''}
                      </div>
                    </div>

                    <div
                      className="px-1 relative pb-1 flex-1 w-full"
                      style={{ overflow: 'visible' }}
                    >
                      {/* show up to 3 events as small pills (Untitled-style) */}
                      {(() => {
                        // Sort events: multi-day events first, then by day span (descending)
                        const sortedEvents = [...dayEvents].sort((a, b) => {
                          const aStart = typeof a.start === 'string' ? new Date(a.start) : a.start;
                          const aEnd = a.end
                            ? typeof a.end === 'string'
                              ? new Date(a.end)
                              : a.end
                            : aStart;
                          const aSpan = differenceInDays(aEnd, aStart) + 1;

                          const bStart = typeof b.start === 'string' ? new Date(b.start) : b.start;
                          const bEnd = b.end
                            ? typeof b.end === 'string'
                              ? new Date(b.end)
                              : b.end
                            : bStart;
                          const bSpan = differenceInDays(bEnd, bStart) + 1;

                          // Multi-day events (span > 1) come first, then sort by span descending
                          if (aSpan > 1 && bSpan === 1) return -1;
                          if (aSpan === 1 && bSpan > 1) return 1;
                          return bSpan - aSpan; // Descending order
                        });

                        return sortedEvents
                          .filter((event) => {
                            const eventStart =
                              typeof event.start === 'string' ? new Date(event.start) : event.start;
                            const eventStartDate = startOfDay(eventStart);
                            const currentDayDate = startOfDay(day);
                            return isSameDay(eventStartDate, currentDayDate);
                          })
                          .slice(0, 5)
                          .map((event, index) => {
                            const eventStart =
                              typeof event.start === 'string' ? new Date(event.start) : event.start;
                            const eventEnd = event.end
                              ? typeof event.end === 'string'
                                ? new Date(event.end)
                                : event.end
                              : eventStart;
                            const eventDaySpan = differenceInDays(eventEnd, eventStart) + 1;
                            const calendarId =
                              event.calendarId || event.id?.toString() || `event-${index}`;
                            const backgroundColor = getDeterministicColor(calendarId, 'bg', 100);
                            const bulletColor = getDeterministicColor(calendarId, 'bg', 500);
                            const borderColor = getDeterministicColor(calendarId, 'border', 500);

                            // Calculate how many days the event spans within the visible month
                            const eventStartDate = startOfDay(eventStart);
                            const monthStart = startOfMonth(cursorMonth);
                            const monthEnd = endOfMonth(cursorMonth);
                            const spanStart =
                              eventStartDate < monthStart ? monthStart : eventStartDate;
                            const spanEnd = eventEnd > monthEnd ? monthEnd : startOfDay(eventEnd);
                            const visibleSpan = Math.max(1, differenceInDays(spanEnd, spanStart));
                            const actualSpan = Math.min(eventDaySpan, visibleSpan);

                            // Calculate width to span across multiple day cells
                            // Each day cell is 100% of its container, so N days = N * 100%
                            // Account for: container padding (1rem total), borders between cells (1px each)
                            const borderWidth = (actualSpan - 1) * 1; // 1px border between each cell
                            const widthValue =
                              actualSpan > 1
                                ? `calc(${actualSpan * 100}% - 1rem + ${borderWidth}px)`
                                : 'calc(100% - 1rem)';

                            // Check if this is a single-day event
                            const isSingleDay = eventDaySpan === 1;

                            // Format start time for single-day events
                            const startTime = isSingleDay
                              ? (() => {
                                  const startDate =
                                    typeof event.start === 'string'
                                      ? new Date(event.start)
                                      : event.start;
                                  // Check if it's an all-day event (no time component)
                                  const isAllDay =
                                    startDate.getHours() === 0 &&
                                    startDate.getMinutes() === 0 &&
                                    startDate.getSeconds() === 0 &&
                                    startDate.getMilliseconds() === 0;
                                  return isAllDay ? null : format(startDate, 'h:mm a');
                                })()
                              : null;

                            // Single-day events: bullet + title + time
                            if (isSingleDay) {
                              return (
                                <div
                                  key={event.id || `event-${index}-${day.getTime()}`}
                                  className="flex items-center gap-1.5 text-xs mt-2 px-2"
                                  title={event.title}
                                >
                                  <div
                                    className={cn('w-1.5 h-1.5 rounded-full border', bulletColor)}
                                  />
                                  <span className="truncate flex-1 min-w-0">
                                    <span className="font-medium">{event.title}</span>
                                    {startTime && (
                                      <span className="text-muted-foreground ml-1">
                                        {startTime}
                                      </span>
                                    )}
                                  </span>
                                </div>
                              );
                            }

                            // Multi-day events: badge/pill style
                            return (
                              <div
                                key={event.id || `event-${index}-${day.getTime()}`}
                                className={cn(
                                  'text-xs truncate rounded absolute px-2 py-0.5 mt-1 block border z-10',
                                  backgroundColor,
                                  borderColor,
                                )}
                                style={{
                                  top: `${index}rem`,
                                  left: '0.5rem',
                                  width: widthValue,
                                }}
                                title={event.title}
                              >
                                {event.title}
                              </div>
                            );
                          });
                      })()}
                      {(() => {
                        // Count events that start on this day
                        const eventsStartingToday = dayEvents.filter((event) => {
                          const eventStart =
                            typeof event.start === 'string' ? new Date(event.start) : event.start;
                          const eventStartDate = startOfDay(eventStart);
                          const currentDayDate = startOfDay(day);
                          return isSameDay(eventStartDate, currentDayDate);
                        });
                        const remaining = eventsStartingToday.length - 5;
                        return remaining > 0 ? (
                          <div className="text-xs mt-1 text-muted-foreground truncate">
                            +{remaining} more
                          </div>
                        ) : null;
                      })()}
                    </div>
                  </button>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
