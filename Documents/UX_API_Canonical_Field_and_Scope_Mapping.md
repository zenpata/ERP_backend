# UX/API Canonical Field and Scope Mapping

เอกสารนี้เป็น baseline กลางสำหรับตัดสินว่า field, query semantics, side effects และ release scope ใดถือเป็น canonical หลังรอบ align ปัจจุบัน

## Canonical Sources
- R1 source of truth: `Documents/Requirements/Release_1.md`
- R2 source of truth: `Documents/Requirements/Release_2.md`
- SD detail contracts: `Documents/SD_Flow/**`
- FE read-model / scope notes: `Documents/UX_Flow/Functions/**`

## Authoritative Addenda
เมื่อไฟล์ SD/UX ด้านบนยังมี placeholder sections ให้ยึด addendum/coverage notes ต่อไปนี้เป็นหลัก:
- `Documents/SD_Flow/User_Login/login.md`
- `Documents/SD_Flow/User_Login/settings_admin_r2.md`
- `Documents/SD_Flow/User_Login/user_role_permission.md`
- `Documents/SD_Flow/HR/employee.md`
- `Documents/SD_Flow/HR/organization.md`
- `Documents/SD_Flow/HR/leaves.md`
- `Documents/SD_Flow/HR/payroll.md`
- `Documents/SD_Flow/HR/attendance_overtime.md`
- `Documents/SD_Flow/Finance/customers.md`
- `Documents/SD_Flow/Finance/vendors.md`
- `Documents/SD_Flow/Finance/ap.md`
- `Documents/SD_Flow/Finance/bank_accounts.md`
- `Documents/SD_Flow/Finance/reports.md`
- `Documents/SD_Flow/Finance/document_exports.md`
- `Documents/SD_Flow/Finance/purchase_orders.md`
- `Documents/SD_Flow/Finance/accounting_core.md`
- `Documents/SD_Flow/Finance/tax.md`
- `Documents/SD_Flow/Finance/quotation_sales_orders.md`
- `Documents/SD_Flow/PM/budgets.md`
- `Documents/SD_Flow/PM/expenses.md`
- `Documents/SD_Flow/PM/progress.md`
- `Documents/SD_Flow/PM/dashboard.md`
- `Documents/SD_Flow/PM/global_dashboard.md`

## Scope Wording Standard
- `in-scope` = endpoint/field/read model ถูก implement และนับอยู่ใน acceptance ของไฟล์นั้น
- `reference only` = กล่าวถึงเพื่อ traceability หรือ deep-link ไป owner doc เท่านั้น และต้องไม่ถูกนับเป็น implemented scope ของไฟล์ปัจจุบัน
- `not in current contract` = field/button/flow ยังไม่มี canonical API contract; FE ห้าม render หรือสร้าง behavior เองจนกว่า Requirements + SD + UX จะอัปเดตครบทั้งชุด

## Cross-file Canonical Locks
| Domain | Canonical | Non-canonical / legacy | Decision |
|---|---|---|---|
| Employee | `hireDate` | `employmentDate` | ใช้ `hireDate` ทุกชั้น |
| Employee list / Settings | `hasUserAccount` | - | ใช้เป็น list filter และ employee summary field |
| Auth / User | `mustChangePassword` | - | persist ใน `users.mustChangePassword` และสะท้อนผ่าน `/api/auth/me` |
| Company settings | `companyName` | `companyNameTh` | ใช้ `companyName`; `companyNameEn` เป็น optional companion |
| Company settings | `currency` | `defaultCurrency` | ใช้ `currency` |
| Employee terminate | request `terminationDate`, read `endDate` | `endDate` ใน request | request ใช้ `terminationDate`; read model ใช้ `endDate` + `status=terminated` |
| AP aggregates | `paidAmount`, `remainingAmount`, `paymentCount`, `statusSummary` | ad hoc labels | ใช้ชุดนี้ทุกชั้น |
| Bank mapping | `glAccountId` | `GL mapping` แบบกว้าง ๆ | ใช้ `glAccountId` เป็น canonical field ฝั่ง bank account |
| Notifications | `eventType` | `type` | ใช้ `eventType` ใน schema, config และ response |
| Date filter semantics | `dateFrom`, `dateTo` | `dateRange` เป็น server field | FE ใช้ `dateRange` ได้ภายใน UI แต่ตอนคุยกับ API ให้ map เป็น `dateFrom` / `dateTo` |
| Audit filters | `actorId`, `startDate`, `endDate` | `userId`, `dateFrom`, `dateTo` | ใช้ `actorId`, `startDate`, `endDate` เป็น canonical สำหรับ audit APIs |
| Expense receipt | `receiptUrl` | upload temp field names | upload flow ใด ๆ ต้อง resolve เป็น `receiptUrl` ก่อน submit |
| Dashboard RBAC | `widgetVisibilityMode = omit_widget` | trim แบบคืน field ว่าง | ถ้าไม่มีสิทธิ์ ให้ omit widget/block นั้นทั้งก้อน |
| Statement payload | `series[]`, `totals`, `meta` | FE local aggregates | statement/readback ต้องยึด payload จาก BE เป็นหลัก |

