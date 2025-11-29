ALTER TABLE "calendar_watches" DROP CONSTRAINT "calendar_watches_calendar_id_calendars_id_fk";
--> statement-breakpoint
ALTER TABLE "calendar_watches" DROP CONSTRAINT "calendar_watches_provider_id_calendar_providers_id_fk";
--> statement-breakpoint
ALTER TABLE "calendar_watches" ALTER COLUMN "calendar_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "calendar_watches" ALTER COLUMN "provider_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "integration" ALTER COLUMN "updated_at" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "integration" ALTER COLUMN "updated_at" DROP NOT NULL;