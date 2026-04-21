# UX Flow — R1-03 HR: โครงสร้างองค์กร (แผนก + ตำแหน่ง)

เอกสารนี้แยก UX เป็น **สองกลุ่ม endpoint** ตาม SD_Flow: แผนก (`/api/hr/departments/*`) และตำแหน่ง (`/api/hr/positions/*`) โดยคง pattern เดียวกับ `Documents/UX_Flow/Login.md`

**แหล่งอ้างอิงที่ผูกกับเอกสารนี้**

- Business requirement (BR): `Documents/Requirements/Release_1.md` (Feature 1.3 HR — Organization Management)
- Traceability: `Documents/Requirements/Release_1_traceability_mermaid.md` (Feature 1.3)
- Sequence / SD_Flow: `Documents/SD_Flow/HR/organization.md`
- Related screens / mockups: `Documents/UI_Flow_mockup/Page/R1-03_HR_Organization_Management/Organization.md`

---

## E2E Scenario Flow

> ภาพรวมการจัดการโครงสร้างองค์กรใน Release 1 ครอบคลุมการดูแลแผนกและตำแหน่งตั้งแต่ list, detail, create, update, delete รวมถึงการเป็นข้อมูลอ้างอิงให้ employee profile, leave approval routing และ payroll grouping

```mermaid
flowchart TD
    classDef screen fill:#ede9fe,stroke:#7c3aed,color:#3b0764
    classDef user fill:#dbeafe,stroke:#2563eb,color:#1e3a5f
    classDef success fill:#d1fae5,stroke:#059669,color:#064e3b
    classDef decision fill:#fef3c7,stroke:#d97706,color:#78350f
    classDef error fill:#fee2e2,stroke:#dc2626,color:#7f1d1d
    classDef terminal fill:#f1f5f9,stroke:#475569,color:#1e293b

    START(["▶ เข้าเมนู `/hr/organization`"]):::terminal
    SCR1["🖥 Organization Workspace
─────────────────────
📋 รายการ Departments และ Positions
📋 ปุ่ม create / edit / delete
─────────────────────
🔘 [เพิ่มแผนก] 🔘 [เพิ่มตำแหน่ง]"]:::screen
    U1(["👤 เลือกว่าจะจัดการ
แผนกหรือตำแหน่ง"]):::user
    D1{{"จัดการข้อมูลชุดไหน?"}}:::decision

    START --> SCR1 --> U1 --> D1

    SCR2A["🖥 Department Flow
─────────────────────
📋 list / detail / form ของแผนก
📝 code, name, parentId, managerId
─────────────────────
🔘 [บันทึก] 🔘 [ลบ] 🔘 [กลับ]"]:::screen
    SCR2B["🖥 Position Flow
─────────────────────
📋 list / detail / form ของตำแหน่ง
📝 code, name, departmentId, level
─────────────────────
🔘 [บันทึก] 🔘 [ลบ] 🔘 [กลับ]"]:::screen

    D1 -- "Departments" --> SCR2A
    D1 -- "Positions" --> SCR2B

    U2(["👤 สร้าง / แก้ไข / ลบข้อมูล"]):::user
    D2{{"validation และ dependency
ผ่านหรือไม่?"}}:::decision
    OUT1["✅ บันทึกข้อมูลสำเร็จ
master data พร้อมใช้ในโมดูลอื่น"]:::success
    OUT2["✅ ลบสำเร็จ
รายการถูก refresh"]:::success
    ERR1["⚠ Validation / Conflict Error
ข้อมูลซ้ำ / อ้างอิงไม่ถูกต้อง"]:::error
    ERR2["⚠ Delete Blocked
ยังมีพนักงาน active หรือ dependency ค้าง"]:::error

    SCR2A --> U2
    SCR2B --> U2
    U2 --> D2
    D2 -- "create/update สำเร็จ" --> OUT1
    D2 -- "delete สำเร็จ" --> OUT2
    D2 -- "validation fail" --> ERR1
    D2 -- "dependency fail" --> ERR2
    ERR1 --> SCR1
    ERR2 --> SCR1

    ENDNODE(["⏹ End / กลับหน้า Organization"]):::terminal
    OUT1 --> ENDNODE
    OUT2 --> ENDNODE
```

### Scenario Summary

| Scenario | ขั้นตอน | ผลลัพธ์ |
|----------|---------|---------|
| ✅ ดูรายการแผนกและตำแหน่ง | เข้า `/hr/organization` → โหลด departments และ positions | เห็น master data ล่าสุดสำหรับจัดการและใช้อ้างอิง |
| ✅ ดูรายละเอียดแผนก | เลือกแถวแผนก → เปิด detail | เห็น `code`, `name`, `parentId`, `managerId` และ action ต่อ |
| ✅ สร้างหรือแก้ไขแผนก | เปิดฟอร์ม create/edit → submit | ข้อมูลแผนกพร้อมใช้กับ employee และ leave approval |
| ✅ สร้างหรือแก้ไขตำแหน่ง | เปิดฟอร์ม/โมดัล position → submit | ตำแหน่งพร้อมใช้งานใน employee form และ payroll grouping |
| ✅ ลบข้อมูลที่ไม่มี dependency | กดลบ → confirm → ระบบตรวจเงื่อนไข | ลบสำเร็จและ list ถูก refresh |
| ⚠ ลบไม่ได้เพราะยังมี dependency | กดลบ department/position → พบพนักงาน active หรือข้อมูลอ้างอิงค้าง | ระบบ block การลบและบอกเหตุผล |
| ⚠ ข้อมูลซ้ำหรืออ้างอิงไม่ถูกต้อง | submit create/edit → `code` ซ้ำ หรือ FK ไม่ถูกต้อง | แสดง validation/conflict error และให้แก้ไข |

---
## ส่วนกลาง — Permission gate & การใช้ข้อมูลข้ามโมดูล

### ชื่อ Flow & ขอบเขต

**Flow name:** `HR Organization — เข้าถึงเมนูและข้อมูลอ้างอิงสำหรับฟอร์มอื่น`

