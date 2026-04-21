# `<Page Title>` — Frontend page spec

คู่มือแปลงจาก UX_Flow → ไฟล์นี้: [`../UX_TO_UI_SPEC_WORKFLOW.md`](../UX_TO_UI_SPEC_WORKFLOW.md)

**Route:** `<e.g. /hr/employees>` (หรือ `—` ถ้าเป็น modal/state ภายใน shell)

## Metadata

| Key | Value |
|-----|--------|
| **UX flow** | [`Documents/UX_Flow/Functions/Rx-xx_Function_Name.md`](../../../UX_Flow/Functions/Rx-xx_Function_Name.md) |
| **UX sub-flow / steps** | `<e.g. Sub-flow List employees → Step …>` |
| **Design system** | [`../design-system.md`](../design-system.md) — ใช้สำหรับ class/pattern ตอนสร้าง HTML |
| **Global FE behaviors** | [`Documents/UX_Flow/_GLOBAL_FRONTEND_BEHAVIORS.md`](../../../UX_Flow/_GLOBAL_FRONTEND_BEHAVIORS.md) |
| **Preview** | [`<PageName>.preview.html`](./<PageName>.preview.html) · CSS: [`../_Shared/preview-base.css`](../_Shared/preview-base.css) · คู่มือแปลง: [`MD_TO_PREVIEW_HTML_MANUAL.md`](./MD_TO_PREVIEW_HTML_MANUAL.md) |

## เป้าหมายหน้าจอ

`<หนึ่งประโยคจาก Goal / context ใน UX>`

## ผู้ใช้และสิทธิ์

`<บทบาท / permission keys ถ้ามี>` — กรณี 401/403/อ่านอย่างเดียวให้อ้างเอกสาร Global FE behaviors แทนการเขียนซ้ำ

## โครง layout (สรุป)

`<PageHeader, sections, table, form grid>` — ระบุ section ใน `design-system.md` ที่ใช้ (เช่น §3 Page Layout, §6 DataTable)

## เนื้อหาและฟิลด์

| Field / element | Required | Validation / notes |
|-----------------|----------|-------------------|
| … | … | … |

## การกระทำ (CTA)

| Control | Behavior |
|---------|----------|
| … | … |

## สถานะพิเศษ

- **Loading / empty / error / 409 / unsaved:** `<เฉพาะหน้านี้>` + อ้าง global เมื่อเป็นมาตรฐานเดียวกัน

## หมายเหตุ implementation (ถ้ามี)

`<เช่น map กับ erp_frontend: path/to/Page.tsx>` — ใช้ชั่วระยะเทียบกับโค้ดเดิม

## Preview HTML notes (แนะนำ — ให้คนเขียน `*.preview.html` ใช้ส่วนนี้เป็นบลูปรินต์)

ขั้นตอนและ convention เต็ม ๆ: [`MD_TO_PREVIEW_HTML_MANUAL.md`](./MD_TO_PREVIEW_HTML_MANUAL.md)

| หัวข้อ | ใส่อะไร |
|--------|---------|
| **Shell** | `standalone` (เต็มจอ เช่น login) / `app` (sidebar+header ตาม AppShell) / `modal` |
| **Regions บนหน้า (ลำดับบนลงล่าง)** | เช่น `PageHeader` → `filters` → `data table` → `pagination` |
| **สถานะสำหรับสลับใน preview** | เช่น `default` · `loading` · `empty` · `error` · `readOnly` — ระบุว่าอันไหนต้องมี mock |
| **ข้อมูลจำลอง** | จำนวนแถว, ตัวอย่าง badge/status, ข้อความ empty state |
| **ลิงก์ CSS** | [`../_Shared/preview-base.css`](../_Shared/preview-base.css) + class จาก [`design-system.md`](../design-system.md) |

---

*ลบส่วน placeholder และแถวตารางที่ไม่ใช้ก่อน commit*
