# UX/API Data Coverage Checklist By File

เอกสารนี้ใช้เป็น snapshot รายไฟล์หลังรอบ align ปัจจุบัน ว่าแต่ละ feature อยู่ในสถานะใด และยังต้องตามต่อที่ชั้นไหนบ้าง

## Status Legend
- `Solved`: requirements, SD_Flow และ UX_Flow ล็อกสาระสำคัญครบสำหรับรอบนี้
- `Residual`: canonical direction ถูกล็อกแล้ว แต่ยังควรขยายตัวอย่าง/field matrix/UX details เพิ่ม
- `Unsolved`: ยังมี source doc สำคัญที่ไม่ละเอียดพอ
- `Mismatch / Scope`: สัญญาหลักถูกล็อกแล้ว แต่ยังมีความเสี่ยงสื่อ scope เกินหรือผิด semantic

---

## R1

### `R1-01_Auth_Login_and_Session.md`
`Current status`: Solved
- `SD_Flow`: ✅ `Documents/SD_Flow/User_Login/login.md` ล็อก `/me`, `/refresh`, `/logout`, `/me/password`, refresh rotation, revoke semantics
- `UX_Flow`: ✅ `Documents/UX_Flow/Functions/R1-01_Auth_Login_and_Session.md`
- `Requirements`: ✅ `Documents/Requirements/Release_1.md` ล็อก persisted session, `mustChangePassword`, logout invalidation
- `Notes`: ไม่มี field mismatch สำคัญค้าง

### `R1-02_HR_Employee_Management.md`
`Current status`: Solved
- `SD_Flow`: ✅ `Documents/SD_Flow/HR/employee.md`
- `UX_Flow`: ✅ `Documents/UX_Flow/Functions/R1-02_HR_Employee_Management.md`
- `Requirements`: ✅ ใช้ `hireDate`, `hasUserAccount`, terminate contract ชัดเจนแล้ว
- `Notes`: field mismatch หลักถูกปิดแล้ว

### `R1-03_HR_Organization_Management.md`
`Current status`: Solved
- `SD_Flow`: ✅ `Documents/SD_Flow/HR/organization.md`
- `UX_Flow`: ✅ `Documents/UX_Flow/Functions/R1-03_HR_Organization_Management.md`
- `Requirements`: ✅ ทิศทาง canonical ถูกสะท้อนครบแล้ว
- `Notes`: manager picker ให้ยึด active employee source

### `R1-04_HR_Leave_Management.md`
`Current status`: Solved
- `SD_Flow`: ✅ `Documents/SD_Flow/HR/leaves.md`
- `UX_Flow`: ✅ `Documents/UX_Flow/Functions/R1-04_HR_Leave_Management.md`
- `Requirements`: ✅ ล็อก `attachmentUrl`, retention baseline, `approverPreview`
- `Notes`: fallback UX เมื่อ `approvalConfigStatus = unconfigured` และ attachment validation ถูก explicit แล้ว

### `R1-05_HR_Payroll.md`
`Current status`: Solved
- `SD_Flow`: ✅ `Documents/SD_Flow/HR/payroll.md`
- `UX_Flow`: ✅ `Documents/UX_Flow/Functions/R1-05_HR_Payroll.md`
- `Requirements`: ✅ ล็อก `warnings[]`, `skippedEmployees[]`, SS/leave side effects
- `Notes`: warning/severity mapping, skip cases, และ async polling context ถูก lock แล้ว

### `R1-06_Finance_Invoice_AR.md`
`Current status`: Solved
- `SD_Flow`: ✅ `Documents/SD_Flow/Finance/invoices.md`
- `UX_Flow`: ✅ `Documents/UX_Flow/Functions/R1-06_Finance_Invoice_AR.md`
- `Requirements`: ✅ invoice core และ balance semantics ถูกล็อกแล้ว
- `Notes`: customer option/display baseline (`code`, `name`, `taxId`, warning state) ถูก explicit แล้ว

### `R1-07_Finance_Vendor_Management.md`
`Current status`: Solved
- `SD_Flow`: ✅ `Documents/SD_Flow/Finance/vendors.md`
- `UX_Flow`: ✅ `Documents/UX_Flow/Functions/R1-07_Finance_Vendor_Management.md`
- `Requirements`: ✅ baseline สอดคล้องแล้ว
- `Notes`: inactive vs soft-deleted visibility ถูกอธิบายแล้ว

