-- Align leave_types with hr.schema.ts (was days_per_year in 0000_huge_sage)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'leave_types'
      AND column_name = 'days_per_year'
  ) THEN
    ALTER TABLE "leave_types" RENAME COLUMN "days_per_year" TO "max_days_per_year";
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "leave_types" ADD COLUMN IF NOT EXISTS "is_carry_over" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "leave_types" ADD COLUMN IF NOT EXISTS "carry_over_max_days" integer;
--> statement-breakpoint
ALTER TABLE "leave_types" ADD COLUMN IF NOT EXISTS "requires_document" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "leave_types" ADD COLUMN IF NOT EXISTS "document_required_after_days" integer;
--> statement-breakpoint
ALTER TABLE "leave_types" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;
