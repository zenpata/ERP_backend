# Journal entry — รายละเอียดและบรรทัด (ก่อน post / reverse)

คู่มือแปลง UX → spec: [`../../UX_TO_UI_SPEC_WORKFLOW.md`](../../UX_TO_UI_SPEC_WORKFLOW.md)

**Route:** `/finance/journal/:id` (TBD — ให้สอดคล้อง router จริง)

---

## Metadata

| Key | Value |
|-----|--------|
| **UX flow** | [`R1-09_Finance_Accounting_Core.md`](../../../UX_Flow/Functions/R1-09_Finance_Accounting_Core.md) |
| **UX sub-flow / steps** | F — `GET /api/finance/journal-entries/:id`; เกี่ยวข้อง H — Post; I — Reverse |
| **Design system** | [`../../design-system.md`](../../design-system.md) — §3, §6 |
| **Global FE behaviors** | [`../../../UX_Flow/_GLOBAL_FRONTEND_BEHAVIORS.md`](../../../UX_Flow/_GLOBAL_FRONTEND_BEHAVIORS.md) |
| **Preview** | [`JournalDetail.preview.html`](./JournalDetail.preview.html) · [`../_Shared/preview-base.css`](../_Shared/preview-base.css) · [`MD_TO_PREVIEW_HTML_MANUAL.md`](../MD_TO_PREVIEW_HTML_MANUAL.md) |

---

## เป้าหมายหน้าจอ

แสดงหัว journal และรายการบรรทัด (debit/credit, account) สำหรับตรวจทานก่อน Post หรือหลัง posted สำหรับดูประวัติ / Reverse

## ผู้ใช้และสิทธิ์

`finance_manager`, `accountant`

## โครง layout (สรุป)

PageHeader + สรุปสถานะ (draft/posted) → ตารางบรรทัด → ปุ่ม Post / Reverse ตาม state และสิทธิ์

## เนื้อหาและฟิลด์

| Element | Notes |
|---------|--------|
| Header | เลขที่ journal, วันที่, คำอธิบาย, สถานะ |
| Lines | account, debit, credit, memo |
| Totals | ยอดรวมเดบิต = เครดิต |

## การกระทำ (CTA)

| Control | Behavior |
|---------|----------|
| `[Post]` | `POST .../post` (Sub-flow H) เมื่อ draft |
| `[Reverse]` | `POST .../reverse` (Sub-flow I) เมื่อ posted ตามเงื่อนไข |
| `[กลับ]` | กลับ [`JournalList.md`](./JournalList.md) |

## สถานะพิเศษ

404; transition error จาก Post/Reverse; optimistic UI ปิดใช้ถ้า BE ไม่รองรับ

## Preview HTML notes

| หัวข้อ | ใส่อะไร |
|--------|--------|
| **Shell** | `app` |
| **สถานะ** | `draft` · `posted` |
| **ลิงก์ CSS** | [`../_Shared/preview-base.css`](../_Shared/preview-base.css) |
