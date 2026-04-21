# Role — ลบ Custom Role (ยืนยัน)

คู่มือแปลง UX → spec: [`../../UX_TO_UI_SPEC_WORKFLOW.md`](../../UX_TO_UI_SPEC_WORKFLOW.md)

**Route:** `—` (dialog / modal เปิดจากหน้า [`Roles.md`](./Roles.md) เมื่อกด `[Delete Role]` บนแถว role ที่ลบได้)

---

## Metadata

| Key | Value |
|-----|--------|
| **UX flow** | [`R1-16_Settings_Role_and_Permission.md`](../../../UX_Flow/Functions/R1-16_Settings_Role_and_Permission.md) |
| **UX sub-flow / steps** | Sub-flow D — ลบ Role; Step D1 — ลบ role ที่ไม่ใช่ system และไม่มี user |
| **Design system** | [`design-system.md`](../../design-system.md) — §5 forms (modal, destructive action) |
| **Global FE behaviors** | [`../../../UX_Flow/_GLOBAL_FRONTEND_BEHAVIORS.md`](../../../UX_Flow/_GLOBAL_FRONTEND_BEHAVIORS.md) |
| **Preview** | [`RoleDelete.preview.html`](./RoleDelete.preview.html) · [`../_Shared/preview-base.css`](../_Shared/preview-base.css) · [`MD_TO_PREVIEW_HTML_MANUAL.md`](../MD_TO_PREVIEW_HTML_MANUAL.md) |
| **Entry** | เฉพาะ role ที่ `isSystem=false` และไม่มีปุ่มลบบน system roles |

---

## เป้าหมายหน้าจอ

ให้ผู้ดูแลยืนยันการลบ role ออกจากระบบ พร้อมทำความเข้าใจผลกระทบต่อสิทธิ์ และส่ง `DELETE /api/settings/roles/:id` เมื่อผ่านเงื่อนไข BR

## ผู้ใช้และสิทธิ์

**Actor(s):** เช่นเดียวกับการจัดการ roles — **403** ถ้าเป็น system role; **409** ถ้ามี user ผูก role

## โครง layout (สรุป)

`modal-backdrop` → `modal-dialog` — หัวข้อเตือน → **เนื้อหา** (ชื่อ role, จำนวน user ที่ผูกถ้ามีจาก API, คำเตือน) → ช่องพิมพ์ยืนยัน → ปุ่ม `[Cancel]` · `[Delete Role]` (destructive)

## เนื้อหาและฟิลด์

| Element | Required | Notes |
|---------|----------|--------|
| แสดง `name` ของ role ที่จะลบ | — | อ่านอย่างเดียว |
| จำนวน user ใน role | — | แนะนำจาก UX: แสดงก่อนลบ (ถ้า API รองรับ filter ตาม role) |
| `confirmRoleName` | ใช่ | พิมพ์ชื่อ role ให้ตรงกับที่แสดงเพื่อเปิดใช้ปุ่มลบ หรือ validate ก่อน submit |

## การกระทำ (CTA)

| Control | Behavior |
|---------|----------|
| `[Cancel]` / ปิด modal | ปิดโดยไม่เรียก API |
| `[Delete Role]` | เมื่อ `confirmRoleName` ตรงกับชื่อ role → `DELETE /api/settings/roles/:id` |
| หลัง **200** | ปิด modal + refresh รายการที่ [`Roles.md`](./Roles.md) |

## สถานะพิเศษ

- **409:** มี user ผูก — แสดงข้อความ dependency ชัดเจน ไม่ลบ
- **403:** system role — ไม่ควรเปิด modal นี้ได้; ถ้า race ให้แสดง error
- **กำลังลบ:** disable ปุ่ม + loading state

## หมายเหตุ implementation (ถ้ามี)

- ปุ่มลบบนแถวต้องซ่อนหรือ disabled สำหรับ `isSystem=true`

## Preview HTML notes

| หัวข้อ | ใส่อะไร |
|--------|--------|
| **Shell** | พื้นหลังจำลอง + modal เหมือน [`LogoutConfirm.preview.html`](../R1-01_Auth_Login_and_Session/LogoutConfirm.preview.html) |
| **Regions** | headline → body (รายละเอียด + ช่องยืนยัน) → footer ปุ่ม |
| **สถานะสำหรับสลับใน preview** | `ready` · `submitting` · (optional) ข้อความ error 409 |
| **ลิงก์ CSS** | [`../_Shared/preview-base.css`](../_Shared/preview-base.css) |

---

## Appendix — UX excerpt (reference)

อ้างอิงเต็ม: **Sub-flow D — ลบ Role** / **Step D1** ใน [`R1-16_Settings_Role_and_Permission.md`](../../../UX_Flow/Functions/R1-16_Settings_Role_and_Permission.md)

**Goal:** เอา role ที่ไม่ใช้แล้วออกจากระบบ

**User sees:** confirm dialog เน้นผลกระทบต่อสิทธิ์

**System / AI behavior:** BR กำหนดลบไม่ได้ถ้ามี user ใน role นั้น

**Success:** 200; refresh list

**Error:** 409 มี user ผูก, 403 role เป็น system
