import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  getDay,
} from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from './button';

interface CalendarProps {
  selected?: Date;
  onSelect: (date: Date) => void;
  month?: Date;
  onMonthChange?: (date: Date) => void;
  className?: string;
}

export function Calendar({
  selected,
  onSelect,
  month = new Date(),
  onMonthChange,
  className,
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState(month);

  React.useEffect(() => {
    setCurrentMonth(month);
  }, [month]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get the first day of the month's weekday (0 = Sunday, 1 = Monday, etc.)
  const firstDayOfWeek = getDay(monthStart);
  // Adjust for Monday as first day (0 = Monday, 6 = Sunday)
  const adjustedFirstDay = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

  const previousMonth = () => {
    const newMonth = subMonths(currentMonth, 1);
    setCurrentMonth(newMonth);
    onMonthChange?.(newMonth);
  };

  const nextMonth = () => {
    const newMonth = addMonths(currentMonth, 1);
    setCurrentMonth(newMonth);
    onMonthChange?.(newMonth);
  };

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className={cn('p-3', className)}>
      <div className="flex items-center justify-between mb-4">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={previousMonth}
          className="h-7 w-7 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="font-medium text-sm">{format(currentMonth, 'MMMM yyyy')}</div>
        <Button type="button" variant="ghost" size="sm" onClick={nextMonth} className="h-7 w-7 p-0">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-muted-foreground text-xs font-medium text-center h-8 flex items-center justify-center"
          >
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {/* Empty cells for days before the first day of the month */}
        {Array.from({ length: adjustedFirstDay }).map((_, i) => (
          <div key={`empty-${i}`} className="h-8" />
        ))}
        {/* Days of the month */}
        {daysInMonth.map((day) => {
          const isSelected = selected && isSameDay(day, selected);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onSelect(day)}
              className={cn(
                'h-8 w-full rounded-md text-sm transition-colors',
                'hover:bg-accent hover:text-accent-foreground',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                isSelected &&
                  'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground',
                !isCurrentMonth && 'text-muted-foreground opacity-50',
              )}
            >
              {format(day, 'd')}
            </button>
          );
        })}
      </div>
    </div>
  );
}
