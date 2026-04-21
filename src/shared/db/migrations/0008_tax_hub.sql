-- R2-3.3 Tax hub: master rates + WHT certificates
CREATE TABLE IF NOT EXISTS "tax_rates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "type" varchar(10) NOT NULL,
  "code" varchar(40) NOT NULL UNIQUE,
  "rate" numeric(5, 2) NOT NULL,
  "description" varchar(300) NOT NULL,
  "pnd_form" varchar(10),
  "income_type" varchar(200),
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "wht_certificates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "certificate_no" varchar(40) NOT NULL UNIQUE,
  "vendor_id" uuid REFERENCES "vendors"("id") ON DELETE SET NULL,
  "employee_id" uuid REFERENCES "employees"("id") ON DELETE SET NULL,
  "ap_bill_id" uuid REFERENCES "finance_ap_bills"("id") ON DELETE SET NULL,
  "pnd_form" varchar(10) NOT NULL,
  "income_type" varchar(200) NOT NULL,
  "base_amount" numeric(15, 2) NOT NULL,
  "wht_rate" numeric(5, 2) NOT NULL,
  "wht_amount" numeric(15, 2) NOT NULL,
  "issued_date" date NOT NULL,
  "source_module" varchar(20) NOT NULL DEFAULT 'ap',
  "created_by" uuid NOT NULL REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "wht_certificates_single_source_chk" CHECK (
    ("ap_bill_id" IS NOT NULL AND "employee_id" IS NULL)
    OR ("ap_bill_id" IS NULL AND "employee_id" IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS "wht_certificates_issued_pnd_idx"
  ON "wht_certificates" ("issued_date", "pnd_form");

INSERT INTO "tax_rates" ("type", "code", "rate", "description", "pnd_form", "income_type")
VALUES
  ('VAT', 'VAT7', 7.00, 'VAT 7%', NULL, NULL),
  ('WHT', 'WHT1', 1.00, 'WHT 1%', 'PND53', '40(2)'),
  ('WHT', 'WHT3_SERVICE', 3.00, 'WHT 3% (service)', 'PND53', '40(2)'),
  ('WHT', 'WHT5_RENTAL', 5.00, 'WHT 5% (rental)', 'PND3', '40(5)'),
  ('WHT', 'WHT15', 15.00, 'WHT 15%', 'PND53', '40(2)')
ON CONFLICT ("code") DO NOTHING;
