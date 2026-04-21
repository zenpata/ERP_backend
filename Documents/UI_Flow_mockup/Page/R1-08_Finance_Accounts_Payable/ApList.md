# AP workspace — รายการบิลเจ้าหนี้และสร้างบิล (inline)

คู่มือแปลง UX → spec: [`../../UX_TO_UI_SPEC_WORKFLOW.md`](../../UX_TO_UI_SPEC_WORKFLOW.md)

**Route:** `/finance/ap`  
**Entry (UX):** เมนู Finance → AP; หน้าเดียวรวมตารางรายการ + แผง/ส่วนสร้างบิลแบบ inline ตาม BR Feature 1.8

---

## Metadata

| Key | Value |
|-----|--------|
| **UX flow** | [`R1-08_Finance_Accounts_Payable.md`](../../../UX_Flow/Functions/R1-08_Finance_Accounts_Payable.md) |
| **UX sub-flow / steps** | Sub-flow 1 — vendor options; Sub-flow 2 — list; Sub-flow 4 — create bill (inline บนหน้านี้ **หรือ** หน้าเต็ม [`ApBillForm.md`](./ApBillForm.md)); Sub-flow 7 — inline vendor modal |
| **Design system** | [`../../design-system.md`](../../design-system.md) — §3 Page layout, §6 DataTable, §5 form grid, §7 alerts |
| **Global FE behaviors** | [`../../../UX_Flow/_GLOBAL_FRONTEND_BEHAVIORS.md`](../../../UX_Flow/_GLOBAL_FRONTEND_BEHAVIORS.md) |
| **Preview** | [`ApList.preview.html`](./ApList.preview.html) · [`../_Shared/preview-base.css`](../_Shared/preview-base.css) · [`MD_TO_PREVIEW_HTML_MANUAL.md`](../MD_TO_PREVIEW_HTML_MANUAL.md) |

---

## เป้าหมายหน้าจอ

- แสดงรายการใบแจ้งหนี้เจ้าหนี้ พร้อมกรอง ค้นหา และเปิดรายละเอียดที่ [`ApDetail.md`](./ApDetail.md)
- สร้างบิลใหม่บนหน้าเดียวกัน (inline) หรือลิงก์ไปฟอร์มเต็มหน้า [`ApBillForm.md`](./ApBillForm.md) (`/finance/ap/new`) — ทั้งสองทางใช้ Sub-flow 4 เดียวกัน

## ผู้ใช้และสิทธิ์

**Actor(s) (UX):** `accountant`, `finance_manager` — ปุ่มอนุมัติ/ปฏิเสธ/จ่ายไม่แสดงบนหน้านี้ (ทำที่หน้ารายละเอียด); กรณี 401/403 อ้าง Global FE behaviors

## โครง layout (สรุป)

`PageHeader` (ชื่อโมดูล + CTA สร้างบิล: toggle แผง inline **และ/หรือ** ไป `/finance/ap/new`) → **ตัวกรอง** (status, vendor, ช่วงวันที่, search) → **ตาราง** (คอลัมน์ตาม UX) → pagination → **แผงสร้างบิล** (ถ้าใช้ inline: ฟอร์ม + ตารางบรรทัด + สรุปยอด) ด้านล่างหรือใน drawer ตาม implementation

## เนื้อหาและฟิลด์

### ตารางรายการ (Sub-flow 2)

| Field / column | Required | Validation / notes |
|----------------|----------|-------------------|
| `documentNo` | แสดง | เลขเอกสารระบบ |
| vendor | แสดง | จาก join |
| `vendorInvoiceNo` | แสดง | |
| วันที่ / ครบกำหนด | แสดง | |
| `status` | แสดง | badge: draft, submitted, approved, rejected, paid, partially_paid |
| `total` / `paidAmount` | แสดง | สรุปยอดตาม API; ไม่คำนวณทับ `remainingAmount` ของ server |

### Query / ตัวกรอง

| Parameter | Required | Notes |
|-----------|----------|-------|
| `page`, `limit` | สำหรับ pagination | |
| `search` | ไม่ | |
| `status` | ไม่ | |
| `vendorId` | ไม่ | |
| `invoiceDateFrom`, `invoiceDateTo` | ไม่ | |

### ฟอร์มสร้างบิล (Sub-flow 4)

| Field | Required | Validation / notes |
|-------|----------|-------------------|
| `vendorId` | ใช่ | จาก `GET /api/finance/vendors/options` (Sub-flow 1); skeleton/error แยกที่บล็อกฟอร์ม |
| `vendorInvoiceNo` | ตาม BR | |
| `invoiceDate`, `dueDate` | ใช่ | |
| `notes` | ไม่ | |
| `poId` | ไม่ | R2: แสดง PO summary + soft warning เมื่อยอดบิลเกิน PO |
| `items[]` | ใช่ | แต่ละแถว: description, quantity, unitPrice |

### Modal สร้าง vendor (Sub-flow 7)

| Field | Required | Notes |
|-------|----------|--------|
| ชุดฟิลด์ขั้นต่ำ vendor | ตาม API | `POST /api/finance/vendors`; หลัง 201 refresh options + auto-select |

## การกระทำ (CTA)

| Control | Behavior |
|---------|----------|
| แถวตาราง / เปิดรายละเอียด | ไป `/finance/ap/:id` (ดู ApDetail) |
| `[สร้างบิล]` / แสดงแผงฟอร์ม | เปิดใช้ฟอร์ม inline |
| `[สร้างบิล (เต็มหน้า)]` หรือลิงก์เทียบเท่า | ไป `/finance/ap/new` — ดู [`ApBillForm.md`](./ApBillForm.md) |
| `[บันทึก]` (ฟอร์มสร้าง) | `POST /api/finance/ap/vendor-invoices`; 201 แล้ว refresh list และอาจเปิด detail บิลใหม่ |
| `[ยกเลิก]` | ปิด/ล้างฟอร์ม |
| `[+ สร้าง vendor ใหม่]` | เปิด modal → `POST /api/finance/vendors` |
| เพิ่ม/ลบแถวรายการบรรทัด | client-side จัดการ array ก่อน submit |

## สถานะพิเศษ

- **Loading:** ตาราง skeleton; ฟอร์ม disable ขณะ submit
- **Empty:** ไม่มีบิลตาม filter
- **Fetch list error:** empty state + retry (Sub-flow 2)
- **Vendor options error:** inline + retry เฉพาะบล็อกฟอร์ม (Sub-flow 1)
- **สร้างบิล 400:** แสดง field errors; vendor ไม่ active ตามข้อความ server
- **409 duplicate vendor (inline):** ตาม API

## หมายเหตุ implementation (ถ้ามี)

- ยอดคงเหลือและ `statusSummary` ฝั่งรายละเอียดให้อ่านจาก BE ตาม Coverage Lock ใน UX

## Preview HTML notes

| หัวข้อ | ใส่อะไร |
|--------|--------|
| **Shell** | `app` |
| **Regions** | PageHeader → filters row → DataTable → pagination → create panel (collapsible) |
| **สถานะสำหรับสลับใน preview** | `default` · `loading` · `empty` · `createOpen` · `vendorOptionsError` |
| **ข้อมูลจำลอง** | 3–5 แถว สถานะต่างกัน; badge สีตาม status |
| **ลิงก์ CSS** | [`../_Shared/preview-base.css`](../_Shared/preview-base.css) |
