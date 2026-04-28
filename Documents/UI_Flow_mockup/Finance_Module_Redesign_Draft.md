# Finance Module — UI Redesign Draft

**สถานะ:** Draft v0.1  
**วันที่:** 2026-04-27  
**อ้างอิง:** SCN-17_Finance_Real_User_Journeys.md, Release_3_Finance_Gaps.md

---

## 1. ปัญหาที่พบจากการทดสอบ (Pain Points)

| ปัญหา | หน้าที่พบ | ผลกระทบ |
|---|---|---|
| Navigation เป็น feature-based ไม่ใช่ task-based | Sidebar ทุกหน้า | User ต้องรู้ก่อนว่า "feature ไหนทำอะไรได้" |
| WHT form ให้กรอก UUID ตรงๆ | Tax Hub → WHT | ไม่มีทาง user การเงินจริงรู้ UUID |
| AP payment ไม่มี bank selector | AP Bills | ไม่สามารถ trace cash-out ได้ |
| ไม่มี prompt เชื่อม AP payment → WHT | AP payment form | User ต้องจำทำเองหลังจ่าย |
| Invoice list ไม่มี contextual alert | Invoice AR | User ต้องสแกนทุก row เอง |
| Journal UI เป็น read-only | Journal Entries | Accountant ปิดเดือนไม่ได้ |
| Reports: summary กับ P&L ใช้คนละ data source | Finance Reports | ตัวเลขไม่ตรงกัน สร้างความสับสน |
| ไม่มี customer 360 view | Customer list | ต้องกระโดดหลายหน้าเพื่อดู AR ของลูกค้าคนเดียว |
| Credit warning ไม่แสดงใน invoice/SO form | Invoice, SO form | สร้าง invoice เกิน credit limit ได้โดยไม่รู้ |

---

## 2. Design Principles

### 2.1 Task-Based Navigation (ทำอะไรได้ทันที)

เปลี่ยนจาก feature menu → task/role menu

```
เดิม (feature-based):          ใหม่ (task-based):
├── Invoices                   ├── ภาพรวม (Dashboard)
├── Quotations                 ├── รายรับ (AR)
├── Sales Orders               │   ├── ใบแจ้งหนี้
├── Vendors                    │   └── ลูกหนี้ค้างชำระ
├── AP Bills                   ├── รายจ่าย (AP)
├── Purchase Orders            │   └── จ่ายเจ้าหนี้
├── Chart of Accounts          ├── บัญชี
├── Journal Entries            │   ├── สมุดบัญชี
├── Reports                    │   ├── งบการเงิน
└── Tax                        │   └── ภาษี VAT/WHT
```

### 2.2 Progressive Disclosure

แสดงข้อมูลเท่าที่ต้องการตามบริบท — detail เพิ่มเมื่อคลิก เช่น:
- Invoice list → แสดง status + ยอดค้าง ไม่ต้องเห็น journal ID
- WHT form → pre-fill จาก AP bill, user แค่ confirm ประเภทรายได้

### 2.3 Contextual Actions (Action ปรากฏตาม Context)

- Invoice เกินกำหนด → ปุ่ม "รับชำระ" + "บันทึก Follow-up" ปรากฏอัตโนมัติ
- หลัง confirm AP payment → prompt "ออก WHT ด้วยเลยไหม?" ทันที
- Journal unbalanced → inline error แจ้ง difference แบบ real-time

### 2.4 Smart Defaults

- Bank account selector แสดงยอดคงเหลือข้างชื่อ
- WHT form pre-fill ยอดเงินจาก AP bill
- Journal reverse date default = today
- Recurring invoice: next run date preview อัตโนมัติ

### 2.5 Consistent Status Language (ภาษาสถานะสม่ำเสมอ)

| สถานะ | สีที่ใช้ | ความหมาย |
|---|---|---|
| Draft | Gray | ยังไม่ส่ง / ยังไม่บันทึก |
| Pending / รอดำเนินการ | Amber | รอการกระทำจากใครบางคน |
| Approved / Confirmed | Blue | ผ่านการอนุมัติ |
| Paid / Posted / ชำระแล้ว | Green | เสร็จสมบูรณ์ |
| Overdue / เกินกำหนด | Red | ต้องดำเนินการด่วน |
| Partial | Pink | ดำเนินการบางส่วน |

