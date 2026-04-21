# UX Flow — Release 1 & 2 (All Functions)

เอกสารนี้สรุป UX flow ของทุก function/feature ใน `Release_1.md` และ `Release_2.md` โดยยึด pattern เดียวกับ `Documents/UX_Flow/Login.md` และ `_TEMPLATE.md`

**แหล่งอ้างอิง**
- BR: `Documents/Requirements/Release_1.md`
- BR: `Documents/Requirements/Release_2.md`
- Traceability: `Documents/Requirements/Release_1_traceability_mermaid.md`
- Traceability: `Documents/Requirements/Release_2_traceability_mermaid.md`

---

## R1-01 Auth — Login & Session

**Flow name:** `Auth — User Login and Session Handling`  
**Actor(s):** ผู้ใช้ทุกบทบาท  
**Entry:** เข้า `/login` หรือถูก redirect เพราะ session หมดอายุ  
**Exit:** เข้าระบบสำเร็จพร้อม permission context  
**Out of scope:** forgot password, MFA

### Step 1 — Login form
**Goal:** เริ่ม authentication  
**User sees:** email/password, login button, session-expired banner (ถ้ามี)  
**User can do:** กรอกฟอร์มและ submit  
**Frontend behavior:** validate เบื้องต้น, disable submit เมื่อข้อมูลไม่ครบ  
**System / AI behavior:** รอ submit  
**Success:** พร้อมยิง `/api/auth/login`  
**Error:** แสดง form error

### Step 2 — Submit credential
**Goal:** ตรวจสอบตัวตน  
**User sees:** loading state  
**User can do:** รอผลลัพธ์  
**Frontend behavior:** call `POST /api/auth/login`  
**System / AI behavior:** verify password, role, permission, active status  
**Success:** ได้ token + user + permissions  
**Error:** invalid credential, locked, inactive

### Step 3 — Bootstrap session
**Goal:** เตรียม app context  
**User sees:** short loading ก่อนเข้า app  
**User can do:** รอ redirect  
**Frontend behavior:** call `/api/auth/me`, set auth state, route by permission  
**System / AI behavior:** validate token, join user-employee context  
**Success:** เข้า landing page ตาม role  
**Error:** token invalid -> กลับ `/login`

---

## R1-02 HR — Employee Management

**Flow name:** `HR — Employee CRUD and Profile`  
**Actor(s):** HR Admin, Employee (self view)  
**Entry:** `/hr/employees`  
**Exit:** สร้าง/แก้ไข/terminate สำเร็จ  
**Out of scope:** Attendance/OT (R2)

### Step 1 — Employee list
**Goal:** ค้นหาและเลือกพนักงาน  
**User sees:** table + search/filter + pagination  
**User can do:** search, open detail, open create  
**Frontend behavior:** call `GET /api/hr/employees`  
**System / AI behavior:** query employee + org refs  
**Success:** แสดงรายการตรง filter  
**Error:** list load fail + retry

### Step 2 — Create/Edit employee
**Goal:** บันทึกข้อมูลพนักงาน  
**User sees:** form sections personal/work/financial  
**User can do:** submit create/update  
**Frontend behavior:** `POST/PATCH /api/hr/employees`  
**System / AI behavior:** validate unique email/code, persist data  
**Success:** save สำเร็จ + กลับ detail/list  
**Error:** duplicate/validation fail

### Step 3 — Terminate employee
**Goal:** ปิดสถานะพนักงานแบบ soft  
**User sees:** confirm terminate modal  
**User can do:** ยืนยันวันสิ้นสุดและเหตุผล  
**Frontend behavior:** call `DELETE /api/hr/employees/:id`  
**System / AI behavior:** enforce dependencies (payroll/leave pending)  
**Success:** status=`terminated` + endDate set  
**Error:** blocked by business rules

---

## R1-03 HR — Organization Management

**Flow name:** `HR — Department and Position Management`  
**Actor(s):** HR Admin  
**Entry:** `/hr/organization`  
**Exit:** โครงสร้างองค์กรอัปเดตสำเร็จ  
**Out of scope:** advanced org chart analytics

### Step 1 — View organization
**Goal:** เห็น departments/positions ปัจจุบัน  
**User sees:** list หรือ split view  
**User can do:** create/edit/delete entities  
**Frontend behavior:** call `GET /api/hr/departments`, `GET /api/hr/positions`  
**System / AI behavior:** return hierarchy + references  
**Success:** โครงสร้างโหลดครบ  
**Error:** fetch fail

### Step 2 — Create/Edit
**Goal:** เพิ่มหรือแก้ไขหน่วยงาน/ตำแหน่ง  
**User sees:** form/modal  
**User can do:** submit changes  
**Frontend behavior:** `POST/PATCH` endpoints  
**System / AI behavior:** validate unique code and valid refs  
**Success:** list refresh ทันที  
**Error:** invalid manager/duplicate code

### Step 3 — Delete with guard
**Goal:** ลบเฉพาะรายการที่ไม่ถูกใช้งาน  
**User sees:** warning modal  
**User can do:** confirm delete  
**Frontend behavior:** call `DELETE` endpoints  
**System / AI behavior:** block if active employees still attached  
**Success:** delete สำเร็จ  
**Error:** dependency block

---

## R1-04 HR — Leave Management

**Flow name:** `HR — Leave Request and Approval`  
**Actor(s):** Employee, HR Admin, Manager  
**Entry:** `/hr/leaves`  
**Exit:** leave request approved/rejected  
**Out of scope:** mobile leave UX

