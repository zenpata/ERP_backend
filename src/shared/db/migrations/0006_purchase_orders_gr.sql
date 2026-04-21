-- R2-3.6 Purchase orders, goods receipts, AP link

CREATE TABLE IF NOT EXISTS "purchase_orders" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "po_no" varchar(30) NOT NULL UNIQUE,
  "vendor_id" uuid NOT NULL REFERENCES "vendors"("id"),
  "requested_by" uuid NOT NULL REFERENCES "users"("id"),
  "approved_by" uuid REFERENCES "users"("id"),
  "approved_at" timestamp,
  "issue_date" timestamp NOT NULL,
  "expected_delivery_date" timestamp,
  "department_id" uuid REFERENCES "departments"("id"),
  "project_budget_id" uuid REFERENCES "pm_budgets"("id"),
  "status" varchar(30) NOT NULL DEFAULT 'draft',
  "subtotal" numeric(15, 2) NOT NULL DEFAULT '0',
  "vat_amount" numeric(15, 2) NOT NULL DEFAULT '0',
  "total_amount" numeric(15, 2) NOT NULL DEFAULT '0',
  "notes" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "po_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "po_id" uuid NOT NULL REFERENCES "purchase_orders"("id") ON DELETE CASCADE,
  "item_no" integer NOT NULL,
  "description" varchar(500) NOT NULL,
  "quantity" numeric(15, 4) NOT NULL,
  "unit" varchar(40),
  "unit_price" numeric(15, 2) NOT NULL,
  "line_total" numeric(15, 2) NOT NULL,
  "received_qty" numeric(15, 4) NOT NULL DEFAULT '0'
);

CREATE TABLE IF NOT EXISTS "goods_receipts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "gr_no" varchar(30) NOT NULL UNIQUE,
  "po_id" uuid NOT NULL REFERENCES "purchase_orders"("id"),
  "received_date" timestamp NOT NULL,
  "received_by" uuid NOT NULL REFERENCES "users"("id"),
  "notes" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "gr_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "gr_id" uuid NOT NULL REFERENCES "goods_receipts"("id") ON DELETE CASCADE,
  "po_item_id" uuid NOT NULL REFERENCES "po_items"("id"),
  "received_qty" numeric(15, 4) NOT NULL,
  "notes" varchar(500)
);

ALTER TABLE "finance_ap_bills" ADD COLUMN IF NOT EXISTS "po_id" uuid REFERENCES "purchase_orders"("id");
