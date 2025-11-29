CREATE TABLE "calendar_watches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"calendar_id" uuid NOT NULL,
	"provider_id" uuid NOT NULL,
	"channel_id" text NOT NULL,
	"resource_id" text NOT NULL,
	"expiration" timestamp,
	"created_at" timestamp DEFAULT now(),
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "calendar_watches" ADD CONSTRAINT "calendar_watches_calendar_id_calendars_id_fk" FOREIGN KEY ("calendar_id") REFERENCES "public"."calendars"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_watches" ADD CONSTRAINT "calendar_watches_provider_id_calendar_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."calendar_providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration" DROP COLUMN "channel_id";--> statement-breakpoint
ALTER TABLE "integration" DROP COLUMN "resource_id";--> statement-breakpoint
ALTER TABLE "integration" DROP COLUMN "expiration";