**Actor(s):** `hr_admin`, `super_admin` สำหรับ CRUD; พนักงานทั่วไปอาจ **อ่าน** บางส่วนผ่าน dropdown ในฟอร์มอื่น (ตาม BR)

**Entry:** เมนู HR → องค์กร หรือเปิดฟอร์มพนักงานที่ต้องโหลด dropdown

**Exit:** จัดการแผนก/ตำแหน่งสำเร็จ หรือส่งค่าไป bind ฟอร์ม employee/leave config

**Out of scope:** org chart visualization แบบกราฟ (ถ้าไม่มีใน scope)

---

### Step G1 — ตรวจสิทธิ์ก่อนแสดง UI แก้ไข

**Goal:** ซ่อน/แสดงปุ่มสร้าง แก้ไข ลบ ตาม permission

**User sees:** หน้า organization แบบ read-only หรือเต็มรูปแบบ

**User can do:** ดูอย่างเดียวหรือจัดการ

**User Action:**
- ประเภท: `กดปุ่ม`
- ปุ่ม / Controls ในหน้านี้:
  - `[Open Organization]` → เข้าเมนูองค์กร
  - `[Back]` → กลับหน้าก่อนหน้าเมื่อไม่มีสิทธิ์จัดการ

**Frontend behavior:**

- ใช้ permission จาก `GET /api/auth/me` / login response
- ไม่พึ่งการซ่อนปุ่มอย่างเดียว — ต้องรับ 403 จาก API อย่างสง่างาม

**System / AI behavior:** API enforce role

**Success:** UI สอดคล้องกับสิทธิ์จริง

**Error:** —

**Notes:** BR ระบุว่า employee create/edit ดึง departments + positions — ดังนั้น **read path** ของ org endpoints ถูกเรียกบ่อยจากฟอร์มอื่น

---

# กลุ่ม 1 — แผนก (Departments)

## Sub-flow D1 — รายการแผนก (`GET /api/hr/departments`)

### ชื่อ Flow & ขอบเขต

**Flow name:** `HR Departments — List`

**Actor(s):** HR ที่มีสิทธิ์, super_admin

**Entry:** แท็บ "แผนก" ในหน้า Organization

**Exit:** เลือกแผนกเพื่อดูรายละเอียดหรือสร้างใหม่

**Out of scope:** drag-drop ลำดับชั้นแบบ tree (ถ้าไม่มี API)

---

### Scenario Flow

### สัญลักษณ์ Node (Color Legend)

| สี | Node shape | หมายถึง |
|----|-----------|---------|
| 🟣 ม่วง | สี่เหลี่ยม `["…"]` | **Screen / UI State** |
| 🔵 น้ำเงิน | วงกลม `(["…"])` | **User Action** |
| 🟢 เขียว | สี่เหลี่ยม `["…"]` | **System / API** |
| 🟡 เหลือง | เพชร `{{"…"}}` | **Decision** |
| 🔴 แดง | สี่เหลี่ยม `["…"]` | **Error / Edge case** |
| ⚫ เทา | วงรี `(["…"])` | **Start / End** |

```mermaid
flowchart TD
    classDef screen   fill:#ede9fe,stroke:#7c3aed,color:#3b0764
    classDef user     fill:#dbeafe,stroke:#2563eb,color:#1e3a5f
    classDef system   fill:#d1fae5,stroke:#059669,color:#064e3b
    classDef decision fill:#fef3c7,stroke:#d97706,color:#78350f
    classDef error    fill:#fee2e2,stroke:#dc2626,color:#7f1d1d
    classDef terminal fill:#f1f5f9,stroke:#475569,color:#1e293b

    START(["▶ Entry\nเปิด sub-flow นี้"]):::terminal
    SCR1["🖥 ① โหลดรายการ\n─────────────────\nUser เห็น: หน้าจอของขั้นตอนนี้"]:::screen
    U1(["👤 ① User Action\nกรอกข้อมูล / กดปุ่ม"]):::user
    SYS1["⚙ ① System / API\nตรวจสอบและประมวลผล"]:::system
    D1{{"① เงื่อนไขสำเร็จ?"}}:::decision
    ERR1["⚠ Error ①\nข้อมูลไม่ถูกต้อง / สิทธิ์ไม่พอ / สถานะไม่ถูกต้อง"]:::error

    START -->|"เปิดหน้า"| SCR1
    SCR1 --> U1
    U1 -->|"Submit"| SYS1
    SYS1 --> D1
    SCR2["🖥 ② Empty / error retry\n─────────────────\nUser เห็น: ผลลัพธ์หรือขั้นตอนถัดไป"]:::screen
    D1 -- "✅ ผ่าน" --> SCR2
    D1 -- "❌ ไม่ผ่าน" --> ERR1
    ERR1 -->|"Retry"| SCR1
    U2(["👤 ② User Action\nเลือกดำเนินการต่อ / ยกเลิก"]):::user
    D2{{"② เลือกเส้นทาง?"}}:::decision
    ENDOK(["⏹ End (Happy Path)"]):::terminal
    ENDCANCEL(["⏹ End (Cancel Path)"]):::terminal
    ERR2["⚠ Error ②\nธุรกรรมล้มเหลว / timeout"]:::error
    SYS2["⚙ ② System / API\nบันทึกหรือยืนยันผล"]:::system
    SCR2 --> U2
    U2 --> D2
    D2 -- "Continue" --> SYS2
    D2 -- "Cancel" --> ENDCANCEL
    SYS2 --> ENDOK
    SYS2 -->|"Error"| ERR2
    ERR2 -->|"Retry"| SCR2
```

---

### Step 1 — โหลดรายการ

**Goal:** แสดงรายการแผนกทั้งหมดพร้อมตัวกรองที่ BE รองรับ

**User sees:** ตาราง/การ์ด, loading

**User can do:** ค้นหา/กรอง (ถ้ามี query)

**User Action:**
- ประเภท: `กรอกข้อมูล / เลือกตัวเลือก`
- ช่องที่ใช้กรอง/ค้นหา:
  - `search` *(optional)* : ค้นหาจากชื่อหรือ code แผนก
