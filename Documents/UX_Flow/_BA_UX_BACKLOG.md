# BA/UX Backlog From UX Flow Review

เอกสารนี้สรุปรายการ “ควรแก้ต่อ” ที่พบจากการ review และ remediation รอบล่าสุดของเอกสารใน `Documents/UX_Flow/Functions`

วัตถุประสงค์:

- เก็บ backlog ที่ยังไม่ควรผูกกับ implementation ทันที
- ใช้เป็นรายการจัดลำดับงานสำหรับทีม BA/UX
- ลดความคลุมเครือก่อน FE/BE ลงงานจริง

---

## วิธีใช้เอกสารนี้

- ใช้ backlog นี้กับรอบ refinement ของ BA/UX
- ถ้าข้อไหนมีผลต่อ API contract หรือ workflow state ให้ sync กับ SD/Backend ก่อนแก้ UX flow
- ถ้าข้อไหนเป็นเรื่อง copy, CTA, warning, หรือ empty/error state ให้ update ทั้ง `_TEMPLATE.md`, `_GLOBAL_FRONTEND_BEHAVIORS.md`, และไฟล์ function ที่เกี่ยวข้องให้สอดคล้องกัน

---

## Priority Guide

### P1 — ควรตัดสินใจให้ชัดก่อนส่งลง implementation

- Workflow / transition ที่มีผลต่อสิทธิ์หรือการลงบัญชี
- Required field ที่อาจทำให้ FE/BE ตีความไม่ตรงกัน
- Blocking rule vs soft warning
- Export / async behavior ที่มีผลต่อ UX และ technical design

### P2 — ควรเก็บก่อน UAT หรือ design sign-off

- Copy มาตรฐานของ error / empty / warning
- Default filters / presets / drilldown behavior
- Widget priority / layout fallback
- Taxonomy และ naming ที่ user จะเห็นซ้ำหลายจุด

### P3 — ปรับคุณภาพเอกสารและความสม่ำเสมอข้ามโมดูล

- ความสม่ำเสมอของ CTA
- การ mask ข้อมูลอ่อนไหว
- มาตรฐาน visual warning / status badge / highlighting

---

## Cross-Cutting

### BAUX-001 — มาตรฐานข้อความ `401/403/404/409`

- Priority: `P1`
- Area: `Cross-cutting`
- Problem:
  โครงสร้าง flow ดีขึ้นแล้ว แต่ product copy ของ error หลักยังเสี่ยงไม่สม่ำเสมอข้ามโมดูล
- Why it matters:
  ถ้าแต่ละทีมเขียนข้อความเอง ผู้ใช้จะเจอ wording ไม่คงที่และแปลความหมายของ error ผิด
- Proposed BA/UX outcome:
  กำหนด message pattern กลางสำหรับ `401`, `403`, `404`, `409`, `500`, และ retry CTA มาตรฐาน
- Affected docs:
  - `Documents/UX_Flow/_GLOBAL_FRONTEND_BEHAVIORS.md`
  - `Documents/UX_Flow/_TEMPLATE.md`
  - เอกสารใน `Documents/UX_Flow/Functions` ทุกโมดูล

### BAUX-002 — มาตรฐาน CTA / warning / empty state ข้ามโมดูล

- Priority: `P2`
- Area: `Cross-cutting`
- Problem:
  ตอนนี้ CTA ในแต่ละเอกสารเริ่มชัดขึ้น แต่ยังไม่มี naming convention กลางระดับผลิตภัณฑ์
- Why it matters:
  ปุ่มอย่าง `Retry`, `Back to List`, `Open Detail`, `Export`, `Preview` ควรใช้คำเหมือนกันในบริบทเดียวกัน
- Proposed BA/UX outcome:
  สร้าง glossary ของ CTA, empty-state copy, warning tone, และ success toast pattern
- Affected docs:
  - `Documents/UX_Flow/_GLOBAL_FRONTEND_BEHAVIORS.md`
  - `Documents/UX_Flow/Functions/*`

---

## HR

### BAUX-010 — ยืนยัน required field ของ Employee

