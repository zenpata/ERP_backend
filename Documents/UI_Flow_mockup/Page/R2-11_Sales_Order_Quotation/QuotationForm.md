# QuotationForm

คู่มือแปลง UX → spec: [`../../UX_TO_UI_SPEC_WORKFLOW.md`](../../UX_TO_UI_SPEC_WORKFLOW.md)

**Route:** `/finance/quotations/new` (create) · `/finance/quotations/:id` (detail / edit)

---

## Metadata

| Key | Value |
|-----|--------|
| **UX flow** | [`R2-11_Sales_Order_Quotation.md`](../../../UX_Flow/Functions/R2-11_Sales_Order_Quotation.md) |
| **UX sub-flow / steps** | สรุปใน Appendix — แตกตามหัวข้อ Sub-flow / Step ในเอกสาร UX |
| **Design system** | [`design-system.md`](../../design-system.md) — §3 Page layout, §5 forms, §6 DataTable ตามประเภทหน้า |
| **Global FE behaviors** | [`_GLOBAL_FRONTEND_BEHAVIORS.md`](../../../UX_Flow/_GLOBAL_FRONTEND_BEHAVIORS.md) |
| **Preview** | [`QuotationForm.preview.html`](./QuotationForm.preview.html) · [`../_Shared/preview-base.css`](../_Shared/preview-base.css) · [`MD_TO_PREVIEW_HTML_MANUAL.md`](../MD_TO_PREVIEW_HTML_MANUAL.md) |

---

## เป้าหมายหน้าจอ

สร้าง / ดูรายละเอียด / แก้ไข quotation และดำเนินการ workflow (ส่ง, ยอมรับ, ปฏิเสธ, แปลง SO, ดาวน์โหลด PDF)

## ผู้ใช้และสิทธิ์

อ่าน Actor(s) และ permission gate ใน Appendix / เอกสาร UX — กรณี 401/403/409 อ้าง Global FE behaviors

## โครง layout (สรุป)

ระบุตามประเภทหน้าใน Appendix: list / detail / form / แท็บ — ใช้ pattern ใน design-system.md

## เนื้อหาและฟิลด์

สกัดจาก **User sees** / **User Action** / ช่องกรอกใน Appendix เป็นตารางฟิลด์เต็มเมื่อปรับแต่งรอบถัดไป; ขณะนี้ใช้บล็อก UX ด้านล่างเป็นข้อมูลอ้างอิงครบถ้วน

## การกระทำ (CTA)

สกัดจากปุ่มใน Appendix (`[...]`) และ Frontend behavior

## สถานะพิเศษ

Loading, empty, error, validation, dependency ขณะลบ — ตาม **Error** / **Success** ใน Appendix

## หมายเหตุ implementation (ถ้ามี)

เทียบ `erp_frontend` เมื่อทราบ path ของหน้า

## Preview HTML notes

| หัวข้อ | ใส่อะไร |
|--------|--------|
| **Shell** | โดยมาก `app` (ยกเว้นหน้า login / standalone) |
| **Regions** | ดูลำดับ **User sees** ใน Appendix |
| **สถานะสำหรับสลับใน preview** | `default` · `loading` · `empty` · `error` ตาม UX |
| **ข้อมูลจำลอง** | จำนวนแถว / สถานะ badge ตามประเภทหน้า |
| **ลิงก์ CSS** | [`../_Shared/preview-base.css`](../_Shared/preview-base.css) |

---

## Appendix — UX excerpt (reference)

## Part 1 — Quotation

### Sub-flow Q1 — รายการใบเสนอราคา (List)

**กลุ่ม endpoint:** `GET /api/finance/quotations`

#### Step Q1a — เปิดตาราง QT

**Goal:** ค้นหาและเลือก quotation

**User sees:** ตาราง `quotNo`, ลูกค้า, วันที่, สถานะ, ยอดรวม

**User can do:** กรอง `status`, `customerId`, `search`, แบ่งหน้า `page`/`limit`

**Frontend behavior:**

- `GET /api/finance/quotations?page=&limit=&search=&status=&customerId=`

**System / AI behavior:** list + `meta.total`

**Success:** แสดงรายการครบ

**Error:** 401/403

**Notes:** SD ระบุ query params ชัดเจน

---

### Sub-flow Q2 — สร้างใบเสนอราคา (Create)

**กลุ่ม endpoint:** `POST /api/finance/quotations`

#### Step Q2a — สร้าง QT ใหม่

