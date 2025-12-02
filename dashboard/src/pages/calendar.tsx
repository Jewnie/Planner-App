import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { type CalendarView } from '@/components/month-calendar';
import {
  startOfMonth,
  format,
  subMonths,
  addMonths,
  subDays,
  addDays,
  isSameDay,
  isSameMonth,
  differenceInDays,
} from 'date-fns';
import { EventSidebar } from '@/components/ui/event-sidebar';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from 'lucide-react';
import { getDeterministicColor } from '@/utils/colors';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventContentArg } from '@fullcalendar/core/index.js';
import { cn } from '@/lib/utils';

export default function CalendarPage() {
  const [searchParams] = useSearchParams();
  const viewParam = searchParams.get('view') || 'month';
  const view = (['month', 'week', 'day'].includes(viewParam) ? viewParam : 'month') as CalendarView;

  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedCalendarIds, setSelectedCalendarIds] = useState<string[]>([]);

  const calendarRef = useRef<FullCalendar | null>(null);

  /** ---------------------------
   *  DATE RANGE FOR 3-MONTH FETCH
   * --------------------------- */
  const dates = useMemo(() => {
    const previousMonth = startOfMonth(subMonths(currentMonth, 1));
    const currentMonthDate = startOfMonth(currentMonth);
    const nextMonth = startOfMonth(addMonths(currentMonth, 1));

    return [
      format(previousMonth, 'yyyy-MM-dd'),
      format(currentMonthDate, 'yyyy-MM-dd'),
      format(nextMonth, 'yyyy-MM-dd'),
    ];
  }, [currentMonth]);

  const calendarsQuery = trpc.calendar.listCalendars.useQuery();

  const eventsQuery = trpc.calendar.listEvents.useQuery(
    {
      range: 'month',
      dates,
      filters: { calendarIds: selectedCalendarIds },
    },
    {
      placeholderData: (prev) => prev,
    },
  );

  /** ---------------------------
   *  TRANSFORM EVENTS FOR FULLCALENDAR
   * --------------------------- */
  const calendarEvents = useMemo(() => {
    if (!eventsQuery.data) return [];

    return eventsQuery.data.map((event) => {
      const baseEvent = {
        id: event.id,
        title: event.title,
        extendedProps: {
          bulletColor: getDeterministicColor(event.calendarId, 'bg', 500),
          borderColor: getDeterministicColor(event.calendarId, 'border', 500),
          backgroundColor: getDeterministicColor(event.calendarId, 'bg', 100),
        },
      };

      if (event.allDay) {
        return {
          ...baseEvent,
          // date: format(new Date(event.startTime), 'yyyy-MM-dd'),
          start: event.startTime,
          end: event.endTime,
          allDay: true,
        };
      }

      return {
        ...baseEvent,
        start: event.startTime,
        end: event.endTime,
      };
    });
  }, [eventsQuery.data]);

  /** ---------------------------
   * PRESELECT ALL CALENDARS
   * --------------------------- */
  useEffect(() => {
    if (calendarsQuery.data && calendarsQuery.data.length > 0 && selectedCalendarIds.length === 0) {
      setSelectedCalendarIds(calendarsQuery.data.map((cal) => cal.id));
    }
  }, [calendarsQuery.data, selectedCalendarIds.length]);

  /** ---------------------------
   * SYNC CUSTOM TOOLBAR WITH FULLCALENDAR VIEW
   * --------------------------- */
  const syncCalendarView = (date: Date) => {
    const api = calendarRef.current?.getApi();
    if (api) api.gotoDate(date);
  };

  const handlePrev = () => {
    if (view === 'day') {
      setSelectedDate((prev) => subDays(prev, 1));
    } else {
      const newMonth = startOfMonth(subMonths(currentMonth, 1));
      setCurrentMonth(newMonth);
      syncCalendarView(newMonth);
    }
  };

  const handleNext = () => {
    if (view === 'day') {
      setSelectedDate((prev) => addDays(prev, 1));
    } else {
      const newMonth = startOfMonth(addMonths(currentMonth, 1));
      setCurrentMonth(newMonth);
      syncCalendarView(newMonth);
    }
  };

  /** ---------------------------
   * UPDATE EVENTS WHEN API DATA CHANGES
   * --------------------------- */
  useEffect(() => {
    const api = calendarRef.current?.getApi();
    if (api) api.refetchEvents();
  }, [calendarEvents]);

  /** ---------------------------
   * LABEL
   * --------------------------- */
  const monthLabel = useMemo(() => {
    if (view === 'day') return format(selectedDate, 'MMMM d yyyy');
    return format(currentMonth, 'LLLL yyyy');
  }, [view, currentMonth, selectedDate]);

  return (
    <div className="flex w-full h-full relative overflow-hidden">
      <div className="flex flex-col w-full min-w-0 h-full">
        {/* ---------- HEADER ---------- */}
        <div className="flex w-full h-24 min-w-0 items-center justify-between space-x-2 shrink-0 p-4 border-b">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handlePrev}>
              ‹
            </Button>
            <h2 className="text-lg w-36 text-center font-medium">{monthLabel}</h2>
            <Button variant="ghost" size="sm" onClick={handleNext}>
              ›
            </Button>
          </div>

          <div className="flex items-center gap-4">
            {calendarsQuery.data && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>
                      Calendars ({selectedCalendarIds.length}/{calendarsQuery.data.length})
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="flex max-w-64" align="end">
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm mb-3">Calendars</h4>
                    <div className="space-y-2">
                      {calendarsQuery.data.map((calendar) => (
                        <label
                          key={calendar.id}
                          className="flex items-center gap-2 cursor-pointer text-sm py-1"
                        >
                          <Checkbox
                            className={getDeterministicColor(calendar.id, 'bg')}
                            checked={selectedCalendarIds.includes(calendar.id)}
                            onCheckedChange={(checked) => {
                              setSelectedCalendarIds((prev) =>
                                checked
                                  ? [...prev, calendar.id]
                                  : prev.filter((id) => id !== calendar.id),
                              );
                            }}
                          />
                          <span className="flex items-center gap-2 flex-1">
                            <span className="truncate">{calendar.name}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>

        {/* ---------- CALENDAR ---------- */}
        <div className="flex-1 min-h-0 min-w-0 w-full overflow-hidden">
          <FullCalendar
            ref={calendarRef}
            firstDay={1}
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={false}
            weekends={true}
            height="100%"
            // IMPORTANT: events MUST be a function for refetch to work
            events={(_info, successCallback) => {
              successCallback(calendarEvents);
            }}
            dateClick={(info) => {
              setSelectedDate(info.date);
            }}
            dayCellClassNames={(args) => {
              const isSelected = isSameDay(args.date, selectedDate);
              const isInCurrentMonth = isSameMonth(args.date, currentMonth);
              return `${isSelected ? 'bg-blue-100' : isInCurrentMonth ? '' : 'bg-gray-100 text-muted-foreground'}`;
            }}
            eventContent={renderEventContent}
          />
        </div>
      </div>

      {isSidebarOpen && (
        <EventSidebar
          selectedDate={selectedDate}
          selectedCalendarIds={selectedCalendarIds}
          onClose={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}

const renderEventContent = (args: EventContentArg) => {
  const backgroundColor = args.event.extendedProps.backgroundColor;
  const bulletColor = args.event.extendedProps.bulletColor;
  const borderColor = args.event.extendedProps.borderColor;
  const isAllDay = args.event.allDay;
  const isMultiDay =
    args.event.end && args.event.start
      ? differenceInDays(args.event.end, args.event.start) > 0
      : false;
  return (
    <span
      className={cn(
        'flex gap-2 items-center text-xs text-black',
        isAllDay || isMultiDay
          ? `p-1 border rounded-lg justify-center ${backgroundColor} ${borderColor}`
          : '',
      )}
    >
      {!isAllDay && <div className={cn(`rounded-full w-1 h-1`, bulletColor)}></div>}{' '}
      <p className={cn(`text-xs`, isAllDay ? 'text-center' : '')}> {args.event.title}</p>
    </span>
  );
};
