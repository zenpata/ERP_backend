# ERP Demo Flow — VC Presentation Script

**เรื่องราว:** "Alpha Corp" บริษัท Startup ที่เพิ่งได้รับเงินทุน Series A กำลังเริ่มใช้ระบบ ERP เพื่อบริหารองค์กรครั้งแรก ตั้งแต่วันแรกจนถึงปิดงบเดือนแรก

**ตัวละครหลัก:**
| ชื่อ | Role | อธิบาย |
|------|------|---------|
| **Somchai** | `super_admin` | IT Admin ผู้ดูแลระบบ |
| **Malee** | `hr_admin` | HR Manager |
| **Wichai** | `finance_manager` | CFO |
| **Napat** | `pm_manager` | Project Manager |
| **Pim** | `employee` | พนักงานใหม่ |

**ระยะเวลา Demo:** ~18 นาที  
**จำนวน Act:** 8 Act

---

## ภาพรวม Flow

```
ACT 1          ACT 2          ACT 3          ACT 4
Settings   →   HR Org     →   Employee   →   Leave
(2 min)        (2 min)        (2 min)        (2 min)

ACT 5          ACT 6          ACT 7          ACT 8
Payroll    →   Finance    →   Project    →   Dashboard
(2 min)        (3 min)        (2 min)        (1 min)
```

---

## ACT 1 — ตั้งค่าระบบ: Role & User
**ผู้แสดง:** Somchai (super_admin)  
**ระยะเวลา:** ~2 นาที  
**จุดขาย:** ระบบควบคุมสิทธิ์แบบ Role-Based — ปลอดภัย ยืดหยุ่น

### Scene 1.1 — ดู Role ในระบบ
| # | หน้าจอ | Action | Pause |
|---|--------|--------|-------|
| 1 | Login page | Somchai login ด้วย email/password → กด [เข้าสู่ระบบ] | 1.5s |
| 2 | Dashboard (super_admin view) | เห็นเมนูครบทุก module | 2s |
| 3 | Settings → Roles & Permissions | คลิก sidebar | 1.5s |
| 4 | Roles List | เห็น roles: `super_admin`, `hr_admin`, `finance_manager`, `pm_manager`, `employee` | 3s ⭐ |
| 5 | Role Detail: hr_admin | คลิกเข้าดู permissions matrix — HR: full, Finance: none, PM: none | 3s ⭐ |

**Narration point:** "ระบบมี Role สำเร็จรูป 5 บทบาท แต่ละบทบาทควบคุมได้ถึงระดับ action — read, create, update, delete"

### Scene 1.2 — สร้าง User Account ให้พนักงาน
| # | หน้าจอ | Action | Pause |
|---|--------|--------|-------|
| 6 | Settings → Users | คลิก sidebar | 1s |
| 7 | Users List | เห็นรายชื่อ users ที่มีอยู่ | 1.5s |
| 8 | Create User Form | คลิก [Create User] | 1s |
| 9 | Form กรอก | เลือก employee "Pim", กรอก email, temp password, เปิด mustChangePassword | 3s |
| 10 | User สร้างสำเร็จ | toast "สร้างบัญชีสำเร็จ" | 2s ⭐ |

**Narration point:** "สร้างบัญชีให้พนักงานได้ทันที พร้อมบังคับเปลี่ยนรหัสผ่านครั้งแรก"

---

## ACT 2 — ตั้งค่าองค์กร: แผนกและตำแหน่ง
**ผู้แสดง:** Malee (hr_admin)  
**ระยะเวลา:** ~2 นาที  
**จุดขาย:** จัดโครงสร้างองค์กรได้ง่าย พร้อม hierarchy

### Scene 2.1 — สร้างแผนก
| # | หน้าจอ | Action | Pause |
|---|--------|--------|-------|
| 1 | Login → Malee (hr_admin) | login | 1.5s |
| 2 | HR → องค์กร → Tab: แผนก | คลิก sidebar | 1.5s |
| 3 | Department List | เห็นแผนกที่มีอยู่ | 1.5s |
| 4 | Create Department Form | คลิก [เพิ่มแผนก] | 1s |
| 5 | กรอก: code = `TECH`, name = `Technology`, manager = Napat | กรอก form | 3s |
| 6 | สร้างสำเร็จ | toast "เพิ่มแผนกสำเร็จ" — แผนกปรากฏใน list | 2s ⭐ |

