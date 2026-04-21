# UX Flow — Login & Session Recovery

ใช้เป็น UX flow มาตรฐานสำหรับหน้า `/login` ใน Release 1

**แหล่งอ้างอิงที่ผูกกับเอกสารนี้**

- Business requirement (BR): `Documents/Requirements/Release_1.md` (Feature 1.1 Auth + RBAC)
- Traceability: `Documents/Requirements/Release_1_traceability_mermaid.md` (Feature 1.1)
- Sequence / SD_Flow: `Documents/SD_Flow/User_Login/login.md`
- Related screens / mockups: `Documents/UI_Flow_mockup/Page/R1-01_Auth_Login_and_Session/Login.md`, `Login.preview.html`

---

## ชื่อ Flow & ขอบเขต

**Flow name:** `Auth — User Login and Session Handling`

**Actor(s):** พนักงานในระบบทุกบทบาท (`super_admin`, `hr_admin`, `finance_manager`, `pm_manager`, `employee`)

**Entry:** ผู้ใช้เข้าหน้า `/login` โดยตรง, ถูก redirect เพราะ token ไม่ valid, หรือ session หมดอายุ

**Exit:** เข้าสู่ระบบสำเร็จและถูกพาไปหน้าแรกตาม role/permission หรืออยู่หน้า login พร้อม error ที่แก้ไขได้

**Out of scope:** ลืมรหัสผ่าน, self-registration, MFA/OTP, social login

---

### Step 1 — เปิดหน้า Login

**Goal:** ให้ผู้ใช้เห็นจุดเริ่มต้นที่ชัดเจนและพร้อมกรอกข้อมูลเข้าสู่ระบบ

**User sees:** ฟอร์ม `email` + `password`, ปุ่ม Login, และ (ถ้ามี) banner แจ้งว่า session หมดอายุ

**User can do:** กรอก email/password, กด Login, กด Enter เพื่อ submit

**Frontend behavior:**

- โหลดหน้า `/login` พร้อม state เริ่มต้นของฟอร์ม
- ถ้าเข้ามาจาก 401/expired ให้แสดง banner เช่น "Session expired, please login again"
- ปุ่ม Login disabled จนกว่าจะผ่าน validation ขั้นต้น (เช่น email format และมี password)

**System / AI behavior:** ยังไม่เรียก API จนกว่าผู้ใช้ submit

**Success:** ผู้ใช้กรอกข้อมูลได้และพร้อมส่งคำขอ login

**Error:** ถ้า assets/API config โหลดไม่ได้ ให้แสดง fallback error พร้อมปุ่ม retry

**Notes:** ตาม BR ระบบนี้ไม่มี self-registration

---

### Step 2 — กรอกข้อมูลและกด Login

**Goal:** ส่ง credential ไปตรวจสอบตัวตนกับระบบ

**User sees:** ค่าในฟอร์มที่กรอก, loading state หลัง submit

**User can do:** แก้ไขข้อมูลก่อน submit, submit ผ่านปุ่มหรือ Enter

**Frontend behavior:**

- validate input ก่อนยิง API (`email`, `password`)
- เรียก `POST /api/auth/login` ด้วย payload `{ email, password }`
- ระหว่างรอ response แสดง loading และป้องกันการกดซ้ำ

**System / AI behavior:**

- ตรวจ user จาก `users.email`
- ตรวจ `passwordHash` ด้วย bcrypt
- ตรวจสถานะ user (`isActive`) และนโยบาย login fail/lock

**Success:** ระบบรับคำขอและตอบกลับผลตรวจสอบได้ภายใน SLA

**Error:** validation fail (400), credential ผิด (401), account inactive/locked (403/423), network timeout

**Notes:** BR กำหนดว่า login fail ต่อเนื่อง 5 ครั้งอาจ lock ชั่วคราวหรือ delay response

---

### Step 3 — Authentication สำเร็จ (รับ token + profile ย่อ)

**Goal:** เตรียม session ฝั่ง FE ให้พร้อมใช้งานหลัง login สำเร็จ

**User sees:** สถานะกำลังเปลี่ยนหน้า หรือ loading สั้น ๆ ก่อนเข้า app

**User can do:** รอระบบพาไปหน้าเป้าหมาย

**Frontend behavior:**

- รับ `accessToken`, `refreshToken`, และ `user` (roles/permissions) จาก response
- เก็บ token ตาม security policy ของระบบ (ไม่เก็บใน localStorage ตาม NFR)
- อัปเดต auth state ใน client

**System / AI behavior:**

- อัปเดต `lastLoginAt`
- resolve role/permission จาก `user_roles`, `role_permissions`, `permissions`
- ส่งข้อมูล user + permissions กลับให้ FE ตัดสิน UI/route

**Success:** FE มี session ที่ใช้งานได้และรู้สิทธิ์ของผู้ใช้ครบ

**Error:** response schema ไม่ครบ/ไม่ถูกต้อง → fail fast และแจ้งให้ login ใหม่

**Notes:** `super_admin` เป็น role พิเศษที่ bypass permission checks ฝั่ง API

---

### Step 4 — โหลดข้อมูลผู้ใช้ปัจจุบัน (`/api/auth/me`)

