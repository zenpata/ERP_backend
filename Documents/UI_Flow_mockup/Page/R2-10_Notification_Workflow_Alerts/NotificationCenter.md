# NotificationCenter

คู่มือแปลง UX → spec: [`../../UX_TO_UI_SPEC_WORKFLOW.md`](../../UX_TO_UI_SPEC_WORKFLOW.md)

**Route:** `— (ดู Entry ใน UX ด้านล่าง)`

---

## Metadata

| Key | Value |
|-----|--------|
| **UX flow** | [`R2-10_Notification_Workflow_Alerts.md`](../../../UX_Flow/Functions/R2-10_Notification_Workflow_Alerts.md) |
| **UX sub-flow / steps** | สรุปใน Appendix — แตกตามหัวข้อ Sub-flow / Step ในเอกสาร UX |
| **Design system** | [`design-system.md`](../../design-system.md) — §3 Page layout, §5 forms, §6 DataTable ตามประเภทหน้า |
| **Global FE behaviors** | [`_GLOBAL_FRONTEND_BEHAVIORS.md`](../../../UX_Flow/_GLOBAL_FRONTEND_BEHAVIORS.md) |
| **Preview** | [`NotificationCenter.preview.html`](./NotificationCenter.preview.html) · [`../_Shared/preview-base.css`](../_Shared/preview-base.css) · [`MD_TO_PREVIEW_HTML_MANUAL.md`](../MD_TO_PREVIEW_HTML_MANUAL.md) |

---

## เป้าหมายหน้าจอ

ดูประวัติแจ้งเตือนทั้งหมดและกรองเฉพาะยังไม่อ่าน

## ผู้ใช้และสิทธิ์

อ่าน Actor(s) และ permission gate ใน Appendix / เอกสาร UX — กรณี 401/403/409 อ้าง Global FE behaviors

## โครง layout (สรุป)

ระบุตามประเภทหน้าใน Appendix: list / detail / form / แท็บ — ใช้ pattern ใน design-system.md

## เนื้อหาและฟิลด์

สกัดจาก **User sees** / **User Action** / ช่องกรอกใน Appendix เป็นตารางฟิลด์เต็มเมื่อปรับแต่งรอบถัดไป; ขณะนี้ใช้บล็อก UX ด้านล่างเป็นข้อมูลอ้างอิงครบถ้วน

## การกระทำ (CTA)

สกัดจากปุ่มใน Appendix (`[...]`) และ Frontend behavior

## สถานะพิเศษ

Loading, empty, error, validation, dependency ขณะลบ — ตาม **Error** / **Success** ใน Appendix

## หมายเหตุ implementation (ถ้ามี)

เทียบ `erp_frontend` เมื่อทราบ path ของหน้า

## Preview HTML notes

| หัวข้อ | ใส่อะไร |
|--------|--------|
| **Shell** | โดยมาก `app` (ยกเว้นหน้า login / standalone) |
| **Regions** | ดูลำดับ **User sees** ใน Appendix |
| **สถานะสำหรับสลับใน preview** | `default` · `loading` · `empty` · `error` ตาม UX |
| **ข้อมูลจำลอง** | จำนวนแถว / สถานะ badge ตามประเภทหน้า |
| **ลิงก์ CSS** | [`../_Shared/preview-base.css`](../_Shared/preview-base.css) |

---

## Appendix — UX excerpt (reference)

## Sub-flow C — หน้ารายการเต็ม (`/notifications`)

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
    SCR1["🖥 ① รายการแบบมี pagination และ filter\n─────────────────\nUser เห็น: หน้าจอของขั้นตอนนี้"]:::screen
    U1(["👤 ① User Action\nกรอกข้อมูล / กดปุ่ม"]):::user
    SYS1["⚙ ① System / API\nตรวจสอบและประมวลผล"]:::system
    D1{{"① เงื่อนไขสำเร็จ?"}}:::decision
    ERR1["⚠ Error ①\nข้อมูลไม่ถูกต้อง / สิทธิ์ไม่พอ / สถานะไม่ถูกต้อง"]:::error

    START -->|"เปิดหน้า"| SCR1
    SCR1 --> U1
    U1 -->|"Submit"| SYS1
    SYS1 --> D1
    SCR2["🖥 ② มาร์คอ่านทั้งหมด\n─────────────────\nUser เห็น: ผลลัพธ์หรือขั้นตอนถัดไป"]:::screen
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

### Step C1 — รายการแบบมี pagination และ filter

**Goal:** ดูประวัติแจ้งเตือนทั้งหมดและกรองเฉพาะยังไม่อ่าน

**User sees:** ตาราง/รายการ, ตัวกรอง `unreadOnly`, pagination

**User can do:** เปิดรายการ, มาร์คอ่านทีละรายการ, ใช้ "อ่านทั้งหมด"

**User Action:**
- ประเภท: `กรอกข้อมูล / เลือกตัวเลือก`
- ช่องที่ใช้กรอง:
  - `unreadOnly` *(optional)* : เฉพาะยังไม่อ่าน
  - `eventType` *(optional)* : ประเภท event
  - `dateFrom` / `dateTo` *(optional)* : ช่วงวันที่
- ปุ่ม / Controls ในหน้านี้:
  - `[Apply Filters]` → โหลดรายการเต็ม
  - `[Open Notification]` → ไปหน้าที่เกี่ยวข้อง
  - `[Mark All Read]` → ไปขั้นตอนอ่านทั้งหมด

**Frontend behavior:**

- `GET /api/notifications` พร้อม `unreadOnly`, `eventType`, `dateFrom`, `dateTo`, `page`, `limit` ตาม BR
- ใช้ `PATCH /api/notifications/:id/read` เหมือน sub-flow B

**System / AI behavior:** list + meta

**Success:** ผู้ใช้ค้นหาเหตุการณ์ workflow ย้อนหลังได้

**Error:** มาตรฐาน

**Notes:** แสดง `eventType`, `title`, `message`, `entityType`/`entityId` สำหรับ debug ของผู้ใช้ power

### Step C2 — มาร์คอ่านทั้งหมด

**Goal:** เคลียร์ inbox อย่างรวดเร็ว

**User sees:** ปุ่ม "อ่านทั้งหมด" + confirm (optional)

**User can do:** ยืนยัน

**User Action:**
- ประเภท: `กดปุ่ม`
- ปุ่ม / Controls ในหน้านี้:
  - `[Confirm Mark All Read]` → เรียก `POST /api/notifications/mark-all-read`
  - `[Cancel]` → ยกเลิก

**Frontend behavior:** `POST /api/notifications/mark-all-read`

**System / AI behavior:** อัปเดตทุกแถวของ user ปัจจุบัน

**Success:** 201/200 ตามสัญญา; badge กลับเป็น 0; refresh list

**Error:** 403/500

**Notes:** ปุ่มควร disabled ขณะรอและเมื่อ unread เป็น 0 อยู่แล้ว

---

## Endpoint กลุ่มตั้งค่า (Notification configs)

| Method | Path |
|--------|------|
| `GET` | `/api/settings/notification-configs` |
| `PUT` | `/api/settings/notification-configs` |

---
