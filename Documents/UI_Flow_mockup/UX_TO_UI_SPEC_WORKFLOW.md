# แปลง UX_Flow → UI page spec (`.md`) เพื่อสร้าง `preview.html` ในอนาคต

เอกสารนี้เป็นขั้นตอนมาตรฐานสำหรับทีม/AI เมื่อต้องการให้ **เอกสารใน [`Documents/UX_Flow/Functions`](../UX_Flow/Functions)** กลายเป็น **spec หน้า** ใน [`Page/`](./Page/) ที่อ่านแล้วนำไปเขียน static HTML preview ได้โดยไม่ต้องเดา

---

## 1) หลักการแยกบทบาท (สำคัญ)

| แหล่ง | ใช้เพื่อ |
|--------|----------|
| **UX_Flow** | เป้าหมายหน้า, บทบาท, **route**, ฟิลด์, ปุ่ม, validation, error/success path, สถานะ loading/empty, ข้อความที่ user เห็น |
| [`design-system.md`](./design-system.md) | **class / component pattern** (PageHeader, card, table, form field, badge, alert) — ไม่คัดลอกทั้งไฟล์ลง spec แต่ **อ้าง section** |
| [`_GLOBAL_FRONTEND_BEHAVIORS.md`](../UX_Flow/_GLOBAL_FRONTEND_BEHAVIORS.md) | พฤติกรรมข้ามหน้า (401/403/409, unsaved, list empty) — **อ้างแทนซ้ำ** ยกเว้นเคสเฉพาะหน้า |
| [`Page/_Shared/preview-base.css`](./Page/_Shared/preview-base.css) | สไตล์ร่วมของไฟล์ `.preview.html` — ใช้ class ที่มีอยู่ก่อน แล้วค่อยเติมถ้าจำเป็น |
| **erp_frontend (ถ้ามี)** | ใส่ใน **หมายเหตุ implementation** เท่านั้น — ไม่แย่งบทบาท UX เรื่องความต้องการ |

---

## 2) หนึ่งไฟล์ UX Function → หลายไฟล์ page spec

- ไฟล์ [`Functions/Rx-xx_....md`](../UX_Flow/Functions) อธิบาย **ทั้ง journey**
- ใน [`Page/Rx-xx_....`](./Page/) ให้แตกเป็น **หนึ่งไฟล์ `.md` = หนึ่งหน้า (หนึ่ง route หรือหนึ่ง modal/sheet ที่ถือเป็นหน้าเดียวกัน)**

**วิธีแตกหน้า (ลำดับการตัดสินใจ):**

1. อ่าน **E2E Scenario Flow** และ mermaid — ทุก node `🖥 Screen` ที่เป็น **หน้าจริง / URL ต่างกัน** → คนละไฟล์ spec (เช่น List vs Form vs Detail)
2. อ่าน **`## Sub-flow ...`** — แต่ละ sub-flow ที่มี **Entry** เป็น route ชัด → อย่างน้อยหนึ่งไฟล์; ถ้า List + Detail + Form แยก route ก็แยกไฟล์
3. อ่าน **`### Step ...`** — รวบ steps ที่อยู่ **บนหน้าเดียวกัน** เป็นไฟล์เดียว; ถ้า step เป็น “เปิดหน้าใหม่” ให้แยกไฟล์และลิงก์ข้าม spec

**ชื่อไฟล์:** ใช้ชื่อสื่อความหมาย + ประเภทหน้า เช่น `EmployeeList.md`, `InvoiceForm.md`, `SessionBootstrap.md` (ไม่มี route แต่เป็นสถานะ UI)

---

## 3) แมปโครงสร้าง UX → หัวข้อใน page spec

ใช้เทมเพลต [`Page/_PAGE_SPEC_TEMPLATE.md`](./Page/_PAGE_SPEC_TEMPLATE.md) เป็นฐาน แล้วเติมตามตารางนี้:

