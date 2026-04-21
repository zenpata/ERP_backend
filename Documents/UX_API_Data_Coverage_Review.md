# UX/API/Data Coverage Review

รีวิวเทียบ `Documents/UX_Flow/Functions`, `Documents/Requirements`, และ `Documents/SD_Flow`

## Scope
- ตรวจทุกไฟล์ใน `Documents/UX_Flow/Functions`
- เทียบกับ `Documents/Requirements/Release_1.md`, `Documents/Requirements/Release_2.md`
- ใช้ `Documents/Requirements/Release_1_traceability_mermaid.md`, `Documents/Requirements/Release_2_traceability_mermaid.md` และ `Documents/SD_Flow/_coverage_matrix.md` เป็นตัวช่วย map
- โฟกัส 4 มุม: request/action, response/read-display, reference/options API, persistence/storage

## Executive Summary

### ภาพรวม
- endpoint coverage เชิง "มี endpoint ครบไหม" โดยรวมค่อนข้างดี และ `_coverage_matrix.md` ระบุว่าไม่มี endpoint หายทั้ง R1/R2
- gap หลักไม่ได้อยู่ที่ "ไม่มี endpoint" แต่เป็น "contract ราย field ยังไม่พอ" โดยเฉพาะใน `Documents/SD_Flow`
- หลาย UX flow ระบุ field/action ละเอียดกว่า SD contract มาก ทำให้ FE/BE มีโอกาสตีความต่างกัน
- มีบาง flow ใน UX ที่ปนขอบเขต release หรือมี copy/paste ผิด sub-flow ทำให้ request/action ใน step ไม่ตรง endpoint จริง

### Severity Summary
- `High`: SD contract เป็น placeholder ในหลายโมดูลหลัก ทำให้พิสูจน์ request/response ไม่ได้
- `High`: บาง UX doc ระบุ field/action ไม่ตรง requirement จริง
- `Medium`: dropdown/detail/prefill/summary ที่ FE ต้องใช้ยังไม่ถูก define ชัด
- `Medium`: persistence side effect หลายเรื่องยังเป็น implied behavior มากกว่า documented contract

## Mapping Matrix

| UX File | Requirement | SD_Flow หลัก |
|---|---|---|
| `R1-01_Auth_Login_and_Session.md` | Feature 1.1 | `User_Login/login.md` |
| `R1-02_HR_Employee_Management.md` | Feature 1.2 | `HR/employee.md` |
| `R1-03_HR_Organization_Management.md` | Feature 1.3 | `HR/organization.md` |
| `R1-04_HR_Leave_Management.md` | Feature 1.4 | `HR/leaves.md` |
| `R1-05_HR_Payroll.md` | Feature 1.5 | `HR/payroll.md` |
| `R1-06_Finance_Invoice_AR.md` | Feature 1.6 | `Finance/invoices.md` |
| `R1-07_Finance_Vendor_Management.md` | Feature 1.7 | `Finance/vendors.md` |
| `R1-08_Finance_Accounts_Payable.md` | Feature 1.8 | `Finance/ap.md` |
| `R1-09_Finance_Accounting_Core.md` | Feature 1.9 | `Finance/accounting_core.md` |
| `R1-10_Finance_Reports_Summary.md` | Feature 1.10 | `Finance/reports.md` |
| `R1-11_PM_Budget_Management.md` | Feature 1.11 | `PM/budgets.md` |
| `R1-12_PM_Expense_Management.md` | Feature 1.12 | `PM/expenses.md` |
| `R1-13_PM_Progress_Tasks.md` | Feature 1.13 | `PM/progress.md` |
| `R1-14_PM_Dashboard.md` | Feature 1.14 | `PM/dashboard.md` |
| `R1-15_Settings_User_Management.md` | Feature 1.15 | `User_Login/user_role_permission.md` |
| `R1-16_Settings_Role_and_Permission.md` | Feature 1.16 | `User_Login/user_role_permission.md` |
| `R2-01_Customer_Management.md` | Feature 3.1 | `Finance/customers.md` |
| `R2-02_AR_Payment_Tracking.md` | Feature 3.2 | `Finance/invoices.md`, `Finance/reports.md` |
| `R2-03_Thai_Tax_VAT_WHT.md` | Feature 3.3 | `Finance/tax.md` |
| `R2-04_Financial_Statements.md` | Feature 3.4 | `Finance/reports.md` |
| `R2-05_Cash_Bank_Management.md` | Feature 3.5 | `Finance/bank_accounts.md` |
| `R2-06_Purchase_Order.md` | Feature 3.6 | `Finance/purchase_orders.md` |
| `R2-07_Attendance_and_Time_Tracking.md` | Feature 3.7 | `HR/attendance_overtime.md` |
| `R2-08_Company_Organization_Settings.md` | Feature 3.8 | `User_Login/settings_admin_r2.md` |
| `R2-09_Document_Print_Export.md` | Feature 3.9 | `Finance/document_exports.md` |
| `R2-10_Notification_Workflow_Alerts.md` | Feature 3.10 | `User_Login/settings_admin_r2.md` |
| `R2-11_Sales_Order_Quotation.md` | Feature 3.11 | `Finance/quotation_sales_orders.md` |
| `R2-12_Audit_Trail.md` | Feature 3.12 | `User_Login/settings_admin_r2.md` |
| `R2-13_Global_Dashboard.md` | Feature 3.13 | `PM/global_dashboard.md` |

