-- Vendor master + AP vendor invoice expansion
ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;
ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "contact_name" varchar(200);
ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "bank_name" varchar(100);
ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "bank_account_number" varchar(40);
ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "bank_account_name" varchar(200);
ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "payment_term_days" integer DEFAULT 30 NOT NULL;
ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;

ALTER TABLE "finance_ap_bills" ADD COLUMN IF NOT EXISTS "vendor_invoice_number" varchar(80);
ALTER TABLE "finance_ap_bills" ADD COLUMN IF NOT EXISTS "received_date" timestamp;
ALTER TABLE "finance_ap_bills" ADD COLUMN IF NOT EXISTS "subtotal" numeric(15, 2);
ALTER TABLE "finance_ap_bills" ADD COLUMN IF NOT EXISTS "vat_amount" numeric(15, 2);
ALTER TABLE "finance_ap_bills" ADD COLUMN IF NOT EXISTS "wht_amount" numeric(15, 2) DEFAULT '0' NOT NULL;
ALTER TABLE "finance_ap_bills" ADD COLUMN IF NOT EXISTS "expense_category" varchar(40);
ALTER TABLE "finance_ap_bills" ADD COLUMN IF NOT EXISTS "attachment_url" varchar(500);
ALTER TABLE "finance_ap_bills" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "finance_ap_bills" ADD COLUMN IF NOT EXISTS "reject_reason" text;
ALTER TABLE "finance_ap_bills" ADD COLUMN IF NOT EXISTS "approved_by" uuid;
ALTER TABLE "finance_ap_bills" ADD COLUMN IF NOT EXISTS "approved_at" timestamp;

UPDATE "finance_ap_bills" SET "subtotal" = "total_amount" WHERE "subtotal" IS NULL;
UPDATE "finance_ap_bills" SET "vat_amount" = 0 WHERE "vat_amount" IS NULL;
UPDATE "finance_ap_bills" SET "wht_amount" = 0 WHERE "wht_amount" IS NULL;
UPDATE "finance_ap_bills" SET "received_date" = "issue_date" WHERE "received_date" IS NULL;

ALTER TABLE "finance_ap_bills" ALTER COLUMN "subtotal" SET NOT NULL;
ALTER TABLE "finance_ap_bills" ALTER COLUMN "vat_amount" SET NOT NULL;
ALTER TABLE "finance_ap_bills" ALTER COLUMN "received_date" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "finance_ap_bills_vendor_invoice_number_unique"
  ON "finance_ap_bills" ("vendor_invoice_number")
  WHERE "vendor_invoice_number" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "finance_ap_vendor_invoice_items" (
 "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "ap_bill_id" uuid NOT NULL REFERENCES "finance_ap_bills"("id") ON DELETE CASCADE,
  "description" varchar(500) NOT NULL,
  "quantity" numeric(15, 4) NOT NULL,
  "unit_price" numeric(15, 2) NOT NULL,
  "amount" numeric(15, 2) NOT NULL,
  "wht_type" varchar(20),
  "wht_rate" numeric(5, 2)
);

CREATE TABLE IF NOT EXISTS "finance_ap_vendor_invoice_payments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "ap_bill_id" uuid NOT NULL REFERENCES "finance_ap_bills"("id") ON DELETE CASCADE,
  "payment_date" date NOT NULL,
  "amount" numeric(15, 2) NOT NULL,
  "payment_method" varchar(20) NOT NULL,
  "reference" varchar(100),
  "notes" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

INSERT INTO "finance_ap_vendor_invoice_items" ("ap_bill_id", "description", "quantity", "unit_price", "amount")
SELECT b."id", 'Legacy bill', '1', b."subtotal", b."subtotal"
FROM "finance_ap_bills" b
WHERE NOT EXISTS (
  SELECT 1 FROM "finance_ap_vendor_invoice_items" i WHERE i."ap_bill_id" = b."id"
);