- ปุ่ม / Controls ในหน้านี้:
  - `[Apply Filters]` → โหลดรายการแผนก
  - `[Create Department]` → เปิดฟอร์มสร้าง
  - `[Open Department]` → ไปหน้า detail

**Frontend behavior:**

- `GET /api/hr/departments` (+ query ตามสัญญา SD/BE)
- cache สั้น ๆ (stale-while-revalidate) เพื่อลดการกระพริบเมื่อสลับแท็บ

**System / AI behavior:** คืนรายการ

**Success:** 200

**Error:** 401 → refresh flow auth; 403 → access denied

**Notes:** ข้อมูลแผนกถูกอ้างอิงจาก leave approval config ตาม BR — แสดง `code` แผนกให้ชัดเพื่อให้ HR map กับนโยบายการลา

---

### Step 2 — Empty / error retry

**Goal:** จัดการสถานะว่างและเครือข่าย

**User sees:** empty state หรือ inline error + ปุ่ม retry

**User can do:** retry

**User Action:**
- ประเภท: `กดปุ่ม`
- ปุ่ม / Controls ในหน้านี้:
  - `[Retry]` → โหลดรายการแผนกใหม่
  - `[Create Department]` → เพิ่มแผนกใหม่เมื่อยังไม่มีข้อมูล
  - `[Clear Filters]` → ล้างเงื่อนไขค้นหา

**Frontend behavior:** เรียก `GET /api/hr/departments` ซ้ำด้วย backoff ง่าย ๆ

**System / AI behavior:** —

**Success:** ได้ข้อมูลหรือยืนยันว่าว่างจริง

**Error:** timeout

**Notes:** —

---

## Sub-flow D2 — รายละเอียดแผนก (`GET /api/hr/departments/:id`)

### Scenario Flow

### สัญลักษณ์ Node (Color Legend)

| สี | Node shape | หมายถึง |
|----|-----------|---------|
| 🟣 ม่วง | สี่เหลี่ยม `["…"]` | **Screen / UI State** |
| 🔵 น้ำเงิน | วงกลม `(["…"])` | **User Action** |
| 🟢 เขียว | สี่เหลี่ยม `["…"]` | **System / API** |
| 🟡 เหลือง | เพชร `{{"…"}}` | **Decision** |
| 🔴 แดง | สี่เหลี่ยม `["…"]` | **Error / Edge case** |
| ⚫ เทา | วงรี `(["…"])` | **Start / End** |

```mermaid
flowchart TD
    classDef screen   fill:#ede9fe,stroke:#7c3aed,color:#3b0764
    classDef user     fill:#dbeafe,stroke:#2563eb,color:#1e3a5f
    classDef system   fill:#d1fae5,stroke:#059669,color:#064e3b
    classDef decision fill:#fef3c7,stroke:#d97706,color:#78350f
    classDef error    fill:#fee2e2,stroke:#dc2626,color:#7f1d1d
    classDef terminal fill:#f1f5f9,stroke:#475569,color:#1e293b

    START(["▶ Entry\nเปิด sub-flow นี้"]):::terminal
    SCR1["🖥 ① เปิดรายละเอียด\n─────────────────\nUser เห็น: หน้าจอของขั้นตอนนี้"]:::screen
    U1(["👤 ① User Action\nกรอกข้อมูล / กดปุ่ม"]):::user
    SYS1["⚙ ① System / API\nตรวจสอบและประมวลผล"]:::system
    D1{{"① เงื่อนไขสำเร็จ?"}}:::decision
    ERR1["⚠ Error ①\nข้อมูลไม่ถูกต้อง / สิทธิ์ไม่พอ / สถานะไม่ถูกต้อง"]:::error

    START -->|"เปิดหน้า"| SCR1
    SCR1 --> U1
    U1 -->|"Submit"| SYS1
    SYS1 --> D1
    ENDMAIN(["⏹ Exit / Complete"]):::terminal
    D1 -- "✅ ผ่าน" --> ENDMAIN
    D1 -- "❌ ไม่ผ่าน" --> ERR1
    ERR1 -->|"Retry"| SCR1
    ENDCANCEL(["⏹ End (Cancel Path)"]):::terminal
    D1 -- "Cancel" --> ENDCANCEL
```

---

### Step 1 — เปิดรายละเอียด

**Goal:** ดู metadata แผนก (ชื่อ, รหัส, parent ถ้ามี ฯลฯ ตาม schema)

**User sees:** skeleton แล้วรายละเอียด

**User can do:** แก้ไข, ลบ (ถ้ามีสิทธิ์)

**User Action:**
- ประเภท: `กดปุ่ม`
- ปุ่ม / Controls ในหน้านี้:
  - `[Edit Department]` → เข้าโหมดแก้ไข
  - `[Delete Department]` → เปิด modal ลบ
  - `[Back to List]` → กลับหน้ารายการ

**Frontend behavior:** `GET /api/hr/departments/:id`

**System / AI behavior:** validate ownership/visibility

**Success:** 200

**Error:** 404

**Notes:** ถ้า user แก้ URL เป็น id ที่ไม่มี — แสดง not found

---

## Sub-flow D3 — สร้างแผนก (`POST /api/hr/departments`)

### Scenario Flow

### สัญลักษณ์ Node (Color Legend)

| สี | Node shape | หมายถึง |
|----|-----------|---------|
| 🟣 ม่วง | สี่เหลี่ยม `["…"]` | **Screen / UI State** |
| 🔵 น้ำเงิน | วงกลม `(["…"])` | **User Action** |
| 🟢 เขียว | สี่เหลี่ยม `["…"]` | **System / API** |
| 🟡 เหลือง | เพชร `{{"…"}}` | **Decision** |
| 🔴 แดง | สี่เหลี่ยม `["…"]` | **Error / Edge case** |
| ⚫ เทา | วงรี `(["…"])` | **Start / End** |

