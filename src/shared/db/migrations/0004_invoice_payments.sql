CREATE TABLE IF NOT EXISTS "invoice_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL REFERENCES "public"."invoices"("id") ON DELETE CASCADE,
	"payment_date" timestamp NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"payment_method" varchar(40) NOT NULL,
	"bank_account_id" varchar(64),
	"reference_no" varchar(100),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