### Step 1 — Create leave request
**Goal:** ส่งคำขอลา  
**User sees:** leave form + balance summary  
**User can do:** เลือก type/date/reason/attachment  
**Frontend behavior:** call `POST /api/hr/leaves`  
**System / AI behavior:** validate policy + approver config  
**Success:** request status=`pending`  
**Error:** invalid range/attachment/balance

### Step 2 — Review and approve/reject
**Goal:** ผู้อนุมัติดำเนินการคำขอ  
**User sees:** leave list + pending queue  
**User can do:** approve/reject  
**Frontend behavior:** call `/approve` or `/reject`  
**System / AI behavior:** update status; adjust balance on approve  
**Success:** status updated + audit-ready  
**Error:** stale state or permission denied

### Step 3 — Post action visibility
**Goal:** สื่อสารผลให้ผู้เกี่ยวข้อง  
**User sees:** updated status and history  
**User can do:** filter by status/date  
**Frontend behavior:** refetch list  
**System / AI behavior:** store timestamps/approver info  
**Success:** ทุกฝ่ายเห็นสถานะเดียวกัน  
**Error:** sync lag + refresh prompt

### Step 4 — HR: master การลา (types / balances / approval-configs)
**Goal:** ปิดช่องว่างโควต้าและสายอนุมัติหลังสร้างแผนกหรือพนักงานใหม่  
**User sees:** แท็บหรือส่วนเพิ่มใน `/hr/leaves` สำหรับ HR  
**User can do:** CRUD ประเภทลา; จัดสรร `leave_balances`; ตั้ง `leave_approval_configs` ต่อแผนก  
**Frontend behavior:** `POST/PATCH /api/hr/leaves/types`; `GET/POST/PATCH /api/hr/leaves/balances` และ `POST .../bulk-allocate`; `GET/POST/PATCH/DELETE /api/hr/leaves/approval-configs`  
**System / AI behavior:** enforce unique approval level ต่อแผนก; `used` ผ่าน approve เท่านั้น  
**Success:** พนักงานยื่นลาได้และ approver เห็นยอดคงเหลือ  
**Error:** 409 ซ้ำ config / ไม่มี balance  

---

## R1-05 HR — Payroll

**Flow name:** `HR — Payroll Run Lifecycle`  
**Actor(s):** HR Admin, Finance Manager  
**Entry:** `/hr/payroll`  
**Exit:** run ไปถึง `paid` และ trigger finance integration  
**Out of scope:** payslip PDF (R2 doc export)

### Step 1 — Create payroll run
**Goal:** สร้างงวดเงินเดือน  
**User sees:** period selector + runs table  
**User can do:** create run  
**Frontend behavior:** call `POST /api/hr/payroll/runs`  
**System / AI behavior:** enforce unique month/year  
**Success:** run status=`draft`  
**Error:** duplicate period

### Step 2 — Process and review
**Goal:** คำนวณ payslip ทั้งงวด  
**User sees:** process progress + payslip list  
**User can do:** process/reprocess, inspect lines, เปิดหน้า config ถ้ามี warning เรื่อง config  
**Frontend behavior:** call `/process`, `/payslips`, และ config endpoints (`/configs`, `/allowance-types`, `/tax-settings`) เมื่อเข้า `/hr/payroll/configs`  
**System / AI behavior:** calc salary, tax, SS, unpaid leave deductions โดยอ่านค่าล่าสุดจาก payroll configs/allowance types/tax settings  
**Success:** run status=`processed`  
**Error:** missing employee data/config พร้อมแนวทางแก้ในหน้า config

### Step 3 — Approve and mark paid
**Goal:** ปิดงวดและบันทึกบัญชี  
**User sees:** action buttons by state  
**User can do:** approve -> mark paid  
**Frontend behavior:** call `/approve`, `/mark-paid`  
**System / AI behavior:** state transition + finance post + ledger entry  
**Success:** run status=`paid`  
**Error:** invalid transition/integration fail

---

## R1-06 Finance — Invoice (AR)

**Flow name:** `Finance — AR Invoice Creation and Tracking`  
**Actor(s):** Finance Manager, Accountant  
**Entry:** `/finance/invoices` or `/finance/invoices/new`  
**Exit:** invoice ถูกสร้างและติดตามสถานะได้  
**Out of scope:** full AR payment history (R2)

### Step 1 — Browse invoice list
**Goal:** ติดตาม invoice ปัจจุบัน  
**User sees:** searchable list + status filters  
**User can do:** open detail/create  
**Frontend behavior:** `GET /api/finance/invoices`  
**System / AI behavior:** paginate and aggregate totals  
**Success:** load list  
**Error:** fetch fail

### Step 2 — Create invoice
**Goal:** ออกใบแจ้งหนี้ใหม่  
**User sees:** header + line item form  
**User can do:** add/remove lines, submit  
**Frontend behavior:** `GET /customers`, `POST /invoices`  
**System / AI behavior:** compute totals/tax and generate invoiceNo  
**Success:** invoice status=`draft`/`sent` per policy  
**Error:** invalid item values/customer

### Step 3 — View detail
**Goal:** ตรวจข้อมูลก่อนส่งลูกค้า  
**User sees:** invoice header/items/total  
**User can do:** review, change status (if allowed)  
**Frontend behavior:** `GET /api/finance/invoices/:id`  
**System / AI behavior:** return full document view  
**Success:** invoice ready for next step  
**Error:** not found/forbidden

---

## R1-07 Finance — Vendor Management

**Flow name:** `Finance — Vendor Master Data`  
**Actor(s):** Finance Manager, Procurement Officer  
**Entry:** `/finance/vendors`  
**Exit:** vendor ถูกสร้าง/แก้ไข/activate/deactivate  
**Out of scope:** vendor scorecard

