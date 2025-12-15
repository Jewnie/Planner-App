ALTER TABLE "events" ADD COLUMN "status" text DEFAULT 'confirmed';--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "recurring_event_id" text;