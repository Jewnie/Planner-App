import React, { useMemo, useRef, useState } from 'react';
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

export type CalendarEvent = {
  id: string;
  createdAt: string | null;
  updatedAt: string | null;
  calendarId: string;
  providerEventId: string;
  title: string;
  description: string | null;
  location: string | null;
  startTime: string;
  endTime: string;
  allDay: boolean | null;
  recurringRule: string | null;
  timeZone: string | null;
  rawData?: unknown;
};

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
  const multiDayEventRef = useRef<HTMLDivElement>(null);
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

  const events = useMemo(() => {
    return eventsQuery.data || [];
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

  const filterEventsByDay = (day: Date) => {
    return events.filter((event) => {
      const start = new Date(event.startTime);
      const end = new Date(event.endTime);

      // All-day events from DB are stored exclusive-end,
      // so shift them to end of the previous day
      if (event.allDay) {
        end.setHours(23, 59, 59, 999);
      }

      // Compare dates in local timezone by comparing year, month, day
      const dayYear = day.getFullYear();
      const dayMonth = day.getMonth();
      const dayDate = day.getDate();

      const startYear = start.getFullYear();
      const startMonth = start.getMonth();
      const startDate = start.getDate();

      const endYear = end.getFullYear();
      const endMonth = end.getMonth();
      const endDate = end.getDate();

      // Check if day falls within the event's date range
      const dayTime = new Date(dayYear, dayMonth, dayDate).getTime();
      const startDayTime = new Date(startYear, startMonth, startDate).getTime();
      const endDayTime = new Date(endYear, endMonth, endDate).getTime();

      return dayTime >= startDayTime && dayTime <= endDayTime;
    });
  };

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

  const renderEventsMoreInfo = (dayEvents: CalendarEvent[], day: Date) => {
    // Count events that start on this day
    const eventsStartingToday = dayEvents.filter((event) => {
      const eventStartDate = startOfDay(new Date(event.startTime));
      const currentDayDate = startOfDay(day);
      return isSameDay(eventStartDate, currentDayDate);
    });
    const remaining = eventsStartingToday.length - 4;
    return remaining > 0 ? (
      <div className="text-xs mt-1 text-muted-foreground truncate">+{remaining} more</div>
    ) : null;
  };

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
      <div className="flex w-full min-w-0 h-full overflow-x-auto overflow-y-hidden flex-col">
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
          {monthGrid.map((week, weekIndex) => {
            const weekEvents: string[] = [];
            return (
              <React.Fragment key={weekIndex}>
                {week.map((day) => {
                  const inMonth = isSameMonth(day, cursorMonth);
                  const dayEvents = filterEventsByDay(day);
                  const dayOfWeek = day.getDay(); // 0 = Sunday, 6 = Saturday
                  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

                  // Ensure all classes are always present as string literals for Tailwind scanning
                  const borderTopClass = weekIndex === 0 ? 'border-t' : '';
                  const selectionClass = isInSelection(day) ? 'bg-green-50' : '';
                  const weekendClass = isWeekend && inMonth ? 'bg-blue-50' : '';

                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => handleDateClick(day)}
                      className={cn(
                        'text-left flex flex-col justify-start overflow-visible min-h-[100px] border-r border-b nth-[7n]:border-r-0 border-border',
                        borderTopClass,
                        selectionClass,
                        weekendClass,
                        !inMonth ? 'bg-gray-100' : '',
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
                          // Sort events: multi-day events first, then all-day events, then timed events by start time
                          const sortedEvents = dayEvents.sort((a, b) => {
                            const aStart = new Date(a.startTime);
                            const aEnd = new Date(a.endTime);
                            const aSpan = differenceInDays(aEnd, aStart) + 1;

                            const bStart = new Date(b.startTime);
                            const bEnd = new Date(b.endTime);
                            const bSpan = differenceInDays(bEnd, bStart) + 1;

                            // 1. Multi-day events first
                            if (aSpan > 1 && bSpan === 1) return -1;
                            if (aSpan === 1 && bSpan > 1) return 1;

                            // 2. All-day single-day events next
                            if (a.allDay && aSpan === 1 && !(b.allDay && bSpan === 1)) return -1;
                            if (b.allDay && bSpan === 1 && !(a.allDay && aSpan === 1)) return 1;

                            // 3. Regular timed single-day events: sort by start time
                            if (!a.allDay && !b.allDay && aSpan === 1 && bSpan === 1) {
                              return aStart.getTime() - bStart.getTime();
                            }

                            // 4. If both are multi-day, sort by start time
                            if (aSpan > 1 && bSpan > 1) {
                              return aStart.getTime() - bStart.getTime();
                            }

                            // 5. Keep original order if both are same category
                            return 0;
                          });

                          return sortedEvents.slice(0, 4).map((event, index) => {
                            if (weekEvents.includes(event.id)) {
                              return null;
                            } else {
                              weekEvents.push(event.id);
                            }
                            const eventStart = new Date(event.startTime);
                            const eventEnd = new Date(event.endTime);
                            const eventDaySpan = differenceInDays(eventEnd, eventStart) + 1; // +1 NECESSARY?
                            const calendarId =
                              event.calendarId || event.id?.toString() || `event-${index}`;
                            const backgroundColor = getDeterministicColor(calendarId, 'bg', 100);
                            const bulletColor = getDeterministicColor(calendarId, 'bg', 500);
                            const borderColor = getDeterministicColor(calendarId, 'border', 500);

                            // Calculate how many days the event spans within the visible week
                            const eventStartDate = startOfDay(new Date(eventStart));

                            const weekStart = startOfWeek(day, { weekStartsOn: 1 }); // Monday start
                            const weekEnd = endOfWeek(day, { weekStartsOn: 1 }); // Sunday end
                            const spanStart =
                              eventStartDate < weekStart ? weekStart : eventStartDate;
                            const spanEnd =
                              new Date(eventEnd) > weekEnd
                                ? weekEnd
                                : startOfDay(new Date(eventEnd));
                            const visibleSpan = differenceInDays(spanEnd, spanStart) + 1; // +1 to include both start and end
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

                            // Calculate top positions: incorporate margin directly into top value
                            // mt-2 = 8px, mt-1 = 4px - add these to the top calculation
                            const topPositionSingle = `${index * 20 + 8}px`; // index * 20 + mt-2 (8px)
                            const topPositionMulti = `${index * 20 + 4}px`; // index * 20 + mt-1 (4px)

                            // Single-day events: bullet + title + time
                            if (isSingleDay && !event.allDay) {
                              const startTimeDate = new Date(event.startTime);
                              return (
                                <div
                                  key={event.id || `event-${index}-${day.getTime()}`}
                                  className="flex absolute h-6 items-center gap-1.5 text-xs px-2"
                                  title={event.title}
                                  style={{
                                    top: topPositionSingle,
                                    left: '0.5rem',
                                    width: widthValue,
                                  }}
                                >
                                  <div
                                    className={cn('w-1.5 h-1.5 rounded-full border', bulletColor)}
                                  />
                                  <span className="truncate flex-1 min-w-0">
                                    <span className="font-medium">{event.title}</span>
                                    <span className="text-muted-foreground ml-1">
                                      {format(startTimeDate, 'HH:mm')}
                                    </span>
                                  </span>
                                </div>
                              );
                            }

                            // Multi-day events: badge/pill style
                            return (
                              <div
                                ref={multiDayEventRef}
                                key={event.id || `event-${index}-${day.getTime()}`}
                                className={cn(
                                  'text-xs truncate h-6 rounded absolute px-2 py-0.5 block border z-10',
                                  backgroundColor,
                                  borderColor,
                                )}
                                style={{
                                  top: topPositionMulti,
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
                      </div>
                      {renderEventsMoreInfo(dayEvents, day)}
                    </button>
                  );
                })}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
