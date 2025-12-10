import { z } from "zod";

const AllDayEventSchema = z.object({
  allDay: z.literal(true),
  title: z.string().min(1, 'Event title is required'),
  description: z.string().optional(),
  location: z.string().optional(),
  calendarId: z.string().min(1, 'Please select a calendar'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  // EXPLICITLY NOT ALLOWED for all-day events:
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  timeZone: z.string().optional(),
});

const TimedEventSchema = z.object({
  allDay: z.literal(false),
  title: z.string().min(1, 'Event title is required'),
  description: z.string().optional(),
  location: z.string().optional(),
  calendarId: z.string().min(1, 'Please select a calendar'),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  timeZone: z.string().min(1, 'Timezone is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
});

export const eventFormSchema = z.discriminatedUnion('allDay', [
  AllDayEventSchema,
  TimedEventSchema,
]);

export type EventFormData = z.infer<typeof eventFormSchema>;

// Discriminated union for the event data sent to the API
export type EventData = 
  | {
      title: string;
      description?: string;
      location?: string;
      calendarId: string;
      allDay: true;
      start: {
        date: string;
        timeZone: string;
      };
      end: {
        date: string;
        timeZone: string;
      };
    }
  | {
      title: string;
      description?: string;
      location?: string;
      calendarId: string;
      allDay: false;
      start: {
        dateTime: string;
        timeZone: string;
      };
      end: {
        dateTime: string;
        timeZone: string;
      };
    };