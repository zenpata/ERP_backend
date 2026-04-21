# Implementation review backlog

Append-only — รายการ `INC-NNN` สำหรับ defect / spec conflict / tech debt / คำถามระหว่าง implement

---

### INC-001 — `bun test` ล้มใน shared + payroll (ก่อนงานชุดนี้)

| Field | Value |
|--------|--------|
| Date | 2026-04-19 |
| Type | defect |
| Step / area | Phase 3 / `erp_backend` tests |
| Summary | `thai-tax.test.ts`, `thai-id.test.ts`, `payroll.test.ts` คาดหวัง `Decimal.toString()` แบบมีทศนิยมคงที่ (เช่น `7.00`) แต่ได้ `7` / checksum เลขบัตรตัวอย่างไม่ตรงกับ implementation |
| Evidence | รัน `cd erp_backend && bun test` |
| Decision / workaround | ยังไม่แก้ — แยก PR แก้ utils หรือปรับ expectation |
| Status | open |

---

### INC-002 — Quotation PDF ยังไม่มี (Batch B5)

| Field | Value |
|--------|--------|
| Date | 2026-04-19 |
| Type | tech debt / gap |
| Step / area | R2-3.11 — `GET /api/finance/quotations/:id/pdf` |
| Summary | Endpoint มีแล้วแต่ตอบ **501** `NOT_IMPLEMENTED` — ยังไม่สร้าง PDF จริง ตาม SD `quotation_sales_orders.md` และ export รวมควรไปทำร่วม B10 / `document_exports.md` |
| Evidence | `erp_backend/.../quotation/quotation.routes.ts` → `AppError('NOT_IMPLEMENTED', …, 501)` |
| Decision / workaround | รับได้ชั่วคราว — FE ไม่มีปุ่มดาวน์โหลดที่เรียก PDF จนกว่าจะ implement |
| Status | open |

---

### INC-003 — แปลง SO → Invoice ครั้งเดียวเต็มยอดคงเหลือทุกบรรทัด (Batch B5)

| Field | Value |
|--------|--------|
| Date | 2026-04-19 |
| Type | spec / UX gap |
| Step / area | R2-3.11 — `POST /api/finance/sales-orders/:id/convert-to-invoice` |
| Summary | SD ล็อกให้ใช้ `remainingQty` ต่อบรรทัดและ **409** เมื่อไม่มียอดคงเหลือ — ปัจจุบัน implement เป็น **หนึ่ง draft invoice ต่อหนึ่งคำขอ** ที่รวมทุกบรรทัดที่ยังเหลือในครั้งเดียว ไม่รองรับแบ่ง partial หลายใบแจ้งหนี้ต่อบรรทัดหรือเลือก qty ต่อครั้ง |
| Evidence | `InvoiceService.createFromSalesOrder` ใน `erp_backend/.../invoice/invoice.service.ts` |
| Decision / workaround | พอใช้สำหรับ pipeline demo — ถ้าต้องการตรง BR เต็ม ให้ขยาย API/body (qty per line) + หลายครั้ง convert |
| Status | open |

---

### INC-004 — AR payment ไม่ลง bank ledger (สะท้อนจาก B4 ยังคงมีผลกับ B5)

| Field | Value |
|--------|--------|
| Date | 2026-04-19 |
| Type | gap |
| Step / area | R2-3.2 / R2-3.5 — `invoice_payments.bank_account_id` |
| Summary | บันทึก payment ลง `invoice_payments` + `invoices.paid_amount` แล้ว แต่ยังไม่บันทึก ledger บัญชีธนาคารเมื่อมี `bankAccountId` ตาม SD เต็ม |
| Evidence | `change.md` Batch B4 — ข้อจำกัด; schema มีฟิลด์แต่ไม่มี side effect ไป GL/bank |
| Decision / workaround | รอ B7 bank / GL integration |
| Status | open |

---