| ใน UX_Flow | ดึงมาใส่ใน UI spec อย่างไร |
|------------|------------------------------|
| `**Entry:**` / route ใน BR | แถว **Route** ใต้หัวข้อหลัก |
| `**Actor(s):**` | หัวข้อ **ผู้ใช้และสิทธิ์** (+ permission key ถ้า UX/BR ระบุ) |
| `### Step ...` → **Goal** | หัวข้อ **เป้าหมายหน้าจอ** (หนึ่งประโยค) |
| **User sees** | รายการบล็อก UI / ส่วนแสดงผล (จะไปเป็น region ใน HTML) |
| **User Action** → ช่อง / field | ตาราง **เนื้อหาและฟิลด์** (ชื่อ, required, validation, ค่าที่ยอมรับ) |
| **User Action** → ปุ่ม | ตาราง **การกระทำ (CTA)** |
| **Frontend behavior** | รวมใน **สถานะพิเศษ** + **โครง layout** (เช่น disable ขณะ submit, inline error) |
| **Error** / **Success** | **สถานะพิเศษ** (เฉพาะหน้า); ถ้าเป็นมาตรฐานระบบให้อ้าง Global |
| **Notes** | **หมายเหตุ** หรือ **หมายเหตุ implementation** |
| E2E **Scenario Summary** | ใช้ตรวจว่า happy/error path ครบ — ไม่ต้องคัดลอกทั้งตาราง ถ้าไม่จำเป็น |

---

## 4) ขั้นตอนการแปลง (ทำซ้ำทุกหน้า)

### 4.1 เตรียม

- เปิดไฟล์ `Functions/Rx-xx_....md` ที่เกี่ยวข้อง + [`_GLOBAL_FRONTEND_BEHAVIORS.md`](../UX_Flow/_GLOBAL_FRONTEND_BEHAVIORS.md)
- สำเนา [`_PAGE_SPEC_TEMPLATE.md`](./Page/_PAGE_SPEC_TEMPLATE.md) เป็น `Page/Rx-xx_.../<ชื่อหน้า>.md`

### 4.2 เติม Metadata

- **UX flow:** ลิงก์ relative ไป `../../../UX_Flow/Functions/<ชื่อเดียวกับโฟลเดอร์>.md`
- **UX sub-flow / steps:** ระบุชัด เช่น `Sub-flow A — …` และ `Step A1 — …` (หรือหลาย steps ถ้ารวมในหน้าเดียว)
- **Design system:** ลิงก์ `../../design-system.md` และระบุ § ที่ใช้ (เช่น §3 Page layout, §6 Table)
- **Preview:** ชื่อไฟล์ `*.preview.html` ที่จะสร้างในอนาคต + `../_Shared/preview-base.css`

### 4.3 ดึงเนื้อหาเชิง UI

- คัดลอกเฉพาะสิ่งที่ **ปรากฏบนจอ** — ไม่ใส่ sequence API ยาวใน spec หน้า ยกเว้นหนึ่งบรรทัดถ้าจำเป็นต่อการเข้าใจ (เช่น “หลัง submit สำเร็จ redirect ไป …”)
- ฟิลด์: ใช้ชื่อเดียวกับ UX (`field_name`) ให้ตรงกับ API/ฟอร์มจริง
- ถ้า UX อ้าง “ตาม BR” แต่ไม่ได้ลิสต์ฟิลด์ — ใส่ `TBD` + ชี้ path BR ใน metadata หรือ Notes

### 4.4 ผูกกับ design system

- ระบุ **รูปแบบหน้า:** list / detail / form / dashboard / auth fullscreen
- สำหรับแต่ละส่วน ระบุ pattern จาก `design-system.md` (ไม่ต้องวาง class ทุกตัวใน spec ถ้า HTML จะทำตาม design system อยู่แล้ว)

### 4.5 ส่วน “พร้อมทำ preview.html” (แนะนำให้ใส่ทุกไฟล์)

