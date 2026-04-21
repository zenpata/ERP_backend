# Chart of accounts — สร้างและแก้ไขบัญชี

คู่มือแปลง UX → spec: [`../../UX_TO_UI_SPEC_WORKFLOW.md`](../../UX_TO_UI_SPEC_WORKFLOW.md)

**Route:** `—` (modal / drawer จาก [`ChartOfAccountsList.md`](./ChartOfAccountsList.md)) หรือ `/finance/accounts/new` / `.../edit` ถ้าแยก route

---

## Metadata

| Key | Value |
|-----|--------|
| **UX flow** | [`R1-09_Finance_Accounting_Core.md`](../../../UX_Flow/Functions/R1-09_Finance_Accounting_Core.md) |
| **UX sub-flow / steps** | B — สร้าง (`POST /api/finance/accounts`); C — แก้ไข (`PATCH`); D — activate/deactivate (`PATCH .../activate`) |
| **Design system** | [`../../design-system.md`](../../design-system.md) — §5 form, §7 |
| **Global FE behaviors** | [`../../../UX_Flow/_GLOBAL_FRONTEND_BEHAVIORS.md`](../../../UX_Flow/_GLOBAL_FRONTEND_BEHAVIORS.md) |
| **Preview** | [`ChartOfAccountsForm.preview.html`](./ChartOfAccountsForm.preview.html) · [`../_Shared/preview-base.css`](../_Shared/preview-base.css) · [`MD_TO_PREVIEW_HTML_MANUAL.md`](../MD_TO_PREVIEW_HTML_MANUAL.md) |

---

## เป้าหมายหน้าจอ

เพิ่มหรือแก้ไขบัญชีในผังบัญชี (code, name, type, parent ถ้ามี) และสลับสถานะใช้งานตาม Sub-flow D

## ผู้ใช้และสิทธิ์

`finance_manager`, `accountant` (ตาม BR) — 403 อ้าง Global

## โครง layout (สรุป)

ฟอร์มสั้นใน modal หรือหน้าเต็ม: ฟิลด์หลัก → ปุ่ม Save / Cancel; แยก control สำหรับ activate ถ้าไม่อยู่ในฟอร์มเดียวกัน

## เนื้อหาและฟิลด์

| Field | Required | Notes |
|-------|----------|--------|
| `code` | ใช่ (สร้าง) | unique; รูปแบบตามนโยบาย |
| `name` | ใช่ | |
| `type` | ใช่ | asset \| liability \| equity \| income \| expense |
| `parent` / parent account | ไม่ | ถ้า product รองรับ hierarchy |
| `isActive` | Sub-flow D | toggle / `PATCH .../activate` |

## การกระทำ (CTA)

| Control | Behavior |
|---------|----------|
| `[บันทึก]` | `POST` (สร้าง) หรือ `PATCH` (แก้ไข) |
| `[ยกเลิก]` | ปิดโดยไม่บันทึก |
| `[เปิด/ปิดใช้งาน]` | `PATCH .../activate` ตาม UX |

## สถานะพิเศษ

409 duplicate code; 400 validation; loading ขณะ submit

## Preview HTML notes

| หัวข้อ | ใส่อะไร |
|--------|--------|
| **Shell** | `app` หรือ `modal` |
| **Regions** | form fields → actions |
| **สถานะ** | `create` · `edit` · `error` |
| **ลิงก์ CSS** | [`../_Shared/preview-base.css`](../_Shared/preview-base.css) |