### Step 1 — Vendor list management
**Goal:** ดูและจัดการ vendor inventory  
**User sees:** table + search + active filter  
**User can do:** edit, activate, soft delete  
**Frontend behavior:** `GET /vendors`, actions on row  
**System / AI behavior:** apply status/deletedAt rules  
**Success:** state updated  
**Error:** blocked by linked AP bills

### Step 2 — Create/Edit vendor
**Goal:** บันทึกข้อมูล vendor ให้ครบ  
**User sees:** vendor form  
**User can do:** submit  
**Frontend behavior:** `POST/PATCH /vendors`  
**System / AI behavior:** validate unique code and required fields  
**Success:** vendor usable in AP dropdown  
**Error:** duplicate/validation fail

### Step 3 — Option list usage
**Goal:** ใช้ vendor ที่ active ในธุรกรรม  
**User sees:** dropdown เฉพาะ active vendors  
**User can do:** select vendor quickly  
**Frontend behavior:** `GET /vendors/options`  
**System / AI behavior:** filter inactive/deleted vendors  
**Success:** transaction forms fill correctly  
**Error:** no active vendor

---

## R1-08 Finance — Accounts Payable (AP)

**Flow name:** `Finance — AP Bill and Payment Workflow`  
**Actor(s):** Accountant, Finance Manager  
**Entry:** `/finance/ap`  
**Exit:** bill ถูกจ่ายครบหรือบางส่วน  
**Out of scope:** bank reconciliation auto-match (R2+)

### Step 1 — Create AP bill
**Goal:** บันทึกใบแจ้งหนี้จาก vendor  
**User sees:** bill form + items  
**User can do:** create bill  
**Frontend behavior:** `POST /api/finance/ap/vendor-invoices`  
**System / AI behavior:** generate documentNo, compute total  
**Success:** status=`draft`/`submitted`  
**Error:** invalid vendor/items

### Step 2 — Approve/Reject bill
**Goal:** ควบคุมขั้นอนุมัติจ่าย  
**User sees:** status actions  
**User can do:** approve or reject  
**Frontend behavior:** `PATCH /:id/status`  
**System / AI behavior:** enforce transition rules  
**Success:** bill status updated  
**Error:** unauthorized or invalid transition

### Step 3 — Record payment
**Goal:** บันทึกการจ่ายเงินจริง  
**User sees:** payment dialog + remaining balance  
**User can do:** add payment records  
**Frontend behavior:** `POST /:id/payments`  
**System / AI behavior:** update paidAmount and derive paid/partially_paid  
**Success:** balanceDue ถูกต้อง  
**Error:** overpayment block

---

## R1-09 Finance — Accounting Core

**Flow name:** `Finance — CoA, Journal, Ledger, Integrations`  
**Actor(s):** Accountant, Finance Manager  
**Entry:** `/finance/accounts`, `/finance/journal`, `/finance/income-expense`  
**Exit:** บันทึกบัญชีถูกต้องแบบ double-entry  
**Out of scope:** multi-company consolidation

### Step 1 — Manage chart of accounts
**Goal:** ดูแลผังบัญชีให้พร้อมใช้งาน  
**User sees:** account tree/list  
**User can do:** create/edit/activate  
**Frontend behavior:** accounts CRUD endpoints  
**System / AI behavior:** validate account structure  
**Success:** accounts usable in journals  
**Error:** invalid hierarchy/code conflict

### Step 2 — Journal workflow
**Goal:** บันทึกและ post journal อย่างสมดุล  
**User sees:** journal form/list/detail  
**User can do:** create, post, reverse  
**Frontend behavior:** journal endpoints  
**System / AI behavior:** enforce debit=credit and posted-lock  
**Success:** posted entries immutable  
**Error:** imbalance/posting fail

### Step 3 — Ledger and auto-post
**Goal:** trace รายการจากโมดูลต้นทาง  
**User sees:** income/expense entries + source links + สถานะ mapping พร้อม action แก้ไข  
**User can do:** filter by source module/date, จัดการ source mappings และ categories เพื่อปลดล็อก auto-post/manual entry  
**Frontend behavior:** ledger/integration endpoints + config endpoints (`/config/source-mappings`, `/income-expense/categories`)  
**System / AI behavior:** create source-linked entries และให้ actionable error เมื่อ mapping/category ไม่พร้อม  
**Success:** traceability end-to-end  
**Error:** missing source mapping/category แต่ผู้ใช้แก้และ retry ได้จาก UI

---

## R1-10 Finance — Reports Summary

**Flow name:** `Finance — KPI Summary Report`  
**Actor(s):** Finance Manager, Management  
**Entry:** `/finance/reports`  
**Exit:** ได้ KPI การเงินตามช่วงเวลา  
**Out of scope:** full statements (R2)

### Step 1 — Select period
**Goal:** ระบุช่วงข้อมูลที่ต้องการ  
**User sees:** period filters  
**User can do:** set from/to  
**Frontend behavior:** call summary API with params  
**System / AI behavior:** aggregate from source tables  
**Success:** parameters accepted  
**Error:** invalid date range

### Step 2 — View KPI cards
**Goal:** อ่านสถานะการเงินเร็ว  
**User sees:** revenue/expense/netProfit/AR/AP  
**User can do:** refresh, change period  
**Frontend behavior:** render summary cards and states  
**System / AI behavior:** return normalized KPI payload  
**Success:** data clearly displayed  
**Error:** API fail -> retry state

### Step 3 — Actionable follow-up
**Goal:** ต่อยอดการวิเคราะห์  
**User sees:** drilldown links (ถ้ามี)  
**User can do:** ไป module ที่เกี่ยวข้อง  
**Frontend behavior:** navigate to source screens  
**System / AI behavior:** preserve filters if supported  
**Success:** workflow ต่อเนื่อง  
**Error:** missing route mapping