**Goal:** บันทึกใบเสนอราคาพร้อมรายการสินค้า/บริการ

**User sees:** `/finance/quotations/new` — เลือกลูกค้า, วันออก, valid until, ตาราง `items`

**User can do:** เพิ่มบรรทัด, บันทึก

**Frontend behavior:**

- โหลดลูกค้า: `GET /api/finance/customers/options` (จาก customers SD)
- `POST /api/finance/quotations` body ตาม SD (customerId, issueDate, validUntil, items[])
- ถ้า response มี `creditWarning` (Gap E เมื่อ BE ใส่ใน POST quotation) → แสดง banner

**System / AI behavior:** insert quotation + items; สถานะเริ่ม `draft`

**Success:** 201 + redirect `/finance/quotations/:id`

**Error:** 400 validation; `creditWarning` ไม่ใช่ error แต่ต้องแสดงชัด

**Notes:** `POST /api/finance/quotations`

---

### Sub-flow Q3 — รายละเอียดและแก้ไข (Detail + Update)

**กลุ่ม endpoint:** `GET /api/finance/quotations/:id`, `PATCH /api/finance/quotations/:id`

#### Step Q3a — ดูรายละเอียด QT

**Goal:** ตรวจสอบเงื่อนไขและรายการก่อนส่งหรือแปลง SO

**User sees:** หัวเอกสาร, รายการ, ยอดรวม, ปุ่ม actions (สถานะ, PDF, แปลง SO)

**User can do:** แก้ไขเมื่อเป็น draft

**Frontend behavior:**

- `GET /api/finance/quotations/:id`

**System / AI behavior:** คืน `items` ครบ

**Success:** โหลดครบ

**Error:** 404

#### Step Q3b — แก้ไข QT (draft)

**Goal:** อัปเดตรายการหรือหมายเหตุ

**User sees:** โหมดแก้ไข

**User can do:** บันทึก

**Frontend behavior:**

- `PATCH /api/finance/quotations/:id` — SD ระบุว่าแก้ได้เฉพาะ draft; ถ้าไม่ใช่ draft ให้ปิดฟอร์มแก้ไขฝั่ง FE

**System / AI behavior:** partial update

**Success:** 200

**Error:** 409 ไม่ใช่ draft

**Notes:** `PATCH /api/finance/quotations/:id`

---

### Sub-flow Q4 — เปลี่ยนสถานะ QT (Status)

**กลุ่ม endpoint:** `PATCH /api/finance/quotations/:id/status`

#### Step Q4a — ส่ง/ยอมรับ/ปฏิเสธ

**Goal:** ขยับ workflow เช่น `sent`, `accepted`, `rejected`

**User sees:** dropdown สถานะ

**User can do:** เลือกและยืนยัน

**Frontend behavior:**

- `PATCH /api/finance/quotations/:id/status` body `{ "status": "<value>" }`

**System / AI behavior:** อัปเดต `quotations.status`

**Success:** badge สถานะเปลี่ยน

**Error:** 409 transition

**Notes:** `PATCH /api/finance/quotations/:id/status`

---

### Sub-flow Q5 — แปลง QT เป็น Sales Order (Convert to SO)

**กลุ่ม endpoint:** `POST /api/finance/quotations/:id/convert-to-so`

#### Step Q5a — Convert

**Goal:** สร้าง SO จาก QT พร้อมคัดลอกรายการ

**User sees:** dialog ยืนยัน

**User can do:** ยืนยัน

**Frontend behavior:**

- `POST /api/finance/quotations/:id/convert-to-so` (body ว่างตาม SD)
- 201 → นำทางไป `GET /api/finance/sales-orders/:salesOrderId` หรือ route `/finance/sales-orders/:id`

**System / AI behavior:** insert `sales_orders` + items จาก quotation

**Success:** ได้ `salesOrderId`, `soNo`, `quotationId`, `quotationStatus` ใน response เพื่อใช้ success state และ navigation

**Error:** 409 QT ไม่พร้อมแปลง

**Notes:** `POST /api/finance/quotations/:id/convert-to-so`

---

### Sub-flow Q6 — PDF ใบเสนอราคา

**กลุ่ม endpoint:** `GET /api/finance/quotations/:id/pdf`

#### Step Q6a — ดาวน์โหลด PDF

**Goal:** ส่งลูกค้าเป็นไฟล์

**Frontend behavior:** `GET /api/finance/quotations/:id/pdf`

**Notes:** รายละเอียดการจัดการ blob ดู `R2-09_Document_Print_Export.md`

