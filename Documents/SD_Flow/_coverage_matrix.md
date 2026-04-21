# SD_Flow Coverage Matrix (Release 1 + Release 2)

อ้างอิงตรวจสอบจาก:
- `Documents/Requirements/Release_1.md`
- `Documents/Requirements/Release_2.md`

## Release 1 Coverage

- Auth: `/api/auth/login`, `/logout`, `/refresh`, `/me`, `/me/password` -> `User_Login/login.md`
- Health: `/health`, `/api/finance/health`, `/api/pm/health` -> `User_Login/health.md`
- HR Employees: `/api/hr/employees/*` -> `HR/employee.md`
- HR Organization: `/api/hr/departments/*`, `/api/hr/positions/*` -> `HR/organization.md`
- HR Leaves: `/api/hr/leaves/*` (รวม `/types`, `/balances`, `/approval-configs`, คำขอลา) -> `HR/leaves.md`
- HR Payroll: `/api/hr/payroll/*` -> `HR/payroll.md`
- Finance Customers (R1 list): `/api/finance/customers` -> `Finance/customers.md`
- Finance Invoices: `/api/finance/invoices/*` -> `Finance/invoices.md`
- Finance Vendors: `/api/finance/vendors/*` -> `Finance/vendors.md`
- Finance AP: `/api/finance/ap/vendor-invoices/*` -> `Finance/ap.md`
- Finance Accounting Core: `/api/finance/accounts/*`, `/journal-entries/*`, `/income-expense/*`, `/integrations/*` -> `Finance/accounting_core.md`
- Finance Reports summary: `/api/finance/reports/summary` -> `Finance/reports.md`
- PM Budgets: `/api/pm/budgets/*` -> `PM/budgets.md`
- PM Expenses: `/api/pm/expenses/*` -> `PM/expenses.md`
- PM Progress: `/api/pm/progress/*` -> `PM/progress.md`
- PM Dashboard aggregate endpoints -> `PM/dashboard.md`
- Settings Users/Roles/Permissions: `/api/settings/users` (รวม `POST` สร้าง user), `/api/settings/users/:id/*`, `/api/settings/roles*`, `/api/settings/permissions` -> `User_Login/user_role_permission.md`

## Release 2 Coverage

- Customers Full CRUD: `/api/finance/customers/*` -> `Finance/customers.md`
- AR Payments: `/api/finance/invoices/:id/payments`, `/api/finance/reports/ar-aging`, invoice status -> `Finance/invoices.md`, `Finance/reports.md`
- Tax: `/api/finance/tax/*` -> `Finance/tax.md`
- Financial Statements: `/api/finance/reports/profit-loss`, `/balance-sheet`, `/cash-flow` -> `Finance/reports.md`
- Bank Management: `/api/finance/bank-accounts/*` -> `Finance/bank_accounts.md`
- Purchase Orders: `/api/finance/purchase-orders/*` -> `Finance/purchase_orders.md`
- Attendance/OT/Holidays/Schedules: `/api/hr/work-schedules/*`, `/api/hr/attendance/*`, `/api/hr/overtime/*`, `/api/hr/holidays/*` -> `HR/attendance_overtime.md`
- Company/Fiscal settings: `/api/settings/company*`, `/api/settings/fiscal-periods*` -> `User_Login/settings_admin_r2.md`
- Document exports (PDF/XLSX): finance/hr export endpoints -> `Finance/document_exports.md`
- Notifications: `/api/notifications/*`, `/api/settings/notification-configs*` -> `User_Login/settings_admin_r2.md`
- Quotation/Sales Order: `/api/finance/quotations/*`, `/api/finance/sales-orders/*` -> `Finance/quotation_sales_orders.md`
- Audit logs: `/api/settings/audit-logs*` -> `User_Login/settings_admin_r2.md`
- Global dashboard: `/api/dashboard/summary` -> `PM/global_dashboard.md`

## Gap Check Result

- Missing endpoint from Release 1: **none** (อัปเดต 2026-04: BR/SD รวม `POST /api/settings/users`, leave types CRUD, balances, approval-configs — ดู `Documents/Requirements/Release_1.md` Feature 1.15 / 1.4)
- Missing endpoint from Release 2: **none**

> หมายเหตุ: บาง endpoint แบบ export/pdf ถูกรวมอยู่ใน `Finance/document_exports.md` เพื่อหลีกเลี่ยงข้อมูลซ้ำหลายไฟล์
