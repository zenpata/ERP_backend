# Implementation changelog (resume)

ลิงก์แผนลำดับงาน: [Documents/Phase0_Implementation_Order.md](Documents/Phase0_Implementation_Order.md)  
Backlog review: [Documents/Implementation_Review_Backlog.md](Documents/Implementation_Review_Backlog.md)

---

## 2026-04-19 — Phase 0 + Batch B1/B2 (GL) + PM snapshot + FE routes

### สรุปที่ทำแล้ว

- สร้าง **Phase 0**: [Documents/Phase0_Implementation_Order.md](Documents/Phase0_Implementation_Order.md) (checklist R1/R2, gap matrix, batches B0–B12, RBAC notes)
- **Backend — Finance GL (R1-1.9 บางส่วน):**
  - `erp_backend/src/modules/finance/submodules/gl/accounts.service.ts`, `accounts.routes.ts` — `GET/POST/PATCH /api/finance/accounts`, `PATCH .../activate`
  - `journal.service.ts`, `journal.routes.ts` — `GET/POST /api/finance/journal-entries`, `GET /:id`
  - ลงทะเบียนใน [erp_backend/src/modules/finance/index.ts](erp_backend/src/modules/finance/index.ts)
- **Backend — PM global snapshot (ต้น R2-3.13):**
  - `erp_backend/src/modules/pm/submodules/dashboard/global-dashboard.service.ts`, `global-dashboard.routes.ts` — `GET /api/pm/global-dashboard/pm-snapshot`
  - ลงทะเบียนใน [erp_backend/src/modules/pm/index.ts](erp_backend/src/modules/pm/index.ts)
- **Seed:** เพิ่ม permission `finance:account:*`, `finance:journal:*`, `pm:dashboard:view` ใน [erp_backend/src/scripts/seed.ts](erp_backend/src/scripts/seed.ts) (รัน seed ใหม่ในสภาพแวดล้อม dev เพื่อให้ role ได้สิทธิ์ใหม่)
- **Frontend:** หน้า `/finance/accounts`, `/finance/journal-entries`, `/pm/global-dashboard` + hooks + `queryKeys` + Sidebar + i18n + `useRouteTitle`
- **เอกสาร:** [erp_frontend/docs/api-contract-matrix.md](erp_frontend/docs/api-contract-matrix.md), [erp_frontend/docs/smoke-checklist.md](erp_frontend/docs/smoke-checklist.md) อัปเดตรายการทดสอบเบื้องต้น

### สถานะ

- DB: ไม่มี migration ใหม่ (ใช้ตาราง `chart_of_accounts` / `journal_entries` ที่มีอยู่)
- Tests: `bun test` ใน `erp_backend` ยังมี failure เดิมใน `thai-tax`, `thai-id`, `payroll` (ไม่เกี่ยวกับ commit นี้) — ดู **INC-001** ใน backlog

### ยังไม่ได้ทำ / Next

- B4 ลงไปตาม [Phase0_Implementation_Order.md](Documents/Phase0_Implementation_Order.md): AR payments (R2-3.2), aging, …
- Journal `POST /:id/post`, `POST /:id/reverse` ตาม Release_1 API summary — ยังไม่ implement
- Income/Expense ledger, Integrations — ยังไม่มี routes

### Findings

- INC-001 (ดู [Implementation_Review_Backlog.md](Documents/Implementation_Review_Backlog.md))

---

## 2026-04-19 — แก้ `db:seed` ล้มที่ `leave_types` (คอลัมน์ไม่ตรง schema)

### สรุปที่ทำแล้ว

- เพิ่ม migration [erp_backend/src/shared/db/migrations/0002_leave_types_align.sql](erp_backend/src/shared/db/migrations/0002_leave_types_align.sql): rename `days_per_year` → `max_days_per_year` + เพิ่มคอลัมน์ที่ `hr.schema.ts` ใช้ (`is_carry_over`, `requires_document`, `is_active`, …)
- อัปเดต [erp_backend/src/shared/db/migrations/meta/_journal.json](erp_backend/src/shared/db/migrations/meta/_journal.json)
- **`ensureSchema()` ใน seed** รัน logic เดียวกันก่อน seed leave types — `bun run db:seed` ใช้ได้แม้ยังไม่รัน `db:migrate` / drizzle-kit

### สถานะ

