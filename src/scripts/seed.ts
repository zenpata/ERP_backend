/**
 * Idempotent schema ensure + RBAC seed for local/dev.
 * Run: bun run src/scripts/seed.ts
 * Requires DATABASE_URL and existing base tables from migration 0000.
 */
import 'dotenv/config'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import {
  apBills,
  customers,
  invoiceItems,
  invoices,
  vendors,
} from '../modules/finance/finance.schema'
import * as financeSchema from '../modules/finance/finance.schema'
import * as hrRelations from '../modules/hr/hr.relations'
import { PayrollService } from '../modules/hr/submodules/payroll/payroll.service'
import {
  employees,
  leaveTypes,
  permissions,
  rolePermissions,
  roles,
  userRoles,
  users,
} from '../modules/hr/hr.schema'
import * as hrSchema from '../modules/hr/hr.schema'
import * as pmSchema from '../modules/pm/pm.schema'
import { db as appDb } from '../shared/db/client'

const connectionString = process.env['DATABASE_URL']
if (!connectionString) {
  console.error('DATABASE_URL is required')
  process.exit(1)
}

const raw = postgres(connectionString, { max: 1 })
const db = drizzle(raw, {
  schema: { ...hrSchema, ...hrRelations, ...financeSchema, ...pmSchema },
})

