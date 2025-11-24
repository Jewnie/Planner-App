ALTER TABLE "events" ALTER COLUMN "start_time" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "events" ALTER COLUMN "end_time" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "events" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "events" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "events" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "events" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "calendar_providers" ADD COLUMN "sync_token" text;--> statement-breakpoint
ALTER TABLE "calendars" ADD COLUMN "sync_token" text;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_provider_event_id_unique" UNIQUE("provider_event_id");