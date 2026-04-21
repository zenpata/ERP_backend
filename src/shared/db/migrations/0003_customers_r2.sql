-- R2-3.1 customer master fields (align with finance.schema customers)
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "contact_name" varchar(200);
--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "credit_term_days" integer DEFAULT 30 NOT NULL;
--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "notes" text;
--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;