## Highest-Risk Findings

### 1. SD_Flow ยังเป็น placeholder มากเกินไป
- พบไฟล์จำนวนมากที่ยังมี request/response แบบ `{}` หรือ `"data": {}` เช่น `Documents/SD_Flow/HR/employee.md`, `Documents/SD_Flow/HR/organization.md`, `Documents/SD_Flow/HR/payroll.md`, `Documents/SD_Flow/Finance/invoices.md`, `Documents/SD_Flow/Finance/ap.md`, `Documents/SD_Flow/Finance/vendors.md`, `Documents/SD_Flow/Finance/reports.md`, `Documents/SD_Flow/Finance/customers.md`, `Documents/SD_Flow/Finance/bank_accounts.md`, `Documents/SD_Flow/Finance/purchase_orders.md`, `Documents/SD_Flow/HR/attendance_overtime.md`, `Documents/SD_Flow/PM/dashboard.md`, `Documents/SD_Flow/PM/global_dashboard.md`, `Documents/SD_Flow/User_Login/settings_admin_r2.md`
- ผลกระทบ: endpoint มีชื่อครบ แต่ยังยืนยันไม่ได้ว่า FE ต้องส่ง field อะไรและจะได้ response อะไรกลับมา
- ควรแก้ที่: `SD_Flow` ก่อนเป็นลำดับแรก

### 2. HR Leave และ HR Payroll มี step บางส่วนผิดบริบท
- `Documents/UX_Flow/Functions/R1-04_HR_Leave_Management.md` มีหลาย step ที่ field/action ไม่ตรง endpoint ของ sub-flow นั้น
- `Documents/UX_Flow/Functions/R1-05_HR_Payroll.md` มีหลาย step ที่มี field/action ข้าม sub-flow เช่น process, approve, mark-paid, payslip export, allowance, tax settings ปะปนกัน
- ผลกระทบ: ถ้าใช้ UX เป็น source หลัก ทีม FE/BE จะ implement ผิด contract ได้เลย
- ควรแก้ที่: `UX_Flow` ด่วน แล้วค่อย sync กลับ `Requirements` และ `SD_Flow`