```mermaid
flowchart TD
    classDef screen   fill:#ede9fe,stroke:#7c3aed,color:#3b0764
    classDef user     fill:#dbeafe,stroke:#2563eb,color:#1e3a5f
    classDef system   fill:#d1fae5,stroke:#059669,color:#064e3b
    classDef decision fill:#fef3c7,stroke:#d97706,color:#78350f
    classDef error    fill:#fee2e2,stroke:#dc2626,color:#7f1d1d
    classDef terminal fill:#f1f5f9,stroke:#475569,color:#1e293b

    START(["▶ Entry\nเปิด sub-flow นี้"]):::terminal
    SCR1["🖥 ① ฟอร์มสร้าง\n─────────────────\nUser เห็น: หน้าจอของขั้นตอนนี้"]:::screen
    U1(["👤 ① User Action\nกรอกข้อมูล / กดปุ่ม"]):::user
    SYS1["⚙ ① System / API\nตรวจสอบและประมวลผล"]:::system
    D1{{"① เงื่อนไขสำเร็จ?"}}:::decision
    ERR1["⚠ Error ①\nข้อมูลไม่ถูกต้อง / สิทธิ์ไม่พอ / สถานะไม่ถูกต้อง"]:::error

    START -->|"เปิดหน้า"| SCR1
    SCR1 --> U1
    U1 -->|"Submit"| SYS1
    SYS1 --> D1
    ENDMAIN(["⏹ Exit / Complete"]):::terminal
    D1 -- "✅ ผ่าน" --> ENDMAIN
    D1 -- "❌ ไม่ผ่าน" --> ERR1
    ERR1 -->|"Retry"| SCR1
    ENDCANCEL(["⏹ End (Cancel Path)"]):::terminal
    D1 -- "Cancel" --> ENDCANCEL
```

---

### Step 1 — ฟอร์มสร้าง

**Goal:** สร้างแผนกใหม่ถูกต้องตาม constraint (เช่น `code` unique ตาม BR)

**User sees:** ฟอร์มฟิลด์ที่จำเป็น

**User can do:** บันทึก, ยกเลิก

**User Action:**
- ประเภท: `กรอกข้อมูล / เลือกตัวเลือก`
- ช่องที่ต้องกรอก:
  - `code` *(required)* : รหัสแผนก
  - `name` *(required)* : ชื่อแผนก
  - `managerId` *(optional/conditional)* : ผู้จัดการแผนก
  - `parentDepartmentId` *(optional)* : แผนกแม่
- ปุ่ม / Controls ในหน้านี้:
  - `[Save Department]` → เรียก `POST /api/hr/departments`
  - `[Cancel]` → ปิดฟอร์ม

**Frontend behavior:**

- validate ฝั่ง client (required, ความยาว `code`)
- `POST /api/hr/departments`

**System / AI behavior:** enforce unique `code`, FK parent ถ้ามี

**Success:** 201 → navigate ไป detail หรือ refresh list

**Error:** 409 ชื่อ/รหัสซ้ำ

**Notes:** หลังสร้างแผนก ให้ไปตั้ง **สายอนุมัติการลา** สำหรับ `departmentId` นี้ผ่าน **`/hr/leaves`** (แท็บ/ส่วน “สายอนุมัติ” — ดู UX **R1-04 Sub-flow H**) และ API `GET/POST /api/hr/leaves/approval-configs` ตาม BR Feature 1.4

---

## Sub-flow D4 — แก้ไขแผนก (`PATCH /api/hr/departments/:id`)

### Scenario Flow

### สัญลักษณ์ Node (Color Legend)

| สี | Node shape | หมายถึง |
|----|-----------|---------|
| 🟣 ม่วง | สี่เหลี่ยม `["…"]` | **Screen / UI State** |
| 🔵 น้ำเงิน | วงกลม `(["…"])` | **User Action** |
| 🟢 เขียว | สี่เหลี่ยม `["…"]` | **System / API** |
| 🟡 เหลือง | เพชร `{{"…"}}` | **Decision** |
| 🔴 แดง | สี่เหลี่ยม `["…"]` | **Error / Edge case** |
| ⚫ เทา | วงรี `(["…"])` | **Start / End** |

```mermaid
flowchart TD
    classDef screen   fill:#ede9fe,stroke:#7c3aed,color:#3b0764
    classDef user     fill:#dbeafe,stroke:#2563eb,color:#1e3a5f
    classDef system   fill:#d1fae5,stroke:#059669,color:#064e3b
    classDef decision fill:#fef3c7,stroke:#d97706,color:#78350f
    classDef error    fill:#fee2e2,stroke:#dc2626,color:#7f1d1d
    classDef terminal fill:#f1f5f9,stroke:#475569,color:#1e293b

    START(["▶ Entry\nเปิด sub-flow นี้"]):::terminal
    SCR1["🖥 ① โหลด + แก้ไข\n─────────────────\nUser เห็น: หน้าจอของขั้นตอนนี้"]:::screen
    U1(["👤 ① User Action\nกรอกข้อมูล / กดปุ่ม"]):::user
    SYS1["⚙ ① System / API\nตรวจสอบและประมวลผล"]:::system
    D1{{"① เงื่อนไขสำเร็จ?"}}:::decision
    ERR1["⚠ Error ①\nข้อมูลไม่ถูกต้อง / สิทธิ์ไม่พอ / สถานะไม่ถูกต้อง"]:::error

    START -->|"เปิดหน้า"| SCR1
    SCR1 --> U1
    U1 -->|"Submit"| SYS1
    SYS1 --> D1
    ENDMAIN(["⏹ Exit / Complete"]):::terminal
    D1 -- "✅ ผ่าน" --> ENDMAIN
    D1 -- "❌ ไม่ผ่าน" --> ERR1
    ERR1 -->|"Retry"| SCR1
    ENDCANCEL(["⏹ End (Cancel Path)"]):::terminal
    D1 -- "Cancel" --> ENDCANCEL
```

---

### Step 1 — โหลด + แก้ไข

**Goal:** อัปเดตบางฟิลด์โดยไม่ส่งทั้ง record ถ้าไม่จำเป็น

**User sees:** ฟอร์ม pre-filled

**User can do:** แก้ไขและบันทึก

