ALTER TABLE "integration" ADD COLUMN "channel_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "integration" ADD COLUMN "resource_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "integration" ADD COLUMN "expiration" timestamp NOT NULL;