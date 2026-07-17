ALTER TYPE "public"."generation_statuses" ADD VALUE 'queued' BEFORE 'processing';--> statement-breakpoint
ALTER TABLE "generations" ALTER COLUMN "status" SET DEFAULT 'queued';