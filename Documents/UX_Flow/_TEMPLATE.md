# UX Flow Template (Pattern)

ใช้ไฟล์นี้เป็น **pattern มาตรฐาน** เมื่อเขียน UX flow แยกตาม function / journey — เล่าให้ครบว่าผู้ใช้เห็นอะไร ทำอะไร เรียงลำดับจนจบ flow

**แหล่งอ้างอิงที่ควรผูกกับเอกสารนี้**

- Business requirement (BR): `<ลิงก์หรือ path>`
- Sequence diagram / SD_Flow: `<ลิงก์หรือ path>`
- Related screens / mockups: `<ถ้ามี หรือระบุ TBD>`
- Global frontend behaviors: `Documents/UX_Flow/_GLOBAL_FRONTEND_BEHAVIORS.md`

---

## E2E Scenario Flow

> **วัตถุประสงค์:** ภาพรวมทั้ง function สำหรับ BU และ User ที่ยังไม่รู้จัก flow นี้ — อ่านแล้วรู้ทันทีว่า "ถ้าจะใช้ Feature นี้ ฉันต้องเจออะไรบ้าง กรอกอะไรบ้าง แล้วจะเกิดอะไรขึ้น"
>
> ความแตกต่างจาก Scenario Flow รายละเอียด:
> - **E2E Scenario Flow** (ที่นี่) = ภาพรวม **ทั้ง function** อยู่บนสุดของเอกสาร
> - **Scenario Flow** (แต่ละ Sub-flow) = รายละเอียดลึกลงไปต่อ Sub-flow นั้น ๆ

### สัญลักษณ์ Node (Color Legend)

| สี | Node | หมายถึง |
|----|------|---------|
| 🟣 ม่วง | `🖥 หน้าจอ` + ช่องกรอก + ปุ่ม | **Screen** — หน้าจอที่ user พบ พร้อม input fields + actions |
| 🔵 น้ำเงิน | `👤 action` | **User Action** — สิ่งที่ user ทำ |
| 🟢 เขียว | `✅ ผลลัพธ์` | **Success Outcome** — ผลสำเร็จ / สิ่งที่ user ได้รับ |
| 🟡 เหลือง | เพชร | **Decision** — เงื่อนไข / จุดแตก branch |
| 🔴 แดง | `❌ / ⚠` | **Error / Blocked** — เกิดปัญหา + วิธีแก้ |
| ⚫ เทา | วงรี | **Start / End** |

