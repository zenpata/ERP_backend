-- R2-3.5 — Bank accounts + ledger movements (B7)
CREATE TABLE IF NOT EXISTS "bank_accounts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "code" varchar(20) NOT NULL UNIQUE,
  "account_name" varchar(200) NOT NULL,
  "account_no" varchar(40) NOT NULL,
  "bank_name" varchar(100) NOT NULL,
  "branch_name" varchar(200),
  "account_type" varchar(20) NOT NULL DEFAULT 'current',
  "currency" varchar(10) NOT NULL DEFAULT 'THB',
  "opening_balance" numeric(15, 2) NOT NULL DEFAULT '0',
  "current_balance" numeric(15, 2) NOT NULL DEFAULT '0',
  "gl_account_id" uuid REFERENCES "chart_of_accounts"("id"),
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "bank_account_transactions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "bank_account_id" uuid NOT NULL REFERENCES "bank_accounts"("id") ON DELETE CASCADE,
  "transaction_date" date NOT NULL,
  "description" varchar(500) NOT NULL,
  "type" varchar(20) NOT NULL,
  "amount" numeric(15, 2) NOT NULL,
  "reference_type" varchar(40),
  "reference_id" uuid,
  "source_module" varchar(20) NOT NULL DEFAULT 'manual',
  "reconciled" boolean NOT NULL DEFAULT false,
  "reconciled_at" timestamp,
  "reconciled_by" uuid REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "bank_account_transactions_bank_date_idx"
  ON "bank_account_transactions" ("bank_account_id", "transaction_date", "created_at");
