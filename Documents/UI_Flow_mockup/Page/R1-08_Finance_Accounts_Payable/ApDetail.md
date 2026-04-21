# AP bill — รายละเอียด  workflow  จ่ายเงิน  PDF

คู่มือแปลง UX → spec: [`../../UX_TO_UI_SPEC_WORKFLOW.md`](../../UX_TO_UI_SPEC_WORKFLOW.md)

**Route:** `/finance/ap/:id`

---

## Metadata

| Key | Value |
|-----|--------|
| **UX flow** | [`R1-08_Finance_Accounts_Payable.md`](../../../UX_Flow/Functions/R1-08_Finance_Accounts_Payable.md) |
| **UX sub-flow / steps** | Sub-flow 3 — detail; Sub-flow 5 — status; Sub-flow 6 — payment; Sub-flow 8 — PDF |
| **Design system** | [`../../design-system.md`](../../design-system.md) — §3 layout, §6 table, §5 form (modal), §7 |
| **Global FE behaviors** | [`../../../UX_Flow/_GLOBAL_FRONTEND_BEHAVIORS.md`](../../../UX_Flow/_GLOBAL_FRONTEND_BEHAVIORS.md) |
| **Preview** | [`ApDetail.preview.html`](./ApDetail.preview.html) · [`../_Shared/preview-base.css`](../_Shared/preview-base.css) · [`MD_TO_PREVIEW_HTML_MANUAL.md`](../MD_TO_PREVIEW_HTML_MANUAL.md) |

---

## เป้าหมายหน้าจอ

แสดงหัวบิล รายการบรรทัด ประวัติการจ่าย และยอดคงเหลือ (`remainingAmount` จาก API) พร้อม action เปลี่ยนสถานะ workflow บันทึกจ่าย (เมื่อ approved/partially_paid) และดาวน์โหลด PDF

## ผู้ใช้และสิทธิ์

**Actor(s):** `accountant`, `finance_manager` — ปุ่ม submit/approve/reject/pay ตาม permission; **จ่ายเงินได้เมื่อสถานะ approved** (และต่อเนื่องเมื่อ partially_paid ตาม BR)

## โครง layout (สรุป)

`PageHeader` (เลขเอกสาร + status badge + back) → **สรุปหัวบิล** (vendor, vendorInvoiceNo, วันที่, due, notes) → ถ้ามี `poId` แสดงแถบเทียบยอด PO vs บิล → **ตารางบรรทัด** → **สรุปยอด** (total, paid, remaining) → **ตารางประวัติจ่าย** → แถบ CTA (workflow, จ่าย, PDF)

## เนื้อหาและฟิลด์

### หัวและสรุป (อ่านอย่างเดียว)

| Element | Notes |
|---------|--------|
| `documentNo`, `vendor`, `vendorInvoiceNo` | จาก `GET /api/finance/ap/vendor-invoices/:id` |
| `invoiceDate`, `dueDate`, `notes` | |
| `status`, `paidAmount`, `totalAmount` | แสดง `remainingAmount` เป็นของจริงจาก server |
| `statusSummary` | ครอบคลุมอย่างน้อย documentStatus, paymentStatus, isOverdue, lastPaymentDate (UX Coverage Lock) |
| บรรทัดสินค้า/บริการ | description, qty, unitPrice, ยอดรวมแถว |

### Modal / dialog บันทึกจ่าย (Sub-flow 6)

| Field | Required | Notes |
|-------|----------|--------|
| `paymentDate` | ใช่ | |
| `amount` | ใช่ | > 0 และ ≤ ยอดคงเหลือ (validate ก่อน POST; canonical จาก `remainingAmount`) |
| `paymentMethod` | ใช่ | `bank_transfer` \| `cash` \| `cheque` \| `other` |
| `bankAccountId` | ถ้า bank_transfer | จาก `GET /api/finance/bank-accounts/options` |
| `referenceNo` | ตาม BR | |
| `notes` | ไม่ | |

### Workflow (Sub-flow 5)

| Action | Notes |
|--------|--------|
| ส่งอนุมัติ / อนุมัติ / ปฏิเสธ | `PATCH .../status` + confirm; เหตุผล reject ถ้ามี |
| rejected → draft | reset เพื่อแก้ไขแล้วส่ง submitted อีกครั้ง (ถ้า BE รองรับ) |

## การกระทำ (CTA)

| Control | Behavior |
|---------|----------|
| `[กลับ]` / breadcrumb | กลับ [`ApList.md`](./ApList.md) |
| `[ส่งอนุมัติ]` / `[อนุมัติ]` / `[ปฏิเสธ]` / `[แก้ไขและส่งใหม่]` | Sub-flow 5; refresh detail + invalidate list |
| `[บันทึกการจ่าย]` | เปิด modal → `POST /api/finance/ap/vendor-invoices/:id/payments` |
| `[ดาวน์โหลด PDF]` | `GET /api/finance/ap/vendor-invoices/:id/pdf` (blob) |
| หลังจ่ายสำเร็จ + vendor `whtApplicable` | prompt แนะนำ WHT (R2 `/finance/tax/wht`) — R1 อาจเป็น copy แนะนำอย่างเดียว |

## สถานะพิเศษ

- **404/403:** ตาม Global
- **Payment 400:** overpayment หรือจ่ายเมื่อยังไม่ approved
- **Transition 400/403:** ข้อความ transition/approver ชัดเจน
- **PDF error:** 404/500 + retry

## หมายเหตุ implementation (ถ้ามี)

- Deep link ไป PO detail เมื่อมี `poId` (R2)

## Preview HTML notes

| หัวข้อ | ใส่อะไร |
|--------|--------|
| **Shell** | `app` |
| **Regions** | header summary → line items table → payments table → action bar |
| **สถานะสำหรับสลับใน preview** | `approvedWithBalance` · `paid` · `rejected` · `paymentModalOpen` |
| **ข้อมูลจำลอง** | 2 แถวจ่าย partial; แสดง remaining |
| **ลิงก์ CSS** | [`../_Shared/preview-base.css`](../_Shared/preview-base.css) |
