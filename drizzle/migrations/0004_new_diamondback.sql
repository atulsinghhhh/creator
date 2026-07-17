CREATE TABLE "provider_calls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"generationId" uuid,
	"step" "job_steps" NOT NULL,
	"provider" text NOT NULL,
	"model" text,
	"promptTokens" integer,
	"completionTokens" integer,
	"costUsd" numeric(10, 6) DEFAULT '0' NOT NULL,
	"latencyMs" integer NOT NULL,
	"success" boolean NOT NULL,
	"error" text,
	"attempt" integer DEFAULT 1 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "provider_calls" ADD CONSTRAINT "provider_calls_generationId_generations_id_fk" FOREIGN KEY ("generationId") REFERENCES "public"."generations"("id") ON DELETE cascade ON UPDATE no action;