### 3. หลาย UX file ปนขอบเขต R1/R2
- `Documents/UX_Flow/Functions/R1-06_Finance_Invoice_AR.md` ครอบคลุม payment, status, export, VAT/company-setting dependency เกินขอบเขต BR ของ R1
- `Documents/UX_Flow/Functions/R1-08_Finance_Accounts_Payable.md` ปน PO/WHT/bank behavior ซึ่งเป็นแนว R2
- `Documents/UX_Flow/Functions/R1-10_Finance_Reports_Summary.md` รวม deep reports และ export references มากกว่าขอบเขต R1 summary
- ผลกระทบ: คนอ่านเอกสารเข้าใจว่า API พร้อมแล้วทั้งที่ requirement ยังไม่ confirm
- ควรแก้ที่: `UX_Flow` และ `Requirements`

## Detailed Findings By Function

### R1

#### `R1-01_Auth_Login_and_Session.md`
- `Medium` `GET /api/auth/me` ยังไม่ชัดว่าต้องคืนอะไรบ้างสำหรับ FE เช่น `roles`, `permissions`, linked employee profile, first-login state
- `Medium` refresh/logout/session invalidation ยังไม่มี persistence contract ชัด
- `High` `Documents/SD_Flow/User_Login/login.md` ยังเป็น placeholder สำหรับ `/refresh`, `/me`, `/me/password`

#### `R1-02_HR_Employee_Management.md`
- `High` request field ไม่ตรง requirement: UX ใช้ `employmentDate` แต่ requirement ใช้ `hireDate`
- `High` UX ยังไม่ครอบคลุม create fields สำคัญบางตัว เช่น `phone`, `dateOfBirth`, `nationalId`, `address`, `bankAccountNo`, `bankName`, `socialSecurityNo`, `taxId`
- `High` terminate flow ต้องส่ง `terminationDate` และ `reason` แต่ SD contract ยังไม่ระบุชัด
- `Medium` list/detail/self profile ยังไม่ lock response fields ที่ FE ต้องแสดง เช่น status, endDate, financial/tax/social-security fields, hasUserAccount
- `Medium` dropdown/reference ของ department/position และ user-account linkage ยังอธิบายไม่พอ
- `High` `Documents/SD_Flow/HR/employee.md` ยังเป็น placeholder แทบทุก endpoint

#### `R1-03_HR_Organization_Management.md`
- `High` create/edit position ยังไม่ lock `departmentId` ชัด
- `High` manager selector ไม่มี source ของ active employee ที่ชัด
- `Medium` response สำหรับ hierarchy, manager display, dependency count ก่อน delete ยังไม่ชัด
- `High` `Documents/SD_Flow/HR/organization.md` ยังไม่พอเป็น implementation contract

#### `R1-04_HR_Leave_Management.md`
- `High` หลาย step มี field/action ผิด sub-flow จาก copy/paste
- `Medium` response fields สำหรับ approve/reject/result timeline เช่น `approvedAt`, `rejectedAt`, `rejectReason`, `attachmentUrl`, `remaining` ยังไม่ชัด
- `Medium` admin flows ต้องใช้ `employeeId`, `approverId`, `departmentId` แต่ source ของ dropdown/options ไม่ชัด
- `Medium` attachment retention และ approval history persistence ยังไม่ชัด
- `High` `Documents/SD_Flow/HR/leaves.md` ยังไม่ระบุ payload หลักพอ

#### `R1-05_HR_Payroll.md`
- `High` หลาย step ผิด context เช่น process/approve/mark-paid/export/config master ปะปนกัน
- `Medium` FE read model ของ run summary, payslip items, warnings, integration result, journal reference ยังไม่ชัด
- `High` persistence ของ `ss_records` และ `ss_submissions` ยังไม่มี REST/contract ชัด แต่ UX พยายามใช้ข้อมูลจาก payslip แทน
- `High` `Documents/SD_Flow/HR/payroll.md` ยังไม่ชัดเรื่อง sync/async, polling, และ payload shape

