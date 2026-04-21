-- R2-3.11 Quotations + Sales orders + link invoices to SO

CREATE TABLE IF NOT EXISTS "quotations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "quot_no" varchar(30) NOT NULL UNIQUE,
  "customer_id" uuid NOT NULL REFERENCES "customers"("id"),
  "created_by" uuid NOT NULL REFERENCES "users"("id"),
  "issue_date" timestamp NOT NULL,
  "valid_until" timestamp NOT NULL,
  "status" varchar(20) NOT NULL DEFAULT 'draft',
  "subtotal_before_vat" numeric(15, 2) NOT NULL DEFAULT '0',
  "vat_amount" numeric(15, 2) NOT NULL DEFAULT '0',
  "total_amount" numeric(15, 2) NOT NULL DEFAULT '0',
  "notes" text,
  "terms_and_conditions" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "quotation_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "quotation_id" uuid NOT NULL REFERENCES "quotations"("id") ON DELETE CASCADE,
  "item_no" integer NOT NULL,
  "description" varchar(500) NOT NULL,
  "quantity" numeric(15, 4) NOT NULL,
  "unit_price" numeric(15, 2) NOT NULL,
  "line_total" numeric(15, 2) NOT NULL,
  "vat_rate" numeric(5, 2) NOT NULL DEFAULT '7'
);

CREATE TABLE IF NOT EXISTS "sales_orders" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "so_no" varchar(30) NOT NULL UNIQUE,
  "customer_id" uuid NOT NULL REFERENCES "customers"("id"),
  "quotation_id" uuid REFERENCES "quotations"("id"),
  "created_by" uuid NOT NULL REFERENCES "users"("id"),
  "order_date" timestamp NOT NULL,
  "delivery_date" timestamp,
  "status" varchar(24) NOT NULL DEFAULT 'draft',
  "subtotal_before_vat" numeric(15, 2) NOT NULL DEFAULT '0',
  "vat_amount" numeric(15, 2) NOT NULL DEFAULT '0',
  "total_amount" numeric(15, 2) NOT NULL DEFAULT '0',
  "notes" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "so_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "so_id" uuid NOT NULL REFERENCES "sales_orders"("id") ON DELETE CASCADE,
  "item_no" integer NOT NULL,
  "description" varchar(500) NOT NULL,
  "quantity" numeric(15, 4) NOT NULL,
  "unit_price" numeric(15, 2) NOT NULL,
  "line_total" numeric(15, 2) NOT NULL,
  "vat_rate" numeric(5, 2) NOT NULL DEFAULT '7',
  "invoiced_qty" numeric(15, 4) NOT NULL DEFAULT '0'
);

ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "sales_order_id" uuid REFERENCES "sales_orders"("id");
