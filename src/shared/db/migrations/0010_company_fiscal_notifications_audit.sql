-- B10: company / fiscal / in-app notifications / notification configs / audit logs

CREATE TABLE IF NOT EXISTS "company_settings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_name" varchar(200) NOT NULL DEFAULT '',
  "company_name_en" varchar(200),
  "tax_id" varchar(20),
  "logo_url" text,
  "currency" varchar(10) NOT NULL DEFAULT 'THB',
  "default_vat_rate" numeric(5, 2) NOT NULL DEFAULT 7,
  "invoice_prefix" varchar(20) DEFAULT 'INV',
  "address" text,
  "phone" varchar(50),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

INSERT INTO "company_settings" ("company_name")
SELECT 'บริษัท ตัวอย่าง จำกัด'
WHERE NOT EXISTS (SELECT 1 FROM "company_settings" LIMIT 1);

CREATE TABLE IF NOT EXISTS "fiscal_periods" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "year" integer NOT NULL,
  "month" integer NOT NULL,
  "start_date" date NOT NULL,
  "end_date" date NOT NULL,
  "status" varchar(20) NOT NULL DEFAULT 'open',
  "closed_at" timestamp,
  "closed_by" uuid REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "fiscal_periods_month_chk" CHECK ("month" >= 1 AND "month" <= 12),
  CONSTRAINT "fiscal_periods_status_chk" CHECK ("status" IN ('open', 'closed')),
  CONSTRAINT "fiscal_periods_year_month_unique" UNIQUE ("year", "month")
);

CREATE TABLE IF NOT EXISTS "in_app_notifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "title" varchar(255) NOT NULL,
  "body" text,
  "read_at" timestamp,
  "entity_type" varchar(100),
  "entity_id" uuid,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "in_app_notifications_user_created_idx"
  ON "in_app_notifications" ("user_id", "created_at" DESC);

CREATE TABLE IF NOT EXISTS "notification_configs" (
  "key" varchar(100) PRIMARY KEY NOT NULL,
  "value" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "occurred_at" timestamp DEFAULT now() NOT NULL,
  "actor_user_id" uuid REFERENCES "users"("id"),
  "entity_type" varchar(100) NOT NULL,
  "entity_id" uuid,
  "action" varchar(100) NOT NULL,
  "metadata" jsonb
);

CREATE INDEX IF NOT EXISTS "audit_logs_entity_idx"
  ON "audit_logs" ("entity_type", "entity_id");
CREATE INDEX IF NOT EXISTS "audit_logs_occurred_idx"
  ON "audit_logs" ("occurred_at" DESC);
