import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import MonthCalendar, { type CalendarView } from '@/components/month-calendar';
import { startOfMonth, format, subMonths, addMonths, subDays, addDays } from 'date-fns';
import { EventSidebar } from '@/components/ui/event-sidebar';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from 'lucide-react';
import { getDeterministicColor } from '@/utils/colors';

export default function CalendarPage() {
  const [searchParams] = useSearchParams();
  const viewParam = searchParams.get('view') || 'month';
  const view = (['month', 'week', 'day'].includes(viewParam) ? viewParam : 'month') as CalendarView;

  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedCalendarIds, setSelectedCalendarIds] = useState<string[]>([]);

  const calendarsQuery = trpc.calendar.listCalendars.useQuery();

  // Initialize selected calendars to all calendars when they load
  useEffect(() => {
    if (calendarsQuery.data && calendarsQuery.data.length > 0 && selectedCalendarIds.length === 0) {
      setSelectedCalendarIds(calendarsQuery.data.map((cal) => cal.id));
    }
  }, [calendarsQuery.data, selectedCalendarIds.length]);

  const monthLabel = useMemo(() => {
    if (view === 'day') {
      return format(selectedDate, 'MMMM d yyyy');
    }
    return format(currentMonth, 'LLLL yyyy');
  }, [view, currentMonth, selectedDate]);

  const handlePrev = () => {
    if (view === 'day') {
      setSelectedDate((prev) => subDays(prev, 1));
    } else {
      const newMonth = subMonths(currentMonth, 1);
      setCurrentMonth(startOfMonth(newMonth));
    }
  };

  const handleNext = () => {
    if (view === 'day') {
      setSelectedDate((prev) => addDays(prev, 1));
    } else {
      const newMonth = addMonths(currentMonth, 1);
      setCurrentMonth(startOfMonth(newMonth));
    }
  };

  return (
    <div className="flex w-full h-full relative overflow-hidden">
      <div className="flex flex-col w-full min-w-0 h-full">
        <div className="flex w-full h-24 min-w-0 items-center justify-between space-x-2 shrink-0 p-4 border-b">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handlePrev} aria-label="Previous month">
              ‹
            </Button>
            <h2 className="text-lg w-36 text-center font-medium">{monthLabel}</h2>
            <Button variant="ghost" size="sm" onClick={handleNext} aria-label="Next month">
              ›
            </Button>
          </div>
          <div className="flex items-center gap-4">
            {calendarsQuery.data && calendarsQuery.data.length > 0 && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>
                      Calendars ({selectedCalendarIds?.length ?? 0}/{calendarsQuery.data.length})
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
                            checked={selectedCalendarIds?.includes(calendar.id)}
                            onCheckedChange={(checked: boolean) => {
                              setSelectedCalendarIds((prev) => {
                                if (checked) {
                                  return [...(prev ?? []), calendar.id];
                                } else {
                                  return prev?.filter((id) => id !== calendar.id) ?? [];
                                }
                              });
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
        <div className="flex-1 min-h-0 min-w-0 w-full overflow-hidden">
          <MonthCalendar
            selectionMode="single"
            initialMonth={currentMonth}
            filterCalendarIds={selectedCalendarIds}
            onMonthChange={(month) => {
              setCurrentMonth(startOfMonth(month));
            }}
            onSelect={(selection) => {
              setSelectedDate(selection.start);
              setIsSidebarOpen(true);
            }}
          />
        </div>
      </div>
      {isSidebarOpen && (
        <EventSidebar
          selectedDate={selectedDate}
          selectedCalendarIds={selectedCalendarIds ?? []}
          onClose={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}