### `R1-08_Finance_Accounts_Payable.md`
`Current status`: Solved
- `SD_Flow`: ✅ `Documents/SD_Flow/Finance/ap.md`
- `UX_Flow`: ✅ `Documents/UX_Flow/Functions/R1-08_Finance_Accounts_Payable.md`
- `Requirements`: ✅ `paidAmount`, `remainingAmount`, `paymentCount`, `statusSummary` ถูกล็อกแล้ว
- `Notes`: `statusSummary` display baseline และ aggregate semantics ถูก explicit แล้ว

### `R1-09_Finance_Accounting_Core.md`
`Current status`: Solved
- `SD_Flow`: ✅ `Documents/SD_Flow/Finance/accounting_core.md`
- `UX_Flow`: ✅ baseline เดิมยังใช้ได้
- `Requirements`: ✅ mapping/integration direction ถูกสะท้อนแล้ว
- `Notes`: ถ้าจะทำรอบถัดไป ให้ขยาย UX repair flow เพิ่มได้ แต่ไม่ใช่ blocker รอบนี้

### `R1-10_Finance_Reports_Summary.md`
`Current status`: Solved
- `SD_Flow`: ✅ `Documents/SD_Flow/Finance/reports.md`
- `UX_Flow`: ✅ `Documents/UX_Flow/Functions/R1-10_Finance_Reports_Summary.md`
- `Requirements`: ✅ summary vs deep-report scope ถูกล็อกแล้ว
- `Notes`: deep reports/export ถูกย้ายความหมายให้เป็น appendix reference-only พร้อม owner docs ของ R2 ชัดเจนแล้ว จึงไม่เหลือ scope drift blocker

### `R1-11_PM_Budget_Management.md`
`Current status`: Solved
- `SD_Flow`: ✅ `Documents/SD_Flow/PM/budgets.md` ล็อก list/detail/summary/write/delete baseline แล้ว
- `UX_Flow`: ✅ `Documents/UX_Flow/Functions/R1-11_PM_Budget_Management.md`
- `Requirements`: ✅ cross-module budget impact direction ถูกล็อกใน `Release_2.md`
- `Notes`: R1 summary copy ถูก tighten ให้ยึด `usedAmount` / `remainingAmount` / `utilizationPct` และระบุ cross-module metrics เป็น `not in current summary contract` แล้ว

### `R1-12_PM_Expense_Management.md`
`Current status`: Solved
- `SD_Flow`: ✅ `Documents/SD_Flow/PM/expenses.md` ล็อก filters, detail, approval metadata, warnings, receipt field แล้ว
- `UX_Flow`: ✅ `Documents/UX_Flow/Functions/R1-12_PM_Expense_Management.md`
- `Requirements`: ✅ `receiptUrl` และ finance-post trigger direction ถูกล็อกพอสำหรับรอบนี้
- `Notes`: source conflict หลักถูกปิดแล้ว

### `R1-13_PM_Progress_Tasks.md`
`Current status`: Solved
- `SD_Flow`: ✅ `Documents/SD_Flow/PM/progress.md` ล็อก list/detail/body, summary metrics, option source baseline แล้ว
- `UX_Flow`: ✅ `Documents/UX_Flow/Functions/R1-13_PM_Progress_Tasks.md`
- `Requirements`: ✅ assignee/budget source direction ถูกล็อกพอสำหรับรอบนี้
- `Notes`: source conflict หลักถูกปิดแล้ว

### `R1-14_PM_Dashboard.md`
`Current status`: Solved
- `SD_Flow`: ✅ `Documents/SD_Flow/PM/dashboard.md`
- `UX_Flow`: ✅ `Documents/UX_Flow/Functions/R1-14_PM_Dashboard.md`
- `Requirements`: ✅ widget source/filter direction ถูก align แล้ว
- `Notes`: no blocking mismatch left

### `R1-15_Settings_User_Management.md`
`Current status`: Solved
- `SD_Flow`: ✅ `Documents/SD_Flow/User_Login/user_role_permission.md` + `Documents/SD_Flow/HR/employee.md`
- `UX_Flow`: ✅ `Documents/UX_Flow/Functions/R1-15_Settings_User_Management.md`
- `Requirements`: ✅ ล็อก `mustChangePassword`, employee binding, deactivate -> revoke sessions
- `Notes`: employee picker ให้ยึด `hasUserAccount=false`

### `R1-16_Settings_Role_and_Permission.md`
`Current status`: Solved
- `SD_Flow`: ✅ `Documents/SD_Flow/User_Login/user_role_permission.md`
- `UX_Flow`: ✅ `Documents/UX_Flow/Functions/R1-16_Settings_Role_and_Permission.md`
- `Requirements`: ✅ `cloneFromRoleId` ถูกล็อกว่าไม่อยู่ใน current contract
- `Notes`: create flow หลักเอา `cloneFromRoleId` ออกจากฟอร์มที่ใช้งานจริงแล้ว จึงไม่เหลือ scope ambiguity blocker

