-- R3 Features: Period Lock, Recurring Invoices, Collection, Bank Reconcile, Inventory, Fixed Assets

-- R3-08: Accounting Periods (for period lock)
CREATE TABLE IF NOT EXISTS "accounting_periods" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "period" varchar(7) NOT NULL UNIQUE,
  "status" varchar(10) NOT NULL DEFAULT 'open',
  "locked_by" uuid REFERENCES "users"("id"),
  "locked_at" timestamp,
  "unlocked_by" uuid REFERENCES "users"("id"),
  "unlock_reason" text,
  "unlocked_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- R3-02: Recurring Invoice Templates
CREATE TABLE IF NOT EXISTS "recurring_invoice_templates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "customer_id" uuid NOT NULL REFERENCES "customers"("id"),
  "name" varchar(200) NOT NULL,
  "frequency" varchar(20) NOT NULL,
  "custom_days" integer,
  "start_date" date NOT NULL,
  "end_date" date,
  "max_occurrences" integer,
  "next_run_date" date NOT NULL,
  "items" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "status" varchar(20) NOT NULL DEFAULT 'active',
  "created_by" uuid REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "recurring_invoice_runs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "template_id" uuid NOT NULL REFERENCES "recurring_invoice_templates"("id"),
  "invoice_id" uuid REFERENCES "invoices"("id"),
  "scheduled_date" date,
  "generated_at" timestamp,
  "status" varchar(20) NOT NULL DEFAULT 'pending',
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Update invoices table to add recurring fields if they don't exist
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "source" varchar(20) NOT NULL DEFAULT 'manual';
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "recurring_template_id" uuid REFERENCES "recurring_invoice_templates"("id");

-- R3-03: Collection Workflow (AR Follow-up)
CREATE TABLE IF NOT EXISTS "invoice_collection_notes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "invoice_id" uuid NOT NULL REFERENCES "invoices"("id"),
  "type" varchar(20) NOT NULL,
  "notes" text NOT NULL,
  "promised_pay_date" date,
  "promised_amount" numeric(15, 2),
  "created_by" uuid REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- R3-04: Bank Statement Import + Auto-match
CREATE TABLE IF NOT EXISTS "bank_statement_imports" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "bank_account_id" uuid NOT NULL REFERENCES "bank_accounts"("id"),
  "file_name" varchar(300),
  "period_from" date NOT NULL,
  "period_to" date NOT NULL,
  "total_lines" integer NOT NULL DEFAULT 0,
  "matched_lines" integer NOT NULL DEFAULT 0,
  "status" varchar(20) NOT NULL DEFAULT 'pending',
  "imported_by" uuid REFERENCES "users"("id"),
  "imported_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "bank_statement_lines" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "import_id" uuid NOT NULL REFERENCES "bank_statement_imports"("id") ON DELETE CASCADE,
  "tx_date" date NOT NULL,
  "description" varchar(500),
  "amount" numeric(15, 2) NOT NULL,
  "reference_no" varchar(200),
  "balance" numeric(15, 2),
  "match_status" varchar(20) NOT NULL DEFAULT 'unmatched',
  "matched_tx_id" uuid,
  "matched_tx_type" varchar(30),
  "confirmed_by" uuid REFERENCES "users"("id"),
  "confirmed_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- R3-05: Inventory / Stock Management
CREATE TABLE IF NOT EXISTS "products" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "sku" varchar(100) NOT NULL UNIQUE,
  "name" varchar(300) NOT NULL,
  "unit" varchar(40) NOT NULL DEFAULT 'pcs',
  "cost_price" numeric(15, 2) NOT NULL DEFAULT 0,
  "selling_price" numeric(15, 2) NOT NULL DEFAULT 0,
  "reorder_point" numeric(10, 2) NOT NULL DEFAULT 0,
  "cogs_account_id" uuid REFERENCES "chart_of_accounts"("id"),
  "inventory_account_id" uuid REFERENCES "chart_of_accounts"("id"),
  "revenue_account_id" uuid REFERENCES "chart_of_accounts"("id"),
  "track_inventory" boolean NOT NULL DEFAULT true,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "stock_movements" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "product_id" uuid NOT NULL REFERENCES "products"("id"),
  "movement_type" varchar(20) NOT NULL,
  "quantity" numeric(10, 4) NOT NULL,
  "unit_cost" numeric(15, 2) NOT NULL DEFAULT 0,
  "total_cost" numeric(15, 2) NOT NULL DEFAULT 0,
  "reference_type" varchar(40),
  "reference_id" uuid,
  "notes" text,
  "created_by" uuid REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Add product reference to invoice_items if needed
ALTER TABLE "invoice_items" ADD COLUMN IF NOT EXISTS "product_id" uuid REFERENCES "products"("id");

-- R3-06: Fixed Assets & Depreciation
CREATE TABLE IF NOT EXISTS "fixed_assets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "asset_no" varchar(40) NOT NULL UNIQUE,
  "name" varchar(300) NOT NULL,
  "category" varchar(100),
  "acquisition_date" date NOT NULL,
  "acquisition_cost" numeric(15, 2) NOT NULL,
  "salvage_value" numeric(15, 2) NOT NULL DEFAULT 0,
  "useful_life_months" integer NOT NULL,
  "depreciation_method" varchar(30) NOT NULL DEFAULT 'straight_line',
  "asset_account_id" uuid REFERENCES "chart_of_accounts"("id"),
  "accum_dep_account_id" uuid REFERENCES "chart_of_accounts"("id"),
  "dep_expense_account_id" uuid REFERENCES "chart_of_accounts"("id"),
  "status" varchar(30) NOT NULL DEFAULT 'active',
  "disposal_date" date,
  "disposal_proceeds" numeric(15, 2),
  "notes" text,
  "created_by" uuid REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "asset_depreciation_schedule" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "asset_id" uuid NOT NULL REFERENCES "fixed_assets"("id") ON DELETE CASCADE,
  "period_date" date NOT NULL,
  "dep_amount" numeric(15, 2) NOT NULL,
  "accum_dep" numeric(15, 2) NOT NULL,
  "nbv" numeric(15, 2) NOT NULL,
  "journal_id" uuid,
  "status" varchar(20) NOT NULL DEFAULT 'scheduled'
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS "accounting_periods_period_idx" ON "accounting_periods"("period");
CREATE INDEX IF NOT EXISTS "recurring_invoices_customer_idx" ON "recurring_invoice_templates"("customer_id");
CREATE INDEX IF NOT EXISTS "collection_notes_invoice_idx" ON "invoice_collection_notes"("invoice_id");
CREATE INDEX IF NOT EXISTS "bank_statements_account_idx" ON "bank_statement_imports"("bank_account_id");
CREATE INDEX IF NOT EXISTS "stock_movements_product_idx" ON "stock_movements"("product_id");
CREATE INDEX IF NOT EXISTS "fixed_assets_status_idx" ON "fixed_assets"("status");
CREATE INDEX IF NOT EXISTS "depreciation_schedule_asset_idx" ON "asset_depreciation_schedule"("asset_id");
