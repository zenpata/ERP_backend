# E2E Scenarios — Checklist Index

> ใช้ไฟล์นี้ติดตามว่า scenario ไหนเขียนเสร็จแล้ว เพื่อกลับมาทำต่อได้เมื่อ token หมด
> อัปเดตสถานะ: `[ ]` = ยังไม่ทำ | `[x]` = เสร็จแล้ว

---

## Release 1 — Scenarios

### HR Module
- [x] [SCN-01: Auth (Login / Logout / Change Password)](SCN-01_Auth.md)
- [x] [SCN-02: HR Employee Management (เพิ่ม / แก้ไข / Terminate พนักงาน)](SCN-02_HR_Employee.md)
- [x] [SCN-03: HR Organization (แผนก / ตำแหน่ง)](SCN-03_HR_Organization.md)
- [x] [SCN-04: HR Leave Management (ยื่นลา / อนุมัติ / ปฏิเสธ)](SCN-04_HR_Leave.md)
- [x] [SCN-05: HR Payroll (รอบเงินเดือน / Process / อนุมัติ / Mark Paid)](SCN-05_HR_Payroll.md)

### Finance Module
- [x] [SCN-06: Finance Invoice AR (ใบแจ้งหนี้ขาย)](SCN-06_Finance_Invoice_AR.md)
- [x] [SCN-07: Finance Vendor Management (จัดการคู่ค้า)](SCN-07_Finance_Vendor.md)
- [x] [SCN-08: Finance Accounts Payable (บัญชีเจ้าหนี้)](SCN-08_Finance_AP.md)
- [x] [SCN-09: Finance Accounting Core (บัญชีแกนกลาง / Journal)](SCN-09_Finance_Accounting.md)
- [x] [SCN-10: Finance Reports (รายงานสรุปการเงิน)](SCN-10_Finance_Reports.md)

### Project Management Module
- [x] [SCN-11: PM Budget Management (งบประมาณ)](SCN-11_PM_Budget.md)
- [x] [SCN-12: PM Expense Management (ค่าใช้จ่ายโครงการ)](SCN-12_PM_Expense.md)
- [x] [SCN-13: PM Progress & Tasks (ความคืบหน้า / งาน)](SCN-13_PM_Tasks.md)
- [x] [SCN-14: PM Dashboard (แดชบอร์ด PM)](SCN-14_PM_Dashboard.md)

### Settings Module
- [x] [SCN-15: Settings User Management (จัดการบัญชีผู้ใช้)](SCN-15_Settings_User.md)
- [x] [SCN-16: Settings Role & Permission (บทบาทและสิทธิ์)](SCN-16_Settings_Role.md)

---

## สรุปจำนวน Scenarios

| Module | จำนวนไฟล์ | สถานะ |
|--------|----------|-------|
| Auth | 1 | ✅ Done |
| HR | 4 | ✅ Done |
| Finance | 5 | ✅ Done |
| PM | 4 | ✅ Done |
| Settings | 2 | ✅ Done |
| **รวม** | **16** | **✅ Done** |

---

## หมายเหตุการเขียน

- แต่ละ scenario ระบุ **Actor**, **ขั้นตอน step-by-step**, **ปุ่มที่กด**, และ **ผลลัพธ์**
- มี **Mermaid diagram** แสดงการไหลของ user journey
- ครอบคลุมทั้ง happy path และ error/edge case
- อ้างอิง UX Flow: `Documents/UX_Flow/Functions/`
- อ้างอิง Requirements: `Documents/Requirements/Release_1.md`