**User Action:**
- ประเภท: `กรอกข้อมูล / เลือกตัวเลือก`
- ช่องที่ต้องกรอก:
  - `name` *(optional)* : ชื่อแผนก
  - `managerId` *(optional)* : ผู้จัดการแผนก
  - `parentDepartmentId` *(optional)* : แผนกแม่
- ปุ่ม / Controls ในหน้านี้:
  - `[Save Changes]` → เรียก `PATCH /api/hr/departments/:id`
  - `[Cancel]` → ยกเลิกการแก้ไข

**Frontend behavior:**

- `GET /api/hr/departments/:id` แล้ว `PATCH /api/hr/departments/:id`

**System / AI behavior:** ตรวจผลกระทบต่อ employee ที่อ้างอิง (ถ้ามี)

**Success:** 200

**Error:** 422

**Notes:** ถ้าเปลี่ยน `code` ที่ถูกอ้างอิงใน integration — แสดงคำเตือนก่อนบันทึก (product copy)

---

## Sub-flow D5 — ลบแผนก (`DELETE /api/hr/departments/:id`)

### Scenario Flow

### สัญลักษณ์ Node (Color Legend)

| สี | Node shape | หมายถึง |
|----|-----------|---------|
| 🟣 ม่วง | สี่เหลี่ยม `["…"]` | **Screen / UI State** |
| 🔵 น้ำเงิน | วงกลม `(["…"])` | **User Action** |
| 🟢 เขียว | สี่เหลี่ยม `["…"]` | **System / API** |
| 🟡 เหลือง | เพชร `{{"…"}}` | **Decision** |
| 🔴 แดง | สี่เหลี่ยม `["…"]` | **Error / Edge case** |
| ⚫ เทา | วงรี `(["…"])` | **Start / End** |

```mermaid
flowchart TD
    classDef screen   fill:#ede9fe,stroke:#7c3aed,color:#3b0764
    classDef user     fill:#dbeafe,stroke:#2563eb,color:#1e3a5f
    classDef system   fill:#d1fae5,stroke:#059669,color:#064e3b
    classDef decision fill:#fef3c7,stroke:#d97706,color:#78350f
    classDef error    fill:#fee2e2,stroke:#dc2626,color:#7f1d1d
    classDef terminal fill:#f1f5f9,stroke:#475569,color:#1e293b

    START(["▶ Entry\nเปิด sub-flow นี้"]):::terminal
    SCR1["🖥 ① ยืนยัน + ลบ\n─────────────────\nUser เห็น: หน้าจอของขั้นตอนนี้"]:::screen
    U1(["👤 ① User Action\nกรอกข้อมูล / กดปุ่ม"]):::user
    SYS1["⚙ ① System / API\nตรวจสอบและประมวลผล"]:::system
    D1{{"① เงื่อนไขสำเร็จ?"}}:::decision
    ERR1["⚠ Error ①\nข้อมูลไม่ถูกต้อง / สิทธิ์ไม่พอ / สถานะไม่ถูกต้อง"]:::error

    START -->|"เปิดหน้า"| SCR1
    SCR1 --> U1
    U1 -->|"Submit"| SYS1
    SYS1 --> D1
    ENDMAIN(["⏹ Exit / Complete"]):::terminal
    D1 -- "✅ ผ่าน" --> ENDMAIN
    D1 -- "❌ ไม่ผ่าน" --> ERR1
    ERR1 -->|"Retry"| SCR1
    ENDCANCEL(["⏹ End (Cancel Path)"]):::terminal
    D1 -- "Cancel" --> ENDCANCEL
```

---

### Step 1 — ยืนยัน + ลบ

**Goal:** ลบแผนกเมื่อไม่มี dependency หรือตามนโยบาย soft-delete

**User sees:** modal ยืนยัน

**User can do:** ยืนยัน

**User Action:**
- ประเภท: `กรอกข้อมูล / กดปุ่ม`
- ช่องที่ต้องกรอก:
  - `confirmDepartmentCode` *(required)* : พิมพ์ code หรือชื่อแผนกเพื่อยืนยัน
- ปุ่ม / Controls ในหน้านี้:
  - `[Confirm Delete]` → เรียก `DELETE /api/hr/departments/:id`
  - `[Cancel]` → ปิด modal

**Frontend behavior:** `DELETE /api/hr/departments/:id` แล้ว invalidate `GET /api/hr/departments`

**System / AI behavior:** 409 ถ้ามีพนักงานหรือ child dept

**Success:** 200 message deleted

**Error:** 409 พร้อมข้อความธุรกิจ

**Notes:** แมปตรงกับ SD endpoint name เพื่อ audit

---

# กลุ่ม 2 — ตำแหน่ง (Positions)

## Sub-flow P1 — รายการตำแหน่ง (`GET /api/hr/positions`)

### Scenario Flow

### สัญลักษณ์ Node (Color Legend)

| สี | Node shape | หมายถึง |
|----|-----------|---------|
| 🟣 ม่วง | สี่เหลี่ยม `["…"]` | **Screen / UI State** |
| 🔵 น้ำเงิน | วงกลม `(["…"])` | **User Action** |
| 🟢 เขียว | สี่เหลี่ยม `["…"]` | **System / API** |
| 🟡 เหลือง | เพชร `{{"…"}}` | **Decision** |
| 🔴 แดง | สี่เหลี่ยม `["…"]` | **Error / Edge case** |
| ⚫ เทา | วงรี `(["…"])` | **Start / End** |