- รัน migration บน DB ของคุณก่อน seed: `psql "$DATABASE_URL" -f erp_backend/src/shared/db/migrations/0002_leave_types_align.sql` หรือใช้ `bun run db:migrate` ถ้า drizzle-kit รันได้บน Node/Bun ที่รองรับ (ถ้า `drizzle-kit migrate` error `||=` ให้อัปเกรด Node หรือรัน SQL ไฟล์โดยตรง)

### Next

- `bun run db:seed` อีกครั้งหลัง migrate สำเร็จ

---

## 2026-04-19 — Batch B3 (R2-3.1 Customers)

### สรุปที่ทำแล้ว

- **Schema:** ขยาย `customers` ใน [erp_backend/src/modules/finance/finance.schema.ts](erp_backend/src/modules/finance/finance.schema.ts) (`contact_name`, `credit_term_days`, `notes`, `is_active`, `deleted_at`) + migration [erp_backend/src/shared/db/migrations/0003_customers_r2.sql](erp_backend/src/shared/db/migrations/0003_customers_r2.sql) + `ensureSchema` ALTER ใน seed
- **Backend:** [erp_backend/src/modules/finance/submodules/customers/customers.service.ts](erp_backend/src/modules/finance/submodules/customers/customers.service.ts), [customers.routes.ts](erp_backend/src/modules/finance/submodules/customers/customers.routes.ts) — contract ตาม [Documents/SD_Flow/Finance/customers.md](Documents/SD_Flow/Finance/customers.md) (list/options/detail, CRUD, activate, soft delete + 409 `conflict`)
- **RBAC:** `finance:customer:*` ใน seed + grant `finance_manager` / `finance:customer:view` ให้ `finance_staff`; invoice สร้างได้ใช้ options ผ่าน `finance:invoice:create` หรือ `finance:customer:view`
- **Errors:** [erp_backend/src/shared/middleware/error.middleware.ts](erp_backend/src/shared/middleware/error.middleware.ts) รองรับ `error.conflict` ใน JSON
- **Invoice:** สร้าง invoice ต้องเป็นลูกค้าที่ active และไม่ถูก soft-delete ([invoice.service.ts](erp_backend/src/modules/finance/submodules/invoice/invoice.service.ts))
- **Frontend:** `/finance/customers`, `/finance/customers/new`, `/finance/customers/:id/edit` + [useCustomers.ts](erp_frontend/src/modules/finance/hooks/useCustomers.ts), อัปเดต [useInvoices.ts](erp_frontend/src/modules/finance/hooks/useInvoices.ts) ให้ดึง `finance/customers/options?activeOnly=true`
- **เอกสาร:** [Phase0_Implementation_Order.md](Documents/Phase0_Implementation_Order.md), [api-contract-matrix.md](erp_frontend/docs/api-contract-matrix.md), [smoke-checklist.md](erp_frontend/docs/smoke-checklist.md)

### Next (ตอนเขียน B3)

- B4: AR payments, invoice status, aging — ดำเนินการแล้ว (ส่วน Batch B4 ด้านล่าง)

---

## 2026-04-19 — Batch B4 (R2-3.2 AR payments, status, aging)

### สรุปที่ทำแล้ว

- **Schema / migration:** ตาราง `invoice_payments` ใน [erp_backend/src/modules/finance/finance.schema.ts](erp_backend/src/modules/finance/finance.schema.ts) + [erp_backend/src/shared/db/migrations/0004_invoice_payments.sql](erp_backend/src/shared/db/migrations/0004_invoice_payments.sql) + `ensureSchema` ใน seed
- **Backend — Invoice:** [invoice.service.ts](erp_backend/src/modules/finance/submodules/invoice/invoice.service.ts) — `listPayments`, `recordPayment` (อัปเดต `paid_amount` + status ตามยอดคงเหลือ), `updateStatus` (sent/cancelled); summary มี `paidAmount`, `balanceDue`, `grandTotal`, `withholdingAmount`; [invoice.routes.ts](erp_backend/src/modules/finance/submodules/invoice/invoice.routes.ts) — permission ต่อ route (`finance:invoice:payment`, `finance:invoice:edit`, …)
- **Backend — Reports:** [reports.service.ts](erp_backend/src/modules/finance/submodules/reports/reports.service.ts) `arAging` + [reports.routes.ts](erp_backend/src/modules/finance/submodules/reports/reports.routes.ts) `GET /reports/ar-aging`
- **RBAC:** `finance:invoice:edit`, `finance:invoice:payment` ใน seed + grant ให้ finance roles
- **Frontend:** [InvoiceDetailPage.tsx](erp_frontend/src/modules/finance/pages/InvoiceDetailPage.tsx) (จ่ายชำระ + ประวัติ), [ReportsPage.tsx](erp_frontend/src/modules/finance/pages/ReportsPage.tsx) แท็บ AR aging, hooks/types/i18n/queryKeys ที่เกี่ยวข้อง
- **เอกสาร:** [Phase0_Implementation_Order.md](Documents/Phase0_Implementation_Order.md), [api-contract-matrix.md](erp_frontend/docs/api-contract-matrix.md), smoke checklist

