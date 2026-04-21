# Role — สร้าง Custom Role

คู่มือแปลง UX → spec: [`../../UX_TO_UI_SPEC_WORKFLOW.md`](../../UX_TO_UI_SPEC_WORKFLOW.md)

**Route:** `/settings/roles/new`  
**ทางเลือก UX:** โมดัลบนหน้า [`Roles.md`](./Roles.md) (`/settings/roles`) ได้เทียบเท่ากัน — เลือกอย่างใดอย่างหนึ่งให้สอดคล้อง `erp_frontend`

---

## Metadata

| Key | Value |
|-----|--------|
| **UX flow** | [`R1-16_Settings_Role_and_Permission.md`](../../../UX_Flow/Functions/R1-16_Settings_Role_and_Permission.md) |
| **UX sub-flow / steps** | Sub-flow B — สร้าง Custom Role; Step B1 — ส่งฟอร์มสร้าง Role |
| **Design system** | [`design-system.md`](../../design-system.md) — §3 Page layout, §5 forms |
| **Global FE behaviors** | [`../../../UX_Flow/_GLOBAL_FRONTEND_BEHAVIORS.md`](../../../UX_Flow/_GLOBAL_FRONTEND_BEHAVIORS.md) |
| **Preview** | [`RoleCreate.preview.html`](./RoleCreate.preview.html) · [`../_Shared/preview-base.css`](../_Shared/preview-base.css) · [`MD_TO_PREVIEW_HTML_MANUAL.md`](../MD_TO_PREVIEW_HTML_MANUAL.md) |
| **กลับ / บริบท** | จาก [`Roles.md`](./Roles.md) ผ่าน `[Create Role]` |

---

## เป้าหมายหน้าจอ

เพิ่ม role แบบ custom (`isSystem=false`) ด้วยชื่อและคำอธิบาย แล้วบันทึกผ่าน `POST /api/settings/roles`

## ผู้ใช้และสิทธิ์

**Actor(s):** `super_admin` หรือ admin ที่มีสิทธิ์จัดการ roles — 401/403/409 ตาม Global FE behaviors

## โครง layout (สรุป)

`PageHeader` + breadcrumb (`Roles` → สร้าง role) → **การ์ดฟอร์ม** (ฟิลด์ด้านล่าง) → แถบปุ่ม secondary primary (`[Cancel]` · `[Create Role]`)

## เนื้อหาและฟิลด์

| Field | Required | Notes |
|-------|----------|--------|
| `name` | ใช่ | ชื่อ role; ความซ้ำตัดสินที่ BE (400/409) |
| `description` | ไม่ | คำอธิบายสั้น ๆ |

## การกระทำ (CTA)

| Control | Behavior |
|---------|----------|
| `[Cancel]` | กลับ [`Roles.md`](./Roles.md) โดยไม่บันทึก |
| `[Create Role]` | validate ฝั่ง client (ชื่อไม่ว่าง) → `POST /api/settings/roles` |
| หลัง **201** | refresh รายการ; ทางเลือก UX: นำทางไป matrix/แก้สิทธิ์ของ role ใหม่ทันที |

## สถานะพิเศษ

- **Submitting:** disable ปุ่ม + แสดงสถานะกำลังบันทึก
- **400/409:** แสดงข้อความชื่อซ้ำหรือ validation จาก API
- **หลังสร้างสำเร็จ:** toast หรือข้อความสำเร็จ ตาม pattern Settings อื่น

## หมายเหตุ implementation (ถ้ามี)

- ไม่สร้าง `super_admin` / system role ผ่านฟอร์มนี้ — มีเฉพาะ custom

## Preview HTML notes

| หัวข้อ | ใส่อะไร |
|--------|--------|
| **Shell** | `app` (sidebar Settings เหมือน [`Users.preview.html`](../R1-15_Settings_User_Management/Users.preview.html)) |
| **Regions** | breadcrumb → heading → card ฟอร์ม → แถบปุ่ม |
| **สถานะสำหรับสลับใน preview** | `default` · `submitting` (ถ้ามี toggle) |
| **ลิงก์ CSS** | [`../_Shared/preview-base.css`](../_Shared/preview-base.css) |

---

## Appendix — UX excerpt (reference)

อ้างอิงเต็ม: **Sub-flow B — สร้าง Custom Role** / **Step B1 — ส่งฟอร์มสร้าง Role** ใน [`R1-16_Settings_Role_and_Permission.md`](../../../UX_Flow/Functions/R1-16_Settings_Role_and_Permission.md)

**Goal:** เพิ่ม role ใหม่ที่องค์กรกำหนดเอง

**User sees:** modal หรือหน้า `/settings/roles/new` พร้อมฟิลด์ชื่อ/คำอธิบาย

**Frontend behavior:** validate ชื่อไม่ซ้ำ (ข้อยุติที่ BE); `POST /api/settings/roles`

**Success:** 201 พร้อม `id`; refresh list

**Error:** 400/409 ชื่อซ้ำ