async function ensureSchema() {
  await raw.unsafe(`
CREATE TABLE IF NOT EXISTS "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "employee_id" uuid,
  "email" varchar(200) NOT NULL UNIQUE,
  "password_hash" varchar(255) NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "last_login_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "roles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(50) NOT NULL UNIQUE,
  "description" text,
  "is_system" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "permissions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "module" varchar(20) NOT NULL,
  "resource" varchar(50) NOT NULL,
  "action" varchar(20) NOT NULL,
  "description" text,
  CONSTRAINT "permissions_module_resource_action_unique" UNIQUE("module","resource","action")
);
CREATE TABLE IF NOT EXISTS "role_permissions" (
  "role_id" uuid NOT NULL REFERENCES "roles"("id") ON DELETE CASCADE,
  "permission_id" uuid NOT NULL REFERENCES "permissions"("id") ON DELETE CASCADE,
  CONSTRAINT "role_permissions_pkey" PRIMARY KEY("role_id","permission_id")
);
CREATE TABLE IF NOT EXISTS "user_roles" (
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "role_id" uuid NOT NULL REFERENCES "roles"("id") ON DELETE CASCADE,
  "assigned_by" uuid REFERENCES "users"("id"),
  "assigned_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "user_roles_pkey" PRIMARY KEY("user_id","role_id")
);
CREATE TABLE IF NOT EXISTS "permission_audit_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "actor_user_id" uuid NOT NULL REFERENCES "users"("id"),
  "role_id" uuid NOT NULL REFERENCES "roles"("id") ON DELETE CASCADE,
  "permission_id" uuid NOT NULL REFERENCES "permissions"("id") ON DELETE CASCADE,
  "action" varchar(10) NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
`)

  const alters = [
    `ALTER TABLE "departments" ADD COLUMN IF NOT EXISTS "description" text`,
    `ALTER TABLE "departments" ADD COLUMN IF NOT EXISTS "parent_id" uuid`,
    `ALTER TABLE "positions" ADD COLUMN IF NOT EXISTS "level" integer DEFAULT 0 NOT NULL`,
    `ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "nickname" varchar(50)`,
    `ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "phone" varchar(20)`,
    `ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "email" varchar(200)`,
    `ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "avatar_url" varchar(500)`,
    `ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "address" text`,
    `ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "manager_id" uuid`,
    `ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "bank_name" varchar(100)`,
    `ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "bank_account_number" varchar(20)`,
    `ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "bank_account_name" varchar(200)`,
    `ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "ss_enrolled" boolean DEFAULT true NOT NULL`,
    `ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "user_id" uuid`,
  ]
  for (const q of alters) {
    await raw.unsafe(q)
  }

  const [leaveTypesRow] = await raw<{ exists: boolean }[]>`
    select exists(
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = 'leave_types'
    ) as exists
  `
  if (leaveTypesRow?.exists) {
    await raw.unsafe(`
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'leave_types' AND column_name = 'days_per_year'
  ) THEN
    ALTER TABLE "leave_types" RENAME COLUMN "days_per_year" TO "max_days_per_year";
  END IF;
END $$;
`)
    const leaveTypesAlters = [
      `ALTER TABLE "leave_types" ADD COLUMN IF NOT EXISTS "is_carry_over" boolean DEFAULT false NOT NULL`,
      `ALTER TABLE "leave_types" ADD COLUMN IF NOT EXISTS "carry_over_max_days" integer`,
      `ALTER TABLE "leave_types" ADD COLUMN IF NOT EXISTS "requires_document" boolean DEFAULT false NOT NULL`,
      `ALTER TABLE "leave_types" ADD COLUMN IF NOT EXISTS "document_required_after_days" integer`,
      `ALTER TABLE "leave_types" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL`,
    ]
    for (const q of leaveTypesAlters) {
      await raw.unsafe(q)
    }
  }

  await raw.unsafe(`
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_employee_id_employees_id_fk'
  ) THEN
    ALTER TABLE "users" ADD CONSTRAINT "users_employee_id_employees_id_fk"
      FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE SET NULL;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'employees_user_id_users_id_fk'
  ) THEN
    ALTER TABLE "employees" ADD CONSTRAINT "employees_user_id_users_id_fk"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
`)

  await raw.unsafe(`
CREATE TABLE IF NOT EXISTS "pm_budgets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "budget_code" varchar(30) NOT NULL UNIQUE,
  "project_name" varchar(200) NOT NULL,
  "total_amount" numeric(15, 2) NOT NULL,
  "budget_type" varchar(50) NOT NULL,
  "module_tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "owner_name" varchar(200) NOT NULL,
  "status" varchar(30) NOT NULL,
  "start_date" date NOT NULL,
  "end_date" date NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "pm_expenses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "expense_code" varchar(30) NOT NULL UNIQUE,
  "title" varchar(300) NOT NULL,
  "budget_id" uuid NOT NULL REFERENCES "pm_budgets"("id") ON DELETE RESTRICT,
  "amount" numeric(15, 2) NOT NULL,
  "expense_date" date NOT NULL,
  "category" varchar(100) NOT NULL,
  "payment_method" varchar(50) NOT NULL,
  "status" varchar(40) NOT NULL,
  "requested_by_employee_id" uuid,
  "approved_by_user_id" uuid,
  "note" text,
  "receipt_url" varchar(500),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "pm_progress_tasks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "task_code" varchar(30) NOT NULL UNIQUE,
  "title" varchar(300) NOT NULL,
  "module" varchar(50) NOT NULL,
  "phase" varchar(100) NOT NULL,
  "status" varchar(30) NOT NULL,
  "priority" varchar(20) NOT NULL,
  "progress_pct" integer DEFAULT 0 NOT NULL,
  "start_date" date NOT NULL,
  "target_date" date NOT NULL,
  "assignee_employee_id" uuid,
  "note" text,
  "actual_end_date" date,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
`)

  await raw.unsafe(`
UPDATE "employees" SET "employment_type" = 'monthly' WHERE "employment_type" = 'full_time';
`)

  await raw.unsafe(`
CREATE TABLE IF NOT EXISTS "customers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "code" varchar(20) NOT NULL UNIQUE,
  "name" varchar(200) NOT NULL,
  "tax_id" varchar(13),
  "address" text,
  "phone" varchar(20),
  "email" varchar(100),
  "credit_limit" numeric(15, 2) DEFAULT '0' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "vendors" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "code" varchar(20) NOT NULL UNIQUE,
  "name" varchar(200) NOT NULL,
  "tax_id" varchar(13),
  "address" text,
  "phone" varchar(20),
  "email" varchar(100),
  "contact_name" varchar(200),
  "bank_name" varchar(100),
  "bank_account_number" varchar(40),
  "bank_account_name" varchar(200),
  "payment_term_days" integer DEFAULT 30 NOT NULL,
  "notes" text,
  "is_active" boolean DEFAULT true NOT NULL,
  "deleted_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "invoices" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "invoice_number" varchar(20) NOT NULL UNIQUE,
  "customer_id" uuid NOT NULL REFERENCES "customers"("id"),
  "issue_date" timestamp NOT NULL,
  "due_date" timestamp NOT NULL,
  "subtotal" numeric(15, 2) NOT NULL,
  "vat_amount" numeric(15, 2) NOT NULL,
  "wht_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
  "total" numeric(15, 2) NOT NULL,
  "paid_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
  "status" varchar(20) DEFAULT 'draft' NOT NULL,
  "note" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "invoice_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "invoice_id" uuid NOT NULL REFERENCES "invoices"("id") ON DELETE CASCADE,
  "description" varchar(500) NOT NULL,
  "quantity" numeric(15, 4) NOT NULL,
  "unit_price" numeric(15, 2) NOT NULL,
  "wht_type" varchar(20),
  "wht_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
  "amount" numeric(15, 2) NOT NULL
);
CREATE TABLE IF NOT EXISTS "invoice_payments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "invoice_id" uuid NOT NULL REFERENCES "invoices"("id") ON DELETE CASCADE,
  "payment_date" timestamp NOT NULL,
  "amount" numeric(15, 2) NOT NULL,
  "payment_method" varchar(40) NOT NULL,
  "bank_account_id" varchar(64),
  "reference_no" varchar(100),
  "notes" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "finance_ap_bills" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "reference_number" varchar(40) NOT NULL UNIQUE,
  "vendor_invoice_number" varchar(80),
  "vendor_id" uuid NOT NULL REFERENCES "vendors"("id"),
  "issue_date" timestamp NOT NULL,
  "due_date" timestamp NOT NULL,
  "received_date" timestamp NOT NULL,
  "subtotal" numeric(15, 2) NOT NULL,
  "vat_amount" numeric(15, 2) NOT NULL,
  "wht_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
  "total_amount" numeric(15, 2) NOT NULL,
  "paid_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
  "expense_category" varchar(40),
  "attachment_url" varchar(500),
  "notes" text,
  "reject_reason" text,
  "approved_by" uuid,
  "approved_at" timestamp,
  "status" varchar(20) DEFAULT 'pending' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
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
CREATE TABLE IF NOT EXISTS "payroll_runs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "period_month" integer NOT NULL,
  "period_year" integer NOT NULL,
  "status" varchar(20) DEFAULT 'draft' NOT NULL,
  "total_gross" numeric(15, 2),
  "total_deductions" numeric(15, 2),
  "total_net" numeric(15, 2),
  "processed_at" timestamp,
  "approved_by" uuid REFERENCES "users"("id"),
  "approved_at" timestamp,
  "paid_at" timestamp,
  "created_by" uuid REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "payroll_runs_period_month_period_year_unique" UNIQUE("period_month","period_year")
);
CREATE TABLE IF NOT EXISTS "payslips" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "payroll_run_id" uuid NOT NULL REFERENCES "payroll_runs"("id"),
  "employee_id" uuid NOT NULL REFERENCES "employees"("id"),
  "working_days_in_month" integer NOT NULL,
  "actual_working_days" numeric(5, 1) NOT NULL,
  "absent_days" numeric(5, 1) DEFAULT '0' NOT NULL,
  "base_salary" numeric(15, 2) NOT NULL,
  "overtime_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
  "allowance_total" numeric(15, 2) DEFAULT '0' NOT NULL,
  "bonus_total" numeric(15, 2) DEFAULT '0' NOT NULL,
  "gross_salary" numeric(15, 2) NOT NULL,
  "ss_deduction" numeric(15, 2) DEFAULT '0' NOT NULL,
  "income_tax_deduction" numeric(15, 2) DEFAULT '0' NOT NULL,
  "other_deductions" numeric(15, 2) DEFAULT '0' NOT NULL,
  "net_salary" numeric(15, 2) NOT NULL,
  "tax_calculation_mode" varchar(10) DEFAULT 'auto' NOT NULL,
  "pdf_url" varchar(500),
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "payslips_payroll_run_id_employee_id_unique" UNIQUE("payroll_run_id","employee_id")
);
`)

  const financeAlters = [
    `ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "contact_name" varchar(200)`,
    `ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "bank_name" varchar(100)`,
    `ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "bank_account_number" varchar(40)`,
    `ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "bank_account_name" varchar(200)`,
    `ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "payment_term_days" integer DEFAULT 30 NOT NULL`,
    `ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "notes" text`,
    `ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL`,
    `ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp`,
    `ALTER TABLE "finance_ap_bills" ADD COLUMN IF NOT EXISTS "vendor_invoice_number" varchar(80)`,
    `ALTER TABLE "finance_ap_bills" ADD COLUMN IF NOT EXISTS "received_date" timestamp`,
    `ALTER TABLE "finance_ap_bills" ADD COLUMN IF NOT EXISTS "subtotal" numeric(15, 2)`,
    `ALTER TABLE "finance_ap_bills" ADD COLUMN IF NOT EXISTS "vat_amount" numeric(15, 2)`,
    `ALTER TABLE "finance_ap_bills" ADD COLUMN IF NOT EXISTS "wht_amount" numeric(15, 2) DEFAULT '0' NOT NULL`,
    `ALTER TABLE "finance_ap_bills" ADD COLUMN IF NOT EXISTS "expense_category" varchar(40)`,
    `ALTER TABLE "finance_ap_bills" ADD COLUMN IF NOT EXISTS "attachment_url" varchar(500)`,
    `ALTER TABLE "finance_ap_bills" ADD COLUMN IF NOT EXISTS "notes" text`,
    `ALTER TABLE "finance_ap_bills" ADD COLUMN IF NOT EXISTS "reject_reason" text`,
    `ALTER TABLE "finance_ap_bills" ADD COLUMN IF NOT EXISTS "approved_by" uuid`,
    `ALTER TABLE "finance_ap_bills" ADD COLUMN IF NOT EXISTS "approved_at" timestamp`,
  ]
  for (const q of financeAlters) {
    await raw.unsafe(q)
  }

  const customerAlters = [
    `ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "contact_name" varchar(200)`,
    `ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "credit_term_days" integer DEFAULT 30 NOT NULL`,
    `ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "notes" text`,
    `ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL`,
    `ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp`,
  ]
  for (const q of customerAlters) {
    await raw.unsafe(q)
  }

  await raw.unsafe(`
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
CREATE TABLE IF NOT EXISTS "work_schedules" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(100) NOT NULL,
  "start_time" time NOT NULL,
  "end_time" time NOT NULL,
  "break_duration_minutes" integer NOT NULL DEFAULT 60,
  "late_tolerance_minutes" integer NOT NULL DEFAULT 0,
  "clock_mode" varchar(20) NOT NULL DEFAULT 'self',
  "work_days" jsonb NOT NULL DEFAULT '[1,2,3,4,5]'::jsonb,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "employee_schedules" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "employee_id" uuid NOT NULL REFERENCES "employees"("id") ON DELETE CASCADE,
  "work_schedule_id" uuid NOT NULL REFERENCES "work_schedules"("id") ON DELETE RESTRICT,
  "effective_from" date NOT NULL,
  "effective_to" date
);
CREATE TABLE IF NOT EXISTS "attendance_records" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "employee_id" uuid NOT NULL REFERENCES "employees"("id") ON DELETE CASCADE,
  "date" date NOT NULL,
  "clock_in" timestamp,
  "clock_out" timestamp,
  "work_minutes" integer,
  "overtime_minutes" integer NOT NULL DEFAULT 0,
  "break_minutes" integer NOT NULL DEFAULT 0,
  "late_minutes" integer,
  "status" varchar(20) NOT NULL DEFAULT 'present',
  "clock_method" varchar(20),
  "is_manual_edit" boolean NOT NULL DEFAULT false,
  "edited_by" uuid REFERENCES "users"("id"),
  "note" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "attendance_records_employee_date_unique" UNIQUE ("employee_id", "date")
);
CREATE INDEX IF NOT EXISTS "attendance_records_employee_date_idx"
  ON "attendance_records" ("employee_id", "date");
CREATE TABLE IF NOT EXISTS "holidays" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "date" date NOT NULL UNIQUE,
  "name" varchar(100) NOT NULL,
  "type" varchar(20) NOT NULL DEFAULT 'national',
  "year" integer NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "overtime_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "employee_id" uuid NOT NULL REFERENCES "employees"("id") ON DELETE CASCADE,
  "date" date NOT NULL,
  "requested_hours" numeric(4, 2) NOT NULL,
  "reason" text,
  "status" varchar(20) NOT NULL DEFAULT 'pending',
  "approved_by" uuid REFERENCES "employees"("id"),
  "approved_at" timestamp,
  "rejected_at" timestamp,
  "rejection_reason" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "overtime_requests_employee_status_idx"
  ON "overtime_requests" ("employee_id", "status");
ALTER TABLE "attendance_records" ADD COLUMN IF NOT EXISTS "late_minutes" integer;
ALTER TABLE "overtime_requests" ADD COLUMN IF NOT EXISTS "rejected_at" timestamp;
ALTER TABLE "overtime_requests" ADD COLUMN IF NOT EXISTS "rejection_reason" text;
INSERT INTO "work_schedules" ("name", "start_time", "end_time", "break_duration_minutes", "late_tolerance_minutes", "clock_mode", "work_days", "is_active")
SELECT 'Office 9–18', '09:00:00', '18:00:00', 60, 10, 'self', '[1,2,3,4,5]'::jsonb, true
WHERE NOT EXISTS (SELECT 1 FROM "work_schedules" LIMIT 1);
`)

  await raw.unsafe(`
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
`)

  await raw.unsafe(`
UPDATE "finance_ap_bills" SET "subtotal" = "total_amount" WHERE "subtotal" IS NULL;
UPDATE "finance_ap_bills" SET "vat_amount" = 0 WHERE "vat_amount" IS NULL;
UPDATE "finance_ap_bills" SET "received_date" = "issue_date" WHERE "received_date" IS NULL;
`)
  await raw.unsafe(`
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
`)
}