---

## 3. Navigation Structure

### 3.1 Sidebar Layout

```
┌─────────────────────┐
│ Finance    Apr 2026  │  ← header: module name + current period
├─────────────────────┤
│ OVERVIEW             │
│  ▸ ภาพรวม           │  ← Dashboard
├─────────────────────┤
│ รายรับ (AR)          │
│  ▸ ใบแจ้งหนี้    [3] │  ← badge = overdue count
│  ▸ ลูกหนี้ค้างชำระ  │
│  ▸ Recurring Invoice │
├─────────────────────┤
│ รายจ่าย (AP)         │
│  ▸ จ่ายเจ้าหนี้  [2] │
│  ▸ Purchase Orders   │
├─────────────────────┤
│ บัญชี               │
│  ▸ สมุดบัญชี        │
│  ▸ งบการเงิน        │
│  ▸ ภาษี VAT/WHT     │
│  ▸ สินทรัพย์ถาวร    │  ← R3-06 (future)
│  ▸ คงคลัง           │  ← R3-05 (future)
├─────────────────────┤
│ SETTINGS            │
│  ▸ รอบบัญชี (Lock)  │  ← R3-08 (future)
└─────────────────────┘
```

### 3.2 Top Bar (per page)

```
[Page Title]    [Secondary action]    [Primary action button]
```

- Primary action: สีน้ำเงิน, เสมอ = create/new action ของหน้านั้น
- Secondary: outline, เป็น export / filter / settings

---

## 4. Screen Specs

### 4.1 Finance Dashboard

**Path:** `/finance`

**Layout:**
```
┌──────────────────────────────────────────────────────────┐
│ ภาพรวมการเงิน              [เดือน Apr 2026 ▼]           │
├──────────────────────────────────────────────────────────┤
│ [รายรับ ฿1.24M +12%] [รายจ่าย ฿0.87M] [กำไร ฿370K]     │
│ [AR ค้าง ฿542K ⚠]   [เงินสด ฿2.1M]                     │
├──────────────────────────────────────────────────────────┤
│ ⚠ Alerts                                                  │
│ • INV-2026-041 ค้างชำระ 3 วัน — ABC ฿125,000  [ดูรายการ] │
│ • AP รอชำระ 2 รายการ รวม ฿340,000             [ดูรายการ] │
├──────────────────────────────────────────────────────────┤
│ ทำอะไรต่อ?                                               │
│ [+ ออกใบแจ้งหนี้]  [จ่ายเจ้าหนี้]  [ปิดภาษีเดือน]  [งบ] │
└──────────────────────────────────────────────────────────┘
```

**KPI Cards — ข้อมูลที่แสดง:**
- รายรับ: sum ของ invoice ที่ status=`sent`/`partial`/`paid` ในเดือน
- รายจ่าย: sum ของ AP bills ที่ status=`approved`/`paid` ในเดือน
- กำไรสุทธิ: จาก journal_entries (P&L) ไม่ใช่ simple subtraction
- AR ค้าง: invoices ที่ balanceDue > 0
- เงินสด: sum currentBalance ของ bank accounts ที่ active

**Alert Logic:**
- แสดง invoices ที่ dueDate < today และ balanceDue > 0 (เรียงตาม overdue วันมาก→น้อย)
- แสดง AP bills ที่ status=`approved` และ dueDate ใน 7 วัน

**Quick Actions:**
- ออกใบแจ้งหนี้ → navigate to `/finance/invoices/new`
- จ่ายเจ้าหนี้ → navigate to `/finance/ap?tab=approved`
- ปิดภาษีเดือน → navigate to `/finance/tax`
- งบการเงิน → navigate to `/finance/reports`

---

### 4.2 Invoice AR — List Page

