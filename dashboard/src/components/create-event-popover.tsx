import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, addHours, addDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/ui/date-picker';
import { cn } from '@/lib/utils';
import { trpc } from '@/lib/trpc';
import type { EventFormData, EventData } from '@/types/eventForm';
import { eventFormSchema } from '@/types/eventForm';

export function CreateEventPopover(props: {
  open: boolean;
  onClose: () => void;
  selectedDate: Date;
}) {
  const { open, onClose } = props;
  const calendarsQuery = trpc.calendar.listCalendars.useQuery();
  const defaultStart = useMemo(() => props.selectedDate, [props.selectedDate]);
  const defaultEnd = useMemo(() => addHours(defaultStart, 1), [defaultStart]);
  const trpcUtils = trpc.useUtils();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
    setValue,
  } = useForm<EventFormData>({
    resolver: zodResolver(eventFormSchema),
    mode: 'onChange',
    defaultValues: {
      allDay: true,
      title: '',
      description: '',
      location: '',
      calendarId: calendarsQuery.data?.[0]?.id || '',
      startDate: format(defaultStart, 'yyyy-MM-dd'),
      startTime: '',
      endDate: format(defaultEnd, 'yyyy-MM-dd'),
      endTime: '',
      timeZone: '',
    },
  });
  const allDay = watch('allDay');
  const currentStartDate = watch('startDate');

  // Initialize form with date when dialog opens
  useEffect(() => {
    if (open) {
      reset({
        allDay: true,
        title: '',
        description: '',
        location: '',
        calendarId: calendarsQuery.data?.[0]?.id || '',
        startDate: format(defaultStart, 'yyyy-MM-dd'),
        startTime: '',
        endDate: format(defaultEnd, 'yyyy-MM-dd'),
        endTime: '',
        timeZone: '',
      });
    }
  }, [open, defaultStart, defaultEnd, calendarsQuery.data, reset]);

  // Handle all-day toggle: clear times when enabled, restore defaults when disabled
  useEffect(() => {
    if (!currentStartDate) return;

    if (allDay) {
      // When enabling all-day: set end date to start date and clear times
      setValue('endDate', currentStartDate);
      setValue('startTime', '');
      setValue('endTime', '');
      setValue('timeZone', '');
    } else {
      // When disabling all-day: restore default times if they're undefined
      const currentStartTime = watch('startTime');
      const currentEndTime = watch('endTime');

      if (!currentStartTime || !currentEndTime) {
        // Use current time for default start time, next hour for end time
        const now = new Date();
        const defaultStartTime = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          now.getHours(),
          0,
          0,
        );
        const defaultEndTime = addHours(defaultStartTime, 1);

        if (!currentStartTime) {
          setValue('startTime', format(defaultStartTime, 'HH:mm'));
        }
        if (!currentEndTime) {
          setValue('endTime', format(defaultEndTime, 'HH:mm'));
        }
        // Set timezone if not already set
        const currentTimeZone = watch('timeZone');
        if (!currentTimeZone) {
          setValue('timeZone', Intl.DateTimeFormat().resolvedOptions().timeZone);
        }
      }
    }
  }, [allDay, currentStartDate, watch, setValue]);

  const createAllDayEventMutation = trpc.calendar.createAllDayEvent.useMutation({
    onSettled: () => {
      trpcUtils.calendar.listEvents.invalidate();
    },
  });
  const createTimedEventMutation = trpc.calendar.createTimedEvent.useMutation({
    onSettled: () => {
      trpcUtils.calendar.listEvents.invalidate();
    },
  });

  const onSubmit = handleSubmit(async (data: EventFormData) => {
    console.log(data);
    try {
      const timeZone =
        data.allDay === false ? data.timeZone : Intl.DateTimeFormat().resolvedOptions().timeZone;

      let eventData: EventData;

      if (data.allDay) {
        // All-day events use "date" field (YYYY-MM-DD format)
        eventData = {
          title: data.title,
          description: data.description || undefined,
          location: data.location || undefined,
          calendarId: data.calendarId,
          allDay: true,
          start: {
            date: data.startDate, // Already in YYYY-MM-DD format
            timeZone: timeZone,
          },
          end: {
            date: format(addDays(new Date(data.endDate), 1), 'yyyy-MM-dd'),
            timeZone: timeZone,
          },
        };
        createAllDayEventMutation.mutate(eventData);
      } else {
        // Timed events use "dateTime" field (ISO 8601 format with timezone offset)
        // Create Date objects in the specified timezone
        const startDateTime = new Date(`${data.startDate}T${data.startTime}`);
        const endDateTime = new Date(`${data.endDate}T${data.endTime}`);

        // Format as ISO 8601 with timezone offset
        // Format: YYYY-MM-DDTHH:mm:ss±HH:mm
        const formatDateTime = (date: Date) => {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const hours = String(date.getHours()).padStart(2, '0');
          const minutes = String(date.getMinutes()).padStart(2, '0');
          const seconds = String(date.getSeconds()).padStart(2, '0');

          // Get timezone offset in format ±HH:mm
          // getTimezoneOffset() returns offset in minutes, positive for behind UTC, negative for ahead
          const offsetMinutes = -date.getTimezoneOffset(); // Invert to get correct sign
          const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60);
          const offsetMins = Math.abs(offsetMinutes) % 60;
          const offsetSign = offsetMinutes >= 0 ? '+' : '-';
          const offset = `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMins).padStart(2, '0')}`;

          return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${offset}`;
        };

        eventData = {
          title: data.title,
          description: data.description || undefined,
          location: data.location || undefined,
          calendarId: data.calendarId,
          allDay: false,
          start: {
            dateTime: formatDateTime(startDateTime),
            timeZone: timeZone,
          },
          end: {
            dateTime: formatDateTime(endDateTime),
            timeZone: timeZone,
          },
        };
        createTimedEventMutation.mutate(eventData);
      }

      onClose();
      reset();
    } catch (error) {
      console.error('Failed to create event:', error);
    }
  });

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Create new event</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Title */}
            <div className="grid gap-2">
              <Label htmlFor="title">
                Event Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                {...register('title')}
                placeholder="Enter event title"
                aria-invalid={errors.title ? 'true' : 'false'}
              />
              {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
            </div>

            {/* Description */}
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Add event description"
                rows={3}
              />
            </div>

            {/* Location */}
            <div className="grid gap-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" {...register('location')} placeholder="Enter location" />
            </div>

            {/* Calendar Selection */}
            <div className="grid gap-2">
              <Label htmlFor="calendarId">
                Calendar <span className="text-destructive">*</span>
              </Label>
              <select
                id="calendarId"
                {...register('calendarId')}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                aria-invalid={errors.calendarId ? 'true' : 'false'}
              >
                <option value="">Select a calendar</option>
                {calendarsQuery.data?.map((calendar) => (
                  <option key={calendar.id} value={calendar.id}>
                    {calendar.name}
                  </option>
                ))}
              </select>
              {errors.calendarId && (
                <p className="text-sm text-destructive">{errors.calendarId.message}</p>
              )}
            </div>

            {/* All Day Toggle */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="allDay"
                checked={allDay}
                onCheckedChange={(checked) => {
                  setValue('allDay', checked === true);
                }}
              />
              <Label htmlFor="allDay" className="cursor-pointer">
                All-day event
              </Label>
            </div>

            {/* Start Date/Time */}
            <div className="grid gap-2">
              <Label htmlFor="startDate">
                Start <span className="text-destructive">*</span>
              </Label>
              <div className="flex gap-2">
                <DatePicker
                  value={watch('startDate')}
                  onChange={(date) => setValue('startDate', date)}
                  placeholder="Select start date"
                  className={cn('flex-1 z-50', errors.startDate && 'border-destructive')}
                />
                {!allDay && (
                  <Input
                    id="startTime"
                    type="time"
                    {...register('startTime')}
                    className="flex-1"
                    aria-invalid={errors.startTime ? 'true' : 'false'}
                  />
                )}
              </div>
              {errors.startDate && (
                <p className="text-sm text-destructive">{errors.startDate.message}</p>
              )}
            </div>

            {/* End Date/Time */}
            <div className="grid gap-2">
              <Label htmlFor="endDate">
                End <span className="text-destructive">*</span>
              </Label>
              <div className="flex gap-2">
                <DatePicker
                  value={watch('endDate')}
                  onChange={(date) => setValue('endDate', date)}
                  placeholder="Select end date"
                  className={cn('flex-1 z-50', errors.endDate && 'border-destructive')}
                />
                {!allDay && (
                  <Input
                    id="endTime"
                    type="time"
                    {...register('endTime')}
                    className="flex-1"
                    aria-invalid={errors.endTime ? 'true' : 'false'}
                  />
                )}
              </div>
              {errors.endTime && (
                <p className="text-sm text-destructive">{errors.endTime.message}</p>
              )}
            </div>

            {/* Timezone (optional, hidden for all-day events) */}
            {!allDay && (
              <div className="grid gap-2">
                <Label htmlFor="timeZone">Timezone</Label>
                <Input
                  id="timeZone"
                  {...register('timeZone')}
                  placeholder="Auto-detect"
                  defaultValue={Intl.DateTimeFormat().resolvedOptions().timeZone}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Event'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