## Canonical Contract Snippets

### Auth Session
- `GET /api/auth/me` คือ bootstrap contract หลักหลัง login หรือ page reload
- `POST /api/auth/refresh` ต้อง rotate refresh token ทุกครั้ง
- `POST /api/auth/logout` ต้องรองรับ current-session revoke และ all-device revoke
- `PATCH /api/auth/me/password` success แล้วต้อง clear `mustChangePassword` และ revoke refresh sessions เดิม

### Leave
- `attachmentUrl` เป็น canonical field ของไฟล์แนบ
- `approverPreview[]` เป็น canonical read model สำหรับ preview สายอนุมัติ
- attachment retention ยึด policy ใน `Release_1.md`

### Payroll
- process result ใช้ `warnings[]` และ `skippedEmployees[]`
- `warnings[]` item: `code`, `message`, `employeeId?`, `severity`
- `skippedEmployees[]` item: `employeeId`, `employeeCode`, `reasonCode`, `reasonMessage`

### Accounting Core
- journal detail/readback ต้องยึด `lines[]` พร้อม account summary (`accountCode`, `accountName`) และ source context `sourceModule`, `sourceType`, `sourceId`
- account selectors และ category selectors ต้อง reuse `GET /api/finance/accounts` และ `GET /api/finance/income-expense/categories` เป็น option source หลัก
- auto-post recovery ต้องยึด error object จาก server โดยเฉพาะ `SOURCE_MAPPING_NOT_FOUND` และใช้ flow แก้ mapping -> retry -> inspect source trace ตาม source key เดิม

### PM Budgets / Expenses / Progress
- budget list/detail/summary ต้องยึด `amount`, `usedAmount`, `remainingAmount`, `utilizationPct`, `status`
- expense list ใช้ `dateFrom` / `dateTo`; ถ้ามี over-budget case ให้ส่ง `warnings[]` จาก BE
- progress summary ใช้ `asOf`, `total`, `todo`, `inProgress`, `done`, `cancelled`, `avgProgressPct`, `overdueCount`
- budget / expense / progress pickers ต้อง reuse source endpoints จริง ไม่ hardcode ใน FE

### AR Payment -> Bank
- invoice/detail/payment history ควรอ้าง bank movement ผ่าน `transactionId`, `referenceType`, `referenceId`, `sourceModule`
- bank transaction rows ใช้ `referenceType`, `referenceId`, `description`, `amount`, `reconciled`, `transactionDate`

### Tax / Quotations / Statements
- `wht-certificates` ต้องรองรับ AP-origin (`apBillId`) และ payroll-origin (`employeeId`) โดยหนึ่ง certificate ต้องมี source แค่หนึ่งทาง
- `pnd-report` ใช้ query `form`, `month`, `year` และ read model `summary`, `lines[]`; UX ต้อง render summary/table ตาม payload จริง
- VAT summary / PND export ต้อง reuse filter snapshot เดียวกับรายงานบนจอ
- quotation create อาจคืน `creditWarning?` เป็น advisory payload
- convert responses ของ quotation/SO ต้องคืน id/no ของ document ปลายทางสำหรับ navigation
- statement endpoints ใช้ `series[]`, `totals`, `meta`; export ต้อง reuse filter ชุดเดียวกับ on-screen report และ UX ต้องแสดง `isEstimated` / `disclaimer` / `lastUpdatedAt` ถ้า BE ส่งมา
- statement query names ห้ามใช้ alias กลางอย่าง `from` / `to` / `comparePeriod`: P&L = `periodFrom`, `periodTo`, `comparePrevious?`; Balance Sheet = `asOfDate`; Cash Flow = `periodFrom`, `periodTo`