---

## R2

### `R2-01_Customer_Management.md`
`Current status`: Solved
- `SD_Flow`: ✅ `Documents/SD_Flow/Finance/customers.md`
- `UX_Flow`: ✅ `Documents/UX_Flow/Functions/R2-01_Customer_Management.md`
- `Requirements`: ✅ customer warning direction ถูก align แล้ว
- `Notes`: inactive vs soft-deleted behavior ถูกอธิบายแล้ว

### `R2-02_AR_Payment_Tracking.md`
`Current status`: Solved
- `SD_Flow`: ✅ `Documents/SD_Flow/Finance/invoices.md` + `Documents/SD_Flow/Finance/bank_accounts.md`
- `UX_Flow`: ✅ `Documents/UX_Flow/Functions/R2-02_AR_Payment_Tracking.md`
- `Requirements`: ✅ payment -> bank visibility baseline ถูกล็อกแล้ว
- `Notes`: invoice-side bank readback / posting state ถูก explicit แล้ว

### `R2-03_Thai_Tax_VAT_WHT.md`
`Current status`: Solved
- `SD_Flow`: ✅ `Documents/SD_Flow/Finance/tax.md` ล็อก tax master, VAT summary/export, WHT source split, PND lines baseline แล้ว
- `UX_Flow`: ✅ `Documents/UX_Flow/Functions/R2-03_Thai_Tax_VAT_WHT.md` ครอบคลุม payroll-origin WHT flow และ VAT/WHT/PND paths แล้ว
- `Requirements`: ✅ payroll-origin WHT source contract อยู่ใน `Documents/Requirements/Release_2.md`
- `Notes`: display field matrix, create-state rules, และ recovery UX ถูก explicit แล้ว

### `R2-04_Financial_Statements.md`
`Current status`: Solved
- `SD_Flow`: ✅ `Documents/SD_Flow/Finance/reports.md` ล็อก `series[]`, `totals`, `meta`, disclaimer/isEstimated baseline แล้ว
- `UX_Flow`: ✅ `Documents/UX_Flow/Functions/R2-04_Financial_Statements.md` ล็อก query semantics, export parity, reference-only links, stale-data flags แล้ว
- `Requirements`: ✅ baseline query/statement scope อยู่ใน `Documents/Requirements/Release_2.md`
- `Notes`: statement display matrix, stale/empty/error UX, และ export parity ถูก explicit แล้ว

### `R2-05_Cash_Bank_Management.md`
`Current status`: Solved
- `SD_Flow`: ✅ `Documents/SD_Flow/Finance/bank_accounts.md`
- `UX_Flow`: ✅ `Documents/UX_Flow/Functions/R2-05_Cash_Bank_Management.md`
- `Requirements`: ✅ `glAccountId` และ AR/AP side effects ถูกล็อกแล้ว
- `Notes`: wording ถูก tighten ให้ `glAccountId` เป็นเพียง bank-to-GL link field และไม่สื่อว่า flow นี้ครอบคลุม GL-management เต็มรูปแบบ

### `R2-06_Purchase_Order.md`
`Current status`: Solved
- `SD_Flow`: ✅ `Documents/SD_Flow/Finance/purchase_orders.md`
- `UX_Flow`: ✅ `Documents/UX_Flow/Functions/R2-06_Purchase_Order.md`
- `Requirements`: ✅ Gap C budget impact ถูกล็อกแล้ว
- `Notes`: no blocking mismatch left

### `R2-07_Attendance_and_Time_Tracking.md`
`Current status`: Solved
- `SD_Flow`: ✅ `Documents/SD_Flow/HR/attendance_overtime.md`
- `UX_Flow`: ✅ `Documents/UX_Flow/Functions/R2-07_Attendance_and_Time_Tracking.md`
- `Requirements`: ✅ attendance -> payroll / notification payload baseline ถูกล็อกแล้ว
- `Notes`: warning/alert mapping และ notification deep-link behavior ถูก explicit แล้ว

### `R2-08_Company_Organization_Settings.md`
`Current status`: Solved
- `SD_Flow`: ✅ `Documents/SD_Flow/User_Login/settings_admin_r2.md`
- `UX_Flow`: ✅ `Documents/UX_Flow/Functions/R2-08_Company_Organization_Settings.md`
- `Requirements`: ✅ ล็อก `companyName`, `currency`, `reopenReason`, date filter semantics
- `Notes`: canonical field mismatch หลักถูกปิดแล้ว

