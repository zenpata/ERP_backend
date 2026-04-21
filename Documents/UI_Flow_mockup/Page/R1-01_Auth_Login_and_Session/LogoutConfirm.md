# Logout — ยืนยันออกจากระบบ

คู่มือแปลง UX → spec: [`../../UX_TO_UI_SPEC_WORKFLOW.md`](../../UX_TO_UI_SPEC_WORKFLOW.md)

**Route:** `—` (dialog / modal จาก account menu หรือ sidebar)

---

## Spec metadata (UX → preview)

| Key | Value |
|-----|-------|
| **UX flow** | [`R1-01_Auth_Login_and_Session.md`](../../../UX_Flow/Functions/R1-01_Auth_Login_and_Session.md) |
| **UX reference** | **Sub-flow C** — **Step C1** (ยืนยันและเรียก `POST /api/auth/logout`) |
| **Design system** | [`design-system.md`](../../design-system.md) — §4.2 ปุ่ม primary/outline; dialog ใช้ spacing สม่ำเสมอ; §7 error ถ้าแจ้งเตือน |
| **Global FE behaviors** | [`_GLOBAL_FRONTEND_BEHAVIORS.md`](../../../UX_Flow/_GLOBAL_FRONTEND_BEHAVIORS.md) |
| **Preview** | [LogoutConfirm.preview.html](./LogoutConfirm.preview.html) · [`../_Shared/preview-base.css`](../_Shared/preview-base.css) |

---

## เป้าหมายหน้าจอ (UX)

**Goal:** แจ้งเซิร์ฟเวอร์ให้ยกเลิก refresh session และพาผู้ใช้กลับ `/login` โดยไม่มี token ใช้งานได้

**Entry:** กด Logout จากเมนูบัญชี / sidebar หรือ forced logout จาก policy

**Exit:** อยู่ที่ `/login` — session ฝั่ง client ถูกเคลียร์

**Actor(s):** ผู้ใช้ที่ login อยู่

**Out of scope (UX):** revoke token ของ device อื่นจากหน้า settings แยก (อนาคต)

---

## สิ่งที่ผู้ใช้เห็น

- (ถ้ามี design) **Modal ยืนยัน** — ข้อความสั้นว่ากำลังออกจากระบบ / ผลกระทบ
- ระหว่างเรียก API: **loading สั้น ๆ** บนปุ่มยืนยัน
- หลังเสร็จ: **หน้า Login** (SCR3 ใน scenario UX)

---

## “ฟิลด์” และพารามิเตอร์ (ไม่ใช่ input ผู้ใช้ทุกตัว — มาจาก client state)

| Name | Required | หมายเหตุ |
|------|----------|-----------|
| `refreshToken` | ใช่ | ส่งใน body เพื่อ revoke |
| `allDevices` | ใช่ | `true` = logout ทุกอุปกรณ์, `false` = เฉพาะ session ปัจจุบัน |

**UI (ถ้ารองรับตาม product):** checkbox หรือ toggle “ออกจากทุกอุปกรณ์” map เป็น `allDevices`

---

## การกระทำ (CTA)

| Control | Behavior (UX) |
|---------|----------------|
| `[Logout]` | `POST /api/auth/logout` พร้อม Bearer (ถ้ายังมี) + body `{ refreshToken, allDevices }`; จากนั้น **เคลียร์ session ฝั่ง client** แล้ว redirect `/login` |
| `[Cancel]` | ปิด modal — อยู่หน้าเดิม (session ไม่เปลี่ยน) |

**Frontend (สำคัญ):**

- **ไม่ว่า API จะสำเร็จหรือไม่** — เคลียร์ cookie/memory แบบ security-first
- Logout ควร **idempotent** — กดซ้ำไม่ควร error รุนแรง

**Error:** network/server fail — ยังคงเคลียร์ฝั่ง client แล้วไป login

---

## สถานะพิเศษ

| สถานะ | พฤติกรรม |
|--------|----------|
| กำลัง logout | Disable ปุ่ม / spinner |
| API error | แจ้งได้หรือเงียบ — แต่ client ต้อง clear แล้วไป login ตาม UX |

---

## โครง layout (แนะนำ)

- Overlay: `fixed inset-0 bg-background/80` หรือ pattern เดียวกับ design system
- กล่อง: `rounded-xl border bg-card p-6 max-w-md`
- ข้อความ + (optional) คำอธิบาย `allDevices`
- ปุ่ม: `[Cancel]` outline, `[Logout]` destructive หรือ primary ตามนโยบายผลิตภัณฑ์

---

## Preview HTML notes

| หัวข้อ | ค่า |
|--------|-----|
| **Shell** | `modal` |
| **Regions** | หัวข้อยืนยัน → คำอธิบาย → (optional) toggle ทุกอุปกรณ์ → ปุ่ม |
| **สถานะ** | `open` · `submitting` |
| **Mock** | ไม่แสดง token จริง |

---

## หมายเหตุ implementation

- จุดเข้า: ปุ่ม LogOut ท้าย sidebar ([AppShell.md](../_Shared/AppShell.md))