- Priority: `P1`
- Area: `HR Employee`
- Problem:
  ยังต้องยืนยันให้ชัดว่า `employeeCode`, `email`, `baseSalary`, `employmentDate`, `positionId` บังคับจริงแค่ไหนใน product
- Why it matters:
  ถ้า BA/UX, FE, และ BE ใช้คนละชุดฟิลด์บังคับ จะเกิด validation mismatch
- Proposed BA/UX outcome:
  ทำ field matrix สำหรับ create/edit employee แยก `required`, `conditional`, `optional`, `read-only`
- Affected docs:
  - `Documents/UX_Flow/Functions/R1-02_HR_Employee_Management.md`

### BAUX-011 — สถานะและการมองเห็น Department/Position

- Priority: `P1`
- Area: `HR Organization`
- Problem:
  ยังไม่ชัดว่า department/position ใช้ hard delete, soft delete, หรือมี `status`
- Why it matters:
  มีผลกับ dropdown ใน employee, leave, approval config และเอกสารอ้างอิงอื่น
- Proposed BA/UX outcome:
  กำหนด rule ว่า inactive entity ควร:
  - มองเห็นใน detail/history ได้หรือไม่
  - ใช้ใน dropdown ใหม่ได้หรือไม่
  - แสดง badge ว่า inactive อย่างไร
- Affected docs:
  - `Documents/UX_Flow/Functions/R1-03_HR_Organization_Management.md`
  - เอกสาร HR ที่ reuse dropdown

---

## PM

### BAUX-020 — นิยาม `committed` vs `actualSpend` ให้เป็น UX rule

- Priority: `P1`
- Area: `PM Budget`
- Problem:
  เอกสารรองรับยอด `allocated`, `committed`, `actualSpend`, `available` แล้ว แต่ UX rule เรื่องการแสดงผลยังไม่ละเอียดพอ
- Why it matters:
  ผู้ใช้จะตัดสินใจผิดถ้าไม่รู้ว่ายอดไหนคือใช้จริง ยอดไหนคือจองแล้ว
- Proposed BA/UX outcome:
  กำหนด:
  - card / table / tooltip ที่ต้องแสดงแต่ละยอด
  - warning เมื่อ `available < 0`
  - สีและ badge สำหรับ over-commit กับ overspend
- Affected docs:
  - `Documents/UX_Flow/Functions/R1-11_PM_Budget_Management.md`
  - `Documents/UX_Flow/Functions/R1-14_PM_Dashboard.md`

### BAUX-021 — ตัดสินใจ post expense/budget ไป Finance แบบ `auto` หรือ `manual`

- Priority: `P1`
- Area: `PM Expense`, `PM Budget`
- Problem:
  เอกสารรองรับทั้ง auto-post และ manual post fallback
- Why it matters:
  ถ้า product ไม่เลือกชัด จะเกิดความสับสนทั้ง UX, notification, audit, และ reconciliation
- Proposed BA/UX outcome:
  เลือก pattern หลัก:
  - `auto on approve`
  - `manual by finance action`
  - หรือ `auto with retry/manual fallback`
- Affected docs:
  - `Documents/UX_Flow/Functions/R1-11_PM_Budget_Management.md`
  - `Documents/UX_Flow/Functions/R1-12_PM_Expense_Management.md`

### BAUX-022 — นิยามความสัมพันธ์ `done` กับ `progressPct`

- Priority: `P1`
- Area: `PM Progress Tasks`
- Problem:
  ยังไม่ชัดว่า task สถานะ `done` ต้องบังคับ `progressPct = 100` หรือไม่
- Why it matters:
  กระทบ summary KPI, progress average, และ logic overdue
- Proposed BA/UX outcome:
  ตัดสินใจและใส่ rule กลางว่า:
  - `done => progressPct = 100`
  - หรืออนุญาต manual override แต่ต้องอธิบายเหตุผล
- Affected docs:
  - `Documents/UX_Flow/Functions/R1-13_PM_Progress_Tasks.md`
  - `Documents/UX_Flow/Functions/R1-14_PM_Dashboard.md`

### BAUX-023 — Widget priority และ fallback ของ PM Dashboard

