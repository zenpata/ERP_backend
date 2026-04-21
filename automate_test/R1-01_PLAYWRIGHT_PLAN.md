# R1-01 — แผน Automate Test (Playwright)

อ้างอิง: `Documents/Testcase/R1-01_testcases.md` และ UI จริง `erp_frontend/src/shared/components/LoginPage.tsx`

## โครงสร้างใน `automate_test/`

| พาธ | ใช้ทำอะไร |
| --- | --- |
| `playwright.config.ts` | `baseURL`, artifact ไปที่ `recordings/test-output/`, เปิด **viewport video (WebM)** ทุกเคส |
| `fixtures/cdp-screencast.ts` | ตัวเลือก **CDP `Page.startScreencast`** → JPEG ที่ `recordings/cdp-screencast/<ชื่อเทส>/` |
| `tests/r1-01-auth.spec.ts` | เทสเริ่มต้น + placeholder สำหรับเคสที่ต้องมี API / mock |

## วิดีโอ — สองช่องทาง

1. **Playwright built-in `video`** (แนะนำเป็นหลัก): ได้ไฟล์ `.webm` ต่อเคส อยู่ใต้ `recordings/test-output/` (โครงสร้างตาม Playwright)
2. **Chromium CDP Screencast**: เปิดด้วย `ENABLE_CDP_SCREENCAST=1` จะได้เฟรม JPEG + ไฟล์ `STITCH.txt` คำสั่ง `ffmpeg` สร้าง MP4

หมายเหตุ: เอกสาร testcase บางจุดไม่ตรงกับโค้ดปัจจุบัน (เช่น `?reason=expired` vs แอปใช้ `session_expired`; ปุ่ม submit ว่างฟอร์ม — แอปยัง **ไม่** disable ปุ่ม; ยังไม่มีปุ่ม show/hide password)

## ครบ 21 เคสใน `tests/r1-01-auth.spec.ts`

| # | ชื่อใน testcase doc | สถานะ |
|---|---------------------|--------|
| 1–6, 8–13, 15–21 | ตามตาราง R1-01 | รันด้วย **mock API** (`page.route` + `tests/helpers/auth-api-mock.ts`) ผ่านเมื่อมี frontend |
| 7 | Show/hide password | `test.skip` — ยังไม่มี UI ในหน้า login |
| 14 | Cancel logout | `test.skip` — Sidebar logout ไม่มี modal ยืนยัน |
| 5 | ปุ่ม disable เมื่อฟอร์มว่าง | ผ่านแบบบันทึก **spec-gap** (แอปยังเปิดปุ่มได้) |
| 8 | `?reason=expired` | annotation **spec-gap** (แอปใช้ `session_expired`) |

รวม describe ท้ายไฟล์: **E2E จริง** 1 เคสเมื่อ `E2E_RUN_LOGIN=1`

## แผนตามเฟส

### Phase A — smoke ไม่พึ่ง mock (ทำแล้วบางส่วน)

- Session banner ด้วย query ที่แอปรองรับ
- Client-side validation อีเมล (zod)
- สถานะปุ่ม submit เทียบกับ spec (บันทึก gap ถ้าไม่ตรง)

### Phase B — ต้องรัน backend + seed user (`E2E_RUN_LOGIN=1`)

- Login สำเร็จ / รหัสผิด / อีเมลไม่มี / inactive (ต้องมี user ในฐานข้อมูล)
- Login ด้วย Enter
- หลัง login: intercept `GET /api/auth/me` สำหรับ bootstrap success/failure

### Phase C — token / refresh (route หรือ clock)

- Silent refresh (`POST /api/auth/refresh`)
- Refresh หมดอายุ → `/login?reason=session_expired` (หรือค่าที่แอปใช้จริง)

### Phase D — logout & change password

- Flow modal logout / cancel / API fail — ต้องเลือก selector จาก `AppShell` และ API client
- Security tab + `PATCH /api/auth/me/password` — ต้องนำทางไป settings ตาม router จริง

### Phase E — RBAC

- Login `employee` แล้ว assert sidebar / ทดสอบ direct URL `/settings/users`

## เวอร์ชัน Node

Playwright ต้องการ **Node 18+** (ดู `engines` ใน `package.json`). ถ้าเครื่อง default เป็น Node 14 ให้ใช้ `nvm use` ตาม `.nvmrc` หรือรันด้วย Node ใหม่ก่อน `npm test`

### `performance is not defined` ตอน `npx playwright install`

เกิดจากรันด้วย **Node เก่า** (เช่น 14) — CLI ของ Playwright ใช้ global `performance` ที่ไม่มีในรุ่นนั้น

แก้:

```bash
cd automate_test
nvm install 20   # หรือ nvm use ถ้ามีแล้ว
nvm use
npm run install:browsers
```

อย่าใช้ `npx playwright install` ก่อนสลับ Node; หลัง Node 18+ แล้ว `npx playwright install chromium` ใช้ได้ตามปกติ

## คำสั่งรัน

```bash
cd automate_test
npm install
npx playwright install chromium
# เปิด frontend (อีกเทอร์มินัล): cd erp_frontend && npm run dev
BASE_URL=http://localhost:5173 npm test
```

รันพร้อม CDP JPEG + WebM:

```bash
ENABLE_CDP_SCREENCAST=1 BASE_URL=http://localhost:5173 npm test
```

รัน login E2E จริง:

```bash
E2E_RUN_LOGIN=1 BASE_URL=http://localhost:5173 npm test
```

## ตัวแปรสภาพแวดล้อม

| ตัวแปร | ค่าเริ่มต้น | ความหมาย |
| --- | --- | --- |
| `BASE_URL` | `http://localhost:5173` | ต้นทาง Vite |
| `E2E_EMAIL` / `E2E_PASSWORD` | demo จากหน้า login | credential |
| `E2E_RUN_LOGIN` | ว่าง | ตั้ง `1` เพื่อรันเทสที่ยิง API login |
| `ENABLE_CDP_SCREENCAST` | ว่าง | ตั้ง `1` เพื่อ CDP screencast |
| `PW_VIDEO` | เปิด | ตั้ง `off` ปิด WebM |