```mermaid
flowchart TD
    classDef screen   fill:#ede9fe,stroke:#7c3aed,color:#3b0764
    classDef user     fill:#dbeafe,stroke:#2563eb,color:#1e3a5f
    classDef success  fill:#d1fae5,stroke:#059669,color:#064e3b
    classDef decision fill:#fef3c7,stroke:#d97706,color:#78350f
    classDef error    fill:#fee2e2,stroke:#dc2626,color:#7f1d1d
    classDef terminal fill:#f1f5f9,stroke:#475569,color:#1e293b

    %% ── Start ───────────────────────────────────────────────────────────
    START(["▶ Entry\n<จุดเริ่มต้น เช่น กดเมนู / เปิด URL>"]):::terminal

    %% ── Screen 1 ─────────────────────────────────────────────────────────
    %% node แต่ละอันแสดง: ชื่อหน้า | ช่องที่ต้องกรอก | ปุ่ม
    SCR1["🖥 <ชื่อหน้า 1>
    ─────────────────────
    📝 <ช่อง 1 — field_name> (required)
    📝 <ช่อง 2 — field_name> (optional)
    ─────────────────────
    🔘 [<ปุ่มหลัก>]  🔘 [<ปุ่มรอง>]"]:::screen

    U1(["👤 กรอกข้อมูล\nแล้วกด [<ปุ่มหลัก>]"]):::user

    START --> |"<trigger>"| SCR1
    SCR1  --> U1

    %% ── Decision 1 ───────────────────────────────────────────────────────
    D1{{"<เงื่อนไข?\nเช่น ข้อมูลถูกต้อง?>"}}:::decision
    ERR1["⚠ <ข้อความ error>\n<แนะนำ action เช่น ตรวจสอบ / ลองใหม่>"]:::error

    U1  --> D1
    D1  -- "✅ ผ่าน"    --> SCR2
    D1  -- "❌ ไม่ผ่าน" --> ERR1
    ERR1 --> |"แก้ไข / Retry"| SCR1

    %% ── Screen 2 ─────────────────────────────────────────────────────────
    SCR2["🖥 <ชื่อหน้า 2>
    ─────────────────────
    📋 <ข้อมูลที่แสดง เช่น รายการ / ผลลัพธ์>
    ─────────────────────
    🔘 [<ปุ่ม A>]  🔘 [<ปุ่ม B>]  🔘 [<ปุ่ม C>]"]:::screen

    U2(["👤 เลือก action\n<กรณี A / B / C>"]):::user
    D2{{"<User เลือก\nอะไร?>"}}:::decision

    SCR2 --> U2
    U2   --> D2

    %% ── Branch ───────────────────────────────────────────────────────────
    OUT_A["✅ <ผลลัพธ์กรณี A>\n<สิ่งที่ user ได้รับ>"]:::success
    OUT_B["✅ <ผลลัพธ์กรณี B>\n<สิ่งที่ user ได้รับ>"]:::success
    ERR2["⚠ <Error กรณี C>\n<แนะนำ action>"]:::error

    D2 -- "<กรณี A>" --> OUT_A
    D2 -- "<กรณี B>" --> OUT_B
    D2 -- "<กรณี C / Error>" --> ERR2

    %% ── End ──────────────────────────────────────────────────────────────
    END(["⏹ Exit / <Next Flow หรือ Module>"]):::terminal

    OUT_A --> END
    OUT_B --> END
    ERR2  --> |"Retry / ติดต่อ admin"| SCR2
```

### Scenario Summary

| Scenario | ขั้นตอน | ผลลัพธ์ |
|----------|---------|---------|
| ✅ Happy Path | กรอก → ผ่าน → ดำเนินการ → สำเร็จ | `<ผลลัพธ์หลัก>` |
| ⚠ Error Path 1 | กรอก → ไม่ผ่าน validation | แสดง error + ให้แก้ไข |
| ⚠ Error Path 2 | `<กรณีพิเศษ>` | `<ผลลัพธ์>` |

---

## ชื่อ Flow & ขอบเขต

**Flow name:** `<ชื่อสั้น ๆ เช่น Payroll — Run monthly payroll>`

**Actor(s):** `<บทบาทผู้ใช้ เช่น HR Admin>`

**Entry:** `<ผู้ใช้เข้ามาจากไหน / trigger อะไร>`

**Exit:** `<จบที่สถานะไหน หรือ drilldown / integration path ไป flow อื่น>`

**Out of scope:** `<สิ่งที่ไม่ครอบในเอกสารนี้>`

---

## มาตรฐานร่วมที่ต้องถือ

- มี `## ชื่อ Flow & ขอบเขต` ระดับเอกสารเพียงครั้งเดียว
- แต่ละ sub-flow ใช้ `## Sub-flow ...`
- แต่ละ step ใช้ `### Step ...`
- ห้ามคง placeholder เช่น `primary_input`, `note_or_filter`, `[Primary Action]` ในเอกสารที่พร้อมส่งต่อทีม
- ถ้าพฤติกรรมเรื่อง loading / 401 / 403 / 409 / unsaved changes / audit ใช้มาตรฐานเดียวกับระบบ ให้ลิงก์อ้างอิง `Documents/UX_Flow/_GLOBAL_FRONTEND_BEHAVIORS.md` ได้แทนการเขียนซ้ำเต็มทุกครั้ง

---

## Scenario Flow

ภาพรวม UX Scenario Map สำหรับ Sub-flow นี้ — ลำดับ step, branch, และ error path