const permDefs: { module: string; resource: string; action: string }[] = [
  { module: 'hr', resource: 'employee', action: 'view' },
  { module: 'hr', resource: 'employee', action: 'create' },
  { module: 'hr', resource: 'employee', action: 'edit' },
  { module: 'hr', resource: 'employee', action: 'delete' },
  { module: 'hr', resource: 'department', action: 'view' },
  { module: 'hr', resource: 'department', action: 'create' },
  { module: 'hr', resource: 'department', action: 'edit' },
  { module: 'hr', resource: 'department', action: 'delete' },
  { module: 'hr', resource: 'position', action: 'view' },
  { module: 'hr', resource: 'position', action: 'create' },
  { module: 'hr', resource: 'position', action: 'edit' },
  { module: 'hr', resource: 'position', action: 'delete' },
  { module: 'hr', resource: 'payroll', action: 'view' },
  { module: 'hr', resource: 'payroll', action: 'run' },
  { module: 'hr', resource: 'leave', action: 'view' },
  { module: 'hr', resource: 'leave', action: 'view_self' },
  { module: 'hr', resource: 'leave', action: 'create' },
  { module: 'hr', resource: 'leave', action: 'approve' },
  { module: 'hr', resource: 'attendance', action: 'view' },
  { module: 'hr', resource: 'attendance', action: 'manage' },
  { module: 'hr', resource: 'attendance', action: 'clock' },
  { module: 'hr', resource: 'overtime', action: 'view' },
  { module: 'hr', resource: 'overtime', action: 'create' },
  { module: 'hr', resource: 'overtime', action: 'approve' },
  { module: 'pm', resource: 'budget', action: 'view' },
  { module: 'pm', resource: 'budget', action: 'create' },
  { module: 'pm', resource: 'budget', action: 'edit' },
  { module: 'pm', resource: 'budget', action: 'delete' },
  { module: 'pm', resource: 'expense', action: 'view' },
  { module: 'pm', resource: 'expense', action: 'create' },
  { module: 'pm', resource: 'expense', action: 'edit' },
  { module: 'pm', resource: 'expense', action: 'approve' },
  { module: 'pm', resource: 'progress', action: 'view' },
  { module: 'pm', resource: 'progress', action: 'create' },
  { module: 'pm', resource: 'progress', action: 'edit' },
  { module: 'pm', resource: 'progress', action: 'delete' },
  { module: 'finance', resource: 'invoice', action: 'view' },
  { module: 'finance', resource: 'invoice', action: 'create' },
  { module: 'finance', resource: 'invoice', action: 'edit' },
  { module: 'finance', resource: 'invoice', action: 'payment' },
  { module: 'finance', resource: 'report', action: 'view' },
  { module: 'finance', resource: 'ap', action: 'view' },
  { module: 'finance', resource: 'ap', action: 'create' },
  { module: 'finance', resource: 'ap', action: 'edit' },
  { module: 'finance', resource: 'ap', action: 'approve' },
  { module: 'finance', resource: 'ap', action: 'payment' },
  { module: 'finance', resource: 'vendor', action: 'view' },
  { module: 'finance', resource: 'vendor', action: 'create' },
  { module: 'finance', resource: 'vendor', action: 'edit' },
  { module: 'finance', resource: 'vendor', action: 'activate' },
  { module: 'finance', resource: 'vendor', action: 'delete' },
  { module: 'finance', resource: 'customer', action: 'view' },
  { module: 'finance', resource: 'customer', action: 'create' },
  { module: 'finance', resource: 'customer', action: 'edit' },
  { module: 'finance', resource: 'customer', action: 'activate' },
  { module: 'finance', resource: 'customer', action: 'delete' },
  { module: 'finance', resource: 'account', action: 'view' },
  { module: 'finance', resource: 'account', action: 'create' },
  { module: 'finance', resource: 'account', action: 'edit' },
  { module: 'finance', resource: 'journal', action: 'view' },
  { module: 'finance', resource: 'journal', action: 'create' },
  { module: 'finance', resource: 'quotation', action: 'view' },
  { module: 'finance', resource: 'quotation', action: 'create' },
  { module: 'finance', resource: 'quotation', action: 'edit' },
  { module: 'finance', resource: 'quotation', action: 'convert' },
  { module: 'finance', resource: 'sales_order', action: 'view' },
  { module: 'finance', resource: 'sales_order', action: 'create' },
  { module: 'finance', resource: 'sales_order', action: 'edit' },
  { module: 'finance', resource: 'purchase_order', action: 'view' },
  { module: 'finance', resource: 'purchase_order', action: 'create' },
  { module: 'finance', resource: 'purchase_order', action: 'edit' },
  { module: 'finance', resource: 'purchase_order', action: 'approve' },
  { module: 'finance', resource: 'bank_account', action: 'view' },
  { module: 'finance', resource: 'bank_account', action: 'create' },
  { module: 'finance', resource: 'bank_account', action: 'edit' },
  { module: 'finance', resource: 'bank_account', action: 'activate' },
  { module: 'finance', resource: 'tax', action: 'view' },
  { module: 'finance', resource: 'tax', action: 'manage' },
  { module: 'pm', resource: 'dashboard', action: 'view' },
  { module: 'system', resource: 'user', action: 'view' },
  { module: 'system', resource: 'user', action: 'edit' },
  { module: 'system', resource: 'role', action: 'view' },
  { module: 'system', resource: 'role', action: 'create' },
  { module: 'system', resource: 'role', action: 'edit' },
  { module: 'system', resource: 'role', action: 'delete' },
  { module: 'system', resource: 'settings', action: 'view' },
  { module: 'system', resource: 'settings', action: 'manage' },
]