### Scene 2.2 — สร้างตำแหน่ง
| # | หน้าจอ | Action | Pause |
|---|--------|--------|-------|
| 7 | Tab: ตำแหน่ง | คลิก tab | 1s |
| 8 | Create Position Form | คลิก [เพิ่มตำแหน่ง] | 1s |
| 9 | กรอก: code = `DEV`, name = `Software Developer`, แผนก = Technology | กรอก form | 3s |
| 10 | สร้างสำเร็จ | toast + ตำแหน่งปรากฏใน list | 2s ⭐ |

**Narration point:** "แผนกและตำแหน่งที่สร้างจะไหลไปใช้ใน HR, Payroll และ Reports โดยอัตโนมัติ"

---

## ACT 3 — รับพนักงานใหม่ + Login ครั้งแรก
**ผู้แสดง:** Malee (hr_admin) → Pim (employee)  
**ระยะเวลา:** ~2 นาที  
**จุดขาย:** onboard พนักงานจาก zero ถึงพร้อมใช้งานได้ในไม่กี่คลิก

### Scene 3.1 — เพิ่มพนักงานใหม่
| # | หน้าจอ | Action | Pause |
|---|--------|--------|-------|
| 1 | HR → พนักงาน | คลิก sidebar | 1s |
| 2 | Employee List | เห็นรายชื่อพนักงาน | 1.5s |
| 3 | Create Employee Form | คลิก [เพิ่มพนักงาน] | 1s |
| 4 | กรอก: code=`EMP-0042`, ชื่อ=`Pim Jansri`, email, แผนก=Technology, ตำแหน่ง=Software Developer, hireDate=วันนี้, salary=45,000 | กรอกข้อมูล | 4s |
| 5 | กด [บันทึก] | บันทึก | 1s |
| 6 | Employee Detail | เห็นโปรไฟล์ Pim ครบถ้วน + callout "สร้างบัญชี Login" | 3s ⭐ |

### Scene 3.2 — Pim Login ครั้งแรก (Force Change Password)
| # | หน้าจอ | Action | Pause |
|---|--------|--------|-------|
| 7 | Login page (เปิด tab ใหม่) | Pim กรอก email + temp password | 2s |
| 8 | Change Password page | ระบบ redirect อัตโนมัติ — mustChangePassword = true | 2s ⭐ |
| 9 | กรอก password ใหม่ + ยืนยัน | กรอก form | 2s |
| 10 | Dashboard (employee view) | toast "เปลี่ยนรหัสผ่านสำเร็จ" → เห็นเมนูตาม role | 2s ⭐ |

**Narration point:** "พนักงานเข้าระบบครั้งแรก ถูกบังคับเปลี่ยนรหัสผ่านทันที — security by design"

---

## ACT 4 — การลา: ยื่นและอนุมัติ
**ผู้แสดง:** Pim (employee) → Malee (hr_admin)  
**ระยะเวลา:** ~2 นาที  
**จุดขาย:** ขอลาออนไลน์ อนุมัติออนไลน์ — ไม่ต้องใช้กระดาษ