---

## R1-11 PM — Budget Management

**Flow name:** `PM — Budget Lifecycle and Utilization`  
**Actor(s):** PM Manager, Finance Manager  
**Entry:** `/pm/budgets`  
**Exit:** budget ถูกตั้งค่าและติดตามการใช้งาน  
**Out of scope:** predictive forecasting

### Step 1 — Create and list budgets
**Goal:** สร้างงบโครงการ  
**User sees:** budget table + create form  
**User can do:** add/edit/status change  
**Frontend behavior:** budget CRUD APIs  
**System / AI behavior:** generate budgetCode + store amount  
**Success:** budget active  
**Error:** invalid amount/date

### Step 2 — View summary
**Goal:** รู้ utilization และ linked expenses  
**User sees:** used/remaining/utilization cards  
**User can do:** inspect related expenses  
**Frontend behavior:** `GET /:id/summary`  
**System / AI behavior:** compute usedAmount from approved expenses  
**Success:** accurate utilization  
**Error:** stale aggregation

### Step 3 — Post adjustment
**Goal:** ส่งผลปรับงบไปบัญชี  
**User sees:** post-adjustment action  
**User can do:** trigger integration  
**Frontend behavior:** call integration endpoint  
**System / AI behavior:** create journal adjustment  
**Success:** adjustment traceable in finance  
**Error:** integration mapping missing

---

## R1-12 PM — Expense Management

**Flow name:** `PM — Expense Request to Approval`  
**Actor(s):** PM Staff, PM Manager, Finance  
**Entry:** `/pm/expenses`  
**Exit:** expense approved/rejected and posted  
**Out of scope:** OCR receipt extraction

### Step 1 — Create expense
**Goal:** บันทึกรายจ่ายโครงการ  
**User sees:** form with budget selector  
**User can do:** create/edit draft  
**Frontend behavior:** expense CRUD endpoints  
**System / AI behavior:** validate budget and fields  
**Success:** draft/submitted record created  
**Error:** invalid budget/date/amount

### Step 2 — Approval action
**Goal:** ตัดสินใจอนุมัติรายจ่าย  
**User sees:** status controls  
**User can do:** approve/reject  
**Frontend behavior:** patch status endpoint  
**System / AI behavior:** update budget usedAmount on approve  
**Success:** status updated  
**Error:** invalid transition

### Step 3 — Finance integration
**Goal:** ลงบัญชีอัตโนมัติจากรายจ่าย  
**User sees:** posted state/source link  
**User can do:** open finance journal  
**Frontend behavior:** call pm-expense integration  
**System / AI behavior:** create journal + ledger refs  
**Success:** cross-module trace complete  
**Error:** posting fail with retry

---

## R1-13 PM — Progress Tasks

**Flow name:** `PM — Task Progress Tracking`  
**Actor(s):** PM Manager, Team Member  
**Entry:** `/pm/progress`  
**Exit:** task status/progress อัปเดตจนจบงาน  
**Out of scope:** gantt planning

### Step 1 — Task list and summary
**Goal:** เห็นงานทั้งหมดและ KPI  
**User sees:** summary stats + task table  
**User can do:** filter/sort/open edit  
**Frontend behavior:** call summary + list APIs  
**System / AI behavior:** compute counts/avg progress/overdue  
**Success:** actionable list shown  
**Error:** API fail

### Step 2 — Create/Edit task
**Goal:** บริหาร lifecycle งาน  
**User sees:** task form  
**User can do:** set assignee, dates, priority, progress  
**Frontend behavior:** create/update endpoints  
**System / AI behavior:** validate progress range and assignee  
**Success:** task saved  
**Error:** invalid progress/assignee

### Step 3 — Status completion
**Goal:** ปิดงานให้ครบถ้วน  
**User sees:** done state and completed date  
**User can do:** mark done/cancelled  
**Frontend behavior:** patch status/progress APIs  
**System / AI behavior:** auto-set completedDate on done  
**Success:** task lifecycle consistent  
**Error:** conflicting updates

---

## R1-14 PM — Dashboard

**Flow name:** `PM — Module Dashboard Overview`  
**Actor(s):** PM Manager, Management  
**Entry:** `/pm/dashboard`  
**Exit:** ได้ภาพรวม budgets/expenses/tasks  
**Out of scope:** predictive insights

### Step 1 — Load dashboard
**Goal:** รวบรวม KPI ข้ามหน้าจอ PM  
**User sees:** KPI cards + recent items  
**User can do:** adjust filters/navigation  
**Frontend behavior:** call summary/list APIs in parallel  
**System / AI behavior:** aggregate module data  
**Success:** cards and lists loaded  
**Error:** partial load states

### Step 2 — Inspect anomalies
**Goal:** หา overdue/over-budget เร็ว  
**User sees:** warning badges/sections  
**User can do:** click-through to source pages  
**Frontend behavior:** deep link with context  
**System / AI behavior:** provide sortable metadata  
**Success:** issue triage faster  
**Error:** stale data confusion

### Step 3 — Continue workflow
**Goal:** ไป action page ได้ทันที  
**User sees:** shortcuts to budgets/expenses/tasks  
**User can do:** navigate to resolve issues  
**Frontend behavior:** route transitions  
**System / AI behavior:** maintain permissions  
**Success:** dashboard acts as launchpad  
**Error:** unauthorized route

---

## R1-15 Settings — User Management

