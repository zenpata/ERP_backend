# UX/API Remaining Gaps Checklist

เอกสารนี้ใช้ติดตามเฉพาะ gap ที่ยังเหลืออยู่จริงหลังรอบ align ปัจจุบัน ไม่ใช้เก็บงานที่ปิดแล้วชุดแรก

## Status Definitions
- `Solved`: canonical decision, SD contract และ UX scope note ถูกล็อกแล้วพอสำหรับรอบนี้
- `Residual`: ทิศทาง canonical ถูกล็อกแล้ว แต่ยังเหลือ detail expansion ที่ควรทำต่อ
- `Unsolved`: ยังไม่มี source contract ที่นิ่งพอ หรือยังไม่มีการเชื่อมจาก Requirements -> SD -> UX ครบ
- `Mismatch / Scope`: เอกสารยังเสี่ยงสื่อ scope หรือ semantics ไม่ตรง แม้ส่วนหนึ่งจะมี contract แล้ว

## Current Snapshot
- `Solved`: auth logout/change-password body, audit filters, notification event/filter/body, PO/AP naming + GR/AP linkage, accounting filters/error code, leave date filter naming, company settings payload/fiscal close-reopen semantics, payroll lifecycle method lock, AP payment bank linkage, tax payroll-origin filter strategy, PM `projectId` persistence story
- `Residual`: 0 หัวข้อ (หลัง re-open และ re-validate)
- `Unsolved`: 0 เอกสารต้นทางที่ยังไม่มี source contract นิ่งพอ
- `Mismatch / Scope`: 0 หัวข้อ

---

## 1. Residual
ไม่มี residual function-level follow-up เปิดอยู่ในรอบนี้แล้ว (รายการที่เคย re-open ถูกปิดหลัง source docs align ครบ)

`ปิดแล้วในรอบล่าสุด`
- `R1-04_HR_Leave_Management.md`
- `R1-05_HR_Payroll.md`
- `R1-06_Finance_Invoice_AR.md`
- `R1-08_Finance_Accounts_Payable.md`
- `R2-02_AR_Payment_Tracking.md`
- `R2-07_Attendance_and_Time_Tracking.md`
- `R2-09_Document_Print_Export.md`
- `R2-10_Notification_Workflow_Alerts.md`
- `R2-12_Audit_Trail.md`
- `R2-13_Global_Dashboard.md`

`หมายเหตุ`
- รอบล่าสุดได้เติม fallback UX, warning/severity mapping, option-source/display fields, bank readback states, export support matrix, archived/empty states, audit filter sources และ widget field matrix baseline ให้ครบตาม source contracts แล้ว

---

## 2. Residual Source Follow-up

ไม่มี source-doc residual follow-up เปิดอยู่ในรอบนี้แล้ว

`ปิดแล้วในรอบก่อนหน้าและรอบล่าสุด`
- `R1-09_Finance_Accounting_Core.md`
- `R2-03_Thai_Tax_VAT_WHT.md`
- `R2-04_Financial_Statements.md`

`หมายเหตุ`
- รอบล่าสุดได้เพิ่ม display field matrix / stale-export UX / selector-recovery UX ให้ครบตาม source contracts แล้ว
- ถ้ามีการเปิด follow-up ใหม่ ควรเปิดเฉพาะเมื่อเกิด source drift หรือ canonical gap ใหม่จริง

---

## 3. Mismatch / Scope Watchlist
ไม่มี mismatch/scope watchlist เปิดอยู่ในรอบนี้แล้ว

`ปิดแล้วในรอบล่าสุด`
- `R1-10_Finance_Reports_Summary.md` ถูก tighten ให้ deep reports/export เป็น appendix reference-only พร้อม owner docs ของ R2
- `R1-11_PM_Budget_Management.md` ถูก tighten ให้ R1 core ยึด `usedAmount` / `remainingAmount` / `utilizationPct` และระบุ cross-module metrics เป็น `not in current summary contract`
- `R2-05_Cash_Bank_Management.md` ถูก tighten ให้ `glAccountId` เป็นเพียง bank-to-GL link field ไม่ใช่ GL-management scope
- `R1-16_Settings_Role_and_Permission.md` ถูก tighten ให้ `cloneFromRoleId` ไม่ปรากฏเป็น create field ที่ใช้งานได้จริงใน R1

---

## 4. Solved This Round

### Requirements locks closed
- auth session persistence / refresh rotation / logout invalidation
- `mustChangePassword` source of truth
- leave attachment retention baseline
- payroll warnings / skipped employees schema baseline
- AP aggregate definitions baseline
- notification `eventType` catalog
- notification archive/date filter semantics baseline
- AR payment -> bank visibility baseline
- PO -> budget impact baseline
- attendance -> payroll / notification payload baseline
- tax payroll-origin WHT baseline
- statement query/report/export baseline
- audit detail/diff baseline
- global dashboard freshness / RBAC trim baseline

### SD locks closed
- `User_Login/login.md`
- `User_Login/settings_admin_r2.md`
- `User_Login/user_role_permission.md`
- `HR/organization.md`
- `Finance/customers.md`
- `Finance/vendors.md`
- `Finance/tax.md`
- `Finance/quotation_sales_orders.md`
- `Finance/purchase_orders.md`
- `Finance/accounting_core.md`
- `PM/budgets.md`
- `PM/expenses.md`
- `PM/progress.md`
- `PM/dashboard.md`
- `PM/global_dashboard.md`

### UX locks closed
- `R1-01`, `R1-03`, `R1-04`, `R1-05`, `R1-06`, `R1-07`, `R1-08`, `R1-09`, `R1-10`, `R1-11`, `R1-12`, `R1-13`, `R1-14`, `R1-15`, `R1-16`
- `R2-01`, `R2-02`, `R2-03`, `R2-04`, `R2-05`, `R2-06`, `R2-07`, `R2-09`, `R2-10`, `R2-11`, `R2-12`, `R2-13`

---

## 5. Completion Rule

ถือว่าปิด gap หนึ่งหัวข้อได้เมื่อครบทั้ง 3 ชั้น:
- Requirements ระบุ canonical behavior / field / side effect
- SD_Flow ระบุ field-level request-response และ error/validation
- UX_Flow ระบุ in-scope endpoints, source endpoint ของ picker/read model, และ semantics แบบ `reference only` / `not in current contract` ชัด
