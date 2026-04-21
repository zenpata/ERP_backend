# ตำแหน่ง — สร้างและแก้ไข

คู่มือแปลง UX → spec: [`../../UX_TO_UI_SPEC_WORKFLOW.md`](../../UX_TO_UI_SPEC_WORKFLOW.md)

**Route:** `—` (โมดัล `PositionFormModal` จาก [`Organization.md`](./Organization.md) ที่ `/hr/organization`)

---

## Metadata

| Key | Value |
|-----|--------|
| **UX flow** | [`R1-03_HR_Organization_Management.md`](../../../UX_Flow/Functions/R1-03_HR_Organization_Management.md) |
| **UX sub-flow / steps** | P3 — สร้างตำแหน่ง (`POST /api/hr/positions`); P4 — แก้ไขตำแหน่ง (`PATCH /api/hr/positions/:id`) |
| **Design system** | [`../../design-system.md`](../../design-system.md) — §3 Page layout, §5 forms |
| **Global FE behaviors** | [`../../../UX_Flow/_GLOBAL_FRONTEND_BEHAVIORS.md`](../../../UX_Flow/_GLOBAL_FRONTEND_BEHAVIORS.md) |
| **Preview** | [`PositionForm.preview.html`](./PositionForm.preview.html) · [`../_Shared/preview-base.css`](../_Shared/preview-base.css) · [`../MD_TO_PREVIEW_HTML_MANUAL.md`](../MD_TO_PREVIEW_HTML_MANUAL.md) |
| **หน้าหลักที่เกี่ยวข้อง** | [`Organization.md`](./Organization.md) |

---

## เป้าหมายหน้าจอ

เพิ่มตำแหน่งใหม่หรืออัปเดตชื่อและระดับตำแหน่งให้พร้อมใช้ใน employee form และ payroll grouping

## ผู้ใช้และสิทธิ์

`hr_admin`, `super_admin` — ควบคุมด้วยสิทธิ์เดียวกับหน้า Organization (`hr:department:edit` หรือ key ที่ product ใช้สำหรับตำแหน่ง — อ้าง BR ถ้าแยก permission)

## โครง layout (สรุป)

โมดัลกลางจอ: หัวข้อตามโหมด → ฟิลด์ (รหัส ชื่อ แผนก ระดับ) → ปุ่ม Cancel + Save

## เนื้อหาและฟิลด์

| Field / element | Required | Validation / notes |
|-----------------|----------|-------------------|
| `code` | ใช่ (สร้าง) | unique ตาม schema; โหมดแก้ไขแสดง read-only |
| `name` | ใช่ (สร้าง); แก้ไข optional ใน payload ตาม UX P4 | — |
| `departmentId` | ใช่ (สร้าง) | **Coverage Lock** ใน [`Organization.md`](./Organization.md): ต้องส่งชัดเจนทุกครั้งเมื่อสร้าง — options จาก `GET /api/hr/departments` |
| `departmentId` (แก้ไข) | TBD | UX P4 ไม่ระบุการย้ายแผนก — ถ้า BE รองรับ ให้เป็น select; ถ้าไม่รองรับ แสดง read-only |
| `level` | ไม่ | ตัวเลขระดับตำแหน่ง (optional) |

## การกระทำ (CTA)

| Control | Behavior |
|---------|----------|
| `[Save Position]` | `POST /api/hr/positions` (สร้าง) |
| `[Save Changes]` | `PATCH /api/hr/positions/:id` (แก้ไข) |
| `[Cancel]` | ปิดโมดัลโดยไม่บันทึก |

## สถานะพิเศษ

- **สร้าง — สำเร็จ:** 201 → refresh รายการตำแหน่ง
- **สร้าง — ข้อผิดพลาด:** 409 / 422 ตาม UX P3
- **แก้ไข — ข้อผิดพลาด:** 422 ตาม UX P4
- **โหลดก่อนแก้ไข:** skeleton ระหว่าง `GET /api/hr/positions/:id`

## หมายเหตุ implementation (ถ้ามี)

สอดคล้อง **PositionFormModal** ใน [`Organization.md`](./Organization.md) — รวม `departmentId` ใน payload สร้างตาม Coverage Lock แม้ bullet ช่องกรอกใน UX P3 จะเน้น code/name/level

## Preview HTML notes

| หัวข้อ | ใส่อะไร |
|--------|--------|
| **Shell** | `app` |
| **Regions** | modal → ฟิลด์รหัส ชื่อ แผนก (select) ระดับ → actions |
| **สถานะสำหรับสลับใน preview** | `create` · `edit` · `error` — **`control-panel`** ตาม [`MD_TO_PREVIEW_HTML_MANUAL.md`](../MD_TO_PREVIEW_HTML_MANUAL.md) |
| **ข้อมูลจำลอง** | P010, หัวหน้าทีมขาย, แผนก D001, level 4 |
| **ลิงก์ CSS** | [`../_Shared/preview-base.css`](../_Shared/preview-base.css) — `.control-panel`, `.modal-backdrop`, `.field` |