- Priority: `P2`
- Area: `PM Dashboard`
- Problem:
  ยังไม่มีลำดับความสำคัญของ widget และ fallback เมื่อบาง widget fail
- Why it matters:
  มีผลต่อ responsive layout, partial failure, และ first-load comprehension
- Proposed BA/UX outcome:
  ระบุ:
  - widget สำคัญสุด
  - widget ไหนซ่อนได้ก่อน
  - fallback skeleton/error/empty แบบไหน
- Affected docs:
  - `Documents/UX_Flow/Functions/R1-14_PM_Dashboard.md`

---

## Finance

### BAUX-030 — กำหนดชัดว่า credit warning เป็น soft warning หรือ block

- Priority: `P1`
- Area: `Customer / AR / Quotation / SO`
- Problem:
  ตอนนี้เอกสารรองรับ warning ดีขึ้น แต่ยังไม่สรุปชัดว่าเมื่อเกินวงเงินเครดิตต้อง block หรือแค่เตือน
- Why it matters:
  เป็น rule สำคัญต่อ sales flow และ credit control
- Proposed BA/UX outcome:
  ทำ decision table:
  - เกินวงเงิน
  - มี overdue
  - เกินวงเงินและ overdue
  - user role override ได้หรือไม่
- Affected docs:
  - `Documents/UX_Flow/Functions/R2-01_Customer_Management.md`
  - `Documents/UX_Flow/Functions/R1-06_Finance_Invoice_AR.md`
  - `Documents/UX_Flow/Functions/R2-11_Sales_Order_Quotation.md`

### BAUX-031 — Preset filter ของ Financial Statements

- Priority: `P2`
- Area: `Financial Statements`
- Problem:
  หน้ารายงานรองรับ parameter หลักแล้ว แต่ยังไม่มี preset ที่เหมาะกับการใช้งานจริง
- Why it matters:
  ผู้ใช้การเงินมักใช้ช่วงซ้ำ ๆ เช่น เดือนนี้, ไตรมาสนี้, YTD
- Proposed BA/UX outcome:
  เพิ่ม preset และระบุ interaction ว่า preset จะ override field ไหน
- Affected docs:
  - `Documents/UX_Flow/Functions/R2-04_Financial_Statements.md`

### BAUX-032 — Matrix 3-way matching สำหรับ PO / GR / AP

- Priority: `P1`
- Area: `Purchase Order`, `AP`
- Problem:
  มี warning แล้ว แต่ยังไม่มี matrix กลางว่าความคลาดเคลื่อนแต่ละแบบต้องแสดงตรงไหนและรุนแรงระดับใด
- Why it matters:
  ลดความคลุมเครือในการอนุมัติ PO, รับของ, รับบิล, และจ่ายเงิน
- Proposed BA/UX outcome:
  ทำ matrix ของกรณี:
  - AP > PO
  - AP < PO
  - รับของไม่ครบ
  - รับของเกิน
  - PO ปิดแต่มี AP เพิ่ม
- Affected docs:
  - `Documents/UX_Flow/Functions/R2-06_Purchase_Order.md`
  - `Documents/UX_Flow/Functions/R1-08_Finance_Accounts_Payable.md`

### BAUX-033 — มาตรฐาน export behavior เอกสารขนาดใหญ่

- Priority: `P1`
- Area: `Finance Reports / Print / Tax / Payroll`
- Problem:
  ยังไม่ชัดว่า export ใช้ sync download, async job, หรือ background notification
- Why it matters:
  มีผลต่อ loading state, retry, duplicate-click safety, และ expectation ของผู้ใช้
- Proposed BA/UX outcome:
  จัดกลุ่มเอกสาร:
  - sync download ได้
  - async job ควรใช้
  - ควรมี notification เมื่อเสร็จ
- Affected docs:
  - `Documents/UX_Flow/Functions/R2-09_Document_Print_Export.md`
  - `Documents/UX_Flow/Functions/R2-04_Financial_Statements.md`
  - `Documents/UX_Flow/Functions/R2-03_Thai_Tax_VAT_WHT.md`
  - `Documents/UX_Flow/Functions/R1-05_HR_Payroll.md`