```mermaid
flowchart TD
    classDef screen   fill:#ede9fe,stroke:#7c3aed,color:#3b0764
    classDef user     fill:#dbeafe,stroke:#2563eb,color:#1e3a5f
    classDef system   fill:#d1fae5,stroke:#059669,color:#064e3b
    classDef decision fill:#fef3c7,stroke:#d97706,color:#78350f
    classDef error    fill:#fee2e2,stroke:#dc2626,color:#7f1d1d
    classDef terminal fill:#f1f5f9,stroke:#475569,color:#1e293b

    START(["▶ Entry\nเปิด sub-flow นี้"]):::terminal
    SCR1["🖥 ① โหลดรายการ\n─────────────────\nUser เห็น: หน้าจอของขั้นตอนนี้"]:::screen
    U1(["👤 ① User Action\nกรอกข้อมูล / กดปุ่ม"]):::user
    SYS1["⚙ ① System / API\nตรวจสอบและประมวลผล"]:::system
    D1{{"① เงื่อนไขสำเร็จ?"}}:::decision
    ERR1["⚠ Error ①\nข้อมูลไม่ถูกต้อง / สิทธิ์ไม่พอ / สถานะไม่ถูกต้อง"]:::error

    START -->|"เปิดหน้า"| SCR1
    SCR1 --> U1
    U1 -->|"Submit"| SYS1
    SYS1 --> D1
    ENDMAIN(["⏹ Exit / Complete"]):::terminal
    D1 -- "✅ ผ่าน" --> ENDMAIN
    D1 -- "❌ ไม่ผ่าน" --> ERR1
    ERR1 -->|"Retry"| SCR1
    ENDCANCEL(["⏹ End (Cancel Path)"]):::terminal
    D1 -- "Cancel" --> ENDCANCEL
```

---

### Step 1 — โหลดรายการ

**Goal:** แสดงตำแหน่งทั้งหมดสำหรับ HR จัดการและสำหรับ dropdown ในฟอร์มอื่น

**User sees:** ตารางตำแหน่ง

**User can do:** ค้นหา/กรอง

**User Action:**
- ประเภท: `กรอกข้อมูล / เลือกตัวเลือก`
- ช่องที่ใช้กรอง/ค้นหา:
  - `search` *(optional)* : ค้นหาชื่อตำแหน่งหรือ code
- ปุ่ม / Controls ในหน้านี้:
  - `[Create Position]` → เปิดฟอร์มสร้าง
  - `[Open Position]` → ไปหน้า detail
  - `[Retry]` → โหลดรายการใหม่

**Frontend behavior:** `GET /api/hr/positions`

**System / AI behavior:** คืนรายการ

**Success:** 200

**Error:** network

**Notes:** Employee form ใช้ endpoint เดียวกัน — ออกแบบ component แชร์เพื่อไม่ duplicate logic

---

## Sub-flow P2 — รายละเอียดตำแหน่ง (`GET /api/hr/positions/:id`)

### Scenario Flow

### สัญลักษณ์ Node (Color Legend)

| สี | Node shape | หมายถึง |
|----|-----------|---------|
| 🟣 ม่วง | สี่เหลี่ยม `["…"]` | **Screen / UI State** |
| 🔵 น้ำเงิน | วงกลม `(["…"])` | **User Action** |
| 🟢 เขียว | สี่เหลี่ยม `["…"]` | **System / API** |
| 🟡 เหลือง | เพชร `{{"…"}}` | **Decision** |
| 🔴 แดง | สี่เหลี่ยม `["…"]` | **Error / Edge case** |
| ⚫ เทา | วงรี `(["…"])` | **Start / End** |

```mermaid
flowchart TD
    classDef screen   fill:#ede9fe,stroke:#7c3aed,color:#3b0764
    classDef user     fill:#dbeafe,stroke:#2563eb,color:#1e3a5f
    classDef system   fill:#d1fae5,stroke:#059669,color:#064e3b
    classDef decision fill:#fef3c7,stroke:#d97706,color:#78350f
    classDef error    fill:#fee2e2,stroke:#dc2626,color:#7f1d1d
    classDef terminal fill:#f1f5f9,stroke:#475569,color:#1e293b

    START(["▶ Entry\nเปิด sub-flow นี้"]):::terminal
    SCR1["🖥 ① เปิด detail\n─────────────────\nUser เห็น: หน้าจอของขั้นตอนนี้"]:::screen
    U1(["👤 ① User Action\nกรอกข้อมูล / กดปุ่ม"]):::user
    SYS1["⚙ ① System / API\nตรวจสอบและประมวลผล"]:::system
    D1{{"① เงื่อนไขสำเร็จ?"}}:::decision
    ERR1["⚠ Error ①\nข้อมูลไม่ถูกต้อง / สิทธิ์ไม่พอ / สถานะไม่ถูกต้อง"]:::error

    START -->|"เปิดหน้า"| SCR1
    SCR1 --> U1
    U1 -->|"Submit"| SYS1
    SYS1 --> D1
    ENDMAIN(["⏹ Exit / Complete"]):::terminal
    D1 -- "✅ ผ่าน" --> ENDMAIN
    D1 -- "❌ ไม่ผ่าน" --> ERR1
    ERR1 -->|"Retry"| SCR1
    ENDCANCEL(["⏹ End (Cancel Path)"]):::terminal
    D1 -- "Cancel" --> ENDCANCEL
```

---

### Step 1 — เปิด detail

**Goal:** ดูรายละเอียดตำแหน่ง

**User sees:** รายละเอียด

**User can do:** แก้ไข/ลบ

**User Action:**
- ประเภท: `กดปุ่ม`
- ปุ่ม / Controls ในหน้านี้:
  - `[Edit Position]` → เข้าโหมดแก้ไข
  - `[Delete Position]` → เปิด modal ลบ
  - `[Back to List]` → กลับหน้ารายการ

**Frontend behavior:** `GET /api/hr/positions/:id`

**System / AI behavior:** —

**Success:** 200

**Error:** 404

**Notes:** —

---

## Sub-flow P3 — สร้างตำแหน่ง (`POST /api/hr/positions`)

### Scenario Flow

### สัญลักษณ์ Node (Color Legend)

| สี | Node shape | หมายถึง |
|----|-----------|---------|
| 🟣 ม่วง | สี่เหลี่ยม `["…"]` | **Screen / UI State** |
| 🔵 น้ำเงิน | วงกลม `(["…"])` | **User Action** |
| 🟢 เขียว | สี่เหลี่ยม `["…"]` | **System / API** |
| 🟡 เหลือง | เพชร `{{"…"}}` | **Decision** |
| 🔴 แดง | สี่เหลี่ยม `["…"]` | **Error / Edge case** |
| ⚫ เทา | วงรี `(["…"])` | **Start / End** |

