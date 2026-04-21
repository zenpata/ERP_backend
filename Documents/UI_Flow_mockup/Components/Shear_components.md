# Shared UI Components — Prompt & UX Spec (จาก UX Flow)

เอกสารนี้รวบรวมกฎและพฤติกรรม UI ที่ใช้ร่วมกันข้ามโมดูลจาก `Documents/UX_Flow` เพื่อใช้เป็น **สเปก / prompt** ตอนสร้าง **shared components** ใน Frontend (เช่น popup error, toast, banner, modal ยืนยัน, empty state) ให้สอดคล้องกับ UX flow จริง

**แหล่งอ้างอิงหลัก**

- `Documents/UX_Flow/_GLOBAL_FRONTEND_BEHAVIORS.md` — มาตรฐาน loading, permission, validation, conflict, unsaved changes, audit, retry
- `Documents/UX_Flow/_TEMPLATE.md` — โครง Step (`User sees` / `Success` / `Error`), สัญลักษณ์สีใน mermaid
- `Documents/UX_Flow/_BA_UX_BACKLOG.md` — backlog ที่กระทบ copy กลาง (เช่น BAUX-001, BAUX-002)
- `Documents/UX_Flow/Functions/R1-01_Auth_Login_and_Session.md` — session banner, bootstrap error, logout confirm
- `Documents/UX_Flow/Functions/R2-10_Notification_Workflow_Alerts.md` — bell, badge, inbox error

**หมายเหตุ:** ชื่อไฟล์ใช้ `Shear_components.md` ตามโฟลเดอร์เดิม; ความหมายทางเทคนิคคือ **shared** components

---

## 1) วิธีใช้เอกสารนี้กับงาน FE

- ทุกหน้า/โฟลว์ที่อ้าง `_GLOBAL_FRONTEND_BEHAVIORS.md` ไม่ต้องคัดลอกกฎซ้ำ — **implement ผ่าน shared primitives** ด้านล่าง
- เวลาเขียน prompt ให้ AI สร้าง component ให้แนบ: **ประเภท feedback**, **HTTP / business case**, **CTA ที่ต้องมี**, **accessibility (focus trap สำหรับ modal)** ตาม section 3–5
- Copy ข้อความภาษาไทย/อังกฤษระดับผลิตภัณฑ์ยังรอมาตรฐานจาก backlog **BAUX-001** — ตอนนี้ใช้ **โครงสร้างข้อความ + ชุด CTA** เป็นหลัก

---

## 2) สัญลักษณ์และ semantic สี (ให้สอดคล้อง UX Flow diagrams)

อ้างอิง `_TEMPLATE.md`: node สีแดง = Error / Blocked; ม่วง = Screen; เขียว = Success

| บริบท UI | Semantic (เข้ากับ design system) | หมายเหตุ |
|----------|-------------------------------------|----------|
| Error รุนแรง / block | `destructive` | ห้ามทำต่อจนกว่าผู้ใช้แก้ |
| Warning นุ่ม (ยังทำต่อได้) | แยกจาก error — ใช้ tone เตือน + อธิบายผลกระทบ | ตามกฎ soft warning ใน global behaviors |
| Success สั้น ๆ | primary / success tone ตาม design system | มักใช้ toast |
| ข้อมูลทั่วไป / neutral | `muted`, `border` | banner ทั่วไป |

---

## 3) Component catalog — พฤติกรรมที่ต้องรองรับ

### 3.1 Page / list loading

- **ครั้งแรก:** skeleton หรือ table placeholder (ไม่ปล่อยหน้าว่างเงียบ)
- **ล้มเหลว:** แสดง **retry** และ **คง filter / query เดิม** (list page)

### 3.2 Empty state

- บอก **สาเหตุที่เป็นไปได้** และ **CTA หลัก**: `Create`, `Import`, หรือลิงก์ไป setup
- แยกจาก error: empty = ไม่มีข้อมูลตามเงื่อนไข ไม่ใช่ระบบพัง