**Path:** `/finance/invoices`

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ ใบแจ้งหนี้ (AR)        [Export ▼]   [+ สร้างใบแจ้งหนี้]    │
├─────────────────────────────────────────────────────────────┤
│ [🔍 ค้นหา] [สถานะ ▼] [วันที่ ▼]  ■เกินกำหนด 3  □ Draft 1  │
├─────────────────────────────────────────────────────────────┤
│ ℹ INV-2026-041 ค้างชำระ 3 วัน — กด "รับชำระ" ได้เลย        │
├─────────────────────────────────────────────────────────────┤
│ เลขที่ | ลูกค้า | ออก | ครบกำหนด | ยอดรวม | ค้าง | สถานะ | actions │
│ INV-041 | ABC | 25/3 | ⚠25/4 (เกิน3วัน) | 125K | 125K | ●เกิน | รับชำระ ติดตาม │
│ INV-052 | XYZ | 1/4  | 30/4             | 85K  | 85K  | ●รอ  | รับชำระ │
│ INV-048 | DEF | 1/4  | 2/5              | 340K | 170K | ◑บางส่วน | รับชำระ │
└─────────────────────────────────────────────────────────────┘
```

**Design Notes:**
- Filter pill "เกินกำหนด N" ติดสีแดง เมื่อมี overdue invoices
- Context banner ปรากฏเมื่อมี overdue invoice อยู่ด้านบน list (dismiss ได้)
- Column "ครบกำหนด" แสดงสีแดง + "(เกิน X วัน)" เมื่อ past due
- Actions column: เฉพาะ action ที่ relevant ตาม status เท่านั้น

**Actions per Status:**
- `draft`: Edit | Delete
- `sent` + ไม่เกิน due: รับชำระ | Download PDF
- `sent` + เกิน due: รับชำระ | ติดตาม | Download PDF
- `partial`: รับชำระ | ดูประวัติ
- `paid`: Download PDF | ดูประวัติ

---

### 4.3 Invoice AR — Create/Edit Form

**Path:** `/finance/invoices/new` หรือ `/finance/invoices/:id/edit`

**Layout:**
```
┌──────────────────────────────────────────────────────────┐
│ [Draft] ← ← สร้างใบแจ้งหนี้          [Save Draft] [Send] │
├──────────────────────────────────────────────────────────┤
│ ① Customer + Dates         │ ② Summary                  │
│ ลูกค้า: [ABC จำกัด ▼]      │ ┌──────────────────────┐   │
│ ⚠ Credit ใช้: ฿230K/฿500K  │ │ Subtotal    ฿100,000  │   │
│ วันที่ออก: [27/4/2026]      │ │ VAT 7%      ฿7,000   │   │
│ ครบกำหนด: [27/5/2026 30d▼] │ │ WHT (3%)   -฿3,000   │   │
│ Ref: [                  ]   │ │ Total       ฿104,000  │   │
├──────────────────────────────│ └──────────────────────┘   │
│ Line Items                  │                             │
│ ┌─────┬──────┬────┬────┬──┐  │                             │
│ │ รายการ │ จำนวน │ ราคา │ รวม │ ▣ │  │                             │
│ ├─────┼──────┼────┼────┼──┤  │                             │
│ │ MA Service │ 1 │ 100,000 │ 100K │ 🗑 │                             │
│ └─────┴──────┴────┴────┴──┘  │                             │
│ [+ เพิ่มรายการ]               │                             │
└──────────────────────────────────────────────────────────┘
```

**Design Notes:**
- Credit warning: แสดงใต้ลูกค้า dropdown ทันที หากยอดค้าง + invoice นี้ > credit limit
  - Warning (< 90% limit): amber "Credit ใช้: ฿230K จาก ฿500K"
  - Error (> 100% limit): red "เกิน credit limit — ฿X เกิน" + ปุ่ม Send ถูก disable
- Due date: ใช้ dropdown ของ term (30 days / 45 days / 60 days / Custom) แทนกรอกวันตรง
- VAT toggle: ถ้า company ไม่จด VAT → ซ่อน VAT fields อัตโนมัติ (เชื่อมกับ company settings)
- Send button: disabled จนกว่า customer + due date + อย่างน้อย 1 line item จะครบ

---

### 4.4 AP Bills — List + Payment Form

**Path:** `/finance/ap`

**Layout:**
```
┌──────────────────────────────────────────────────────────┐
│ จ่ายเจ้าหนี้ (AP)                      [+ บันทึก AP bill] │
├──────────────────────────────────────────────────────────┤
│ [รออนุมัติ (2)] [อนุมัติแล้ว] [ชำระแล้ว]                 │
├──────────────────────────────────────────────────────────┤
│ ℹ หลังบันทึกการจ่าย ระบบจะถามออก WHT ทันที               │
├──────────────────────────────────────────────────────────┤
│ Vendor | Bill# | ครบกำหนด | ยอดรวม | WHT | ยอดจ่าย | สถานะ | actions │
│ บ.พิมพ์ดี | AP-018 | 30/4 ⚠ | 240K | 4,800(2%) | 235,200 | ●รออนุมัติ | อนุมัติ แก้ไข │
└──────────────────────────────────────────────────────────┘
```

**Payment Drawer / Modal:**

เมื่อกด "บันทึกการจ่าย" บน AP ที่ approved:

```
┌────────────────────────────────────────┐
│ บันทึกจ่ายเงิน — AP-2026-018           │
│ Vendor: บ.พิมพ์ดี จำกัด               │
├────────────────────────────────────────┤
│ บัญชีธนาคาร: [กสิกร xxx-1234 (฿2.1M)▼]│
│ ← ยอดคงเหลือแสดงในวงเล็บ             │
│ วันที่จ่าย: [28/4/2026]               │
│ Reference/ใบโอน: [____________]        │
│ หมายเหตุ: [____________]              │
├────────────────────────────────────────┤
│ ยอดที่จะจ่าย: ฿235,200                │
│ (WHT หัก ฿4,800 แล้ว)               │
├────────────────────────────────────────┤
│  [บันทึกการจ่าย ฿235,200]             │
└────────────────────────────────────────┘
```

**Post-Payment WHT Prompt (inline):**

หลัง confirm จ่าย → แสดงทันทีใน same view:

```
┌─────────────────────────────────────────────────────┐
│ ✓ บันทึกการจ่ายแล้ว                                 │
│                                                     │
│ ออก WHT certificate สำหรับรายการนี้ด้วยเลยไหม?      │
│ วงเงิน: ฿4,800  ประเภท: 3% (บริการ)                 │
│                                                     │
│  [ออก WHT เลย]   [ข้ามก่อน ทำทีหลัง]                │
└─────────────────────────────────────────────────────┘
```

กด "ออก WHT เลย" → navigate to `/finance/tax/wht/new?apId=AP-018` พร้อม pre-fill

---

### 4.5 Tax Hub — VAT & WHT

**Path:** `/finance/tax`

**Layout:**
```
┌──────────────────────────────────────────────────────────┐
│ ภาษี VAT / WHT                         [Export PND]       │
├──────────────────────────────────────────────────────────┤
│ [VAT สรุปเดือน] [ใบรับรอง WHT] [อัตราภาษี]               │
├──────────────────────────────────────────────────────────┤
│ [Output VAT ฿87,360] [Input VAT ฿16,800] [นำส่ง ฿70,560] │
└──────────────────────────────────────────────────────────┘
```

**WHT Create Form — Redesigned:**

```
┌──────────────────────────────────────────────────────────┐
│ ออกใบรับรองหัก ณ ที่จ่าย                                 │
├──────────────────────────────────────────────────────────┤
│ Step: [✓ เลือก AP] → [กรอกข้อมูล] → [ยืนยัน + PDF]      │
│                                                          │
│ อ้างอิง AP: ← pre-filled จากปุ่ม WHT ของ AP bill         │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ AP-2026-021 — น.ส.สมใจ มีสุข — จ่าย 28/4/2026      │ │
│ └──────────────────────────────────────────────────────┘ │
│                                                          │
│ เลขประจำตัวผู้เสียภาษี: [3-1234-56789-01-2]  ← from vendor│
│ ประเภทรายได้: [40(2) รับจ้าง ▼]                          │
│                                                          │
│ ยอดเงินได้: ฿100,000  ← auto จาก AP (editable)          │
│ อัตราภาษี: 3%         ← auto จาก type                   │
│ ภาษีที่หัก: ฿3,000    ← computed                        │
│                                                          │
│ วันที่จ่ายเงิน: 28/4/2026  ← auto จาก AP payment         │
│                                                          │
│  [ออกใบรับรอง + บันทึก PDF]    [Save Draft]              │
└──────────────────────────────────────────────────────────┘
```

**Design Notes:**
- ทุก field pre-fill จาก AP bill — user ต้องแก้แค่ "ประเภทรายได้" เท่านั้นในกรณีปกติ
- ถ้าเปิดจาก AP payment prompt: step 1 (เลือก AP) ถูก skip
- ถ้าสร้างใหม่ (standalone): แสดง dropdown ค้นหา AP bill ที่จ่ายแล้วก่อน

---

### 4.6 Journal Entry — Create Form (NEW)

**Path:** `/finance/journal/new`

**Layout:**
```
┌──────────────────────────────────────────────────────────┐
│ [Draft] สร้างรายการบัญชี       [Save Draft]  [Post ▷]    │
├────────────────────────────────────────────────────────── │
│ วันที่: [27/4/2026]  Reference: [JE-2026-XXX auto]        │
│ Memo: [Accrual ค่าเช่าสำนักงาน เม.ย. 2026              ] │
├──────────────────────────────────────────────────────────┤
│ # │ บัญชี (ค้นหา...)  │ คำอธิบาย    │ Debit    │ Credit   │
├──────────────────────────────────────────────────────────┤
│ 1 │ [5200 ค่าเช่า ▼]  │ ค่าเช่า เม.ย│ 45,000   │          │
│ 2 │ [2100 เจ้าหนี้ ▼] │ ค้างจ่าย   │          │ 45,000   │
│ + │ + เพิ่ม line       │             │          │          │
├──────────────────────────────────────────────────────────┤
│ รวม Debit: ฿45,000  |  รวม Credit: ฿45,000  |  Diff: ฿0 ✓│
│ ← Real-time balance indicator                            │
└──────────────────────────────────────────────────────────┘
```

**Design Notes:**
- Account dropdown: searchable ด้วยชื่อหรือรหัสบัญชี, กรอง inactive accounts ออก
- Balance indicator (bottom bar):
  - Diff = 0 → สีเขียว ✓ "Balanced"
  - Diff ≠ 0 → สีแดง "ยังขาด ฿X,XXX ด้าน [Debit/Credit]"
- Post button: disabled เมื่อ Diff ≠ 0 หรือ status ถูก lock period
- Tooltip บน Post เมื่อ disabled: แสดงสาเหตุ

**Journal List:** `/finance/journal`
```
┌──────────────────────────────────────────────────────────┐
│ สมุดบัญชี                          [+ สร้างรายการบัญชี]  │
├──────────────────────────────────────────────────────────┤
│ [วันที่จาก] [วันที่ถึง] [ทุกประเภท ▼] [ทุกสถานะ ▼]       │
├──────────────────────────────────────────────────────────┤
│ วันที่ | Reference | Memo | ประเภท | Debit | Credit | สถานะ | actions │
│ 27/4 | JE-2026-045 | Accrual ค่าเช่า | Manual | 45K | 45K | ●Draft | Edit Post │
│ 27/4 | JE-2026-044 | รับชำระ INV-039 | Auto | 220K | 220K | ●Posted | View │
│ 26/4 | JE-2026-043 | Payroll เม.ย. | Auto | 850K | 850K | ●Posted | View Reverse │
└──────────────────────────────────────────────────────────┘
```

**Actions per Status:**
- `draft`: Edit | Post | Delete
- `posted` (Manual): View | Reverse
- `posted` (Auto): View only
- `reversed`: View (badge "Reversed")

---

### 4.7 AR Aging — Collection View

**Path:** `/finance/ar-aging`

**Layout:**
```
┌──────────────────────────────────────────────────────────┐
│ ลูกหนี้ค้างชำระ                               [Export]   │
├──────────────────────────────────────────────────────────┤
│ As of: [27/4/2026]                                        │
├──────────────────────────────────────────────────────────┤
│ [ยังไม่ครบ ฿425K] [1-30วัน ฿210K] [31-60วัน ฿125K⚠] [61-90 ฿0] [90+ ฿0] │
│                  ← visual bar chart per bucket            │
├──────────────────────────────────────────────────────────┤
│ ลูกค้า | ยังไม่ครบ | 1-30 | 31-60 | 61-90 | 90+ | รวม | last contact | actions │
│ บ.ABC  │ ฿0      │ ฿0  │ ฿125K⚠│ ฿0  │ ฿0 │ ฿125K│ ยังไม่มี  │ ดู invoices บันทึก follow-up │
└──────────────────────────────────────────────────────────┘
```

**Column "Last Contact":**
- ดึงจาก `invoice_collection_notes` ล่าสุดของลูกค้า
- แสดง: "3 วันที่แล้ว (โทร)" หรือ "ยังไม่มี" (แสดงเป็น amber เมื่อ overdue > 7 วัน)

**Customer AR Summary:** `/finance/customers/:id/ar`
```
┌──────────────────────────────────────────────────────────┐
│ บ.ABC จำกัด — AR Summary                                  │
├──────────────────────────────────────────────────────────┤
│ Credit Limit: ฿500K | ยอดค้าง: ฿125K | เกิน limit: ไม่   │
├──────────────────────────────────────────────────────────┤
│ Open Invoices                                            │
│ INV-041 | 25/3/26 | ฿125,000 | ●เกินกำหนด 3 วัน | [รับชำระ] │
├──────────────────────────────────────────────────────────┤
│ Collection History                                       │
│ 🔵 25/4 ระบบ: Reminder email ส่งแล้ว                      │
│ 📞 20/4 โทร: "ลูกค้าแจ้งจะโอนภายใน 7 วัน (promise: 27/4)"│
│ 📧 15/4 Email: ส่ง invoice reminder                       │
└──────────────────────────────────────────────────────────┘
```

---

### 4.8 Financial Reports Hub

**Path:** `/finance/reports`

**Layout:**
```
┌──────────────────────────────────────────────────────────┐
│ งบการเงิน                                                 │
├──────────────────────────────────────────────────────────┤
│ [P&L] [Balance Sheet] [Cash Flow] [AR Aging]              │
├──────────────────────────────────────────────────────────┤
│ ช่วงเวลา: [มกราคม 2026 ▼] ถึง [เมษายน 2026 ▼]  [แสดง]   │
├──────────────────────────────────────────────────────────┤
│ ⚠ หมายเหตุ: ตัวเลขรายได้ใน Summary อาจต่างจาก P&L        │
│ Summary ใช้ invoice data, P&L ใช้ journal entries         │
│ (แก้ไขเมื่อ R3-07 Budget-GL integration เสร็จ)            │
├──────────────────────────────────────────────────────────┤
│ [ตัวเลขงบ P&L]        [Export PDF ↓]  [Export Excel ↓]   │
└──────────────────────────────────────────────────────────┘
```

**Design Notes:**
- Banner เตือน data source mismatch ระหว่าง Summary KPI กับ P&L — แสดงจนกว่า R3-07 จะเสร็จ
- Export: PDF ดาวน์โหลดได้ทันที, Excel ด้วย

---

### 4.9 Accounting Periods (Period Lock)

**Path:** `/finance/settings/periods` (หรือ `/settings/accounting-periods`)

**Layout:**
```
┌──────────────────────────────────────────────────────────┐
│ รอบบัญชี (Accounting Periods)                             │
├──────────────────────────────────────────────────────────┤
│ รอบ     │ สถานะ  │ Locked โดย │ Lock เมื่อ │ actions     │
│ 2026-04 │ ●Open  │ —          │ —          │ [Lock รอบนี้] │
│ 2026-03 │ 🔒Locked│ นาย ก     │ 5 เม.ย.   │ (super_admin เท่านั้น: Unlock) │
│ 2026-02 │ 🔒Locked│ นาย ก     │ 4 มี.ค.   │             │
└──────────────────────────────────────────────────────────┘
```

**Lock Confirmation Modal:**
```
┌──────────────────────────────────────────────────────────┐
│ Lock รอบบัญชี เมษายน 2026?                               │
│                                                          │
│ ⚠ 2 รายการ draft ใน เม.ย. ยังไม่ post:                   │
│   • JE-2026-045 Accrual ค่าเช่า                          │
│   • JE-2026-043 (partial)                               │
│   แนะนำ post ก่อน lock                                   │
│                                                          │
│ เมื่อ lock แล้ว จะไม่สามารถสร้าง/แก้ไขรายการ           │
│ ที่มีวันที่ใน เมษายน 2026 ได้อีก                        │
│                                                          │
│  [ดู Draft รายการก่อน]   [Lock เลย]   [ยกเลิก]           │
└──────────────────────────────────────────────────────────┘
```

---

## 5. Component Patterns

### 5.1 Status Badge

```
สีตาม status language (section 2.5)
size: 11px font, 2px 8px padding, border-radius 10px
```

### 5.2 Alert Banner (Contextual)

```
Background: amber-50 | border: amber-200
Icon: amber dot
Text: 13px amber-800
Action link: ขวาสุด, blue, 11px
Dismiss: ไม่มี (แสดงตลอดจนกว่าจะแก้ไข)
```

### 5.3 Real-time Validation Bar (Journal)

```
Bottom bar ใน form
Debit total | Credit total | Difference
Difference = 0: green bg, ✓ "Balanced"
Difference ≠ 0: red bg, "ยังขาด ฿X,XXX ด้าน [Debit/Credit]"
```

### 5.4 Post-Action Prompt (WHT after AP payment)

```
Inline card หลัง success message
Background: blue-50
Title: "ออก WHT ด้วยเลยไหม?"
Subtitle: amount + rate summary
Actions: Primary "ออก WHT เลย" | Secondary "ข้ามก่อน"
Auto-dismiss: 30 วินาที
```

### 5.5 Collection Note Quick-Add

```
Mini-form inline ใน Invoice detail sidebar
Fields: ประเภท (icon buttons: 📞 📧 🤝 📝), ข้อความ, promise date (optional)
Save: Enter หรือปุ่ม "บันทึก"
```

### 5.6 Credit Warning (Invoice Form)

```
ปรากฏใต้ Customer dropdown
Warning (50–99% used): amber chip "Credit ใช้: ฿X จาก ฿Y (N%)"
Error (100%+): red chip "เกิน credit limit ฿X" + disable Send
```

---

## 6. Outstanding Questions / TBD

| # | คำถาม | เจ้าของ |
|---|---|---|
| 1 | Company settings: จด VAT หรือไม่ — เก็บที่ไหน? ส่งผลกับ invoice form อย่างไร? | Backend |
| 2 | Journal Entry: ต้องการ two-person approval (maker-checker) หรือไม่? | Business |
| 3 | Bank statement import: รองรับ format ของธนาคารไทยรายใดบ้าง? (column mapping) | Business |
| 4 | Recurring invoice: email send อัตโนมัติหรือต้อง manual confirm ทุกครั้ง? | Business |
| 5 | Fixed assets: ต้องการ revaluation model หรือ cost model เท่านั้น? | Accounting |
| 6 | Inventory valuation: WAC เพียงพอหรือต้องรองรับ FIFO ด้วย? | Accounting |
| 7 | Reports data source: จะ reconcile Summary KPI กับ P&L ใน R3-07 หรือเร็วกว่า? | Backend |