**Goal:** ยืนยันว่า session ที่ได้มาใช้งานจริงและดึง profile ที่ต้องใช้ตอน bootstrap app

**User sees:** loading ระยะสั้นก่อนเข้า dashboard/หน้าแรก

**User can do:** รอจนระบบโหลดเสร็จ

**Frontend behavior:**

- เรียก `GET /api/auth/me` หลัง login หรือช่วง app bootstrap
- sync ข้อมูล user/employee/permissions ใน state กลาง
- ถ้า `me` fail ด้วย 401 ให้เคลียร์ session และกลับ `/login`

**System / AI behavior:**

- validate token
- join ข้อมูล `users` กับ `employees` ผ่าน `employeeId`
- ส่ง current user context ล่าสุดกลับ FE

**Success:** ได้ current user context ครบและพร้อม render app shell

**Error:** token หมดอายุ/invalid (401), user ถูก deactivate ระหว่าง session

**Notes:** BR ระบุว่า FE ใช้ `/me` ทุก page load เพื่อตรวจ session

---

### Step 5 — Redirect ไปหน้าแรกตามสิทธิ์

**Goal:** พาผู้ใช้ไปยังจุดเริ่มทำงานที่เหมาะกับบทบาท

**User sees:** หน้า landing แรกของระบบ (เช่นโมดูล HR/Finance/PM/Settings ตามสิทธิ์)

**User can do:** เริ่มใช้งานเมนู/ฟีเจอร์ที่ตนมีสิทธิ์

**Frontend behavior:**

- คำนวณ default route จาก role/permission
- render sidebar/menu/button ตาม permission list ที่ได้จาก login/me
- block route ที่ไม่มีสิทธิ์ และแสดง unauthorized state ตาม design

**System / AI behavior:** รอคำขอถัดไปพร้อม middleware ตรวจ permission ระดับ API

**Success:** ผู้ใช้เข้าหน้าแรกได้ถูกต้องตามสิทธิ์

**Error:** ไม่มี permission ที่แมปกับ route ใดเลย → แสดงหน้า access-denied พร้อมแนวทางติดต่อ admin

**Notes:** การซ่อนเมนูใน FE ไม่แทนที่การบังคับสิทธิ์ใน BE

---

### Step 6 — กรณี Session หมดอายุระหว่างใช้งาน (Refresh Flow)

**Goal:** รักษาประสบการณ์ใช้งานต่อเนื่องโดยไม่บังคับ login ใหม่ทันที

**User sees:** โดยปกติไม่เห็นอะไร (silent refresh); หาก refresh ไม่สำเร็จจะเห็น redirect ไป login พร้อม banner

**User can do:** ทำงานต่อได้ทันทีถ้า refresh สำเร็จ

**Frontend behavior:**

- เมื่อ access token หมดอายุ ให้เรียก `POST /api/auth/refresh`
- ถ้า refresh สำเร็จ ให้อัปเดต token และ retry request เดิม 1 ครั้ง
- ถ้า refresh fail ให้ clear session และ redirect `/login?reason=expired`

**System / AI behavior:**

- ตรวจ refresh token
- ทำ refresh token rotation (ออก token ใหม่และ invalidate ตัวเก่า)
- คืน access token ใหม่ให้ FE

**Success:** request เดิมทำงานต่อโดยไม่สะดุด

**Error:** refresh token หมดอายุ/ถูกเพิกถอน → ต้อง login ใหม่

**Notes:** BR กำหนด access token 15 นาที, refresh token 7 วัน

---

### Step 7 — Logout

**Goal:** จบ session อย่างปลอดภัย

**User sees:** กลับหน้า `/login` พร้อมสถานะ logout สำเร็จ

**User can do:** login ใหม่ด้วยบัญชีเดิมหรือบัญชีอื่น

**Frontend behavior:**

- เรียก `POST /api/auth/logout`
- clear token/state ฝั่ง client ไม่ว่าจะ API success หรือ fail
- redirect ไป `/login`

**System / AI behavior:**

- invalidate refresh token/session ที่เกี่ยวข้อง
- ตอบผลสำเร็จให้ FE

**Success:** session ปัจจุบันถูกยกเลิกและไม่สามารถใช้ token เดิมต่อได้

**Error:** network fail ตอน logout — FE ยังต้อง clear local session เพื่อความปลอดภัย

**Notes:** ควรออกแบบให้ logout เป็น idempotent

---

## แนวทางผูกกับ BR และ Sequence diagram (สรุปสำหรับ flow นี้)

1. **จาก BR:** แปลงเงื่อนไขสำคัญเป็น UX behavior ได้แก่ redirect เมื่อ token ไม่ valid, refresh rotation, lock หลัง login fail, และการใช้ permissions คุม UI
2. **จาก SD_Flow:** แมปเป็นลำดับ `Login → Token/Permissions → /me → Redirect` และกรณีรอง `Refresh`, `Logout`
3. **จาก Traceability:** ยืนยันการเชื่อม `Page /login → APIs auth/* → Tables users/roles/permissions/user_roles/role_permissions`
4. **Success / Error:** ครอบคลุมทั้ง happy path และ edge cases ที่กระทบผู้ใช้โดยตรง (invalid credential, expired session, inactive account, network failure)