#### `R1-06_Finance_Invoice_AR.md`
- `High` UX ระบุ AR payment/history ทั้งที่ R1 requirement ยังไม่ define persistence contract ของ `invoice_payments`
- `High` `Documents/SD_Flow/Finance/invoices.md` ยัง placeholder สำหรับ list/create/detail/status/payments
- `Medium` detail response ยังไม่ lock fields อย่าง subtotal, tax, balanceDue, payment totals
- `Medium` customer picker/options payload ยังไม่ชัด
- `Medium` UX ปน dependency เรื่อง VAT/company settings ซึ่งยังไม่อยู่ใน R1 scope แบบชัดเจน

#### `R1-07_Finance_Vendor_Management.md`
- `High` response/detail/options ยังไม่ชัด ทั้ง code/name/taxId/payment terms/active state
- `Medium` create/update/toggle active payload ยังไม่ถูก lock
- `Medium` soft-delete visibility/detail behavior ยังไม่ชัด
- `Low` dropdown payload shape สำหรับ vendor options ยังไม่ชัด

#### `R1-08_Finance_Accounts_Payable.md`
- `High` UX ปน concept จาก R2 เช่น PO, WHT, bank/payment behavior
- `High` `Documents/SD_Flow/Finance/ap.md` ยัง placeholder ทั้ง request/response หลัก
- `Medium` detail/history response ยังไม่ชัดสำหรับ items, payments, remaining balance
- `Medium` inline vendor create path ยังไม่ชัดว่าต้องคืน field อะไรให้ฟอร์มเลือกต่อทันที
- `Medium` status transition contract และ reject reason ยังไม่ชัด

#### `R1-09_Finance_Accounting_Core.md`
- `High` แม้ SD ดีกว่าโมดูลอื่น แต่ list/read/error payload ยังไม่ละเอียดพอสำหรับ journal, mapping, categories, recovery flow
- `Medium` account/category selector ยังไม่มี options contract ชัด
- `Medium` integration retry/recovery error payload ยังไม่พอให้ FE เปิดหน้าซ่อม mapping ได้อย่าง deterministic

#### `R1-10_Finance_Reports_Summary.md`
- `High` UX เกิน scope R1 เพราะรวม ar-aging, P&L, balance sheet, cash flow, exports
- `High` `Documents/SD_Flow/Finance/reports.md` ยังไม่ define KPI response shape ชัด
- `Medium` disclaimer เรื่อง AR number ใน R1 ยังไม่ชัดว่าจะส่ง metadata มาหรือเป็นแค่ note ใน UX

#### `R1-11_PM_Budget_Management.md`
- `High` UX กับ SD example ไม่ตรงกันเรื่อง create fields เช่น `projectId`, `startDate`, `endDate`, `description`
- `High` UX ใช้ summary fields แบบ R2 (`allocated`, `actualSpend`, `committed`, `available`) แต่ R1 requirement ยังไม่ยืนยัน
- `Medium` detail response และ delete semantics ยังไม่ชัด

#### `R1-12_PM_Expense_Management.md`
- `High` `Documents/SD_Flow/PM/expenses.md` ยัง placeholder ทั้ง request/response
- `Medium` budget picker ยังไม่มี options contract ชัด
- `Medium` approved/rejected metadata ใน detail/list ยังไม่ชัด
- `Low` receipt upload/file behavior ยังไม่ตรงกับ schema ที่มีแค่ `receiptUrl`

#### `R1-13_PM_Progress_Tasks.md`
- `High` assignee employee selector และ budget selector ยังไม่มี reference/options contract ชัด
- `Medium` list/detail response ยังไม่ชัดเรื่อง priority, overdue context, assignee, dueDate, completedDate
- `Medium` delete semantics ยังไม่ชัดว่า hard/soft delete

#### `R1-14_PM_Dashboard.md`
- `High` `Documents/SD_Flow/PM/dashboard.md` ยัง placeholder ทั้ง widget payload
- `Medium` widget filters/query params ยังไม่ถูก lock
- `Medium` dashboard พึ่ง `GET /api/auth/me` เพื่อ RBAC แต่ traceability ยังไม่ชัด