---

## Part 2 — Sales Order

### Sub-flow S1 — รายการ SO (List)

**กลุ่ม endpoint:** `GET /api/finance/sales-orders`

#### Step S1a — เปิดตาราง SO

**Goal:** ค้นหาและเลือก SO

**User sees:** ตาราง `soNo`, ลูกค้า, สถานะ, ยอด

**User can do:** กรอง `page`,`limit`,`search`,`status`,`customerId`

**Frontend behavior:**

- `GET /api/finance/sales-orders?page=&limit=&search=&status=&customerId=`

**System / AI behavior:** list + meta

**Success:** แสดงครบ

**Error:** 401/403

**Notes:** `GET /api/finance/sales-orders`

---

### Sub-flow S2 — สร้าง SO โดยตรง (Create SO)

**กลุ่ม endpoint:** `POST /api/finance/sales-orders`

#### Step S2a — สร้าง SO ไม่ผ่าน QT

**Goal:** บันทึก SO ใหม่เมื่อไม่มี quotation ต้นทาง

**User sees:** ฟอร์มลูกค้า, orderDate, items

**User can do:** บันทึก

**Frontend behavior:**

- `GET /api/finance/customers/options`
- `POST /api/finance/sales-orders` body ตาม SD (`customerId`, `orderDate`, `items`)
- จัดการ `creditWarning` ถ้ามี (Gap E)

**System / AI behavior:** insert SO + lines

**Success:** 201 + redirect detail

**Error:** 400

**Notes:** `POST /api/finance/sales-orders`

---

### Sub-flow S3 — รายละเอียด SO (Detail)

**กลุ่ม endpoint:** `GET /api/finance/sales-orders/:id`

#### Step S3a — ดู SO

**Goal:** ตรวจสอบรายการก่อน confirm หรือแปลง invoice

**User sees:** รายการ, สถานะ, ลิงก์ invoice ที่สร้างแล้ว (ถ้า BE ส่ง)

**User can do:** เปลี่ยนสถานะ, แปลง invoice, (ถ้ามีในอนาคต) แก้ไขผ่าน endpoint ที่ BE เพิ่ม — ใน SD ปัจจุบันมีเฉพาะ `PATCH .../status`

**Frontend behavior:**

- `GET /api/finance/sales-orders/:id`

**System / AI behavior:** SD ระบุว่า select รวม linked invoices

**Success:** ข้อมูลครบ

**Error:** 404

**Notes:** `GET /api/finance/sales-orders/:id`

---

### Sub-flow S4 — สถานะ SO (Status)

**กลุ่ม endpoint:** `PATCH /api/finance/sales-orders/:id/status`

#### Step S4a — confirm / cancel

**Goal:** ปรับสถานะ SO ให้สอดคล้องการส่งมอบ/บัญชี

**User sees:** ปุ่ม/dropdown สถานะ

**User can do:** เลือกสถานะ

**Frontend behavior:**

- `PATCH /api/finance/sales-orders/:id/status` body `{ "status": "confirmed" }` เป็นต้น

**System / AI behavior:** update `sales_orders.status`

**Success:** 200

**Error:** 409

**Notes:** `PATCH /api/finance/sales-orders/:id/status`

---

### Sub-flow S5 — แปลง SO เป็น Invoice (Convert to invoice)

**กลุ่ม endpoint:** `POST /api/finance/sales-orders/:id/convert-to-invoice`

#### Step S5a — สร้าง invoice จาก SO

**Goal:** เปิดใบแจ้งหนี้จากยอดคงเหลือของ SO (qty ที่เหลือ invoice ได้ — ตาม BR/BE)

**User sees:** dialog ยืนยัน + สรุปยอดที่จะถูก invoice

**User can do:** ยืนยัน

**Frontend behavior:**

- `POST /api/finance/sales-orders/:id/convert-to-invoice`
- 201 → navigate `/finance/invoices/:invoiceId` และอาจเรียก `GET /api/finance/invoices/:id`

**System / AI behavior:** insert invoice + items จาก SO remaining qty (ตาม SD sequence)

**Success:** ได้ `invoiceId`, `invoiceNo`, `salesOrderId`, `salesOrderStatus` เพื่อใช้ success state และ navigation

**Error:** 409 ไม่มียอดให้ invoice; 400

**Notes:** เชื่อม `Documents/SD_Flow/Finance/invoices.md` (`POST /api/finance/invoices` เป็นอีกทางสร้าง invoice โดยตรง — คนละ flow)
