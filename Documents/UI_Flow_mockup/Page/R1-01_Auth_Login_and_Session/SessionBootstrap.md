# Session bootstrap — หลัง login (token + `/me` + landing)

คู่มือแปลง UX → spec: [`../../UX_TO_UI_SPEC_WORKFLOW.md`](../../UX_TO_UI_SPEC_WORKFLOW.md)

**Route:** `—` (สถานะในแอปหลัง `POST /api/auth/login` สำเร็จ จนกว่าจะแสดง shell + หน้าแรก; ไม่ใช่ URL แยก)

---

## Spec metadata (UX → preview)

| Key | Value |
|-----|-------|
| **UX flow** | [`R1-01_Auth_Login_and_Session.md`](../../../UX_Flow/Functions/R1-01_Auth_Login_and_Session.md) |
| **UX reference** | **Sub-flow A** — **Step A3** (เก็บ session), **Step A4** (`GET /api/auth/me`), **Step A5** (redirect ตามสิทธิ์); **Sub-flow B** — silent refresh (สรุปด้านล่าง) |
| **Design system** | [`design-system.md`](../../design-system.md) — §3 shell, §7.3 loading/empty, §8 App shell; skeleton ระหว่าง bootstrap |
| **Global FE behaviors** | [`_GLOBAL_FRONTEND_BEHAVIORS.md`](../../../UX_Flow/_GLOBAL_FRONTEND_BEHAVIORS.md) — Loading, Permission/Auth (401 บน `/me`) |
| **Preview** | [SessionBootstrap.preview.html](./SessionBootstrap.preview.html) · [`../_Shared/preview-base.css`](../_Shared/preview-base.css) · โครง shell อ้าง [_Shared/AppShell.preview.html](../_Shared/AppShell.preview.html) |

---

## เป้าหมาย (UX)

| Step | Goal |
|------|------|
| **A3** | เก็บ token และสิทธิ์อย่างปลอดภัย — อัปเดต auth store; **ไม่** เก็บ access token ใน `localStorage` ตาม BR/NFR |
| **A4** | ยืนยัน access token กับ `GET /api/auth/me` และ sync profile + permissions ก่อน landing |
| **A5** | พาผู้ใช้ไป default route ตาม permission; ถ้า `mustChangePassword` ให้จำกัดไป flow เปลี่ยนรหัสก่อนใช้งานเต็มรูปแบบ |

---

## ผู้ใช้และสิทธิ์

เท่ากับผู้ใช้ที่ login สำเร็จแล้ว — สิทธิ์มาจาก response `/me` (และ login ถ้ามี)

- Deep-link ไป route ที่ไม่มีสิทธิ์ → หน้า access denied (UX Step A5)
- ไม่มี route ใดตรงกับ permission → แจ้งติดต่อ admin

---

## สิ่งที่ผู้ใช้เห็น (UX)

- **ระหว่าง A3–A4:** loading สั้น ๆ / transition หรือ **loading overlay + skeleton ของ app shell**
- **เมื่อสำเร็จ:** shell พร้อมเมนูตาม role/permission + หน้า landing
- **Error บน `/me`:** แสดง error + **`[Retry]`** เรียก `/me` อีกครั้งก่อน fallback ไป login; 401 → เคลียร์ session → `/login?reason=unauthorized`

---

## ฟิลด์และ input จากผู้ใช้

ไม่มีฟอร์ม — ยกเว้นปุ่ม **Retry** ใน error state (Step A4)

| Control | เมื่อไหร่ | Behavior |
|---------|-----------|----------|
| `[Retry]` | `/me` ล้มเหลวชั่วคราว | เรียก `GET /api/auth/me` อีกครั้ง (UX: ก่อน fallback login) |
| — | สำเร็จ | redirect อัตโนมัติไป landing / change-password required |

---

## พฤติกรรมฝั่ง client (สรุป UX)

**Step A3**

- เก็บ token ตาม mechanism ที่กำหนด (cookie/memory ฯลฯ)
- ถ้า response login ไม่ครบ schema → แสดง error, เคลียร์ state ชั่วคราว

**Step A4**

- `Authorization: Bearer <access_token>`
- 200 → merge user + `employeeId` (ถ้ามี) เข้า global state
- ควร **retry 1 ครั้ง** หลัง silent refresh ถ้า fail เพราะ token เพิ่งหมดอายุ (UX Notes)
- 401/403, user deactivate → จัดการตาม Global + UX

**Step A5**

- คำนวณ default route จาก permission list
- `mustChangePassword` → บังคับไป change password ก่อน (สอดคล้อง Coverage Lock Notes ใน UX)

---

## Sub-flow B — Silent refresh (ไม่ใช่หน้าแยก)

เกิดขณะใช้งาน protected page เมื่อ access token หมดอายุ

| สิ่งที่ user เห็น | พฤติกรรม |
|-------------------|----------|
| โดยปกติ | ไม่เห็น (silent); อาจมี spinner สั้น ๆ บน action ที่ค้าง |
| Refresh สำเร็จ | request เดิม retry ครั้งเดียว ทำงานต่อ |
| Refresh ไม่ได้ | เคลียร์ session → `/login?reason=expired`; อาจมี `[Login ใหม่]` |

FE: interceptor จับ 401, queue request, `POST /api/auth/refresh` แบบ mutex — รายละเอียด Step B1–B2 ใน UX

---

## สถานะพิเศษ

| สถานะ | รายละเอียด |
|--------|-------------|
| Loading | Skeleton shell / overlay |
| `/me` error | Retry → แล้วเคลียร์ session กลับ login ตาม UX |
| ไม่มี route | ข้อความติดต่อ admin |
| mustChangePassword | จำกัด navigation — เชื่อม [ChangePassword.md](./ChangePassword.md) |

---

## Preview HTML notes

| หัวข้อ | ค่า |
|--------|-----|
| **Shell** | `app` — โครงย่อ sidebar + header ว่าง หรือโหลดจาก [_Shared/AppShell.preview.html](../_Shared/AppShell.preview.html) |
| **Regions** | เต็ม `main` ด้วย skeleton (shimmer blocks) หรือ spinner กลาง |
| **สถานะ** | `loading` · `me_error_retry` · `success_placeholder` (optional ไม่ต้องทำเต็ม landing) |
| **Mock** | ไม่ต้องมีตารางจริง — เน้นโครง shell + overlay |

---

## หมายเหตุ implementation

- Hydrate auth หลัง reload ยังต้องอิง `GET /api/auth/me` ตาม UX lock
- State ระยะยาวอ่านจาก `/me` ไม่ใช่แค่ login response อย่างเดียว