### สัญลักษณ์ Node (Color Legend)

| สี | Node shape | หมายถึง |
|----|-----------|---------|
| 🟣 ม่วง | สี่เหลี่ยม `["…"]` | **Screen / UI State** — หน้าจอหรือ state ที่ user เห็น |
| 🔵 น้ำเงิน | วงกลม `(["…"])` | **User Action** — สิ่งที่ user ทำ (กด / กรอก / เลือก) |
| 🟢 เขียว | สี่เหลี่ยม `["…"]` | **System / API** — การตอบสนองของระบบหรือ API call |
| 🟡 เหลือง | เพชร `{{"…"}}` | **Decision** — จุดแตก branch / เงื่อนไข |
| 🔴 แดง | สี่เหลี่ยม `["…"]` | **Error / Edge case** — กรณีผิดพลาดหรือ exception |
| ⚫ เทา | วงรี `(["…"])` | **Start / End** — จุดเริ่มต้นและจุดจบ |

```mermaid
flowchart TD
    classDef screen   fill:#ede9fe,stroke:#7c3aed,color:#3b0764
    classDef user     fill:#dbeafe,stroke:#2563eb,color:#1e3a5f
    classDef system   fill:#d1fae5,stroke:#059669,color:#064e3b
    classDef decision fill:#fef3c7,stroke:#d97706,color:#78350f
    classDef error    fill:#fee2e2,stroke:#dc2626,color:#7f1d1d
    classDef terminal fill:#f1f5f9,stroke:#475569,color:#1e293b

    %% ── Start ───────────────────────────────────────────────────
    START(["▶ Entry\n<trigger / เข้าหน้า>"]):::terminal

    %% ── Step 1 ──────────────────────────────────────────────────
    SCR1["🖥 ① <ชื่อหน้าจอ Step 1>\n─────────────────\nUser เห็น: <สิ่งที่แสดง>"]:::screen
    U1(["👤 <User Action>\nกรอก… / กด… / เลือก…"]):::user

    START --> |"<trigger>"| SCR1
    SCR1   --> U1

    %% ── Step 2 ──────────────────────────────────────────────────
    SYS2["⚙ ② <API/Process>\nPOST /endpoint — validate"]:::system
    D2{{"② เงื่อนไข?\n<validate / check>"}}:::decision
    ERR2["⚠ Error Step 2\n<ข้อความ error + แนะนำ action>"]:::error

    U1   --> |"① <action ที่ trigger>"| SYS2
    SYS2 --> D2
    D2   -- "✅ ผ่าน"      --> SCR3
    D2   -- "❌ ไม่ผ่าน"   --> ERR2
    ERR2 --> |"แก้ไข / Retry" | SCR1

    %% ── Step 3 (Happy Path) ─────────────────────────────────────
    SCR3["🖥 ③ <ชื่อหน้าจอ Step 3>\n─────────────────\nUser เห็น: <ผลลัพธ์>"]:::screen
    U3(["👤 <User Action>\nเลือก / ยืนยัน / ดำเนินการต่อ"]):::user
    D3{{"③ User เลือก?"}}:::decision

    SCR3 --> U3
    U3   --> D3

    %% ── Step 3 — Branch ─────────────────────────────────────────
    SCR4A["🖥 ④-A <ชื่อหน้าจอ กรณี A>\n─────────────────\nUser เห็น: …"]:::screen
    SCR4B["🖥 ④-B <ชื่อหน้าจอ กรณี B>\n─────────────────\nUser เห็น: …"]:::screen

    D3 -- "<กรณี A>"  --> SCR4A
    D3 -- "<กรณี B>"  --> SCR4B

    %% ── End ─────────────────────────────────────────────────────
    END(["⏹ Exit / <Next Flow>"]):::terminal

    SCR4A --> END
    SCR4B --> END
```

---

## Step pattern (คัดลอกไปใช้ทุก Step)