### 3.3 Inline validation (ฟอร์ม)

- Client: ลด error ที่เดาได้ (required, date range, amount > 0, confirm password ตรงกัน)
- Server เป็น source of truth — แสดงผลจาก API ที่ field หรือ summary ตาม contract
- ตัวอย่าง Auth: change password — inline error เมื่อรหัสเดิมผิด / policy ไม่ผ่าน

### 3.4 Error banner (ระดับหน้าหรือ section)

- ใช้เมื่อ load ล้มเหลว, integration error, หรือ partial failure ที่ต้องอ่านง่าย
- ควรมีอย่างน้อย: ข้อความสรุป + **Retry** และ/หรือ **Back to list** / **Open detail** ตามบริบท
- ตัวอย่าง: payroll process — error banner + retry + link ไป error detail / log ถ้ามี

### 3.5 Snackbar / toast

- **Network / transient error** บางกรณี (เช่น attendance — `network → snackbar`)
- **Success สั้น ๆ** หลัง mutation (เช่น change password success + clear form; row save success + refetch)
- กำหนด duration, ไม่บังทับ action สำคัญ, stack หรือ replace ตามนโยบายผลิตภัณฑ์

### 3.6 Modal — ยืนยัน / แจ้งผลข้างเคียง

- ใช้เมื่อ action มี **ผลข้างเคียง** (เช่น re-run payroll ทับ draft) — อธิบายให้ชัดก่อนยืนยัน
- **Modal ฟอร์ม:** ถ้ามีการแก้แล้ว ต้องเตือนก่อนปิด (ดู 3.9)
- ปุ่มมาตรฐาน: primary action ชัด, รอง = Cancel / ปิด

### 3.7 Dialog / modal — ข้อผิดพลาด (error popup)

- ใช้เมื่อต้องการ **ความสนใจเต็มที่** หรือหลาย action เช่น `Refresh` vs `Reload latest` (409)
- ควรระบุ: สาเหตุโดยย่อ, รหัส/ correlation id (ถ้ามี), CTA ชัด

### 3.8 Soft warning (ไม่บล็อกทันที)

- ใช้เมื่อระบบ **ยังให้ไปต่อได้** (credit warning, variance vs PO, stale cache)
- **ต้องมี:** อธิบายผลกระทบ + ว่าทำต่อได้หรือไม่ — อาจเป็น inline alert, banner สีเตือน, หรือ confirm แบบ “รับทราบแล้วทำต่อ”

### 3.9 Unsaved changes guard

- ฟอร์มหลาย field/section: เตือนก่อนออกจาก **route**
- **Modal form:** เตือนก่อนปิดเมื่อ dirty
- หลัง **save สำเร็จ:** clear dirty state ทันที

### 3.10 Permission & auth feedback

| กรณี | UI |
|------|-----|
| `401` | พยายาม recover session ตาม auth flow; ถ้าไม่ได้ค่อยไป login |
| `403` route | หน้า access denied ชัดเจน |
| `403` component | ซ่อนหรือ disable action ตามสิทธิ์ |
| Read-only user | เห็นข้อมูลที่อ่านได้; ซ่อน mutating actions แต่ไม่ซ่อน context สำคัญ |
| Session หมดอายุ | optional banner บน login; redirect `?reason=expired` ตาม Auth flow |

### 3.11 Conflict `409`

- ข้อความว่าข้อมูล **เปลี่ยนจากที่ผู้ใช้เปิดไว้**
- Action อย่างน้อยหนึ่งอย่าง: `Refresh`, `Reload latest`, `Open latest detail`

### 3.12 Detail page errors

- **404:** ให้กลับ list ได้ง่าย
- **Partial section fail:** error **แยกราย section** — ไม่ทำทั้งหน้าพังเว้นแต่ข้อมูลหลักหาย

### 3.13 Dashboard / widgets

- อนุญาต **partial failure ราย widget**
- ถ้ามี cache/staleness: แสดง `Last updated` หรือข้อความ freshness