### `R2-09_Document_Print_Export.md`
`Current status`: Solved
- `SD_Flow`: ✅ `Documents/SD_Flow/Finance/document_exports.md`
- `UX_Flow`: ✅ `Documents/UX_Flow/Functions/R2-09_Document_Print_Export.md`
- `Requirements`: ✅ retention/expiry baseline ถูกล็อกแล้ว
- `Notes`: support matrix ของ inline PDF / format export / async job ถูก lock แล้ว

### `R2-10_Notification_Workflow_Alerts.md`
`Current status`: Solved
- `SD_Flow`: ✅ `Documents/SD_Flow/User_Login/settings_admin_r2.md`
- `UX_Flow`: ✅ `Documents/UX_Flow/Functions/R2-10_Notification_Workflow_Alerts.md`
- `Requirements`: ✅ eventType catalog, archive policy, date filter semantics ถูกล็อกแล้ว
- `Notes`: archived/empty-state semantics และ `archiveBoundaryDate` ถูก explicit แล้ว

### `R2-11_Sales_Order_Quotation.md`
`Current status`: Solved
- `SD_Flow`: ✅ `Documents/SD_Flow/Finance/quotation_sales_orders.md` ล็อก create/detail/convert/linked-doc/source picker baseline แล้ว
- `UX_Flow`: ✅ `Documents/UX_Flow/Functions/R2-11_Sales_Order_Quotation.md`
- `Requirements`: ✅ conversion/cross-customer direction ถูก align พอสำหรับรอบนี้
- `Notes`: source conflict หลักถูกปิดแล้ว

### `R2-12_Audit_Trail.md`
`Current status`: Solved
- `SD_Flow`: ✅ `Documents/SD_Flow/User_Login/settings_admin_r2.md`
- `UX_Flow`: ✅ `Documents/UX_Flow/Functions/R2-12_Audit_Trail.md`
- `Requirements`: ✅ audit detail/diff baseline ถูกล็อกแล้ว
- `Notes`: filter source semantics และ actor picker source ถูก explicit แล้ว

### `R2-13_Global_Dashboard.md`
`Current status`: Solved
- `SD_Flow`: ✅ `Documents/SD_Flow/PM/global_dashboard.md`
- `UX_Flow`: ✅ `Documents/UX_Flow/Functions/R2-13_Global_Dashboard.md`
- `Requirements`: ✅ multi-widget payload, freshness, RBAC trim ถูกล็อกแล้ว
- `Notes`: widget type / module-block matrix และ omit-widget behavior ถูก explicit แล้ว

---

## Cross-File Snapshot

### SD_Flow closed this round
- `User_Login/login.md`
- `User_Login/settings_admin_r2.md`
- `User_Login/user_role_permission.md`
- `HR/organization.md`
- `Finance/vendors.md`
- `Finance/customers.md`
- `Finance/purchase_orders.md`
- `Finance/accounting_core.md`
- `Finance/tax.md`
- `Finance/quotation_sales_orders.md`
- `PM/budgets.md`
- `PM/expenses.md`
- `PM/progress.md`
- `PM/dashboard.md`
- `PM/global_dashboard.md`

### UX_Flow closed this round
- `R1-01`, `R1-03`, `R1-04`, `R1-05`, `R1-06`, `R1-07`, `R1-08`, `R1-09`, `R1-10`, `R1-11`, `R1-12`, `R1-13`, `R1-14`, `R1-15`, `R1-16`
- `R2-01`, `R2-02`, `R2-03`, `R2-04`, `R2-05`, `R2-06`, `R2-07`, `R2-09`, `R2-10`, `R2-11`, `R2-12`, `R2-13`

### Requirements locks closed this round
- auth session persistence / refresh / logout invalidation
- leave attachment retention baseline
- payroll warnings / skipped employees baseline
- customer credit warning baseline
- AR payment -> bank movement visibility baseline
- PO -> budget impact baseline
- attendance -> payroll / notification payload baseline
- tax payroll-origin WHT baseline
- statement query/report/export baseline
- audit detail/diff baseline
- global dashboard payload + freshness metadata baseline

### Source docs still open for further detail
ไม่มี residual source docs เปิดอยู่ใน snapshot ปัจจุบัน

### Scope watchlist
ไม่มี scope watchlist เปิดอยู่ใน snapshot ปัจจุบัน