#### `R1-15_Settings_User_Management.md`
- `Medium` list response/filter ยังไม่ชัดพอสำหรับ users table
- `Medium` create user พึ่ง `GET /api/hr/employees?hasUserAccount=false` แต่ contract ของ filter/payload ยังไม่ชัด
- `Medium` `mustChangePassword` และ force logout on deactivate ยังไม่มี persistence/session contract ชัด
- `Medium` `Documents/SD_Flow/User_Login/user_role_permission.md` ยังไม่ละเอียดพอสำหรับ list/activate/update roles

#### `R1-16_Settings_Role_and_Permission.md`
- `Medium` UX เพิ่ม `cloneFromRoleId` แต่ requirement/SD ยังไม่มี
- `High` permission matrix ต้องใช้ current `permissionIds` และ delete impact แต่ list/detail contract ยังไม่พอ
- `Medium` attached-user count/filter by role ยังไม่มี contract ชัด
- `Medium` audit log หลัง grant/revoke ยังไม่ถูกสะท้อนใน UX/SD ชัด

### R2

#### `R2-01_Customer_Management.md`
- `High` detail/options response ยังไม่ชัดสำหรับ AR summary, invoice history, overdue badge, credit context
- `Medium` dropdown behavior ยังไม่ define active-only, label format, overdue/credit flags
- `Medium` lifecycle behavior ของ inactive vs soft-deleted customer ยังไม่ชัด
- `High` cross-module `creditWarning` contract ยังไม่ถูก define ชัดใน invoice/quotation SD

#### `R2-02_AR_Payment_Tracking.md`
- `High` payment create request fields ยังไม่ได้ถูก lock ใน `Documents/SD_Flow/Finance/invoices.md`
- `Medium` invoice/payment refresh response ยังไม่ชัดเรื่อง paidAmount, balanceDue, status, payment rows
- `Medium` bank-account options dependency ยังไม่ถูกอ้างใน SD contract
- `Medium` auto-created bank movement side effect ยังไม่ได้ document ชัด

#### `R2-03_Thai_Tax_VAT_WHT.md`
- `High` payroll-origin WHT branch ยังไม่มี contract ชัด โดยเฉพาะ source tagging และ payload
- `Medium` VAT/WHT review screens ยังไม่ lock row/detail fields พอสำหรับ audit
- `Medium` tax master lookup ที่ source documents ต้องใช้ยังไม่ชัด
- `Low` export contract กระจายอยู่หลายไฟล์ ทำให้ trace ยาก

#### `R2-04_Financial_Statements.md`
- `High` statement payload shape ยังไม่ชัดสำหรับ comparePrevious, grouping, section totals, cash-flow buckets
- `High` reports hub / summary dependency ยังไม่ชัดว่า required หรือ optional
- `Medium` cash-flow lineage จาก `bank_transactions`, payroll, AP ยังไม่ถูกอธิบายเรื่องความครบของ data source
- `Medium` export parity กับ on-screen totals ยังไม่ถูก define

#### `R2-05_Cash_Bank_Management.md`
- `High` create/options/reconcile request fields ยังไม่ถูก lock ชัด
- `Medium` movement history response ยังไม่ชัดเรื่อง source, direction, running balance, reconcile state
- `Medium` downstream bank-account options behavior สำหรับ AR/AP ยังไม่ชัด
- `Medium` auto-posting side effect จาก AR/AP ไป `bank_transactions` ยังไม่ถูก document พอ
- `Low` UX พูดถึง GL mapping แต่ requirement ยังไม่ชัดว่ามี field นี้จริง

#### `R2-06_Purchase_Order.md`
- `High` create/update PO และ goods receipt payload ยังไม่ถูก define พอ
- `High` Gap C เรื่อง budget impact ยังไม่ถูกลง contract ใน SD/persistence
- `Medium` 3-way matching read model ยังไม่ชัด เช่น received qty, billed qty, remaining qty
- `Medium` upstream vendor/budget references ยังไม่ถูก define ชัด