เพิ่มหัวข้อ **## Preview HTML notes** (ดูตัวอย่างใน `_PAGE_SPEC_TEMPLATE.md` หลังอัปเดต) ให้ครอบคลุม:

- **Shell:** หน้านี้อยู่ใน App shell หรือ standalone (เช่น login)
- **Regions:** ลำดับบล็อกบนหน้า (header → filters → table → pagination) เพื่อ map เป็น `<section>` / `div` ใน HTML
- **สถานะที่ควรมีใน preview:** อย่างน้อย `default`, `loading`, `empty`, `error` ถ้า UX ระบุ — จะได้ทำ toggle หรือหลาย variant ในไฟล์เดียว
- **ข้อมูลจำลอง:** จำนวนแถวตัวอย่าง, ข้อความ badge, ตัวเลข KPI (ถ้ามี)

เป้าหมาย: คนที่ไม่เคยอ่าน UX ยาว ๆ แต่อ่านแค่ spec หน้า + design system ก็สร้าง HTML ได้

### 4.6 ตรวจก่อนปิดงาน

- [ ] ทุกฟิลด์ใน **User Action** ของ step ที่เกี่ยวข้องถูกสะท้อนในตารางฟิลด์หรือตาราง read-only
- [ ] ทุกปุ่มสำคัญอยู่ในตาราง CTA และมีผลลัพธ์สั้น ๆ
- [ ] Error / empty / permission ไม่ขัดกับ Global (หรือระบุข้อยกเว้น)
- [ ] มีลิงก์ UX + design system + path preview ที่ถูกต้อง
- [ ] อัปเดต [`Page/_INDEX.md`](./Page/_INDEX.md) เมื่อเพิ่ม route/ไฟล์ใหม่

---

## 5) ความสัมพันธ์กับ `preview.html` (ลำดับในอนาคต)

1. อ่าน `*.md` ของหน้านั้น + `design-system.md` + `preview-base.css`
2. สร้าง `*.preview.html` ในโฟลเดอร์เดียวกับ spec
3. ใส่ `<link rel="stylesheet" href="../_Shared/preview-base.css">` (ระดับเดียวกับไฟล์ใน `Page/Rx-xx/`)
4. ถ้าหน้าอยู่ในแอปหลัง login: อาจห่อด้วยโครงย่อจาก [`AppShell.preview.html`](./Page/_Shared/AppShell.preview.html) หรือคัดลอกเฉพาะ main column — ตามที่ **Preview HTML notes** ระบุ
5. ถ้ามีหลายสถานะ: ใช้ปุ่ม JS เล็ก ๆ สลับ class หรือ `hidden` บน section (แบบ [`Login.preview.html`](./Page/R1-01_Auth_Login_and_Session/Login.preview.html))

---

## 6) เมื่อ UX กับโค้ดเดิมขัดกัน

- ใน spec ให้ถือ **UX_Flow เป็นความต้องการผลิตภัณฑ์**
- ความต่างจาก `erp_frontend` ใส่ใต้ **หมายเหตุ implementation** พร้อมว่า “ควรแก้ preview ให้ตาม UX” หรือ “รอปรับโค้ด”

---

## 7) เอกสารที่เกี่ยวข้อง

| ไฟล์ | หน้าที่ |
|------|--------|
| [`Page/_PAGE_SPEC_TEMPLATE.md`](./Page/_PAGE_SPEC_TEMPLATE.md) | โครงหน้าว่างสำหรับคัดลอก |
| [`Page/_INDEX.md`](./Page/_INDEX.md) | สารบัญ route ↔ spec ↔ preview |
| [`design-system.md`](./design-system.md) | มาตรฐาน visual / Tailwind pattern |
| [`UX_Flow/_TEMPLATE.md`](../UX_Flow/_TEMPLATE.md) | โครงเอกสาร UX ฝั่งต้นทาง |

---

*อัปเดต workflow นี้เมื่อรูปแบบ UX หรือ design system เปลี่ยน — ไม่ต้องแก้ทุก page spec ถ้าหลักการยังเดิม*