const roleDefs: { name: string; description: string; isSystem: boolean }[] = [
  { name: 'super_admin', description: 'Full system access', isSystem: true },
  { name: 'hr_admin', description: 'HR administration', isSystem: true },
  { name: 'hr_manager', description: 'HR manager', isSystem: true },
  { name: 'hr_staff', description: 'HR staff', isSystem: true },
  { name: 'pm_manager', description: 'PM manager', isSystem: true },
  { name: 'pm_staff', description: 'PM staff', isSystem: true },
  { name: 'finance_manager', description: 'Finance manager', isSystem: true },
  { name: 'finance_staff', description: 'Finance staff', isSystem: true },
  { name: 'employee', description: 'Employee', isSystem: true },
]

async function seedFinanceAndPayrollDemo() {
  const d = appDb
  const [cust] = await d
    .insert(customers)
    .values({
      code: 'C-SEED-001',
      name: 'บริษัท ตัวอย่าง จำกัด',
      creditLimit: '500000',
    })
    .onConflictDoNothing({ target: customers.code })
    .returning({ id: customers.id })

  let customerId = cust?.id
  if (!customerId) {
    const found = await d.select({ id: customers.id }).from(customers).where(eq(customers.code, 'C-SEED-001')).limit(1)
    customerId = found[0]?.id
  }
  if (!customerId) return

  const [vend] = await d
    .insert(vendors)
    .values({
      code: 'V-SEED-001',
      name: 'ผู้ขาย ตัวอย่าง',
    })
    .onConflictDoNothing({ target: vendors.code })
    .returning({ id: vendors.id })

  let vendorId = vend?.id
  if (!vendorId) {
    const vf = await d.select({ id: vendors.id }).from(vendors).where(eq(vendors.code, 'V-SEED-001')).limit(1)
    vendorId = vf[0]?.id
  }

  const invExists = await d.select({ id: invoices.id }).from(invoices).where(eq(invoices.invoiceNumber, 'INV-SEED-001')).limit(1)
  if (invExists.length === 0) {
    const [inv] = await d
      .insert(invoices)
      .values({
        invoiceNumber: 'INV-SEED-001',
        customerId,
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 86400000),
        subtotal: '10000',
        vatAmount: '700',
        whtAmount: '0',
        total: '10700',
        paidAmount: '0',
        status: 'issued',
        note: 'ใบแจ้งหนี้ตัวอย่าง',
      })
      .returning({ id: invoices.id })
    if (inv) {
      await d.insert(invoiceItems).values({
        invoiceId: inv.id,
        description: 'บริการ ERP',
        quantity: '1',
        unitPrice: '10000',
        whtAmount: '0',
        amount: '10000',
      })
    }
  }

  if (vendorId) {
    const apExists = await d
      .select({ id: apBills.id })
      .from(apBills)
      .where(eq(apBills.referenceNumber, 'AP-SEED-001'))
      .limit(1)
    if (apExists.length === 0) {
      const [apRow] = await d
        .insert(apBills)
        .values({
          referenceNumber: 'AP-SEED-001',
          vendorId,
          issueDate: new Date(),
          dueDate: new Date(Date.now() + 14 * 86400000),
          receivedDate: new Date(),
          subtotal: '5000',
          vatAmount: '0',
          whtAmount: '0',
          totalAmount: '5000',
          paidAmount: '0',
          status: 'pending',
        })
        .returning({ id: apBills.id })
      if (apRow) {
        await d.insert(financeSchema.apVendorInvoiceItems).values({
          apBillId: apRow.id,
          description: 'Sample line item',
          quantity: '1',
          unitPrice: '5000',
          amount: '5000',
        })
      }
    }
  }

  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()
  try {
    const run = await PayrollService.createRun(month, year)
    await PayrollService.processRun(run.id)
  } catch {
    // run เดือนนี้อาจมีอยู่แล้ว
  }
}