#### `R2-07_Attendance_and_Time_Tracking.md`
- `High` non-list sub-flows หลายตัวไม่มี payload contract ชัด เช่น assign, check-in/out, approve/reject OT, holiday actions
- `Medium` attendance summary ที่ payroll ต้องใช้ยังไม่มี response shape ชัด
- `Medium` employee options และ join logic กับ holiday/schedule context ยังไม่ชัด
- `High` integration path ไป payroll/notifications ยังไม่ถูก define พอ แม้ feature value พึ่งสิ่งนี้โดยตรง

#### `R2-08_Company_Organization_Settings.md`
- `High` request field naming mismatch: UX ใช้ `companyNameTh`, `defaultCurrency` แต่ requirement ใช้ `companyName`, `currency`
- `High` singleton settings/fiscal metadata response ยังไม่ชัด เช่น `logoUrl`, `closedAt`, `closedBy`
- `Medium` `reopenReason` มีใน UX แต่ requirement/SD/persistence ยังไม่รองรับ
- `Medium` year/status/month/currency filter options ยังไม่มี contract ชัด

#### `R2-09_Document_Print_Export.md`
- `High` binary/HTML export response contract ยังไม่ชัด เช่น MIME type, filename, disposition
- `High` async export flow สำหรับงานใหญ่ยังไม่ถูกสะท้อนใน UX ชัด แม้ requirement บอกว่าควร queue ได้
- `Medium` generated artifact persistence/caching/expiry ยังไม่ชัด
- `Medium` support matrix ว่า endpoint ไหนรองรับ `pdf/xlsx/preview` ยังไม่มี source เดียว

#### `R2-10_Notification_Workflow_Alerts.md`
- `High` ไม่มี source ของ `eventType` catalog สำหรับ settings grid
- `High` filter contract ของ inbox/list ยังไม่ตรงกันระหว่าง UX กับ requirement เช่น `type`, `dateRange`, sort, limit
- `Medium` notification response metadata ยังไม่พอสำหรับ dropdown/full list/actionUrl
- `Medium` retention/archive behavior ยังไม่สะท้อนใน UX

#### `R2-11_Sales_Order_Quotation.md`
- `High` `creditWarning` และ monetary fields ใน create/convert responses ยังไม่ถูก define พอ
- `Medium` pipeline detail/read model ยังไม่ชัดเรื่อง linked quotation/SO/invoice, remaining qty, conversion status
- `Medium` conversion side effects/persistence ยังไม่ชัดพอที่จะกัน duplicate conversion
- `Low` customer options contract ยังต้องอ้างจากอีกโมดูลแบบ implicit

#### `R2-12_Audit_Trail.md`
- `High` filter dropdowns เช่น `userId`, `module`, `entityType` ยังไม่มี reference/options contract ชัด
- `High` diff/detail contract ยังไม่ชัดว่าจะอ่านจาก list payload, entity-history endpoint หรือควรมี detail endpoint ใหม่
- `Medium` UX ใช้ `action=approve` แต่ requirement ฝั่ง audit action values ใช้ชุดอื่น
- `Medium` immutable/system-generated log display behavior ยังไม่ชัด

#### `R2-13_Global_Dashboard.md`
- `High` widget content หลายส่วนต้องใช้ series/list data แต่ requirement/SD ยังมีแต่ scalar KPI
- `High` `Documents/SD_Flow/PM/global_dashboard.md` ยัง placeholder ทั้งก้อน
- `Medium` cache freshness / `asOf` metadata ยังไม่ถูก define
- `Medium` alert type/deep-link contract ยังไม่ชัด
- `Medium` RBAC trimming behavior ยังไม่ชัดว่า BE ควร omit data หรือ FE เป็นคนซ่อน

