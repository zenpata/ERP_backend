-- R2-3.7 Time & attendance (aligns with hr.schema Drizzle models)
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

INSERT INTO "work_schedules" ("name", "start_time", "end_time", "break_duration_minutes", "late_tolerance_minutes", "clock_mode", "work_days", "is_active")
SELECT 'Office 9–18', '09:00:00', '18:00:00', 60, 10, 'self', '[1,2,3,4,5]'::jsonb, true
WHERE NOT EXISTS (SELECT 1 FROM "work_schedules" LIMIT 1);
