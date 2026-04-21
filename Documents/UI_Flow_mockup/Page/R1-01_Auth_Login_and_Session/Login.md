# Login — หน้าเข้าสู่ระบบ

คู่มือแปลง UX → spec: [`../../UX_TO_UI_SPEC_WORKFLOW.md`](../../UX_TO_UI_SPEC_WORKFLOW.md)

**Route:** `/login`  
**Entry (UX):** เปิดโดยตรง, redirect จาก guard เมื่อไม่มี session, หรือ query `?reason=expired` / `?reason=unauthorized` (และ mapping จาก UX ไป copy ที่เหมาะสม)

---

## Spec metadata (UX → preview)

| Key | Value |
|-----|-------|
| **UX flow** | [`R1-01_Auth_Login_and_Session.md`](../../../UX_Flow/Functions/R1-01_Auth_Login_and_Session.md) |
| **UX reference** | **Sub-flow A** — Login → Token → Bootstrap; **Step A1** (เปิดหน้า), **Step A2** (submit credential) |
| **Design system** | [`design-system.md`](../../design-system.md) — §3 ไม่ใช้ PageHeader แบบแอป; ใช้ card กลางจอ; §5.3 input มาตรฐาน (ปรับด้วย `rounded-lg` ตาม implementation); §7.1 error alert |
| **Global FE behaviors** | [`_GLOBAL_FRONTEND_BEHAVIORS.md`](../../../UX_Flow/_GLOBAL_FRONTEND_BEHAVIORS.md) — Permission/Auth, Validation |
| **Preview** | [Login.preview.html](./Login.preview.html) · [`../_Shared/preview-base.css`](../_Shared/preview-base.css) |

---

## เป้าหมายหน้าจอ (UX)

| Step | Goal |
|------|------|
| **A1** | ให้ผู้ใช้เห็นจุดเริ่มต้นและสถานะ session (ถ้ามี) ก่อนกรอกข้อมูล |
| **A2** | ส่ง `email` + `password` ไปตรวจสอบและรับ token ชุดแรก (`POST /api/auth/login`) |

**ถัดไป (ไม่ใช่หน้านี้):** เก็บ token + `GET /api/auth/me` + redirect — ดู [SessionBootstrap.md](./SessionBootstrap.md)

---

## ผู้ใช้และสิทธิ์ (UX)

**Actor(s):** พนักงานทุกบทบาทที่มีบัญชี (`super_admin`, `hr_admin`, `finance_manager`, `pm_manager`, `employee`)

- หน้านี้ **ก่อน** authentication — ไม่ใช้ permission key ของแอป
- หลัง login ล้มเหลว: แสดงข้อความทั่วไป (ไม่เปิดเผยว่า email ลงทะเบียนในระบบหรือไม่); กรณี lock หลัง fail ต่อเนื่อง (BR) อาจมี countdown / ติดต่อ admin ตาม policy
- **Out of scope (UX):** ลืมรหัสผ่าน, self-registration, MFA, social login — **ไม่มีลิงก์สมัครสมาชิก**

---

## เนื้อหาและฟิลด์ (UX → UI)

| Field / element | Required | Validation / notes (UX) |
|-----------------|----------|-------------------------|
| `email` | ใช่ | รูปแบบอีเมล `name@company.com`; client validate ก่อนยิง login |
| `password` | ใช่ | masked; **Show/Hide** toggle โดยไม่ submit |
| Banner สถานะ session | ถ้ามี | แปลง query `reason` เป็น copy (เช่น expired / unauthorized) |
| Root / form error | ตามผล API | 401 credential, 403/423 inactive/locked, 400 validation, network timeout |

---

## การกระทำ (CTA)

| Control | Behavior (UX) |
|---------|----------------|
| `[เข้าสู่ระบบ]` | Submit เมื่อฟอร์ม valid → `POST /api/auth/login` payload `{ email, password }` |
| `Enter` | เทียบเท่าปุ่มเข้าสู่ระบบ |
| `[Show/Hide Password]` | Toggle มองเห็นรหัสผ่าน ไม่ trigger submit |
| หลัง error | ผู้ใช้แก้ email/password แล้ว submit ใหม่ |

**Frontend (UX):**