async function seedLeaveTypes() {
  await db
    .insert(leaveTypes)
    .values([
      { code: 'annual', name: 'Annual leave', maxDaysPerYear: '10' },
      { code: 'sick', name: 'Sick leave', maxDaysPerYear: '30' },
      { code: 'personal', name: 'Personal business', maxDaysPerYear: '3' },
    ])
    .onConflictDoNothing({ target: leaveTypes.code })
}

async function grantRolePermissions(
  roleIdByName: Record<string, string>,
  permByKey: Map<string, string>,
  roleName: string,
  keys: string[]
) {
  const rid = roleIdByName[roleName]
  if (!rid) return
  const rows = keys
    .map((key) => {
      const pid = permByKey.get(key)
      return pid ? { roleId: rid, permissionId: pid } : null
    })
    .filter((x): x is { roleId: string; permissionId: string } => x != null)
  if (rows.length === 0) return
  await db.insert(rolePermissions).values(rows).onConflictDoNothing()
}

async function seed() {
  await ensureSchema()

  const passwordHash = await Bun.password.hash('password123')

  for (const p of permDefs) {
    await db
      .insert(permissions)
      .values(p)
      .onConflictDoNothing({
        target: [permissions.module, permissions.resource, permissions.action],
      })
  }

  const allPerms = await db.select().from(permissions)
  const permByKey = new Map(allPerms.map((x) => [`${x.module}:${x.resource}:${x.action}`, x.id]))

  const roleIdByName: Record<string, string> = {}
  for (const r of roleDefs) {
    const [row] = await db
      .insert(roles)
      .values(r)
      .onConflictDoNothing({ target: roles.name })
      .returning({ id: roles.id })
    if (row) {
      roleIdByName[r.name] = row.id
    } else {
      const existing = await db.query.roles.findFirst({ where: eq(roles.name, r.name) })
      if (existing) roleIdByName[r.name] = existing.id
    }
  }

  const ALL_KEYS = permDefs.map((p) => `${p.module}:${p.resource}:${p.action}`)
  await grantRolePermissions(roleIdByName, permByKey, 'super_admin', ALL_KEYS)
  await grantRolePermissions(roleIdByName, permByKey, 'hr_admin', [
    'hr:employee:view',
    'hr:employee:create',
    'hr:employee:edit',
    'hr:employee:delete',
    'hr:department:view',
    'hr:department:edit',
    'hr:payroll:view',
    'hr:payroll:run',
    'hr:leave:view',
    'hr:leave:view_self',
    'hr:leave:create',
    'hr:leave:approve',
    'hr:attendance:view',
    'hr:attendance:manage',
    'hr:attendance:clock',
    'hr:overtime:view',
    'hr:overtime:create',
    'hr:overtime:approve',
  ])
  await grantRolePermissions(roleIdByName, permByKey, 'hr_manager', [
    'hr:employee:view',
    'hr:employee:create',
    'hr:employee:edit',
    'hr:department:view',
    'hr:payroll:view',
    'hr:payroll:run',
    'hr:leave:view',
    'hr:leave:view_self',
    'hr:leave:create',
    'hr:leave:approve',
    'hr:attendance:view',
    'hr:attendance:manage',
    'hr:attendance:clock',
    'hr:overtime:view',
    'hr:overtime:create',
    'hr:overtime:approve',
  ])
  await grantRolePermissions(roleIdByName, permByKey, 'hr_staff', [
    'hr:employee:view',
    'hr:department:view',
    'hr:payroll:view',
    'hr:leave:view',
    'hr:leave:create',
    'hr:attendance:view',
    'hr:attendance:clock',
    'hr:overtime:view',
  ])
  await grantRolePermissions(roleIdByName, permByKey, 'pm_manager', [
    'pm:dashboard:view',
    'pm:budget:view',
    'pm:budget:create',
    'pm:budget:edit',
    'pm:budget:delete',
    'pm:expense:view',
    'pm:expense:create',
    'pm:expense:edit',
    'pm:expense:approve',
    'pm:progress:view',
    'pm:progress:create',
    'pm:progress:edit',
    'pm:progress:delete',
  ])
  await grantRolePermissions(roleIdByName, permByKey, 'pm_staff', [
    'pm:dashboard:view',
    'pm:budget:view',
    'pm:expense:view',
    'pm:expense:create',
    'pm:progress:view',
    'pm:progress:create',
    'pm:progress:edit',
  ])
  const FINANCE_MANAGER_KEYS = [
    'finance:invoice:view',
    'finance:invoice:create',
    'finance:invoice:edit',
    'finance:invoice:payment',
    'finance:report:view',
    'finance:ap:view',
    'finance:ap:create',
    'finance:ap:edit',
    'finance:ap:approve',
    'finance:ap:payment',
    'finance:vendor:view',
    'finance:vendor:create',
    'finance:vendor:edit',
    'finance:vendor:activate',
    'finance:customer:view',
    'finance:customer:create',
    'finance:customer:edit',
    'finance:customer:activate',
    'finance:customer:delete',
    'finance:account:view',
    'finance:account:create',
    'finance:account:edit',
    'finance:journal:view',
    'finance:journal:create',
    'finance:quotation:view',
    'finance:quotation:create',
    'finance:quotation:edit',
    'finance:quotation:convert',
    'finance:sales_order:view',
    'finance:sales_order:create',
    'finance:sales_order:edit',
    'finance:purchase_order:view',
    'finance:purchase_order:create',
    'finance:purchase_order:edit',
    'finance:purchase_order:approve',
    'finance:bank_account:view',
    'finance:bank_account:create',
    'finance:bank_account:edit',
    'finance:bank_account:activate',
    'finance:tax:view',
    'finance:tax:manage',
    'finance:asset:view',
    'finance:asset:create',
    'finance:asset:edit',
  ]
  const FINANCE_STAFF_KEYS = [
    'finance:invoice:view',
    'finance:invoice:create',
    'finance:invoice:edit',
    'finance:invoice:payment',
    'finance:report:view',
    'finance:ap:view',
    'finance:ap:create',
    'finance:vendor:view',
    'finance:customer:view',
    'finance:account:view',
    'finance:journal:view',
    'finance:journal:create',
    'finance:quotation:view',
    'finance:quotation:create',
    'finance:quotation:edit',
    'finance:quotation:convert',
    'finance:sales_order:view',
    'finance:sales_order:create',
    'finance:sales_order:edit',
    'finance:purchase_order:view',
    'finance:purchase_order:create',
    'finance:purchase_order:edit',
    'finance:bank_account:view',
    'finance:bank_account:create',
    'finance:asset:view',
    'finance:bank_account:edit',
    'finance:tax:view',
  ]
  await grantRolePermissions(roleIdByName, permByKey, 'finance_manager', FINANCE_MANAGER_KEYS)
  await grantRolePermissions(roleIdByName, permByKey, 'finance_staff', FINANCE_STAFF_KEYS)
  await grantRolePermissions(roleIdByName, permByKey, 'employee', [
    'hr:leave:view_self',
    'hr:leave:create',
    'hr:attendance:clock',
    'hr:overtime:create',
  ])

  await seedLeaveTypes()

  const demoUsers: {
    email: string
    role: string
    employee?: { code: string; first: string; last: string; nid: string }
  }[] = [
    { email: 'admin@erp.com', role: 'super_admin' },
    {
      email: 'hr@erp.com',
      role: 'hr_admin',
      employee: { code: 'EMP-SEED-001', first: 'สมหญิง', last: 'รักดี', nid: '1101700405656' },
    },
    {
      email: 'pm@erp.com',
      role: 'pm_manager',
      employee: { code: 'EMP-SEED-002', first: 'สมชาย', last: 'ใจดี', nid: '2201700405653' },
    },
  ]

  for (const du of demoUsers) {
    let employeeId: string | null = null
    if (du.employee) {
      const existing = await db.query.employees.findFirst({
        where: eq(employees.nationalId, du.employee.nid),
      })
      if (existing) {
        employeeId = existing.id
      } else {
        const [emp] = await db
          .insert(employees)
          .values({
            code: du.employee.code,
            nationalId: du.employee.nid,
            firstnameTh: du.employee.first,
            lastnameTh: du.employee.last,
            gender: 'female',
            birthDate: '1990-01-15',
            employmentType: 'monthly',
            startDate: '2020-01-01',
            baseSalary: '50000.00',
          })
          .returning({ id: employees.id })
        employeeId = emp?.id ?? null
      }
    }

    const [u] = await db
      .insert(users)
      .values({
        email: du.email,
        passwordHash,
        employeeId,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: users.email,
        set: {
          passwordHash,
          employeeId,
          isActive: true,
          updatedAt: new Date(),
        },
      })
      .returning({ id: users.id })

    const userId = u?.id
    if (!userId) continue

    const rid = roleIdByName[du.role]
    if (rid) {
      await db.insert(userRoles).values({ userId, roleId: rid }).onConflictDoNothing()
    }
    if (employeeId) {
      await db.update(employees).set({ userId }).where(eq(employees.id, employeeId))
    }
  }

  const [adminSeed] = await db.select({ id: users.id }).from(users).where(eq(users.email, 'admin@erp.com')).limit(1)
  if (adminSeed?.id) {
    await raw`
      INSERT INTO "in_app_notifications" ("user_id", "title", "body")
      SELECT ${adminSeed.id}, 'Welcome', 'Notification inbox is ready.'
      WHERE NOT EXISTS (
        SELECT 1 FROM "in_app_notifications" n
        WHERE n."user_id" = ${adminSeed.id} AND n."title" = 'Welcome'
        LIMIT 1
      )
    `
  }

  await seedFinanceAndPayrollDemo()

  console.log('Seed complete. Demo logins (password: password123):')
  console.log('  admin@erp.com (super_admin)')
  console.log('  hr@erp.com (hr_admin)')
  console.log('  pm@erp.com (pm_manager)')
}

seed()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await raw.end()
  })