แต่ละ Step ใช้หัวข้อเดียวกันเสมอ เพื่อให้ AI / ทีมอ่านและ review ได้สม่ำเสมอ

### Step `<n>` — `<ชื่อหน้าจอ / สถานะ / ช่วงเวลาใน journey>`

**Goal:** ผู้ใช้ต้องการทำอะไรใน step นี้ (หนึ่งประโยค)

**User sees:** …

**User can do:** …

**User Action:**
- ประเภท: `<กรอกแบบฟอร์ม / กดยืนยัน / เลือกรายการ / อัปโหลด / ดูข้อมูล / …>`
- ช่องที่ต้องกรอกหรือค่าที่ใช้ใน step นี้:
  - `field_name` *(required/optional)* : คำอธิบาย / ค่าที่รับได้
  - `field_name` *(required/optional)* : คำอธิบาย / ค่าที่รับได้
- ปุ่ม / Controls ในหน้านี้:
  - `[ปุ่ม A]` → พฤติกรรม / ไป step ถัดไป
  - `[ปุ่ม B]` → ยกเลิก / กลับ

**Frontend behavior:** …

- …

**System / AI behavior:** …

- …

**Success:** …

**Error:** …

**Notes:** …

- ถ้าใช้กติกากลางเรื่อง loading / permission / conflict / unsaved changes / audit ให้ใส่ reference ไป `Documents/UX_Flow/_GLOBAL_FRONTEND_BEHAVIORS.md`

---

## ตัวอย่าง (Chat-style flow)

---

## E2E Scenario Flow

> ภาพรวม Chat Function ทั้งหมด — BU / User อ่านแล้วรู้ว่าต้องทำอะไรบ้าง เจอ scenario ไหนได้บ้าง

```mermaid
flowchart TD
    classDef screen   fill:#ede9fe,stroke:#7c3aed,color:#3b0764
    classDef user     fill:#dbeafe,stroke:#2563eb,color:#1e3a5f
    classDef success  fill:#d1fae5,stroke:#059669,color:#064e3b
    classDef decision fill:#fef3c7,stroke:#d97706,color:#78350f
    classDef error    fill:#fee2e2,stroke:#dc2626,color:#7f1d1d
    classDef terminal fill:#f1f5f9,stroke:#475569,color:#1e293b

    START(["▶ เปิดหน้า Chat"]):::terminal

    %% ── หน้า 1 : Chat Input ──────────────────────────────────────────────
    SCR1["🖥 หน้า Chat
    ─────────────────────
    📝 message (required) — พิมพ์คำถาม
    📎 attachments (optional) — แนบไฟล์
    ─────────────────────
    🔘 [Send]  📎 [Attach File]"]:::screen

    U1(["👤 พิมพ์ข้อความ\nแล้วกด [Send]"]):::user

    START --> SCR1
    SCR1  --> U1

    %% ── Decision : ระบบรับได้? ───────────────────────────────────────────
    D1{{"ระบบรับ\nrequest ได้?"}}:::decision
    ERR1["⚠ Network / Validation Error
    ข้อความ: 'ส่งไม่สำเร็จ'
    แนะนำ: ตรวจสอบการเชื่อมต่อ / Retry"]:::error

    U1  --> |"กด Send (message required)"| D1
    D1  -- "❌ timeout / error" --> ERR1
    ERR1 --> |"Retry"| U1

    %% ── หน้า 2 : AI กำลังตอบ ────────────────────────────────────────────
    SCR2["🖥 หน้า Responding
    ─────────────────────
    ⏳ streaming answer... (spinner)
    ─────────────────────
    🔘 [Stop Generation]"]:::screen

    U2(["👤 รอดูคำตอบ\n(optional: กด Stop)"]):::user
    D2{{"User\nกด Stop?"}}:::decision

    D1  -- "✅ ส่งสำเร็จ" --> SCR2
    SCR2 --> U2
    U2   --> D2

    %% ── หน้า 3 : ได้คำตอบแล้ว ───────────────────────────────────────────
    SCR3["🖥 หน้า Completion
    ─────────────────────
    ✅ คำตอบสุดท้ายจาก AI
    ─────────────────────
    🔘 [Copy]  🔘 [Regenerate]  🔘 [ถามต่อ]"]:::screen

    U3(["👤 เลือก action"]):::user
    D3{{"User เลือก?"}}:::decision

    D2 -- "ไม่กด (รอจนจบ)"  --> SCR3
    D2 -- "กด Stop"          --> SCR3
    SCR3 --> U3
    U3   --> D3

    %% ── Branch : ผลลัพธ์ ─────────────────────────────────────────────────
    OUT_COPY["✅ คัดลอกสำเร็จ
    ข้อความถูก copy ไป clipboard"]:::success

    OUT_REGEN["✅ กำลัง generate ใหม่
    กลับไปหน้า Responding"]:::success

    D3 -- "Copy"       --> OUT_COPY
    D3 -- "Regenerate" --> OUT_REGEN
    D3 -- "ถามต่อ"     --> SCR1
    D3 -- "จบ"         --> END

    OUT_COPY  --> END
    OUT_REGEN --> SCR2

    END(["⏹ End session"]):::terminal
```

