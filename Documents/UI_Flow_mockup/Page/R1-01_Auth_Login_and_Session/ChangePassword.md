# Change password — เปลี่ยนรหัสผ่าน (self-service)

คู่มือแปลง UX → spec: [`../../UX_TO_UI_SPEC_WORKFLOW.md`](../../UX_TO_UI_SPEC_WORKFLOW.md)

**Route:** ตาม product — มักเป็น **modal** (`ChangePasswordModal` ใน shell) หรือหน้า Settings/Profile แท็บความปลอดภัย  
**Entry (UX):** Settings / Profile → Security; หรือถูกบังคับเมื่อ `mustChangePassword` หลัง bootstrap

---

## Spec metadata (UX → preview)

| Key | Value |
|-----|-------|
| **UX flow** | [`R1-01_Auth_Login_and_Session.md`](../../../UX_Flow/Functions/R1-01_Auth_Login_and_Session.md) |
| **UX reference** | **Sub-flow D** — **Step D1** (ฟอร์ม), **Step D2** (submit `PATCH /api/auth/me/password`) |
| **Design system** | [`design-system.md`](../../design-system.md) — §3 section card, §5 Form field structure, §7.1 error, primary/secondary buttons |
| **Global FE behaviors** | [`_GLOBAL_FRONTEND_BEHAVIORS.md`](../../../UX_Flow/_GLOBAL_FRONTEND_BEHAVIORS.md) — Unsaved changes, Validation |
| **Preview** | [ChangePassword.preview.html](./ChangePassword.preview.html) · [`../_Shared/preview-base.css`](../_Shared/preview-base.css) |

---

## เป้าหมายหน้าจอ (UX)

| Step | Goal |
|------|------|
| **D1** | ให้ผู้ใช้กรอกรหัสเดิมและรหัสใหม่ตามนโยบายความแข็งแรง |
| **D2** | อัปเดต `passwordHash` ผ่าน API; แสดงผลสำเร็จหรือ error; อาจบังคับ login ใหม่ตาม policy |

**Actor(s):** ผู้ใช้ที่ login แล้ว (ทุก role ที่เข้าถึง security/profile ตาม product)

**Out of scope (UX):** admin reset รหัสผู้ใช้อื่น

---

## เนื้อหาและฟิลด์ (UX)

| Field | Required | Validation / notes |
|-------|----------|---------------------|
| `currentPassword` | ใช่ | ส่งยืนยันตัวตนก่อนเปลี่ยนรหัส |
| `newPassword` | ใช่ | อย่างน้อย 8 ตัวอักษร (UX); ตรงกับ BR/NFR เพิ่มเติม (เช่น bcrypt factor ≥ 12 ฝั่ง BE) |
| `confirmPassword` | ใช่ | ต้องตรง `newPassword` ก่อนเปิด submit |
| Password policy hint | แนะนำ | ความยาว, อักขระพิเศษ ฯลฯ ตาม BR — แสดงใต้ฟอร์มหรือใกล้ช่อง |

**Frontend (D1):**

- Validate ความยาวและความตรงของ confirm ก่อน submit
- Disable `[บันทึก]` จนกว่าฟอร์ม valid
- `[Show/Hide Password]` ต่อช่อง (ไม่ log รหัสใน console/analytics)

---

## การกระทำ (CTA)

| Control | Behavior |
|---------|----------|
| `[บันทึก]` | เมื่อ valid → `PATCH /api/auth/me/password` + Bearer; body `{ currentPassword, newPassword, confirmPassword }` ตามสัญญา BE |
| `[ยกเลิก]` | D1: reset หรือออกจากหน้า/modal ตาม design; D2: ได้เฉพาะก่อน request ถูกส่ง |
| `[Show/Hide]` | Toggle แต่ละช่อง |

---

## ผลลัพธ์และสถานะพิเศษ

| ผล | UI (UX) |
|----|---------|
| **สำเร็จ** | Toast สำเร็จ; clear ฟิลด์ sensitive ทันที |
| **Policy บังคับ login ใหม่** | Redirect `/login` พร้อมข้อความ |
| **อยู่ session เดิมได้** | กลับหน้า security / ปิด modal |
| **Error** | 400 รูปแบบรหัสใหม่; 401 รหัสเดิมผิด; 429 rate limit; network — **inline error** + แก้แล้วส่งใหม่ |

---

## โครง layout (แนะนำ)

- กล่องฟอร์ม: `rounded-xl border bg-card` + `p-6`, ภายใน `space-y-4`
- หัวข้อ + คำอธิบายสั้น (ถ้าเป็นหน้าเต็ม)
- ฟิลด์ละ `space-y-1`, error `text-xs text-destructive`
- กลุ่มปุ่ม: `[บันทึก]` primary, `[ยกเลิก]` outline/secondary

---

## Preview HTML notes

| หัวข้อ | ค่า |
|--------|-----|
| **Shell** | `modal` — overlay + กล่องกลาง หรือ `app` ถ้าเป็นหน้าเต็มใน Settings |
| **Regions** | title + hint policy → 3 ช่องรหัส → inline errors → actions |
| **สถานะ** | `default` · `submitting` · `inline_error` · `success_toast` (จำลอง) |
| **Mock** | ไม่ใส่รหัสจริง — placeholder เท่านั้น |

---

## หมายเหตุ implementation

- โค้ดอ้างอิง: `ChangePasswordModal` จาก header (ดู [_Shared/AppShell.md](../_Shared/AppShell.md))
- หลังสำเร็จถ้า `mustChangePassword` ถูกเคลียร์ ต้องสอดคล้องกับ bootstrap policy เดียวกันทั้งระบบ (UX Coverage Lock)