### Notifications / Audit / Dashboard
- notification catalog ใช้ชุด `eventType` เดียวกันใน Requirements, SD, UX และ API response
- audit detail response ต้องมี `history[]`, `changes[]`, `context`
- global dashboard response ต้องมี `finance`, `hr`, `pm`, `alerts`, `meta`

## Scope Locks By Feature

### R1
- `R1-01_Auth_Login_and_Session.md`
  - in-scope: login, me, refresh, logout, self password change
  - lock: refresh rotation, logout invalidation, `mustChangePassword`
- `R1-02_HR_Employee_Management.md`
  - in-scope: list/detail/me/create/update/terminate
  - lock: `hireDate`, `hasUserAccount`, soft terminate read model
- `R1-03_HR_Organization_Management.md`
  - in-scope: departments / positions CRUD
  - lock: hierarchy summary, dependency blockers, manager picker source
- `R1-04_HR_Leave_Management.md`
  - in-scope: create/approve/reject/list/balances/configs
  - lock: `attachmentUrl`, `approverPreview`, reject body `{ reason }`
- `R1-05_HR_Payroll.md`
  - in-scope: create -> process -> approve -> mark-paid
  - lock: warnings, skipped employees, payslip summary
- `R1-06_Finance_Invoice_AR.md`
  - in-scope: invoice list/create/detail
  - reference only: advanced payment/export behavior; owner UX อยู่ใน `R2-02_AR_Payment_Tracking.md` และ `R2-09_Document_Print_Export.md`
- `R1-07_Finance_Vendor_Management.md`
  - in-scope: options/list/detail/create/update/activate/delete
  - lock: inactive vs soft-deleted visibility
- `R1-08_Finance_Accounts_Payable.md`
  - in-scope: AP list/create/detail/status/payments
  - reference only: PO/WHT/bank advanced flows; owner UX อยู่ใน `R2-06_Purchase_Order.md`, `R2-03_Thai_Tax_VAT_WHT.md`, `R2-05_Cash_Bank_Management.md`
- `R1-09_Finance_Accounting_Core.md`
  - in-scope: accounts, journals, income/expense, source mappings
  - lock: line schema, recovery error object, option sources, selector/retry recovery UX
- `R1-10_Finance_Reports_Summary.md`
  - in-scope: `GET /api/finance/reports/summary`
  - reference only: AR aging owner UX อยู่ใน `R2-02_AR_Payment_Tracking.md`; P&L / balance sheet / cash flow owner UX อยู่ใน `R2-04_Financial_Statements.md`; export owner UX อยู่ใน `R2-09_Document_Print_Export.md`
- `R1-11_PM_Budget_Management.md`
  - in-scope: budget CRUD + summary minimum contract
  - not in current summary contract: `committedAmount`, `actualSpend`, `availableAmount` จาก PO/AP linkage จนกว่า BE จะเพิ่ม payload ดังกล่าว
- `R1-12_PM_Expense_Management.md`
  - in-scope: expense list/create/detail/status/delete
  - lock: `receiptUrl`, workflow warnings, budget picker source
- `R1-13_PM_Progress_Tasks.md`
  - in-scope: summary/list/create/read/update/status/progress/delete
  - lock: assignee / budget picker source และ server-computed overdue/KPI
- `R1-14_PM_Dashboard.md`
  - in-scope: progress summary, recent tasks, budgets overview, expenses overview
  - lock: widget-level query/filter/read model
- `R1-15_Settings_User_Management.md`
  - in-scope: users list/create/roles/activate
  - lock: employee picker source, `mustChangePassword`, deactivate revokes sessions
- `R1-16_Settings_Role_and_Permission.md`
  - in-scope: roles CRUD, permissions catalog, permission replace
  - not in current contract: `cloneFromRoleId`; UI ต้องไม่ expose role-clone flow จนกว่าจะมี API contract

### R2
- `R2-01_Customer_Management.md`
  - in-scope: customer list/detail/options/create/update/activate/delete
  - lock: `creditWarning`, overdue badge, delete conflict payload
