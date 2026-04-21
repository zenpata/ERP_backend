# AP bill — สร้างใบแจ้งหนี้เจ้าหนี้ (ฟอร์มเต็มหน้า)

คู่มือแปลง UX → spec: [`../../UX_TO_UI_SPEC_WORKFLOW.md`](../../UX_TO_UI_SPEC_WORKFLOW.md)

**Route:** `/finance/ap/new`  
**Entry (UX):** ทางเลือกถัดจาก workspace [`ApList.md`](./ApList.md) — เนื้อหาเดียวกับ Sub-flow 4 (สร้างบิล) แต่แยกเป็น **หนึ่ง route / หนึ่งไฟล์ spec** ตาม [`UX_TO_UI_SPEC_WORKFLOW.md`](../../UX_TO_UI_SPEC_WORKFLOW.md) §2 (List vs Form vs Detail)

---

## Metadata

| Key | Value |
|-----|--------|
| **UX flow** | [`R1-08_Finance_Accounts_Payable.md`](../../../UX_Flow/Functions/R1-08_Finance_Accounts_Payable.md) |
| **UX sub-flow / steps** | Sub-flow 1 — vendor options; Sub-flow 4 — สร้าง AP bill; Sub-flow 7 — inline vendor modal |
| **Design system** | [`../../design-system.md`](../../design-system.md) — §3 Page layout, §5 form grid, §6 DataTable (ตารางบรรทัด), §7 alerts |
| **Global FE behaviors** | [`../../../UX_Flow/_GLOBAL_FRONTEND_BEHAVIORS.md`](../../../UX_Flow/_GLOBAL_FRONTEND_BEHAVIORS.md) |
| **Preview** | [`ApBillForm.preview.html`](./ApBillForm.preview.html) · [`../_Shared/preview-base.css`](../_Shared/preview-base.css) · [`MD_TO_PREVIEW_HTML_MANUAL.md`](../MD_TO_PREVIEW_HTML_MANUAL.md) |

---

## เป้าหมายหน้าจอ

กรอกหัวบิล (vendor, เลขใบกำกับผู้ขาย, วันที่, ครบกำหนด, หมายเหตุ) และรายการบรรทัด แล้วบันทึกเป็น `draft` ผ่าน `POST /api/finance/ap/vendor-invoices` — หลังสำเร็จนำทางไป [`ApDetail.md`](./ApDetail.md) ของบิลใหม่และ/หรือกลับรายการ

## ผู้ใช้และสิทธิ์

**Actor(s) (UX):** `accountant`, `finance_manager` — กรณี 401/403 อ้าง Global FE behaviors

## โครง layout (สรุป)

`PageHeader` (ชื่อหน้า + `[กลับรายการ]` ไป [`ApList.md`](./ApList.md)) → **การ์ดฟอร์มหลัก**: vendor (select/combobox + ลิงก์สร้าง vendor) → ฟิลด์หัวบิล (grid) → **ตารางบรรทัด** + สรุปยอดรวม → แถบ CTA (`[บันทึกบิล]` · `[ยกเลิก]`)

## เนื้อหาและฟิลด์

### Vendor และหัวบิล (Sub-flow 4 + 1)

| Field | Required | Validation / notes |
|-------|----------|-------------------|
| `vendorId` | ใช่ | จาก `GET /api/finance/vendors/options`; skeleton / inline error + retry เฉพาะบล็อก vendor (Sub-flow 1) |
| `vendorInvoiceNo` | ตาม BR | |
| `invoiceDate` | ใช่ | |
| `dueDate` | ใช่ | |
| `notes` | ไม่ | |
| `poId` | ไม่ | R2: เลือก PO ได้; แสดง PO summary + soft warning เมื่อยอดบิลเกิน `PO totalAmount` (ยัง submit ได้ถ้า BR/BE อนุญาต) |

### รายการบรรทัด `items[]`

| Field (ต่อแถว) | Required | Validation / notes |
|-----------------|----------|-------------------|
| `description` | ใช่ | |
| `quantity` | ใช่ | |
| `unitPrice` | ใช่ | |

### Modal สร้าง vendor (Sub-flow 7)

| Field | Required | Notes |
|-------|----------|--------|
| ชุดฟิลด์ขั้นต่ำ vendor | ตาม API | `POST /api/finance/vendors`; หลัง 201 refresh options + auto-select vendor ใหม่ |

## การกระทำ (CTA)

| Control | Behavior |
|---------|----------|
| `[กลับรายการ]` / breadcrumb | ไป `/finance/ap` — ถ้ามีการแก้ฟอร์มให้ยึด global unsaved confirm |
| `[+ สร้างผู้ขายใหม่]` | เปิด modal → `POST /api/finance/vendors` |
| เพิ่ม/ลบแถวรายการ | จัดการ array ฝั่ง client ก่อน submit |
| `[บันทึกบิล]` | `POST /api/finance/ap/vendor-invoices`; 201 แล้ว redirect ไป `/finance/ap/:id` (แนะนำ) และ invalidate list |
| `[ยกเลิก]` | กลับ `/finance/ap` (หรือ history back) พร้อมยืนยันถ้ามี unsaved |

## สถานะพิเศษ

- **Loading:** skeleton ตัวเลือก vendor; disable ปุ่ม submit ขณะ POST
- **Vendor options error:** inline + retry (Sub-flow 1)
- **สร้างบิล 400:** field errors; vendor ไม่ active ตามข้อความ server
- **Modal vendor 409:** duplicate code ตาม API

## หมายเหตุ implementation (ถ้ามี)

- ทางเลือก UX เดิม: สร้างบิล **inline บน** `/finance/ap` ใน [`ApList.md`](./ApList.md) — โปรเจกต์อาจใช้เฉพาหนึ่งทาง หรือทั้งสอง (ปุ่ม “สร้างบิล” แยกหน้า vs แผง inline)

## Preview HTML notes

| หัวข้อ | ใส่อะไร |
|--------|--------|
| **Shell** | `app` |
| **Regions** | PageHeader → card ฟอร์ม (vendor + grid) → ตารางบรรทัด + สรุปยอด → footer CTA |
| **สถานะสำหรับสลับใน preview** | `default` · `vendorOptionsError` · `vendorModalOpen` · `submitting` |
| **ข้อมูลจำลอง** | 2 แถวบรรทัด; ยอดรวมอ่านจาก client หรือ mock |
| **ลิงก์ CSS** | [`../_Shared/preview-base.css`](../_Shared/preview-base.css) |