### BAUX-034 — กำหนด format มาตรฐานต่อเอกสาร

- Priority: `P2`
- Area: `Finance / Tax / HR Print`
- Problem:
  เอกสารจำนวนมากรองรับ `pdf/xlsx` ตาม pattern เดียวกัน แต่ยังไม่ระบุชัดว่าเอกสารไหนควรมี format ไหนบ้าง
- Why it matters:
  ลด scope creep และช่วย FE ออกแบบ control export ได้ตรง
- Proposed BA/UX outcome:
  ทำ matrix `document type -> allowed export formats`
- Affected docs:
  - `Documents/UX_Flow/Functions/R2-09_Document_Print_Export.md`

---

## Settings / Company

### BAUX-040 — เหตุผลบังคับสำหรับ Close / Reopen Fiscal Period

- Priority: `P1`
- Area: `Company Settings / Fiscal Period`
- Problem:
  ยังไม่ชัดว่าการ close/reopen period ต้องเก็บเหตุผลบังคับหรือไม่
- Why it matters:
  เป็นประเด็น audit/compliance โดยตรง
- Proposed BA/UX outcome:
  ตัดสินใจว่า:
  - close ต้องมี reason หรือไม่
  - reopen ต้องมี reason หรือไม่
  - ใครเห็น reason นี้ได้
- Affected docs:
  - `Documents/UX_Flow/Functions/R2-08_Company_Organization_Settings.md`

---

## Notifications

### BAUX-050 — Taxonomy กลางของ `eventType`

- Priority: `P2`
- Area: `Notifications`
- Problem:
  หน้า config พร้อมแล้ว แต่ event naming ยังเสี่ยงไม่เป็นมาตรฐานถ้าหลายทีมเติมเอง
- Why it matters:
  user จะเห็นชื่อ event ซ้ำใน preferences, inbox, email templates, และ audit
- Proposed BA/UX outcome:
  ทำ master list ของ `eventType`, label ที่ user เห็น, และ module owner
- Affected docs:
  - `Documents/UX_Flow/Functions/R2-10_Notification_Workflow_Alerts.md`

---

## Audit / Compliance

### BAUX-060 — นิยาม field masking กลางสำหรับ audit diff

- Priority: `P1`
- Area: `Audit Trail`
- Problem:
  ตอนนี้ระบุเรื่อง secret/password แล้ว แต่ยังไม่ครอบคลุม field อ่อนไหวอื่น
- Why it matters:
  diff viewer เสี่ยงแสดงข้อมูลส่วนบุคคลหรือข้อมูลการเงินที่ไม่ควรเปิดเต็ม
- Proposed BA/UX outcome:
  สร้างรายการ field ที่ต้อง:
  - mask ทั้งหมด
  - mask บางส่วน
  - แสดงเฉพาะ admin บาง role
- Affected docs:
  - `Documents/UX_Flow/Functions/R2-12_Audit_Trail.md`
  - `Documents/UX_Flow/_GLOBAL_FRONTEND_BEHAVIORS.md`

---

## Suggested Next Pass

ถ้าทีม BA/UX จะทำ refinement ต่อ แนะนำลำดับดังนี้:

1. เก็บ `P1` ก่อน โดยเฉพาะ workflow, blocking rule, required fields, export behavior, audit masking
2. อัปเดต `_GLOBAL_FRONTEND_BEHAVIORS.md` สำหรับกฎกลางที่ใช้หลายโมดูล
3. ค่อยไล่ update ไฟล์ function ตามโมดูลที่ได้รับผล
4. ปิดท้ายด้วย consistency pass เรื่อง copy, CTA, warning tone, และ empty state

---

## Source Scope

Backlog นี้สรุปจากการ review/remediation รอบล่าสุดของไฟล์ใน:

- `Documents/UX_Flow/Functions`
- `Documents/UX_Flow/_TEMPLATE.md`
- `Documents/UX_Flow/_GLOBAL_FRONTEND_BEHAVIORS.md`
- เอกสารอ้างอิงใน `Documents/Requirements`
- เอกสารอ้างอิงใน `Documents/SD_Flow`