### Scenario Summary

| Scenario | ขั้นตอน | ผลลัพธ์ |
|----------|---------|---------|
| ✅ ถามและได้คำตอบ | พิมพ์ → Send → รอ AI → อ่านคำตอบ | ได้คำตอบจาก AI |
| ✅ ถามต่อเนื่อง | ... → Completion → กด [ถามต่อ] → กลับหน้า input | ถามใหม่ใน session เดิม |
| ✅ Copy คำตอบ | ... → Completion → กด [Copy] | ข้อความ copy ไป clipboard |
| ✅ Regenerate | ... → Completion → กด [Regenerate] | AI generate ใหม่ |
| ⚠ Send ไม่สำเร็จ | พิมพ์ → Send → Network error | แสดง error + Retry |
| ⚠ หยุดกลางคัน | ... → Responding → กด [Stop] | ได้คำตอบที่ generate ไปแล้ว |

---

### Scenario Flow (Sub-flow detail)

```mermaid
flowchart TD
    classDef screen   fill:#ede9fe,stroke:#7c3aed,color:#3b0764
    classDef user     fill:#dbeafe,stroke:#2563eb,color:#1e3a5f
    classDef system   fill:#d1fae5,stroke:#059669,color:#064e3b
    classDef decision fill:#fef3c7,stroke:#d97706,color:#78350f
    classDef error    fill:#fee2e2,stroke:#dc2626,color:#7f1d1d
    classDef terminal fill:#f1f5f9,stroke:#475569,color:#1e293b

    %% ── Start ───────────────────────────────────────────────────
    START(["▶ เปิดหน้า Chat"]):::terminal

    %% ── Step 1 : Landing ────────────────────────────────────────
    SCR1["🖥 ① Landing / Empty State\n─────────────────\nUser เห็น: input box, ปุ่ม Send\nhint text: Ask anything…"]:::screen
    U1(["👤 พิมพ์ข้อความ\n+ (optional) แนบไฟล์"]):::user

    START --> SCR1
    SCR1  --> U1

    %% ── Step 2 : Submit ─────────────────────────────────────────
    SYS2["⚙ ② POST /api/chat\nvalidate → queue request"]:::system
    D2{{"② ระบบรับ\nrequest ได้?"}}:::decision
    ERR2["⚠ Error: Network / Validation\nแสดงข้อความ + ปุ่ม Retry"]:::error

    U1   --> |"① กด Send\n(message required)"| SYS2
    SYS2 --> D2
    D2   -- "✅ ใช่"               --> SCR3
    D2   -- "❌ timeout / error"   --> ERR2
    ERR2 --> |"Retry"| SYS2

    %% ── Step 3 : Responding ─────────────────────────────────────
    SCR3["🖥 ③ AI Responding\n─────────────────\nUser เห็น: streaming answer\nspinner / skeleton"]:::screen
    U3(["👤 รอดูคำตอบ\n(optional: กด Stop)"]):::user
    D3{{"③ User\nกด Stop?"}}:::decision
    SYS3S["⚙ DELETE /api/chat/{id}/stream\nหยุด generation"]:::system

    SCR3 --> U3
    U3   --> D3
    D3   -- "ไม่กด (รอจนจบ)"  --> SCR4
    D3   -- "กด Stop"          --> SYS3S
    SYS3S --> SCR4

    %% ── Step 4 : Completion ─────────────────────────────────────
    SCR4["🖥 ④ Completion\n─────────────────\nUser เห็น: คำตอบสุดท้าย\nปุ่ม Copy / Regenerate"]:::screen
    U4(["👤 เลือก action"]):::user
    D4{{"④ User เลือก?"}}:::decision

    SCR4 --> U4
    U4   --> D4

    %% ── Branch from Step 4 ──────────────────────────────────────
    SYS4C["⚙ copy to clipboard"]:::system
    SYS4R["⚙ POST /api/chat/{id}/regenerate\nสร้างคำตอบใหม่"]:::system

    D4 -- "Copy"        --> SYS4C
    D4 -- "Regenerate"  --> SYS4R
    D4 -- "Follow-up"   --> SCR1
    D4 -- "จบ"          --> END

    SYS4C --> END
    SYS4R --> SCR3

    END(["⏹ End session"]):::terminal
```

