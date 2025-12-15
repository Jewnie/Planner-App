import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';
import { user } from './auth-schema.js';
import { calendars } from './calendar-schema.js';

export const households = pgTable('households', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  createdBy: text('created_by')
    .notNull()
    .references(() => user.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

export const householdMembers = pgTable('household_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  householdId: uuid('household_id')
    .notNull()
    .references(() => households.id),
  userId: text('user_id')
    .notNull()
    .references(() => user.id),
  role: text('role').notNull().default('member').$type<'member' | 'admin' | 'owner'>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const householdInvitations = pgTable('household_invitations', {
  id: uuid('id').primaryKey().defaultRandom(),
  householdId: uuid('household_id')
    .notNull()
    .references(() => households.id),
  email: text('email').notNull(),
  token: text('token').notNull(),
  status: text('status').notNull().default('pending').$type<'pending' | 'accepted' | 'rejected'>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  createdBy: text('created_by')
    .notNull()
    .references(() => user.id),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const householdCalendars = pgTable('household_calendars', {
  id: uuid('id').primaryKey().defaultRandom(),
  householdId: uuid('household_id')
    .notNull()
    .references(() => households.id),
  calendarId: uuid('calendar_id')
    .notNull()
    .references(() => calendars.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