**Flow name:** `Settings — User Roles and Activation`  
**Actor(s):** super_admin, Admin  
**Entry:** `/settings/users`  
**Exit:** user created หรือ role/activation state updated  
**Out of scope:** self-registration

### Step 1 — User list
**Goal:** ดูบัญชีและบทบาททั้งหมด  
**User sees:** user table + roles + active state  
**User can do:** สร้างบัญชีใหม่, assign role, activate/deactivate  
**Frontend behavior:** `GET /api/settings/users`  
**System / AI behavior:** join users/roles/employee info  
**Success:** data complete  
**Error:** fetch fail

### Step 1b — Create user (admin-only)
**Goal:** สร้าง login ให้พนักงานที่มี record แล้ว  
**User sees:** modal ฟอร์ม email / รหัสผ่านเริ่มต้น / เลือกพนักงาน  
**User can do:** submit สร้างบัญชี  
**Frontend behavior:** `POST /api/settings/users`; optional `GET /api/hr/employees?hasUserAccount=false` สำหรับ picker; รองรับ `?employeeId=` เมื่อมาจาก HR  
**System / AI behavior:** หนึ่งพนักงานต่อหนึ่ง user; email unique  
**Success:** 201 + refresh ตาราง  
**Error:** 409 ชนกฎ  

### Step 2 — Assign role
**Goal:** ปรับสิทธิ์ตามหน้าที่  
**User sees:** role selector  
**User can do:** save role change  
**Frontend behavior:** `PATCH /users/:id/roles`  
**System / AI behavior:** persist user_roles and constraints  
**Success:** role updated  
**Error:** forbidden for protected accounts

### Step 3 — Toggle activation
**Goal:** ควบคุมสิทธิ์เข้าใช้ระบบ  
**User sees:** active toggle with confirmations  
**User can do:** activate/deactivate  
**Frontend behavior:** `PATCH /users/:id/activate`  
**System / AI behavior:** enforce self-deactivate restriction  
**Success:** activation state changed  
**Error:** business rule violation

---

## R1-16 Settings — Role & Permission Management

**Flow name:** `Settings — Role Matrix and Permission Audit`  
**Actor(s):** super_admin, Admin  
**Entry:** `/settings/roles`  
**Exit:** role matrix updated with audit trail  
**Out of scope:** ABAC policy engine

### Step 1 — Load role matrix
**Goal:** เห็น roles x permissions  
**User sees:** role list and permission grid  
**User can do:** create/edit/delete non-system roles  
**Frontend behavior:** roles + permissions endpoints  
**System / AI behavior:** return counts and flags  
**Success:** matrix ready  
**Error:** load fail

### Step 2 — Update permissions
**Goal:** ตั้งสิทธิ์ให้ role  
**User sees:** toggles/checklist  
**User can do:** submit new permission set  
**Frontend behavior:** `PUT /roles/:id/permissions`  
**System / AI behavior:** replace mapping + write audit logs  
**Success:** permissions effective immediately  
**Error:** protected system role or validation fail

### Step 3 — Verify effect
**Goal:** ยืนยันผลการแก้สิทธิ์  
**User sees:** updated count/state  
**User can do:** review change impact  
**Frontend behavior:** refresh role data  
**System / AI behavior:** enforce permissions at API middleware  
**Success:** role behavior consistent  
**Error:** cache mismatch

---

## R2-01 Customer Management (Full CRUD)

**Flow name:** `Finance — Customer Master with Credit Context`  
**Actor(s):** Finance Manager, Sales Admin  
**Entry:** `/finance/customers`  
**Exit:** customer พร้อมใช้งานใน AR/Sales  
**Out of scope:** customer portal self-service

### Step 1 — Customer list and filters
**Goal:** ค้นหาและดูสถานะลูกค้า  
**User sees:** list columns code/name/taxId/credit/status  
**User can do:** search/filter/open detail  
**Frontend behavior:** `GET /api/finance/customers`  
**System / AI behavior:** pagination + active filter  
**Success:** list usable  
**Error:** load fail

### Step 2 — Create/Edit/Activate
**Goal:** จัดการข้อมูลลูกค้า  
**User sees:** customer form  
**User can do:** create/update/activate/deactivate  
**Frontend behavior:** `POST/PATCH/activate` APIs  
**System / AI behavior:** validate unique code + soft-delete rules  
**Success:** state updated  
**Error:** duplicate code/constraint

### Step 3 — Credit warning context
**Goal:** แสดงความเสี่ยง credit จาก AR คงค้าง  
**User sees:** warning badge/dialog เมื่อเกินวงเงิน  
**User can do:** ยืนยันทำรายการต่อ (soft block)  
**Frontend behavior:** display `creditWarning` payload  
**System / AI behavior:** compute currentAR vs creditLimit  
**Success:** user ตัดสินใจบนข้อมูลความเสี่ยง  
**Error:** missing AR data

---

## R2-02 AR Payment Tracking

**Flow name:** `Finance — AR Receipt and Aging`  
**Actor(s):** Accountant, Finance Manager  
**Entry:** `/finance/invoices/:id`, `/finance/reports/ar-aging`  
**Exit:** invoice paid/partially_paid พร้อม aging ที่ถูกต้อง  
**Out of scope:** auto bank reconciliation

### Step 1 — Record invoice payment
**Goal:** ลงรับชำระจากลูกค้า  
**User sees:** payment form + remaining balance  
**User can do:** add payment record  
**Frontend behavior:** `POST /invoices/:id/payments`  
**System / AI behavior:** update paidAmount/balanceDue and status  
**Success:** payment history updated  
**Error:** overpayment/invalid method