---

### Step 1 — Landing / Empty state

**Goal:** เริ่มสนทนาโดยยังไม่ส่งข้อความ

**User sees:** ช่องพิมพ์คำถาม, ปุ่ม Send, hint text "Ask anything…"

**User can do:** พิมพ์ข้อความ / แนบไฟล์

**User Action:**
- ประเภท: `กรอกข้อความ / อัปโหลดไฟล์`
- ช่องที่ต้องกรอก (ตาม API required fields):
  - `ช่อง 1 — message` *(required)* : ข้อความคำถาม (string, max length ตาม config)
  - `ช่อง 2 — attachments` *(optional)* : ไฟล์แนบ (array of file)
- ปุ่ม / Controls ในหน้านี้:
  - `[Send]` → ส่งข้อความ ไป Step 2 (disabled ถ้า message ว่าง)
  - `[Attach]` → เปิด file picker

**Frontend behavior:**

- ปุ่ม Send disabled ถ้ายังไม่มี input
- แสดงรายการไฟล์ที่แนบแล้ว
- จำกัดความยาว input

**System / AI behavior:** ยังไม่ทำงานจนกด Send

**Success:** ผู้ใช้พร้อมส่ง prompt

**Error:** —

**Notes:** —

### Step 2 — User submits prompt

**Goal:** ส่งคำถามและบริบทไปยังระบบ

**User sees:** (ต่อจาก step 1)

**User can do:** กด Send

**User Action:**
- ประเภท: `กดปุ่มยืนยัน`
- ช่องที่ต้องกรอก (ตาม API required fields):
  - `ช่อง 1 — message` *(required)* : ข้อความที่พิมพ์ไว้ใน Step 1 (ส่งผ่าน body)
  - `ช่อง 2 — session_id` *(required)* : ID session ปัจจุบัน (auto จาก frontend)
  - `ช่อง 3 — attachments` *(optional)* : ไฟล์ที่แนบไว้
- ปุ่ม / Controls ในหน้านี้:
  - `[Send]` → POST /api/chat — ส่ง prompt ไปยังระบบ

**Frontend behavior:**

- append message ของ user เข้า chat
- clear input box
- แสดง loading state / typing indicator
- disable input ชั่วคราวหรือยังพิมพ์ต่อได้ตาม product decision

**System / AI behavior:**

- รับ prompt + context + attachments
- เริ่ม generate response

**Success:** ข้อความ user แสดงใน thread และระบบรับคำขอแล้ว

**Error:** แสดงข้อความ error / retry ตามนโยบาย (network, validation)