### สถานะ / ข้อจำกัด

- รัน `bun run db:seed` (หรือ migrate) เพื่อให้ตาราง `invoice_payments` และสิทธิ์ใหม่มีใน DB
- **ยังไม่ทำ:** บันทึก bank ledger เมื่อระบุ `bankAccountId` ตาม SD เต็มรูปแบบ — ตอนนี้บันทึกเฉพาะ AR payment + ยอด invoice

### Next

- B5 — ดำเนินการแล้ว (ส่วน Batch B5 ด้านล่าง); ต่อด้วย B6+ ตาม Phase0

---

## 2026-04-19 — Batch B5 (R2-3.11 Quotation / Sales Order)

### สรุปที่ทำแล้ว

- **Schema / migration:** [finance.schema.ts](erp_backend/src/modules/finance/finance.schema.ts) — `quotations`, `quotation_items`, `sales_orders`, `so_items`, `invoices.sales_order_id` (FK ไป SO) + [0005_quotations_sales_orders.sql](erp_backend/src/shared/db/migrations/0005_quotations_sales_orders.sql) + `ensureSchema` ใน [seed.ts](erp_backend/src/scripts/seed.ts)
- **Backend:** [quotation.service.ts / quotation.routes.ts](erp_backend/src/modules/finance/submodules/quotation/), [sales-order.service.ts / sales-order.routes.ts](erp_backend/src/modules/finance/submodules/sales-order/), [finance/index.ts](erp_backend/src/modules/finance/index.ts) mount `/quotations` และ `/sales-orders`
- **Invoice:** [invoice.service.ts](erp_backend/src/modules/finance/submodules/invoice/invoice.service.ts) — `createFromSalesOrder` (draft invoice จากยอดคงเหลือ SO, อัปเดต `invoiced_qty` และสถานะ SO)
- **RBAC:** `finance:quotation:*`, `finance:sales_order:*` ใน seed + grant ให้ finance_manager / finance_staff
- **Frontend:** หน้า list/form/detail สำหรับ quotation และ sales order, router, sidebar, i18n, [useQuotations.ts](erp_frontend/src/modules/finance/hooks/useQuotations.ts), [useSalesOrders.ts](erp_frontend/src/modules/finance/hooks/useSalesOrders.ts)
- **PDF:** `GET /quotations/:id/pdf` ตอบ **501** (ยังไม่ implement ตาม B10/export)

### Next

- B6: PO / GR ตาม Phase0

---

## 2026-04-19 — Batch B12 (Phase 3 — smoke, API matrix, contract tests)

### สรุปที่ทำแล้ว

- **[smoke-checklist.md](erp_frontend/docs/smoke-checklist.md):** เพิ่มรายการทดสอบ R2 settings (company / fiscal / notifications / audit), การแจ้งเตือนในแอป, PDF invoice/AP, และ global dashboard `/dashboard`
- **[api-contract-matrix.md](erp_frontend/docs/api-contract-matrix.md):** ขยายเป็น cross-cutting — เพิ่มตาราง Invoice PDF, AP vendor PDF, `GET dashboard/summary`, settings R2, notifications, tax hub (ตัวอย่าง path หลัก)
- **Backend tests:** [tests/modules/dashboard/dashboard-access.test.ts](erp_backend/tests/modules/dashboard/dashboard-access.test.ts) — ครอบ `userCanAccessDashboard` (gate finance / HR / PM)
- **[Phase0_Implementation_Order.md](Documents/Phase0_Implementation_Order.md):** อัปเดตบรรทัดสถานะให้รวม B12 ตามข้างต้น

### หมายเหตุ

- ยังไม่มี Playwright/E2E ใน repo — B12 เน้น checklist + matrix + unit test เล็กสำหรับสัญญา dashboard access