### Step 2 — View payment history
**Goal:** trace การรับชำระย้อนหลัง  
**User sees:** payment timeline/table  
**User can do:** inspect references  
**Frontend behavior:** `GET /invoices/:id/payments`  
**System / AI behavior:** return chronological records  
**Success:** reconciliation ready  
**Error:** data inconsistency

### Step 3 — AR aging report
**Goal:** ดูยอดค้างตามอายุหนี้  
**User sees:** aging buckets per customer  
**User can do:** filter/export  
**Frontend behavior:** `GET /reports/ar-aging`  
**System / AI behavior:** aggregate invoices + receipts  
**Success:** aging accurate  
**Error:** bucket calc error

---

## R2-03 Thai Tax — VAT + WHT

**Flow name:** `Finance — Thai Tax Compliance`  
**Actor(s):** Accountant, Finance Manager  
**Entry:** `/finance/tax`, `/finance/tax/vat-report`, `/finance/tax/wht`  
**Exit:** VAT/WHT records complete and exportable  
**Out of scope:** e-filing integration

### Step 1 — Tax config and rates
**Goal:** ตั้งค่าอัตราภาษีใช้งานจริง  
**User sees:** tax rates management UI  
**User can do:** create/update tax rates  
**Frontend behavior:** tax rates APIs  
**System / AI behavior:** validate type/code/rate  
**Success:** rates active  
**Error:** invalid rate schema

### Step 2 — VAT and PND reports
**Goal:** ดูรายงานยื่นภาษี  
**User sees:** VAT summary + PND report views  
**User can do:** filter period/export  
**Frontend behavior:** vat/pnd report endpoints  
**System / AI behavior:** compute from invoice/AP data  
**Success:** report totals consistent  
**Error:** mismatch requiring audit

### Step 3 — WHT certificates
**Goal:** ออกหนังสือรับรองหัก ณ ที่จ่าย  
**User sees:** certificate list/create/download PDF  
**User can do:** create and print certificate  
**Frontend behavior:** wht certificate endpoints  
**System / AI behavior:** store certificate refs; support payroll gap integration  
**Success:** legal document ready  
**Error:** missing payee/source data

---

## R2-04 Financial Statements

**Flow name:** `Finance — P&L, Balance Sheet, Cash Flow`  
**Actor(s):** Finance Manager, CEO  
**Entry:** `/finance/statements/*`  
**Exit:** ได้งบการเงินตามช่วงเวลา  
**Out of scope:** IFRS note disclosures

### Step 1 — Select statement + period
**Goal:** ระบุงบที่ต้องการ  
**User sees:** statement type and period controls  
**User can do:** choose P&L/BS/CF  
**Frontend behavior:** call statement APIs by type  
**System / AI behavior:** map accounts to statement groups  
**Success:** query accepted  
**Error:** invalid period

### Step 2 — Render statement
**Goal:** อ่านตัวเลขการเงินหลัก  
**User sees:** hierarchical rows, totals, subtotals  
**User can do:** expand/collapse rows  
**Frontend behavior:** render numeric and comparison columns  
**System / AI behavior:** aggregate journal lines  
**Success:** balanced/consistent output  
**Error:** out-of-balance warning

### Step 3 — Export/share
**Goal:** ส่งต่อเอกสารการเงิน  
**User sees:** export actions  
**User can do:** export PDF/CSV (ตามระบบ)  
**Frontend behavior:** call export endpoint  
**System / AI behavior:** generate file with filters metadata  
**Success:** downloadable artifact  
**Error:** export timeout

---

## R2-05 Cash / Bank Management

**Flow name:** `Finance — Bank Accounts and Transactions`  
**Actor(s):** Accountant, Treasury role  
**Entry:** `/finance/banks`  
**Exit:** bank transactions ถูกบันทึกและพร้อม reconcile  
**Out of scope:** direct bank API sync

### Step 1 — Manage bank accounts
**Goal:** สร้างบัญชีธนาคารในระบบ  
**User sees:** bank account list/form  
**User can do:** create/edit/activate  
**Frontend behavior:** bank account APIs  
**System / AI behavior:** validate account metadata  
**Success:** accounts available for AR/AP payments  
**Error:** duplicate account

### Step 2 — Record cash movements
**Goal:** ลงรายการรับ-จ่ายผ่านธนาคาร  
**User sees:** transaction form and ledger  
**User can do:** add transaction/ref linkage  
**Frontend behavior:** transaction endpoints  
**System / AI behavior:** persist with source references  
**Success:** running balance updated  
**Error:** invalid source link

### Step 3 — Reconciliation support
**Goal:** ตรวจความสอดคล้องธนาคารกับบัญชี  
**User sees:** reconcile view/status  
**User can do:** mark matched/unmatched  
**Frontend behavior:** reconciliation actions  
**System / AI behavior:** update reconciliation flags  
**Success:** close period confidently  
**Error:** unresolved differences

---

## R2-06 Purchase Order (PO)

**Flow name:** `Procurement — PO to Receipt to AP`  
**Actor(s):** Procurement Officer, Approver, Warehouse, Finance  
**Entry:** `/procurement/po*`  
**Exit:** PO flow complete and ready for AP (3-way match)  
**Out of scope:** supplier bidding portal

### Step 1 — Create and approve PO
**Goal:** ออกใบสั่งซื้ออย่างเป็นทางการ  
**User sees:** PO list/form/workflow status  
**User can do:** create, submit, approve/reject  
**Frontend behavior:** PO CRUD + status APIs  
**System / AI behavior:** generate PO number and enforce workflow  
**Success:** PO approved  
**Error:** invalid vendor/items/status jump