- โหลด `/login` โดย **ยังไม่** เรียก login API
- **Disable** submit จนกว่า email ผ่านรูปแบบขั้นต้นและมี password
- ระหว่างรอ response: loading, disable ปุ่ม/ฟอร์ม (กันส่งซ้ำ)

---

## สถานะพิเศษ

| สถานะ | พฤติกรรม |
|--------|----------|
| **Loading** | ข้อความปุ่ม loading; ฟอร์ม disabled |
| **Login error** | ข้อความทั่วไป + ลองใหม่; ไม่รั่วข้อมูลว่า email มีในระบบ |
| **Bootstrap ล้มหลังได้ token** | ข้อความชุด `/me` / session (map กับ `ME_FETCH_FAILED` ใน implementation) |
| **Config / static load fail** | ข้อความ + retry (ตาม UX Step A1 Error) |
| **Session expired banner** | query `reason` + อาจใช้ `sessionStorage` ตาม implementation — หลังแสดงล้าง flag |

รายละเอียด 401/403 แบบหน้า protected อ้าง Global FE behaviors (หน้านี้เป็นพิเศษก่อนเข้าแอป)

---

## โครง layout — visual (implementation: `erp_frontend`)

ใช้เมื่อสร้าง `preview.html` / เปรียบเทียบกับโค้ด; **ความต้องการพฤติกรรมอยู่ที่ส่วนบน**

### Page wrapper
- `min-h-screen`, `flex items-center justify-center`, gradient `from-blue-600 to-indigo-800`, `p-4`

### Login card
- `w-full max-w-sm`, `rounded-2xl`, `bg-card`, `shadow-2xl`, `p-8`

### Header ใน card
- ไอคอน `Briefcase` ในกล่อง `h-14 w-14 rounded-2xl bg-primary`
- ชื่อแอป + subtitle (`text-2xl font-bold` / `text-sm text-muted-foreground`)

### Form
- `space-y-4`, กลุ่ม field `space-y-1`
- Input: `w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm`, `focus:ring-2 focus:ring-ring`
- Submit: `w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground`

### Demo block (ถ้ามีใน preview)
- `mt-6`, `rounded-lg bg-muted/50 p-3`, `text-xs text-muted-foreground`

---

## Copy (locale ปัจจุบัน — `erp_frontend`)

| Key / usage | ไทย (ตัวอย่าง) |
|-------------|----------------|
| App name | `ERP System` |
| Subtitle | `สำหรับ SME ไทย · Modular Edition` |
| Email label | `อีเมล` |
| Password label | `รหัสผ่าน` |
| Submit | `เข้าสู่ระบบ` |
| Submit loading | `กำลังเข้าสู่ระบบ...` |
| Auth error | `อีเมลหรือรหัสผ่านไม่ถูกต้อง` |
| Session / user load error | `ไม่สามารถโหลดข้อมูลผู้ใช้ได้ กรุณาลองใหม่` |
| Session expired banner | `เซสชันหมดอายุหรือถูกยกเลิก กรุณาเข้าสู่ระบบใหม่` |
| Demo | บัญชีทดลอง (บรรทัด admin / hr / pm) |

---

## Validation & implementation notes (`LoginPage.tsx`, zod)

- `email`: `z.string().email(...)`
- `password`: `z.string().min(1, ...)`
- Root error ใต้ password: invalid credentials / `ME_FETCH_FAILED`
- Banner: `reason=session_expired` หรือ `sessionStorage` `erp-session-expired` แล้วลบ key

---

## Preview HTML notes

| หัวข้อ | ค่า |
|--------|-----|
| **Shell** | `standalone` — เต็มจอ ไม่มี sidebar |
| **Regions** | gradient background → card → (optional banner) → form fields → root error → submit → demo block |
| **สถานะใน preview** | `default` · `session_expired_banner` · `auth_error` · `loading` · (optional `dark`) — สอดคล้องกับ [Login.preview.html](./Login.preview.html) |
| **Mock** | email/password จำลอง; ข้อความ error ตามตาราง Copy |

---

## Component tree (สำหรับ preview / FE)

1. Fullscreen gradient  
2. Login card  
3. Header (icon, title, subtitle)  
4. Optional session banner  
5. Email + errors  
6. Password + errors  
7. Root error  
8. Submit  
9. Demo accounts (ถ้ามี)

หน้าอื่นในระบบ: [`../_INDEX.md`](../_INDEX.md)
