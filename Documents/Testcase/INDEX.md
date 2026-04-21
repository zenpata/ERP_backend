# Test Cases Index — ERP Project

รวม test case documents ทั้งหมด 29 โมดูล แบ่งตาม Release และ Feature Group

---

## Release 1 — Core Modules

| ไฟล์ | โมดูล | จำนวน Test Cases | Priority สูงสุด |
| :--- | :--- | :--- | :--- |
| [R1-01_testcases.md](R1-01_testcases.md) | Auth: Login และ Session Management | 23 | High |
| [R1-02_testcases.md](R1-02_testcases.md) | HR: จัดการพนักงาน (Employee Management) | 25 | High |
| [R1-03_testcases.md](R1-03_testcases.md) | HR: จัดการองค์กร แผนก และตำแหน่ง | 19 | High |
| [R1-04_testcases.md](R1-04_testcases.md) | HR: จัดการการลา (Leave Management) | 25 | High |
| [R1-05_testcases.md](R1-05_testcases.md) | HR: เงินเดือน (Payroll) | 16 | High |
| [R1-06_testcases.md](R1-06_testcases.md) | Finance: ใบแจ้งหนี้ลูกหนี้ (Invoice AR) | 16 | High |
| [R1-07_testcases.md](R1-07_testcases.md) | Finance: จัดการ Vendor | 16 | High |
| [R1-08_testcases.md](R1-08_testcases.md) | Finance: Accounts Payable (AP) | 16 | High |
| [R1-09_testcases.md](R1-09_testcases.md) | Finance: Accounting Core (COA, Journal, Ledger) | 16 | High |
| [R1-10_testcases.md](R1-10_testcases.md) | Finance: Reports Summary Dashboard | 25 | High |
| [R1-11_testcases.md](R1-11_testcases.md) | PM: จัดการงบโครงการ (Budget Management) | 15 | High |
| [R1-12_testcases.md](R1-12_testcases.md) | PM: จัดการค่าใช้จ่ายโครงการ (Expense Management) | 17 | High |
| [R1-13_testcases.md](R1-13_testcases.md) | PM: ความคืบหน้าและงาน (Progress / Tasks) | 15 | High |
| [R1-14_testcases.md](R1-14_testcases.md) | PM: Dashboard | 14 | High |
| [R1-15_testcases.md](R1-15_testcases.md) | Settings: จัดการผู้ใช้ (User Management) | 16 | High |
| [R1-16_testcases.md](R1-16_testcases.md) | Settings: บทบาทและสิทธิ์ (Role & Permission) | 15 | High |

---

## Release 2 — Extended Modules

| ไฟล์ | โมดูล | จำนวน Test Cases | Priority สูงสุด |
| :--- | :--- | :--- | :--- |
| [R2-01_testcases.md](R2-01_testcases.md) | Finance: จัดการลูกค้า (Customer Management) | 15 | High |
| [R2-02_testcases.md](R2-02_testcases.md) | Finance: ติดตามการรับชำระ (AR Payment Tracking) | 15 | High |
| [R2-03_testcases.md](R2-03_testcases.md) | Finance: ภาษีไทย VAT และหัก ณ ที่จ่าย (WHT) | 15 | High |
| [R2-04_testcases.md](R2-04_testcases.md) | Finance: งบการเงิน (Financial Statements) | 14 | High |
| [R2-05_testcases.md](R2-05_testcases.md) | Finance: เงินสดและบัญชีธนาคาร (Cash & Bank) | 15 | High |
| [R2-06_testcases.md](R2-06_testcases.md) | Finance: ใบสั่งซื้อ (Purchase Order) | 15 | High |
| [R2-07_testcases.md](R2-07_testcases.md) | HR: เวลาเข้างาน ตารางงาน OT และวันหยุด | 15 | High |
| [R2-08_testcases.md](R2-08_testcases.md) | Settings: ข้อมูลบริษัทและรอบบัญชี (Company & Fiscal) | 14 | High |
| [R2-09_testcases.md](R2-09_testcases.md) | Cross-Module: พิมพ์และส่งออกเอกสาร (Print & Export) | 14 | High |
| [R2-10_testcases.md](R2-10_testcases.md) | Cross-Module: การแจ้งเตือนและ Workflow Alerts | 13 | High |
| [R2-11_testcases.md](R2-11_testcases.md) | Finance: ใบเสนอราคาและใบสั่งขาย (Quotation & SO) | 15 | High |
| [R2-12_testcases.md](R2-12_testcases.md) | Settings: Audit Trail (ประวัติข้ามโมดูล) | 13 | High |
| [R2-13_testcases.md](R2-13_testcases.md) | Global Dashboard (ภาพรวมองค์กร) | 14 | High |

---

## สรุปภาพรวม

| รายการ | จำนวน |
| :--- | :--- |
| โมดูลทั้งหมด | 29 |
| Test Cases ทั้งหมด (ประมาณการ) | ~447 |
| โมดูล Release 1 | 16 |
| โมดูล Release 2 | 13 |

---

## หมายเหตุการใช้งาน

- คอลัมน์ `jira` และ `squad` และ `automation` เว้นว่างไว้สำหรับกรอกในภายหลัง
- `priority`: High = ต้องทดสอบในทุก sprint, Medium = ทดสอบก่อน release, Low = regression เท่านั้น
- Test cases ครอบคลุมทั้ง Happy Path และ Negative/Edge Case
- ภาษาใน `precondition`, `steps` และ `expected_result` เป็นภาษาไทย
- ภาษาใน `title` เป็นภาษาอังกฤษ
