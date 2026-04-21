# แผนก — สร้างและแก้ไข

คู่มือแปลง UX → spec: [`../../UX_TO_UI_SPEC_WORKFLOW.md`](../../UX_TO_UI_SPEC_WORKFLOW.md)

**Route:** `—` (โมดัล `DepartmentFormModal` จาก [`Organization.md`](./Organization.md) ที่ `/hr/organization`) — ถ้า product แยก route ภายหลัง ใช้ `/hr/organization/departments/new` และ `.../edit` ตามนโยบาย routing

---

## Metadata

| Key | Value |
|-----|--------|
| **UX flow** | [`R1-03_HR_Organization_Management.md`](../../../UX_Flow/Functions/R1-03_HR_Organization_Management.md) |
| **UX sub-flow / steps** | D3 — สร้างแผนก (`POST /api/hr/departments`); D4 — แก้ไขแผนก (`PATCH /api/hr/departments/:id`) |
| **Design system** | [`../../design-system.md`](../../design-system.md) — §3 Page layout, §5 forms |
| **Global FE behaviors** | [`../../../UX_Flow/_GLOBAL_FRONTEND_BEHAVIORS.md`](../../../UX_Flow/_GLOBAL_FRONTEND_BEHAVIORS.md) |
| **Preview** | [`DepartmentForm.preview.html`](./DepartmentForm.preview.html) · [`../_Shared/preview-base.css`](../_Shared/preview-base.css) · [`../MD_TO_PREVIEW_HTML_MANUAL.md`](../MD_TO_PREVIEW_HTML_MANUAL.md) |
| **หน้าหลักที่เกี่ยวข้อง** | [`Organization.md`](./Organization.md) |

---

## เป้าหมายหน้าจอ

สร้างแผนกใหม่ให้ถูกต้องตาม constraint (รหัสไม่ซ้ำ) หรืออัปเดตชื่อ ผู้จัดการ และแผนกแม่โดยไม่ส่งทั้ง record ถ้าไม่จำเป็น

## ผู้ใช้และสิทธิ์

`hr_admin`, `super_admin` — สิทธิ์แก้ไขผูกกับ `hr:department:edit` (ดูหน้าหลัก Organization); 401/403 อ้าง Global FE behaviors

## โครง layout (สรุป)

โมดัลกลางจอ: หัวข้อตามโหมด (สร้าง / แก้ไข) → ฟิลด์แบบฟอร์มแนวตั้งหรือ grid 2 คอลัมน์ (จอใหญ่) → แถบปุ่ม Cancel (secondary) + Save (primary)

## เนื้อหาและฟิลด์

| Field / element | Required | Validation / notes |
|-----------------|----------|-------------------|
| `code` | ใช่ (สร้างเท่านั้น) | client: required, ความยาวตามนโยบาย; โหมดแก้ไขแสดง read-only หรือซ่อน (ไม่ส่งใน PATCH ถ้า product ล็อกรหัส) |
| `name` | ใช่ (สร้าง); แก้ไขเป็นช่องว่างได้ตาม UX (optional ใน payload) | — |
| `managerId` | ไม่ | select พนักงาน active — แหล่งข้อมูล `GET /api/hr/employees?status=active` ตาม Coverage Lock ใน Organization spec |
| `parentDepartmentId` | ไม่ | select แผนกแม่; กันวงจร / self-parent ตาม BE |

## การกระทำ (CTA)

| Control | Behavior |
|---------|----------|
| `[Save Department]` | `POST /api/hr/departments` (สร้าง) |
| `[Save Changes]` | `PATCH /api/hr/departments/:id` (แก้ไข) |
| `[Cancel]` | ปิดโมดัลโดยไม่บันทึก; ถ้ามีการแก้ไขค้าง อ้าง global unsaved ถ้าใช้ใน product |

## สถานะพิเศษ

- **สร้าง — สำเร็จ:** 201 → ไป detail หรือ refresh รายการแผนกบนหน้าหลัก (ตาม UX D3)
- **สร้าง — ข้อผิดพลาด:** 409 รหัส/ชื่อซ้ำ; แสดงข้อความใต้ฟิลด์หรือ alert ในโมดัล
- **แก้ไข — ข้อผิดพลาด:** 422 validation
- **แก้ไข — เตือน:** ถ้าเปลี่ยน `code` กระทบ integration — คำเตือนก่อนบันทึก (copy ตาม UX D4 Notes)
- **โหลดก่อนแก้ไข:** แสดง skeleton ในโมดัลระหว่าง `GET /api/hr/departments/:id`

## หมายเหตุ

หลังสร้างแผนก UX แนะนำให้ตั้งสายอนุมัติการลาสำหรับ `departmentId` ผ่าน `/hr/leaves` (R1-04 Sub-flow H)

## หมายเหตุ implementation (ถ้ามี)

สอดคล้องบล็อก **DepartmentFormModal** ใน [`Organization.md`](./Organization.md) — ฟิลด์ต้องตรงกับ UX (รหัส + ชื่อ + ผู้จัดการ + แม่) ไม่ใช้ placeholder คำว่า "รายละเอียด" แทนฟิลด์จริงถ้าไม่มีใน UX/SD

## Preview HTML notes

| หัวข้อ | ใส่อะไร |
|--------|--------|
| **Shell** | `app` (sidebar + header) เป็น context เดียวกับหน้า Organization |
| **Regions** | `modal-backdrop` → `modal-dialog` → head (ชื่อโมดัล) → body (ฟิลด์) → foot (Cancel + Save) |
| **สถานะสำหรับสลับใน preview** | `create` · `edit` · `error` (409/validation) — ใช้ **`control-panel`** + `control-row` ตาม [`MD_TO_PREVIEW_HTML_MANUAL.md`](../MD_TO_PREVIEW_HTML_MANUAL.md) |
| **ข้อมูลจำลอง** | รหัส D003, ชื่อฝ่ายทดสอบ, parent = D001, manager = ตัวอย่างชื่อ |
| **ลิงก์ CSS** | [`../_Shared/preview-base.css`](../_Shared/preview-base.css) — `.control-panel`, `.modal-backdrop`, `.modal-dialog`, `.field`, `.grid-2` |