**Notes:** ระบุว่า attachments ส่งแบบ sync หรือ async

### Step 3 — AI responding

**Goal:** รอและรับคำตอบจากระบบ

**User sees:** ข้อความ AI ค่อย ๆ โผล่ / skeleton / spinner

**User can do:** (ถ้ามี) กดหยุด / ยกเลิก

**User Action:**
- ประเภท: `ดูข้อมูล / กดยกเลิก (optional)`
- ช่องที่ต้องกรอก (ตาม API required fields): —
- ปุ่ม / Controls ในหน้านี้:
  - `[Stop]` *(optional)* → ยกเลิก generation — DELETE /api/chat/{session_id}/stream

**Frontend behavior:**

- stream response ทีละ chunk
- show stop button
- handle timeout / retry state

**System / AI behavior:** generate answer / call tools / return partial response

**Success:** ได้เนื้อหาคำตอบครบหรือครบตามข้อจำกัด product

**Error:** timeout, tool failure, rate limit — แสดง state ที่ชัด

**Notes:** —

### Step 4 — Completion

**Goal:** ใช้คำตอบหรือทำต่อใน session เดียวกัน

**User sees:** คำตอบสุดท้าย, action buttons เช่น Copy / Regenerate / Follow-up

**User can do:** copy, ถามต่อ, regenerate ตามที่มี

**User Action:**
- ประเภท: `กดปุ่ม / กรอกข้อความต่อ`
- ช่องที่ต้องกรอก (ตาม API required fields): —
- ปุ่ม / Controls ในหน้านี้:
  - `[Copy]` → คัดลอกคำตอบลง clipboard
  - `[Regenerate]` → POST /api/chat/{id}/regenerate — สร้างคำตอบใหม่
  - `[Follow-up input]` → กรอกคำถามต่อ กลับไป Step 1

**Frontend behavior:**

- hide loading
- enable input
- persist conversation state

**System / AI behavior:** save chat / log event / wait for next action

**Success:** ผู้ใช้ได้ outcome ที่ต้องการหรือกลับไป step ถามต่อ

**Error:** persist ล้มเหลว — แจ้งและให้ retry ถ้าจำเป็น

**Notes:** —

---

## แนวทางผูกกับ BR และ Sequence diagram

1. **จาก BR:** แต่ละ acceptance criterion / user story ที่เป็น "ผู้ใช้ทำสิ่งนี้ได้" → แมปเป็น **Goal** ของ step หรือหลาย step
2. **จาก sequence:** แต่ละข้อความระหว่าง actor กับระบบ → แบ่งเป็น **Frontend behavior** (สิ่งที่เกิดบน UI) กับ **System / AI behavior** (API, job, model, notification)
3. **ลำดับ step:** เรียงตามเวลาจริงของผู้ใช้ ไม่ใช่แค่ลำดับ technical call — ถ้า parallel ให้เขียนใน **Notes**
4. **Success / Error:** ต้องอ่านแล้วรู้ว่า "จบดี" และ "พังแล้วทำยังไง" ชัดเจน
5. **User Action:** เติม field ตาม API spec ของ step นั้น ๆ — ระบุ required/optional ให้ชัด เพื่อให้ทีม design รู้ว่า UI หน้านี้ต้องมี input ช่องไหนและปุ่มอะไรบ้าง
6. **E2E Scenario Flow:** วางบนสุดของเอกสาร — screen node ต้องระบุ fields + ปุ่มที่มีในหน้านั้น ใช้ Scenario Summary table สรุป happy / error paths ให้ BU อ่านได้ทันที
7. **Scenario Flow (Sub-flow):** วาดก่อนลงรายละเอียด step — ใช้ API node + numbered step + error retry loop

เมื่อสร้างเอกสาร UX flow จริง ให้คัดลอกในลำดับนี้:
**E2E Scenario Flow** → **ชื่อ Flow & ขอบเขต** → **Scenario Flow** → **Step detail**