```mermaid
flowchart TD
    classDef screen   fill:#ede9fe,stroke:#7c3aed,color:#3b0764
    classDef user     fill:#dbeafe,stroke:#2563eb,color:#1e3a5f
    classDef system   fill:#d1fae5,stroke:#059669,color:#064e3b
    classDef decision fill:#fef3c7,stroke:#d97706,color:#78350f
    classDef error    fill:#fee2e2,stroke:#dc2626,color:#7f1d1d
    classDef terminal fill:#f1f5f9,stroke:#475569,color:#1e293b

    START(["▶ Entry\nเปิด sub-flow นี้"]):::terminal
    SCR1["🖥 ① submit สร้าง\n─────────────────\nUser เห็น: หน้าจอของขั้นตอนนี้"]:::screen
    U1(["👤 ① User Action\nกรอกข้อมูล / กดปุ่ม"]):::user
    SYS1["⚙ ① System / API\nตรวจสอบและประมวลผล"]:::system
    D1{{"① เงื่อนไขสำเร็จ?"}}:::decision
    ERR1["⚠ Error ①\nข้อมูลไม่ถูกต้อง / สิทธิ์ไม่พอ / สถานะไม่ถูกต้อง"]:::error

    START -->|"เปิดหน้า"| SCR1
    SCR1 --> U1
    U1 -->|"Submit"| SYS1
    SYS1 --> D1
    ENDMAIN(["⏹ Exit / Complete"]):::terminal
    D1 -- "✅ ผ่าน" --> ENDMAIN
    D1 -- "❌ ไม่ผ่าน" --> ERR1
    ERR1 -->|"Retry"| SCR1
    ENDCANCEL(["⏹ End (Cancel Path)"]):::terminal
    D1 -- "Cancel" --> ENDCANCEL
```

---

### Step 1 — submit สร้าง

**Goal:** เพิ่มตำแหน่งใหม่

**User sees:** ฟอร์ม

**User can do:** บันทึก

**User Action:**
- ประเภท: `กรอกข้อมูล / เลือกตัวเลือก`
- ช่องที่ต้องกรอก:
  - `code` *(required)* : รหัสตำแหน่ง
  - `name` *(required)* : ชื่อตำแหน่ง
  - `level` *(optional)* : ระดับตำแหน่ง
- ปุ่ม / Controls ในหน้านี้:
  - `[Save Position]` → เรียก `POST /api/hr/positions`
  - `[Cancel]` → ยกเลิก

**Frontend behavior:** `POST /api/hr/positions`

**System / AI behavior:** validate unique / level fields ตาม schema

**Success:** 201

**Error:** 409/422

**Notes:** —

---

## Sub-flow P4 — แก้ไขตำแหน่ง (`PATCH /api/hr/positions/:id`)

### Scenario Flow

### สัญลักษณ์ Node (Color Legend)

| สี | Node shape | หมายถึง |
|----|-----------|---------|
| 🟣 ม่วง | สี่เหลี่ยม `["…"]` | **Screen / UI State** |
| 🔵 น้ำเงิน | วงกลม `(["…"])` | **User Action** |
| 🟢 เขียว | สี่เหลี่ยม `["…"]` | **System / API** |
| 🟡 เหลือง | เพชร `{{"…"}}` | **Decision** |
| 🔴 แดง | สี่เหลี่ยม `["…"]` | **Error / Edge case** |
| ⚫ เทา | วงรี `(["…"])` | **Start / End** |

```mermaid
flowchart TD
    classDef screen   fill:#ede9fe,stroke:#7c3aed,color:#3b0764
    classDef user     fill:#dbeafe,stroke:#2563eb,color:#1e3a5f
    classDef system   fill:#d1fae5,stroke:#059669,color:#064e3b
    classDef decision fill:#fef3c7,stroke:#d97706,color:#78350f
    classDef error    fill:#fee2e2,stroke:#dc2626,color:#7f1d1d
    classDef terminal fill:#f1f5f9,stroke:#475569,color:#1e293b

    START(["▶ Entry\nเปิด sub-flow นี้"]):::terminal
    SCR1["🖥 ① patch\n─────────────────\nUser เห็น: หน้าจอของขั้นตอนนี้"]:::screen
    U1(["👤 ① User Action\nกรอกข้อมูล / กดปุ่ม"]):::user
    SYS1["⚙ ① System / API\nตรวจสอบและประมวลผล"]:::system
    D1{{"① เงื่อนไขสำเร็จ?"}}:::decision
    ERR1["⚠ Error ①\nข้อมูลไม่ถูกต้อง / สิทธิ์ไม่พอ / สถานะไม่ถูกต้อง"]:::error

    START -->|"เปิดหน้า"| SCR1
    SCR1 --> U1
    U1 -->|"Submit"| SYS1
    SYS1 --> D1
    ENDMAIN(["⏹ Exit / Complete"]):::terminal
    D1 -- "✅ ผ่าน" --> ENDMAIN
    D1 -- "❌ ไม่ผ่าน" --> ERR1
    ERR1 -->|"Retry"| SCR1
    ENDCANCEL(["⏹ End (Cancel Path)"]):::terminal
    D1 -- "Cancel" --> ENDCANCEL
```

---

### Step 1 — patch

**Goal:** อัปเดตตำแหน่ง

**User sees:** ฟอร์มแก้ไข

**User can do:** บันทึก

**User Action:**
- ประเภท: `กรอกข้อมูล / เลือกตัวเลือก`
- ช่องที่ต้องกรอก:
  - `name` *(optional)* : ชื่อตำแหน่ง
  - `level` *(optional)* : ระดับตำแหน่ง
- ปุ่ม / Controls ในหน้านี้:
  - `[Save Changes]` → เรียก `PATCH /api/hr/positions/:id`
  - `[Cancel]` → ยกเลิก

**Frontend behavior:** `PATCH /api/hr/positions/:id`

**System / AI behavior:** —

**Success:** 200

**Error:** 422

**Notes:** —

---

## Sub-flow P5 — ลบตำแหน่ง (`DELETE /api/hr/positions/:id`)

### Scenario Flow

