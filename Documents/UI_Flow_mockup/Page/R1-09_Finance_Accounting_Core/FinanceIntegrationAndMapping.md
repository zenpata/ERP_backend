# Accounting — integration post, source trace, mapping config

คู่มือแปลง UX → spec: [`../../UX_TO_UI_SPEC_WORKFLOW.md`](../../UX_TO_UI_SPEC_WORKFLOW.md)

**Route:** ส่วนใหญ่ `—` (แท็บ/หน้าย่อยภายใต้ `/finance/...` ตาม product) — ดู UX Sub-flow M–S

---

## Metadata

| Key | Value |
|-----|--------|
| **UX flow** | [`R1-09_Finance_Accounting_Core.md`](../../../UX_Flow/Functions/R1-09_Finance_Accounting_Core.md) |
| **UX sub-flow / steps** | M — Post payroll; N — Post PM expense; O — Post budget adjustment; P — Source tracing; Q — Source mappings config; R — Income/expense categories config; S — Error recovery auto-post |
| **Design system** | [`../../design-system.md`](../../design-system.md) |
| **Global FE behaviors** | [`../../../UX_Flow/_GLOBAL_FRONTEND_BEHAVIORS.md`](../../../UX_Flow/_GLOBAL_FRONTEND_BEHAVIORS.md) |
| **Preview** | [`FinanceIntegrationAndMapping.preview.html`](./FinanceIntegrationAndMapping.preview.html) · [`../_Shared/preview-base.css`](../_Shared/preview-base.css) · [`MD_TO_PREVIEW_HTML_MANUAL.md`](../MD_TO_PREVIEW_HTML_MANUAL.md) |

---

## เป้าหมายหน้าจอ

รวม UI สำหรับผลักดันข้อมูลจากโมดูลอื่นเข้าบัญชี ตรวจสอบแหล่งที่มา ตั้งค่า mapping และกู้ error ตาม Sub-flow M–S ในเอกสาร UX

## ผู้ใช้และสิทธิ์

`finance_manager` เป็นหลัก; บาง action อาจจำกัด `super_admin`

## โครง layout (สรุป)

แท็บหรือเมนูย่อย: Integration actions (ปุ่ม post ต่อ runId/expenseId/budgetId) · Source trace (ค้นหา module/sourceId) · Mapping tables (editable grid) · Recovery queue

## เนื้อหาและฟิลด์

อ้าง **User sees** / endpoint ใน UX แต่ละ Sub-flow M–S — ฟิลด์ขึ้นกับ contract API (runId, expenseId, budgetId, module, sourceId)

## การกระทำ (CTA)

Post / Retry mapping / เปิด journal จาก trace — ตาม UX แต่ละ sub-flow

## สถานะพิเศษ

409 ขัดแย้ง; 400 mapping ไม่ครบ; แสดงรายการ error recovery (S)

## หมายเหตุ implementation (ถ้ามี)

แยกเป็นหลายหน้าได้เมื่อ router คงที่ — แตกไฟล์เพิ่มได้ภายหลัง

## Preview HTML notes

| หัวข้อ | ใส่อะไร |
|--------|--------|
| **Shell** | `app` |
| **Regions** | ตามแท็บ UX |
| **ลิงก์ CSS** | [`../_Shared/preview-base.css`](../_Shared/preview-base.css) |