### Scene 4.1 — พนักงานยื่นลา
| # | หน้าจอ | Action | Pause |
|---|--------|--------|-------|
| 1 | HR → การลา (Pim's session) | คลิก sidebar | 1s |
| 2 | Leave Workspace | เห็น leave balance: ลาพักร้อน 10 วัน, ลาป่วย 30 วัน | 2s ⭐ |
| 3 | Leave Request Form | คลิก [ยื่นลา] | 1s |
| 4 | กรอก: ประเภท=ลาพักร้อน, วันที่ 3 วัน, เหตุผล="ท่องเที่ยวครอบครัว" | กรอก form — ระบบคำนวณ 3 วันอัตโนมัติ | 3s |
| 5 | กด [ส่งคำขอลา] | ส่ง | 1s |
| 6 | Leave List | คำขอสถานะ `pending` ปรากฏ | 2s ⭐ |

### Scene 4.2 — HR อนุมัติ
| # | หน้าจอ | Action | Pause |
|---|--------|--------|-------|
| 7 | HR → การลา (Malee's session) | switch user | 1.5s |
| 8 | Leave List — filter: pending | เห็นคำขอของ Pim | 2s |
| 9 | Leave Request Detail | คลิกเข้าดูรายละเอียด — ตรวจวัน, balance | 2s |
| 10 | กด [อนุมัติ] → Modal ยืนยัน → [ยืนยันอนุมัติ] | อนุมัติ | 2s |
| 11 | สถานะเปลี่ยนเป็น `approved` | badge สีเขียว | 2s ⭐ |

**Narration point:** "HR เห็น leave balance real-time ก่อนอนุมัติ — ไม่ต้องเปิด spreadsheet"

---

## ACT 5 — Payroll: ประมวลผลและอนุมัติเงินเดือน
**ผู้แสดง:** Malee (hr_admin) → Wichai (finance_manager)  
**ระยะเวลา:** ~2 นาที  
**จุดขาย:** Process payroll อัตโนมัติ — คำนวณ SS, WHT, หักลาไม่มีเงินเดือนให้อัตโนมัติ

### Scene 5.1 — สร้างและ Process รอบเงินเดือน
| # | หน้าจอ | Action | Pause |
|---|--------|--------|-------|
| 1 | HR → เงินเดือน (Malee's session) | คลิก sidebar | 1s |
| 2 | Payroll Workspace | เห็นรายการรอบเงินเดือน | 1.5s |
| 3 | Create Run Form | คลิก [สร้างรอบเงินเดือน] | 1s |
| 4 | กรอก: period = April 2026, payDate = May 2 | กรอก form | 2s |
| 5 | กด [บันทึก] → status = `draft` | บันทึก | 1s |
| 6 | Payroll Run Detail | คลิกเปิด — เห็น payslip preview ของพนักงานทุกคน | 2s ⭐ |
| 7 | กด [Process] → Modal ยืนยัน → [ยืนยัน Process] | Process | 2s |
| 8 | status = `processed` — payslips คำนวณครบ | เห็น net pay, SS deduction, WHT ของแต่ละคน | 3s ⭐ |

### Scene 5.2 — Approve และ Mark Paid
| # | หน้าจอ | Action | Pause |
|---|--------|--------|-------|
| 9 | กด [Approve] → ยืนยัน → status = `approved` | Approve | 2s |
| 10 | Payroll Run (Wichai's session) | switch user → เปิด Run ที่ approved | 1.5s |
| 11 | กด [Mark Paid] → กรอก paymentReference → ยืนยัน | Mark Paid | 2s |
| 12 | status = `paid` → Journal entry ถูกสร้างใน Finance อัตโนมัติ | เห็น integration message | 2s ⭐ |

**Narration point:** "Mark Paid แล้ว — Journal บัญชีเงินเดือนถูก post เข้า Finance โดยอัตโนมัติ ไม่ต้องบันทึกซ้ำ"

---

## ACT 6 — Finance: Invoice, AP, Journal, Reports
**ผู้แสดง:** Wichai (finance_manager)  
**ระยะเวลา:** ~3 นาที  
**จุดขาย:** Finance cycle ครบ — AR ↔ AP ↔ Accounting ↔ Reports ในระบบเดียว

### Scene 6.1 — สร้าง Invoice ขาย (AR)
| # | หน้าจอ | Action | Pause |
|---|--------|--------|-------|
| 1 | Finance → Invoice (Wichai's session) | คลิก sidebar | 1s |
| 2 | Invoice List | เห็นรายการ invoices | 1.5s |
| 3 | Create Invoice Form | คลิก [Create Invoice] | 1s |
| 4 | กรอก: ลูกค้า=ABC Co., issueDate=วันนี้, dueDate=+30 วัน | กรอก header | 2s |
| 5 | เพิ่มรายการ: "บริการ Consulting", qty=1, price=150,000 | เพิ่ม line item — ระบบคำนวณ subtotal + VAT | 3s ⭐ |
| 6 | กด [บันทึก] → Invoice Detail | เห็นเลข `INV-2026-0042` grand total 160,500 บาท | 2s ⭐ |
| 7 | เปลี่ยนสถานะ Draft → Sent | คลิก [Mark as Sent] | 1.5s |

### Scene 6.2 — สร้าง AP Bill (จ่ายผู้ขาย)
| # | หน้าจอ | Action | Pause |
|---|--------|--------|-------|
| 8 | Finance → AP | คลิก sidebar | 1s |
| 9 | Create Bill Form | คลิก [Create Bill] | 1s |
| 10 | เลือก Vendor: XYZ Supplier Co., invoiceDate, dueDate | กรอก header | 2s |
| 11 | เพิ่มรายการ: "ค่า Software License", qty=1, price=25,000 | เพิ่ม line item | 2s |
| 12 | กด [บันทึก] → status = `draft` | บันทึก | 1s |
| 13 | กด [Submit] → [Approve] → status = `approved` | Submit + Approve ต่อเนื่อง | 2s ⭐ |

### Scene 6.3 — ดู Finance Reports
| # | หน้าจอ | Action | Pause |
|---|--------|--------|-------|
| 14 | Finance → Reports | คลิก sidebar | 1s |
| 15 | Finance Dashboard | เห็น KPI cards: รายรับ 160,500 / รายจ่าย 70,000 / กำไร 90,500 | 3s ⭐ |
| 16 | Tab: AR Aging | คลิก — เห็น invoice ค้างชำระจัดกลุ่ม 0-30, 31-60 วัน | 2s ⭐ |
| 17 | กด [Export Excel] | ดาวน์โหลด | 1.5s |

**Narration point:** "จาก Payroll → Invoice → AP ทุกอย่างไหลมาที่ Reports โดยอัตโนมัติ CFO เห็นภาพการเงิน real-time"

---

## ACT 7 — Project Management: งบ, ค่าใช้จ่าย, Tasks
**ผู้แสดง:** Napat (pm_manager)  
**ระยะเวลา:** ~2 นาที  
**จุดขาย:** บริหารโครงการ + งบประมาณ + task ในที่เดียว

### Scene 7.1 — สร้างงบโครงการ
| # | หน้าจอ | Action | Pause |
|---|--------|--------|-------|
| 1 | PM → งบประมาณ (Napat's session) | คลิก sidebar | 1s |
| 2 | Budget Create Form | คลิก [Create] | 1s |
| 3 | กรอก: name="Digital Transform Q2-2026", amount=500,000, startDate, endDate | กรอก form | 3s |
| 4 | กด [บันทึก] → status = `draft` → กด [เปิดใช้งาน] → `active` | สร้าง + activate | 2s ⭐ |

### Scene 7.2 — บันทึกค่าใช้จ่ายโครงการ
| # | หน้าจอ | Action | Pause |
|---|--------|--------|-------|
| 5 | PM → ค่าใช้จ่าย | คลิก sidebar | 1s |
| 6 | Create Expense Form | คลิก [Create Expense] | 1s |
| 7 | กรอก: budget=Digital Transform, title="ค่าเดินทาง Meeting", amount=2,500, date, upload receipt | กรอก + อัปโหลดไฟล์ | 3s |
| 8 | กด [บันทึก] → [Submit] → Finance_manager Approve | submit + approve | 2s ⭐ |

### Scene 7.3 — สร้างและติดตาม Tasks
| # | หน้าจอ | Action | Pause |
|---|--------|--------|-------|
| 9 | PM → ความคืบหน้า | คลิก sidebar | 1s |
| 10 | Progress Workspace | เห็น KPI: tasks ทั้งหมด, เสร็จ, overdue | 2s ⭐ |
| 11 | Create Task Form | คลิก [Create Task] | 1s |
| 12 | กรอก: title="Design UI Components", assignee=Pim, priority=high, dueDate | กรอก form | 2s |
| 13 | Task สร้างสำเร็จ status = `todo` → เปลี่ยนเป็น `in_progress` | สร้าง + update status | 2s ⭐ |

---

## ACT 8 — PM Dashboard: ภาพรวมทุกอย่างในที่เดียว
**ผู้แสดง:** Napat (pm_manager) / Wichai (finance_manager)  
**ระยะเวลา:** ~1 นาที  
**จุดขาย:** Executive view — เห็นทุกอย่างในหน้าจอเดียว

| # | หน้าจอ | Action | Pause |
|---|--------|--------|-------|
| 1 | PM → Dashboard | คลิก sidebar | 1s |
| 2 | PM Dashboard | เห็น KPI cards: งบทั้งหมด 500K, ใช้แล้ว 2,500 (0.5%), tasks 1 ชิ้น | 3s ⭐ |
| 3 | Budget Utilization chart | bar chart แสดง % การใช้งบแต่ละโครงการ | 2s ⭐ |
| 4 | Task Status chart | pie chart: todo/in_progress/done | 2s ⭐ |
| 5 | กด [Export] | ดาวน์โหลด PDF summary | 1.5s |

**Narration point:** "ผู้บริหารเห็นภาพโครงการ งบประมาณ และ tasks ในหน้าเดียว — ตัดสินใจได้เร็วขึ้น"

---

## สรุป Key Features ที่โชว์ตลอด Demo

| Feature | Act ที่โชว์ |
|---------|------------|
| Role-Based Access Control | ACT 1 |
| HR Organization Hierarchy | ACT 2 |
| Employee Onboarding | ACT 3 |
| Force Password Change (Security) | ACT 3 |
| Leave Management + Balance | ACT 4 |
| Payroll Auto-calculation (SS, WHT) | ACT 5 |
| Payroll → Finance Auto-integration | ACT 5 |
| Invoice AR + Status tracking | ACT 6 |
| AP Bill approval workflow | ACT 6 |
| Finance Reports (Real-time) | ACT 6 |
| AR Aging Report | ACT 6 |
| Project Budget Management | ACT 7 |
| Expense + Receipt Upload | ACT 7 |
| Task Management | ACT 7 |
| Executive Dashboard | ACT 8 |

---

## Playwright Script Notes

### Timing Guidelines
```
waitForTimeout(1000)  → transition ธรรมดา
waitForTimeout(2000)  → หลัง action สำคัญ
waitForTimeout(3000)  → จุดที่ต้องการให้ VC ดูนาน ⭐
waitForTimeout(1500)  → หลัง navigation / page load
```

### Test Accounts ที่ต้องเตรียม
```
super_admin:      somchai@alphacorp.com / [password]
hr_admin:         malee@alphacorp.com   / [password]
finance_manager:  wichai@alphacorp.com  / [password]
pm_manager:       napat@alphacorp.com   / [password]
employee (new):   pim@alphacorp.com     / [temp-password]  mustChangePassword=true
```

### Video Output
- Format: Playwright Screencast → `.webm` → แปลงเป็น `.mp4` ด้วย ffmpeg
- Resolution: 1280×720 (หรือ 1920×1080 ถ้า machine รองรับ)
- แนะนำแบ่งเป็น **8 ไฟล์ตาม Act** แล้ว concat ทีหลัง → แก้ไข/ถ่ายใหม่เฉพาะ Act ที่มีปัญหาได้

```
ffmpeg -i act1.webm -i act2.webm ... -filter_complex "[0][1]...[7]concat=n=8:v=1:a=0" demo_final.mp4
```

### Slowdown Strategy
```typescript
// ใน Playwright config
use: {
  launchOptions: { slowMo: 80 },  // delay ทุก action 80ms
  video: { mode: 'on', size: { width: 1280, height: 720 } }
}
```