### สัญลักษณ์ Node (Color Legend)

| สี | Node shape | หมายถึง |
|----|-----------|---------|
| 🟣 ม่วง | สี่เหลี่ยม `["…"]` | **Screen / UI State** |
| 🔵 น้ำเงิน | วงกลม `(["…"])` | **User Action** |
| 🟢 เขียว | สี่เหลี่ยม `["…"]` | **System / API** |
| 🟡 เหลือง | เพชร `{{"…"}}` | **Decision** |
| 🔴 แดง | สี่เหลี่ยม `["…"]` | **Error / Edge case** |
| ⚫ เทา | วงรี `(["…"])` | **Start / End** |

```mermaid
flowchart TD
    classDef screen   fill:#ede9fe,stroke:#7c3aed,color:#3b0764
    classDef user     fill:#dbeafe,stroke:#2563eb,color:#1e3a5f
    classDef system   fill:#d1fae5,stroke:#059669,color:#064e3b
    classDef decision fill:#fef3c7,stroke:#d97706,color:#78350f
    classDef error    fill:#fee2e2,stroke:#dc2626,color:#7f1d1d
    classDef terminal fill:#f1f5f9,stroke:#475569,color:#1e293b

    START(["▶ Entry\nเปิด sub-flow นี้"]):::terminal
    SCR1["🖥 ① ลบ\n─────────────────\nUser เห็น: หน้าจอของขั้นตอนนี้"]:::screen
    U1(["👤 ① User Action\nกรอกข้อมูล / กดปุ่ม"]):::user
    SYS1["⚙ ① System / API\nตรวจสอบและประมวลผล"]:::system
    D1{{"① เงื่อนไขสำเร็จ?"}}:::decision
    ERR1["⚠ Error ①\nข้อมูลไม่ถูกต้อง / สิทธิ์ไม่พอ / สถานะไม่ถูกต้อง"]:::error

    START -->|"เปิดหน้า"| SCR1
    SCR1 --> U1
    U1 -->|"Submit"| SYS1
    SYS1 --> D1
    ENDMAIN(["⏹ Exit / Complete"]):::terminal
    D1 -- "✅ ผ่าน" --> ENDMAIN
    D1 -- "❌ ไม่ผ่าน" --> ERR1
    ERR1 -->|"Retry"| SCR1
    ENDCANCEL(["⏹ End (Cancel Path)"]):::terminal
    D1 -- "Cancel" --> ENDCANCEL
```

---

### Step 1 — ลบ

**Goal:** ลบตำแหน่งเมื่อปลอดภัย

**User sees:** modal

**User can do:** ยืนยัน

**User Action:**
- ประเภท: `กรอกข้อมูล / กดปุ่ม`
- ช่องที่ต้องกรอก:
  - `confirmPositionName` *(required)* : พิมพ์ชื่อตำแหน่งเพื่อยืนยัน
- ปุ่ม / Controls ในหน้านี้:
  - `[Confirm Delete]` → เรียก `DELETE /api/hr/positions/:id`
  - `[Cancel]` → ยกเลิก

**Frontend behavior:** `DELETE /api/hr/positions/:id`

**System / AI behavior:** 409 ถ้ามีพนักงานอ้างอิง

**Success:** 200

**Error:** 409

**Notes:** แนะนำ copy ว่าให้ย้ายพนักงานไปตำแหน่งอื่นก่อน

---

## Coverage Checklist

| Endpoint | Covered in UX file | Notes |
|----------|-------------------|-------|
| `GET /api/hr/departments` | Sub-flow D1, Steps 1–2 | `Documents/SD_Flow/HR/organization.md` |
| `GET /api/hr/departments/:id` | Sub-flow D2, Step 1; Sub-flow D4, Step 1 | `organization.md` — detail + pre-load ก่อน PATCH |
| `POST /api/hr/departments` | Sub-flow D3, Step 1 | `organization.md` — สร้างแผนก |
| `PATCH /api/hr/departments/:id` | Sub-flow D4, Step 1 | `organization.md` — แก้ไขแผนก |
| `DELETE /api/hr/departments/:id` | Sub-flow D5, Step 1 | `organization.md` — ลบแผนก |
| `GET /api/hr/positions` | Sub-flow P1, Step 1 | `organization.md` |
| `GET /api/hr/positions/:id` | Sub-flow P2, Step 1 | `organization.md` — detail ตำแหน่ง |
| `POST /api/hr/positions` | Sub-flow P3, Step 1 | `organization.md` — สร้างตำแหน่ง |
| `PATCH /api/hr/positions/:id` | Sub-flow P4, Step 1 | `organization.md` — แก้ไขตำแหน่ง |
| `DELETE /api/hr/positions/:id` | Sub-flow P5, Step 1 | `organization.md` — ลบตำแหน่ง |
| `GET /api/auth/me` | ส่วนกลาง, Step G1 | `Documents/SD_Flow/User_Login/login.md` — permission gate (ข้ามโมดูล) |

โครง sub-flow ใช้หัวข้อมาตรฐานจาก `Documents/UX_Flow/_TEMPLATE.md`

## Coverage Lock Notes (2026-04-16)

### In-scope endpoints
- `GET /api/hr/departments`
- `GET /api/hr/departments/:id`
- `POST /api/hr/departments`
- `PATCH /api/hr/departments/:id`
- `DELETE /api/hr/departments/:id`
- `GET /api/hr/positions`
- `GET /api/hr/positions/:id`
- `POST /api/hr/positions`
- `PATCH /api/hr/positions/:id`
- `DELETE /api/hr/positions/:id`

### Source endpoints / pickers
- manager picker ให้ยึด `GET /api/hr/employees?status=active`
- position form ต้องส่ง `departmentId` ชัดเจนทุกครั้ง

### UX lock
- delete flow ของ department/position ต้องแสดง dependency blockers จาก payload conflict (`childDepartmentCount`, `activeEmployeeCount` หรือรายการที่เทียบเท่า)
- organization list/detail ต้องแยกให้เห็น hierarchy summary กับ dependency summary ชัด ไม่ให้ FE เดาเองจาก raw rows
