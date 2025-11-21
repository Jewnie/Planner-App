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

// Main events table
export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  calendarId: uuid("calendar_id").notNull(), // UUID reference to calendar
  providerEventId: text("provider_event_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  location: text("location"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  allDay: boolean("all_day").default(false),
  recurringRule: text("recurring_rule"),
  timeZone: text("time_zone"),
  rawData: json("raw_data"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date()),
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
