-- 0013_schema_drift_fix.sql
-- Sync DB columns with finance.schema.ts / pm.schema.ts that drifted out
-- of sync (R3-01 journal posting state machine, recurring invoice soft-delete,
-- pm_expenses GL account links).

-- journal_entries: R3-01 posting workflow fields
ALTER TABLE "journal_entries" ADD COLUMN IF NOT EXISTS "status" varchar(20) NOT NULL DEFAULT 'draft';
ALTER TABLE "journal_entries" ADD COLUMN IF NOT EXISTS "source" varchar(30) NOT NULL DEFAULT 'manual';
ALTER TABLE "journal_entries" ADD COLUMN IF NOT EXISTS "reference_no" varchar(100);
ALTER TABLE "journal_entries" ADD COLUMN IF NOT EXISTS "reversed_by_id" uuid;
ALTER TABLE "journal_entries" ADD COLUMN IF NOT EXISTS "posted_at" timestamp;
ALTER TABLE "journal_entries" ADD COLUMN IF NOT EXISTS "posted_by" uuid REFERENCES "users"("id");
ALTER TABLE "journal_entries" ADD COLUMN IF NOT EXISTS "created_by" uuid REFERENCES "users"("id");

-- pm_expenses: GL account links
ALTER TABLE "pm_expenses" ADD COLUMN IF NOT EXISTS "expense_account_id" uuid;
ALTER TABLE "pm_expenses" ADD COLUMN IF NOT EXISTS "accrued_expense_account_id" uuid;

-- recurring_invoice_templates: soft delete + notes (used by service)
ALTER TABLE "recurring_invoice_templates" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;
ALTER TABLE "recurring_invoice_templates" ADD COLUMN IF NOT EXISTS "notes" text;

-- journal_lines: optional project budget link for budget-vs-actual reports
ALTER TABLE "journal_lines" ADD COLUMN IF NOT EXISTS "project_budget_id" uuid;
