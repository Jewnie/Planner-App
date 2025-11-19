import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import MonthCalendar, { type CalendarView } from '@/components/month-calendar';
import DayCalendar from '@/components/day-calendar';
import { startOfMonth, format, subMonths, addMonths, subDays, addDays } from 'date-fns';
import { EventSidebar } from '@/components/ui/event-sidebar';
import { Button } from '@/components/ui/button';

export default function CalendarPage() {
  const [searchParams] = useSearchParams();
  const viewParam = searchParams.get('view') || 'month';
  const view = (['month', 'week', 'day'].includes(viewParam) ? viewParam : 'month') as CalendarView;

  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const monthLabel = useMemo(() => {
    if (view === 'day') {
      return format(selectedDate, 'MMMM d, yyyy');
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
        <div className="flex w-full min-w-0 items-center justify-between space-x-2 shrink-0 p-4 border-b">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handlePrev} aria-label="Previous month">
              ‹
            </Button>
            <h2 className="text-lg w-36 text-center font-medium">{monthLabel}</h2>
            <Button variant="ghost" size="sm" onClick={handleNext} aria-label="Next month">
              ›
            </Button>
          </div>
        </div>
        <div className="flex-1 min-h-0 min-w-0 w-full overflow-hidden">
          {view === 'day' ? (
            <DayCalendar
              selectedDate={selectedDate}
              onSelect={(selection) => {
                setSelectedDate(selection.start);
                setIsSidebarOpen(true);
              }}
            />
          ) : (
            <MonthCalendar
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
          )}
        </div>
      </div>
      {isSidebarOpen && (
        <EventSidebar selectedDate={selectedDate} onClose={() => setIsSidebarOpen(false)} />
      )}
    </div>
  );
}