## Cross-Document Mismatches

### Naming / Field mismatch
- `R1-02_HR_Employee_Management.md`: `employmentDate` vs requirement `hireDate`
- `R2-08_Company_Organization_Settings.md`: `companyNameTh`, `defaultCurrency` vs requirement `companyName`, `currency`
- `R1-16_Settings_Role_and_Permission.md`: `cloneFromRoleId` มีใน UX แต่ไม่มีใน requirement

### Scope mismatch
- `R1-06_Finance_Invoice_AR.md` ปน payment/status/export/VAT dependency
- `R1-08_Finance_Accounts_Payable.md` ปน PO/WHT/bank behavior
- `R1-10_Finance_Reports_Summary.md` ปน deep reports/export

### Traceability / reference mismatch
- หลาย SD doc ยังอ้าง `Documents/Release_1.md` หรือ `Documents/Release_2.md` แทน path ใต้ `Documents/Requirements/`
- Notification, Audit Trail, Company Settings ถูกรวมอยู่ใน `Documents/SD_Flow/User_Login/settings_admin_r2.md` ทำให้ trace ตาม feature ยาก

## Recommended Fix Order

### Wave 1: แก้ความผิดพลาดที่ทำให้ implement ผิดทันที
- แก้ `R1-04_HR_Leave_Management.md`
- แก้ `R1-05_HR_Payroll.md`
- แก้ field mismatch ใน `R1-02_HR_Employee_Management.md`
- แก้ field mismatch ใน `R2-08_Company_Organization_Settings.md`

### Wave 2: ยกระดับ SD contracts ของโมดูลหลัก
- `Documents/SD_Flow/HR/employee.md`
- `Documents/SD_Flow/HR/organization.md`
- `Documents/SD_Flow/HR/payroll.md`
- `Documents/SD_Flow/Finance/invoices.md`
- `Documents/SD_Flow/Finance/ap.md`
- `Documents/SD_Flow/Finance/reports.md`
- `Documents/SD_Flow/Finance/customers.md`
- `Documents/SD_Flow/Finance/bank_accounts.md`
- `Documents/SD_Flow/Finance/purchase_orders.md`
- `Documents/SD_Flow/HR/attendance_overtime.md`
- `Documents/SD_Flow/User_Login/settings_admin_r2.md`
- `Documents/SD_Flow/PM/global_dashboard.md`

### Wave 3: ปรับ scope และ traceability ให้ชัด
- แยกสิ่งที่เป็น R2 หรือ future scope ออกจาก R1 UX docs
- เพิ่ม option/reference API หรืออย่างน้อย response shape สำหรับ dropdown/prefill/detail ที่ต้องใช้ซ้ำหลายโมดูล
- บันทึก persistence side effects ที่สำคัญ เช่น bank movements, credit warnings, payroll attendance impact, audit/reopen reason

## Suggested Documentation Standard
- ทุก endpoint ใน `SD_Flow` ควรมี `Request Body` และ `Response Body` แบบ field-level example จริง ไม่ใช้ `{}` เมื่อเป็น endpoint ที่ FE เรียกจริง
- ทุก UX sub-flow ที่มี form ควรมี field matrix: `field`, `required?`, `source`, `maps to request`
- ทุก dropdown/prefill/detail dependency ควรอ้าง source endpoint ชัด
- ทุก persistence side effect สำคัญควรมี note ว่าเขียน table/field อะไร และ FE จะเห็นผลกลับจาก endpoint ไหน

## Conclusion
- เอกสารชุดนี้พร้อมสำหรับการใช้เป็น coverage map ระดับ endpoint
- แต่ยังไม่พร้อมเป็น implementation contract ระดับ field สำหรับหลายโมดูล
- ถ้าต้องเลือกจุดเริ่มต้นเดียว ให้เริ่มจากแก้ `SD_Flow` ที่เป็น placeholder และ UX docs ที่มี step ผิด context ก่อน
