import { pgTable, uuid, text, timestamp, boolean, json } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Calendar providers
export const calendarProviders = pgTable("calendar_providers", {
  id: uuid("id").primaryKey().defaultRandom(), // UUID PK
  name: text("name").notNull(),
  accountId: text("account_id").notNull(),
  syncToken: text("sync_token"),
});

// User-visible calendars
export const calendars = pgTable("calendars", {
  id: uuid("id").primaryKey().defaultRandom(),
  providerId: uuid("provider_id").notNull(), // UUID reference to provider
  name: text("name").notNull(),
  color: text("color"),
  metadata: json("metadata"),
  syncToken: text("sync_token"),
});

export const calendarWatches = pgTable("calendar_watches", {
  id: uuid("id").primaryKey().defaultRandom(),
  calendarId: uuid("calendar_id").notNull().references(() => calendars.id),
  providerId: uuid("provider_id").notNull().references(() => calendarProviders.id),
  channelId: text("channel_id").notNull(),
  resourceId: text("resource_id").notNull(),
  expiration: timestamp("expiration"),
  createdAt: timestamp("created_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

// Main events table
export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  calendarId: uuid("calendar_id").notNull(),   // FK to calendar
  
  providerEventId: text("provider_event_id")
  .notNull()
  .unique(),
  
  title: text("title").notNull(),
  description: text("description"),
  location: text("location"),
  
  // Store real instants in time (always UTC!)
  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
  endTime: timestamp("end_time", { withTimezone: true }).notNull(),
  
  // If Google event was all-day (start.date, end.date)
  allDay: boolean("all_day").default(false),
  
  // Standard RRULE
  recurringRule: text("recurring_rule"),
  
  // Optional original timezone (for display)
  timeZone: text("time_zone"),
  
  // Preserve original Google payload
  rawData: json("raw_data"),
  
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
  .defaultNow()
  .$onUpdate(() => new Date()),
  });
  

// Attendees table
export const eventAttendees = pgTable("event_attendees", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id").notNull(), // UUID reference to event
  name: text("name"),
  email: text("email"),
  status: text("status"),
});

// ---- Relations ----

// Calendars belong to a provider
export const calendarRelations = relations(calendars, ({ one, many }) => ({
  provider: one(calendarProviders, {
    fields: [calendars.providerId],
    references: [calendarProviders.id],
  }),
  events: many(events),
}));

// Events belong to a calendar
export const eventRelations = relations(events, ({ one, many }) => ({
  calendar: one(calendars, {
    fields: [events.calendarId],
    references: [calendars.id],
  }),
  attendees: many(eventAttendees),
}));

// Event attendees belong to an event
export const attendeeRelations = relations(eventAttendees, ({ one }) => ({
  event: one(events, {
    fields: [eventAttendees.eventId],
    references: [events.id],
  }),
}));
