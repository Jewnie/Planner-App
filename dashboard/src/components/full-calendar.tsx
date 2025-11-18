import React, { useMemo, useState } from 'react';
import {
  add,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  sub,
  addMonths,
  type Locale,
} from 'date-fns';

// shadcn/ui primitives (assume you have shadcn/ui installed)
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// --- Types ---
export interface CalendarEvent {
  id: string | number;
  title: string;
  start: Date | string;
  end?: Date | string;
  color?: string;
}

export interface FullCalendarProps {
  events?: CalendarEvent[];
  initialMonth?: Date;
  selectionMode?: 'single' | 'range' | 'none';
  onSelect?: (selection: { start: Date; end: Date | null }) => void;
  onMonthChange?: (month: Date) => void;
  locale?: Locale;
}

export default function FullCalendar({
  events = [],
  initialMonth = new Date(),
  selectionMode = 'single',
  onSelect = () => {},
  onMonthChange,
  locale = undefined,
}: FullCalendarProps) {
  const [cursorMonth, setCursorMonth] = useState(() => startOfMonth(initialMonth));
  const [selectedStart, setSelectedStart] = useState<Date | null>(null);
  const [selectedEnd, setSelectedEnd] = useState<Date | null>(null);

  const monthGrid = useMemo(() => {
    const monthStart = startOfMonth(cursorMonth);
    const monthEnd = endOfMonth(cursorMonth);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday start
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

    // group days into weeks (arrays of 7)
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

  function monthLabel() {
    return format(cursorMonth, 'LLLL yyyy', { locale });
  }

  function handlePrev() {
    setCursorMonth((month) => {
      const newMonth = sub(month, { months: 1 });
      onMonthChange?.(newMonth);
      return newMonth;
    });
  }
  function handleNext() {
    setCursorMonth((month) => {
      const newMonth = addMonths(month, 1);
      onMonthChange?.(newMonth);
      return newMonth;
    });
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
      <div className="flex w-full min-w-0 items-center justify-between space-x-2 shrink-0 p-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handlePrev} aria-label="Previous month">
            ‹
          </Button>
          <h2 className="text-lg w-36 text-center font-medium">{monthLabel()}</h2>
          <Button variant="ghost" size="sm" onClick={handleNext} aria-label="Next month">
            ›
          </Button>
        </div>
        <div className="flex items-center gap-2"></div>
      </div>
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
              {week.map((day) => {
                const inMonth = isSameMonth(day, cursorMonth);
                const isoDate = format(day, 'yyyy-MM-dd');
                const dayEvents = eventsByDate[isoDate] || [];

                return (
                  <button
                    key={isoDate}
                    onClick={() => handleDateClick(day)}
                    className={cn(
                      'text-left flex flex-col justify-start overflow-hidden min-h-[100px] border-r border-b nth-7:border-l-4 border-border',
                      weekIndex === 0 && 'border-t',
                      !inMonth && 'bg-gray-100 opacity-50',
                      isInSelection(day) && 'bg-green-50',
                    )}
                    aria-pressed={isInSelection(day)}
                  >
                    <div className="flex items-start justify-between p-2">
                      <div
                        className={cn(
                          'text-sm font-semibold',
                          isSameDay(day, new Date()) && 'underline',
                        )}
                      >
                        {format(day, 'd')}
                      </div>
                      <div className="text-xs text-muted-foreground">{format(day, 'LLL')}</div>
                    </div>

                    <div className="px-2 pb-2 flex-1 w-full overflow-hidden">
                      {/* show up to 3 events as small pills (Untitled-style) */}
                      {dayEvents.slice(0, 3).map((event, index) => (
                        <div
                          key={event.id || index}
                          className="text-xs truncate rounded px-2 py-0.5 mt-1 w-full block border bg-blue-50"
                          title={event.title}
                        >
                          {event.title}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-xs mt-1 text-muted-foreground truncate">
                          +{dayEvents.length - 3} more
                        </div>
                      )}
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