### Step 2 — Goods receipt
**Goal:** บันทึกรับสินค้า/บริการ  
**User sees:** receipt form against PO lines  
**User can do:** receive partial/full quantities  
**Frontend behavior:** goods receipt APIs  
**System / AI behavior:** update received quantities and PO status  
**Success:** receipt posted  
**Error:** over-receive blocked

### Step 3 — 3-way matching to AP
**Goal:** ตรวจ PO-Receipt-Bill consistency  
**User sees:** matching summary and mismatches  
**User can do:** proceed or hold AP bill creation  
**Frontend behavior:** call matching endpoints  
**System / AI behavior:** compare qty/amount tolerances  
**Success:** AP bill linked with traceability  
**Error:** mismatch exceptions

---

## R2-07 Attendance & Time Tracking

**Flow name:** `HR — Attendance to Payroll Input`  
**Actor(s):** Employee, HR Admin  
**Entry:** `/hr/attendance`  
**Exit:** attendance data validated and usable in payroll  
**Out of scope:** geo-fencing mobile clock-in

### Step 1 — Clock in/out and records
**Goal:** เก็บเวลาทำงานจริง  
**User sees:** attendance calendar/table  
**User can do:** check-in/check-out/edit request  
**Frontend behavior:** attendance APIs  
**System / AI behavior:** persist records with schedule/holiday context  
**Success:** daily records complete  
**Error:** duplicate/invalid time entries

### Step 2 — HR review
**Goal:** ตรวจแก้ข้อมูลผิดพลาด  
**User sees:** exceptions list (late/missing/outlier)  
**User can do:** approve corrections  
**Frontend behavior:** review endpoints  
**System / AI behavior:** apply corrections with audit trail  
**Success:** clean attendance dataset  
**Error:** unresolved anomalies

### Step 3 — Payroll integration
**Goal:** ใช้ attendance ในการคำนวณเงินเดือน  
**User sees:** payroll note/source indicators  
**User can do:** process payroll with attendance-enabled config  
**Frontend behavior:** run payroll process with flags  
**System / AI behavior:** include attendance impacts per policy  
**Success:** payroll reflects attendance facts  
**Error:** missing schedule mapping

---

## R2-08 Company / Organization Settings

**Flow name:** `Settings — Company Master and Policies`  
**Actor(s):** super_admin, Admin  
**Entry:** `/settings/company`  
**Exit:** company profile/policies updated for all modules  
**Out of scope:** multi-tenant control plane

### Step 1 — Company profile setup
**Goal:** เก็บข้อมูลบริษัทกลาง  
**User sees:** legal/profile form  
**User can do:** update name, tax, address, logo  
**Frontend behavior:** company settings APIs  
**System / AI behavior:** validate required compliance fields  
**Success:** profile saved  
**Error:** invalid tax/company data

### Step 2 — Policy configuration
**Goal:** ตั้งค่า baseline ทางธุรกิจ  
**User sees:** settings sections (finance/hr/document)  
**User can do:** update defaults and toggles  
**Frontend behavior:** policy update endpoints  
**System / AI behavior:** persist module-level defaults  
**Success:** new transactions use latest config  
**Error:** incompatible setting combo

### Step 3 — Propagate and verify
**Goal:** ยืนยันค่ากลางถูกใช้จริง  
**User sees:** effective values in dependent forms  
**User can do:** test sample workflow  
**Frontend behavior:** read-back + cache refresh  
**System / AI behavior:** serve updated config consistently  
**Success:** system-wide consistency  
**Error:** stale configuration cache

---

## R2-09 Document Print / Export

**Flow name:** `Shared — Printable Documents and Exports`  
**Actor(s):** HR, Finance, Sales, Procurement  
**Entry:** จากหน้ารายการเอกสารต่าง ๆ  
**Exit:** เอกสารถูกพิมพ์/ดาวน์โหลดได้  
**Out of scope:** custom report designer

### Step 1 — Select document
**Goal:** เลือกเอกสารที่ต้องการพิมพ์/ส่งต่อ  
**User sees:** print/export actions on detail pages  
**User can do:** choose format/template  
**Frontend behavior:** request export endpoint  
**System / AI behavior:** gather data and apply template  
**Success:** job accepted  
**Error:** missing template/data

### Step 2 — Generate artifact
**Goal:** สร้างไฟล์ที่พร้อมใช้งาน  
**User sees:** loading/progress or immediate download  
**User can do:** wait/retry  
**Frontend behavior:** poll or direct download  
**System / AI behavior:** render PDF/CSV with branding  
**Success:** file generated  
**Error:** rendering timeout

### Step 3 — Download and trace
**Goal:** ใช้งานไฟล์และเก็บร่องรอย  
**User sees:** success message + download link  
**User can do:** open/share/print  
**Frontend behavior:** show completion and metadata  
**System / AI behavior:** optionally log export event  
**Success:** document delivery complete  
**Error:** broken download link

---

## R2-10 Notification / Workflow Alerts

**Flow name:** `Shared — In-app Notification and Alerting`  
**Actor(s):** ผู้ใช้ทุกบทบาท  
**Entry:** event-driven จาก workflow  
**Exit:** ผู้ใช้รับรู้และดำเนินการต่อ  
**Out of scope:** SMS/line campaign automation

### Step 1 — Trigger event
**Goal:** ส่งสัญญาณเมื่อเกิดเหตุสำคัญ  
**User sees:** badge count/notification item  
**User can do:** open notification center  
**Frontend behavior:** subscribe/poll notification APIs  
**System / AI behavior:** create notification from business events  
**Success:** event visible quickly  
**Error:** delayed or missing alert