### 3.14 Long-running / critical actions

- หลังคลิก: **disable ปุ่ม** ทันที, แสดง **progress** หรือ state อ่านได้
- ถ้ามี retry: บอกว่า **กดซ้ำปลอดภัยหรือไม่**
- สำเร็จบางส่วน: แยกผลหลัก vs งานที่ fail + เส้นทาง retry / manual recovery

### 3.15 Audit / success ที่ต้องอ้างอิง

- เมื่อ entity มี audit หรือ posting: success ควรโชว์ **id / documentNo / reference** สำคัญ + link ไปประวัติหรือต้นทางเมื่อสมเหตุสมผล

### 3.16 Notifications (header / bell)

- **Badge unread:** ถ้าโหลด count fail — หลีกเลี่ยงตัวเลขค้างผิด; อาจซ่อน badge + **ไอคอน warning เล็กน้อย** (ตาม R2-10)
- **Load list / save preference fail:** แจ้ง error + retry
- รายการมี **actionUrl** — เปิดแล้วนำทางถูกต้อง; mark read / mark all read sync state

---

## 4) ชุด CTA ที่ควรสม่ำเสมอ (รอ glossary เต็มจาก BAUX-002)

ใช้คำเดียวกันในบริบทเดียวกัน:

- `Retry`, `Back to List`, `Open Detail`, `Reload latest`, `Refresh`, `Export`, `Preview`, `View Error Detail`, `Confirm …`, `Cancel`, `Mark all read`, `Save Preferences`

---

## 5) Block prompt สำหรับ AI / ทีม implement (คัดลอกใช้ซ้ำ)

```
คุณกำลังสร้าง shared UI component สำหรับ ERP Frontend (Tailwind + semantic tokens ตาม Documents/UI_Flow_mockup/design-system.md)

อ่านมาตรฐานพฤติกรรมจาก Documents/UI_Flow_mockup/Components/Shear_components.md และ Documents/UX_Flow/_GLOBAL_FRONTEND_BEHAVIORS.md

ข้อกำหนด:
- ระบุ variant: toast | inline field error | page banner | modal confirm | modal error | empty state | skeleton | permission empty | 409 conflict dialog
- ทุก error ที่ recover ได้ต้องมี CTA ชัด (Retry / Back to list / Reload latest ตามบริบท)
- Soft warning ต้องแยกจาก blocking error และอธิบายผลกระทบ
- Modal: focus trap, ปิดด้วย Esc ถ้าเหมาะสม, ปุ่ม primary ชัด
- ไม่แสดงข้อมูลละเอียดเกินจำเป็นใน toast; รายละเอียดยาวใส่ modal หรือลิงก์ "ดูรายละเอียด"
- รองรับ partial failure (dashboard widget / detail section) แยกกล่อง error ต่อส่วน
```

---

## 6) Backlog ที่กระทบ component นี้โดยตรง

| ID | เรื่อง | ผลต่อ shared UI |
|----|--------|------------------|
| BAUX-001 | มาตรฐานข้อความ `401/403/404/409/500` | ข้อความใน banner/modal/page |
| BAUX-002 | Glossary CTA, empty, warning, success toast | ป้ายปุ่มและโทนข้อความ |
| BAUX-050 | Taxonomy `eventType` | label ใน notification settings |

เมื่อ BA ปิด backlog เหล่านี้ ให้อัปเดต section 4–5 และ token ข้อความใน component library ให้ตรงกัน

---

## 7) Checklist ก่อน merge UI ใหม่

- [ ] Loading แรกมี skeleton/placeholder ไม่ใช่จอว่าง
- [ ] Error list มี retry และไม่เสีย filter
- [ ] Empty มีเหตุผล + CTA หลัก
- [ ] 409 มี reload/refresh/open latest
- [ ] Unsaved: route + modal ครอบคลุม
- [ ] 403 แยก route vs component
- [ ] Long action: ปุ่ม disable + progress
- [ ] Success mutation: toast หรือ feedback ชัด + clear dirty