- `R2-02_AR_Payment_Tracking.md`
  - in-scope: payment create/list/status
  - lock: bank movement visibility contract
- `R2-03_Thai_Tax_VAT_WHT.md`
  - in-scope: VAT/WHT summary/list/detail/export + payroll-origin WHT branch
  - lock: rate master, PND/WHT source split, display matrix, export parity, source-aware recovery UX
- `R2-04_Financial_Statements.md`
  - in-scope: P&L, balance sheet, cash flow, export parity
  - lock: query semantics, `series[]` / `totals` / `meta`, statement display matrix, stale/export flags
- `R2-05_Cash_Bank_Management.md`
  - in-scope: bank account create/options/transactions/reconcile
  - lock: `glAccountId`, transaction row references, inactive-history behavior
- `R2-06_Purchase_Order.md`
  - in-scope: PO create/update/status/GR/AP-bill linkage
  - lock: `budgetImpact`, 3-way matching read model
- `R2-07_Attendance_and_Time_Tracking.md`
  - in-scope: schedules, attendance, OT, holidays, summary
  - lock: attendance -> payroll / notification payload
- `R2-08_Company_Organization_Settings.md`
  - in-scope: company singleton + fiscal periods
  - lock: `companyName`, `companyNameEn`, `currency`, `reopenReason`
- `R2-09_Document_Print_Export.md`
  - in-scope: pdf/preview/export response types and retention
  - lock: sync vs async export contract
- `R2-10_Notification_Workflow_Alerts.md`
  - in-scope: inbox, unread count, mark read, mark all read, preferences
  - lock: `eventType` catalog, archive boundary semantics, `dateFrom` / `dateTo`
- `R2-11_Sales_Order_Quotation.md`
  - in-scope: quotation/order/convert flows
  - lock: conversion result payload, `creditWarning?`, customer option reuse, `remainingQty`
- `R2-12_Audit_Trail.md`
  - in-scope: audit list/detail
  - lock: action enum, audit filters, diff/context payload
- `R2-13_Global_Dashboard.md`
  - in-scope: cross-module summary payload
  - lock: `meta.asOf`, `meta.freshnessSeconds`, `permissionTrimmedModules`, `widgetVisibilityMode`

## Residual Follow-up Detail
ไม่มี residual source follow-up เปิดอยู่ในเอกสารนี้แล้วสำหรับ:
- `Documents/UX_Flow/Functions/R1-09_Finance_Accounting_Core.md`
- `Documents/UX_Flow/Functions/R2-03_Thai_Tax_VAT_WHT.md`
- `Documents/UX_Flow/Functions/R2-04_Financial_Statements.md`

และไม่มี function-level residual follow-up เปิดอยู่แล้วสำหรับ:
- `Documents/UX_Flow/Functions/R1-04_HR_Leave_Management.md`
- `Documents/UX_Flow/Functions/R1-05_HR_Payroll.md`
- `Documents/UX_Flow/Functions/R1-06_Finance_Invoice_AR.md`
- `Documents/UX_Flow/Functions/R1-08_Finance_Accounts_Payable.md`
- `Documents/UX_Flow/Functions/R2-02_AR_Payment_Tracking.md`
- `Documents/UX_Flow/Functions/R2-07_Attendance_and_Time_Tracking.md`
- `Documents/UX_Flow/Functions/R2-09_Document_Print_Export.md`
- `Documents/UX_Flow/Functions/R2-10_Notification_Workflow_Alerts.md`
- `Documents/UX_Flow/Functions/R2-12_Audit_Trail.md`
- `Documents/UX_Flow/Functions/R2-13_Global_Dashboard.md`

ถ้าเกิด gap ใหม่ ให้ reopen เฉพาะเมื่อมี source drift จริงระหว่าง Requirements / SD / UX หรือมี canonical field/query/recovery behavior ใหม่ที่ยังไม่ถูกล็อก

## SD Completeness Standard
ทุก SD file ที่ยังมี placeholder body ควรมีอย่างน้อย:
1. Method + path + purpose
2. Field-level request (`query`, `params`, `body`)
3. Field-level response (`data`, `meta`, summaries`)
4. Validation / error contract
5. Side effects / invalidation / integrations
6. Option or picker source ที่ UX ใช้