### Step 2 — Action from alert
**Goal:** พาผู้ใช้ไปทำงานที่ค้างอยู่  
**User sees:** actionable message with deep link  
**User can do:** navigate to target screen  
**Frontend behavior:** route to referenced entity  
**System / AI behavior:** resolve permission and target state  
**Success:** reduced response time  
**Error:** target not found/forbidden

### Step 3 — Mark read and manage state
**Goal:** คุมความสะอาด inbox  
**User sees:** read/unread status  
**User can do:** mark read/archive  
**Frontend behavior:** notification state update APIs  
**System / AI behavior:** persist user-specific status  
**Success:** notification center organized  
**Error:** sync mismatch

---

## R2-11 Sales Order / Quotation

**Flow name:** `Sales — Quotation to Sales Order to Invoice`  
**Actor(s):** Sales Admin, Finance  
**Entry:** `/sales/quotations`, `/sales/orders`  
**Exit:** sales document lifecycle complete and convertible to invoice  
**Out of scope:** CRM lead management

### Step 1 — Create quotation
**Goal:** เสนอราคาให้ลูกค้า  
**User sees:** quotation form with customer/items  
**User can do:** create/send/revise quotation  
**Frontend behavior:** quotation APIs + customer options  
**System / AI behavior:** compute totals and credit warning context  
**Success:** quotation status updated  
**Error:** invalid pricing/customer

### Step 2 — Convert to sales order
**Goal:** เปลี่ยนใบเสนอราคาเป็นคำสั่งขาย  
**User sees:** conversion action and order draft  
**User can do:** confirm conversion  
**Frontend behavior:** convert endpoint + SO APIs  
**System / AI behavior:** copy lines/terms and track source refs  
**Success:** SO created with trace link  
**Error:** stale quotation state

### Step 3 — Generate invoice
**Goal:** ส่งต่อไป AR อย่างถูกต้อง  
**User sees:** create invoice from SO action  
**User can do:** generate and review invoice  
**Frontend behavior:** invoke invoice create with SO context  
**System / AI behavior:** enforce consistency and references  
**Success:** end-to-end sales pipeline closed  
**Error:** mismatch in quantities/amounts

---

## R2-12 Audit Trail (Cross-module)

**Flow name:** `Shared — Audit Log for Critical Actions`  
**Actor(s):** Admin, Auditor, Compliance  
**Entry:** `/audit` หรือจาก module detail  
**Exit:** ตรวจสอบเหตุการณ์ย้อนหลังได้ครบ  
**Out of scope:** SIEM external streaming

### Step 1 — Capture action events
**Goal:** เก็บประวัติทุกการเปลี่ยนแปลงสำคัญ  
**User sees:** ไม่เห็นตรง ๆ ในจังหวะทำงาน  
**User can do:** ทำรายการตามปกติ  
**Frontend behavior:** optionally pass context headers  
**System / AI behavior:** write audit entries on create/update/delete/approve/post  
**Success:** event stored with actor/timestamp/source  
**Error:** logging failure fallback strategy

### Step 2 — Audit browsing
**Goal:** ค้นหาประวัติย้อนหลัง  
**User sees:** audit table + filters  
**User can do:** filter by user/module/action/date  
**Frontend behavior:** query audit endpoints  
**System / AI behavior:** return paginated immutable logs  
**Success:** investigators can reconstruct events  
**Error:** over-broad query performance issues

### Step 3 — Trace to source
**Goal:** เปิดเอกสารต้นทางจาก log  
**User sees:** source module/id links  
**User can do:** jump to source record  
**Frontend behavior:** deep link navigation  
**System / AI behavior:** enforce permission on source access  
**Success:** full audit traceability  
**Error:** source deleted/archived

---

## R2-13 Global Dashboard

**Flow name:** `Executive — Cross-module KPI Dashboard`  
**Actor(s):** CEO, Management, Finance Manager  
**Entry:** `/dashboard`  
**Exit:** ได้ภาพรวมธุรกิจในหน้าเดียว  
**Out of scope:** predictive AI assistant

### Step 1 — Aggregate startup view
**Goal:** โหลด KPI ข้าม HR/Finance/PM/Sales  
**User sees:** high-level cards + trends + alerts  
**User can do:** set period/filter  
**Frontend behavior:** parallel API calls with skeletons  
**System / AI behavior:** aggregate cross-module metrics  
**Success:** coherent global snapshot  
**Error:** partial widget failures

### Step 2 — Drilldown navigation
**Goal:** จาก KPI ไปสู่ root cause  
**User sees:** clickable metric tiles  
**User can do:** open module pages with context  
**Frontend behavior:** preserve filter params on navigation  
**System / AI behavior:** support parameterized drilldown  
**Success:** fast decision loop  
**Error:** broken mapping

### Step 3 — Role-based visibility
**Goal:** แสดงเฉพาะข้อมูลที่มีสิทธิ์เห็น  
**User sees:** personalized widget set  
**User can do:** interact within permissions  
**Frontend behavior:** hide/disable restricted widgets  
**System / AI behavior:** enforce API-level authorization  
**Success:** secure and relevant dashboard  
**Error:** permission mismatch

---

## หมายเหตุการใช้งานเอกสารนี้

- โครงสร้างในแต่ละ flow ตั้งใจให้เหมือนตัวอย่าง `Documents/UX_Flow/Login.md`
- หากต้องการระดับละเอียดขึ้น ให้แตก flow ใด flow หนึ่งเป็นไฟล์เดี่ยว (เหมือน Login) โดยเพิ่ม step ย่อยและ error matrix
- ลำดับรหัส flow:
  - `R1-01` ถึง `R1-16` = ทุก feature จาก Release 1
  - `R2-01` ถึง `R2-13` = ทุก feature ใหม่จาก Release 2
