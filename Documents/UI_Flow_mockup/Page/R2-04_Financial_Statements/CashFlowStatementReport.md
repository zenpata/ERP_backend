# CashFlowStatementReport

คู่มือแปลง UX → spec: [`../../UX_TO_UI_SPEC_WORKFLOW.md`](../../UX_TO_UI_SPEC_WORKFLOW.md)

**Route:** `— (ดู Entry ใน UX ด้านล่าง)`

---

## Metadata

| Key | Value |
|-----|--------|
| **UX flow** | [`R2-04_Financial_Statements.md`](../../../UX_Flow/Functions/R2-04_Financial_Statements.md) |
| **UX sub-flow / steps** | สรุปใน Appendix — แตกตามหัวข้อ Sub-flow / Step ในเอกสาร UX |
| **Design system** | [`design-system.md`](../../design-system.md) — §3 Page layout, §5 forms, §6 DataTable ตามประเภทหน้า |
| **Global FE behaviors** | [`_GLOBAL_FRONTEND_BEHAVIORS.md`](../../../UX_Flow/_GLOBAL_FRONTEND_BEHAVIORS.md) |
| **Preview** | [`CashFlowStatementReport.preview.html`](./CashFlowStatementReport.preview.html) · [`../_Shared/preview-base.css`](../_Shared/preview-base.css) · [`MD_TO_PREVIEW_HTML_MANUAL.md`](../MD_TO_PREVIEW_HTML_MANUAL.md) |

---

## เป้าหมายหน้าจอ

ดูกระแสเงินสดต้นงวด + in/out แยก operating / investing / financing และยอดสุทธิปลายงวด ตามช่วงเวลาที่เลือก

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

## Sub-flow D — Cash Flow Statement (งบกระแสเงินสด)

**กลุ่ม endpoint:** `GET /api/finance/reports/cash-flow`, `GET /api/finance/reports/cash-flow/export`

### สัญลักษณ์ Node (Color Legend)

| สี | Node shape | หมายถึง |
|----|-----------|---------|
| 🟣 ม่วง | สี่เหลี่ยม `[“…”]` | **Screen / UI State** |
| 🔵 น้ำเงิน | วงกลม `([“…”])` | **User Action** |
| 🟢 เขียว | สี่เหลี่ยม `[“…”]` | **System / API** |
| 🟡 เหลือง | เพชร `{{“…”}}` | **Decision** |
| 🔴 แดง | สี่เหลี่ยม `[“…”]` | **Error / Edge case** |
| ⚫ เทา | วงรี `([“…”])` | **Start / End** |

```mermaid
flowchart TD
    classDef screen   fill:#ede9fe,stroke:#7c3aed,color:#3b0764
    classDef user     fill:#dbeafe,stroke:#2563eb,color:#1e3a5f
    classDef system   fill:#d1fae5,stroke:#059669,color:#064e3b
    classDef decision fill:#fef3c7,stroke:#d97706,color:#78350f
    classDef error    fill:#fee2e2,stroke:#dc2626,color:#7f1d1d
    classDef terminal fill:#f1f5f9,stroke:#475569,color:#1e293b

    START([“▶ Entry\nเปิด sub-flow นี้”]):::terminal
    SCR1[“🖥 ① ดูงบกระแสเงินสดตามช่วง\n─────────────────\nUser เห็น: filter periodFrom/periodTo + 3 sections”]:::screen
    U1([“👤 ① User Action\nกรอก periodFrom / periodTo / กด Preview”]):::user
    SYS1[“⚙ ① System / API\nGET /api/finance/reports/cash-flow?periodFrom=&periodTo=”]:::system
    D1{{“① โหลดสำเร็จ?”}}:::decision
    ERR1[“⚠ Error ①\nขาด periodFrom/To / 400 / 5xx”]:::error

    START -->|”เปิดหน้า”| SCR1
    SCR1 --> U1
    U1 -->|”Preview Report”| SYS1
    SYS1 --> D1
    SCR2[“🖥 ② Handoff: Export Cash Flow\n─────────────────\nUser เห็น: report + ปุ่ม Export (active)”]:::screen
    D1 -- “✅ ผ่าน” --> SCR2
    D1 -- “❌ ไม่ผ่าน” --> ERR1
    ERR1 -->|”Retry”| SCR1
    U2([“👤 ② User Action\nเลือก format / Download หรือ Cancel”]):::user
    D2{{“② format?”}}:::decision
    ENDOK([“⏹ End (ไฟล์ได้รับ)”]):::terminal
    ENDCANCEL([“⏹ End (Cancel)”]):::terminal
    ERR2[“⚠ Error ②\nexport fail / timeout”]:::error
    SYS2[“⚙ ② GET .../cash-flow/export?periodFrom=&periodTo=&format=”]:::system
    SCR2 --> U2
    U2 --> D2
    D2 -- “Download” --> SYS2
    D2 -- “Cancel” --> ENDCANCEL
    SYS2 --> ENDOK
    SYS2 -->|”Error”| ERR2
    ERR2 -->|”Retry”| SCR2
```

---

### Step D1 — ดูงบกระแสเงินสดตามช่วง

**Goal:** เห็นเงินสดต้นงวด (`openingCash`) + in/out แยก operating / investing / financing และยอด `netChange` / `closingCash`

**User sees:** `/finance/reports/cash-flow` สามส่วนตามการจัดประเภทของ BE พร้อม opening/closing summary bar

**User can do:** เลือก `periodFrom`, `periodTo`

**User Action:**
- ประเภท: `กรอกข้อมูล / เลือกตัวเลือก`
- ช่องที่ต้องกรอก:
  - `periodFrom` *(required)* : วันหรือเดือนเริ่ม
  - `periodTo` *(required)* : วันหรือเดือนสิ้นสุด
- ปุ่ม / Controls ในหน้านี้:
  - `[Preview Report]` → เรียก `GET /api/finance/reports/cash-flow`
  - `[Export]` → ไปขั้นตอน export (active เฉพาะเมื่อ report โหลดสำเร็จ)

**Frontend behavior:**

- `GET /api/finance/reports/cash-flow?periodFrom=&periodTo=`
- bind `data.series[]`, `data.totals`, `data.meta` โดยตรง — sections `operating`, `investing`, `financing` และยอด `openingCash` / `netChange` / `closingCash` ต้อง render ตาม response จาก BE
- FE ไม่รวม totals เองจากตาราง; ถ้า response มี `isEstimated` / `disclaimer` / `lastUpdatedAt` ต้องแสดงใกล้ report header — เป็น field สำคัญเพราะ cash-flow ดึงหลาย source

**System / AI behavior:** aggregate `bank_transactions` + payroll payments + AP payments ตาม BR

**Success:** ยอดปลายงวดสอดคล้องกับ movement

**Error:** 400 ขาด periodFrom/To

**Notes:** แหล่งข้อมูลหลายระบบ — FE ไม่คำนวณซ้ำ แสดงตาม response; ถ้า endpoint เปลี่ยนเป็น async export job ให้ follow polling/readback contract ใน `Documents/SD_Flow/Finance/document_exports.md`

### Step D2 — Handoff: Export Cash Flow

**Goal:** export งบกระแสเงินสดเป็น PDF/XLSX

**User sees:** ปุ่ม Export + dialog เลือก `format` (active เฉพาะหลัง preview สำเร็จ)

**User can do:** เลือกชนิดไฟล์, ดาวน์โหลด, หรือยกเลิก

**User Action:**
- ประเภท: `เลือกตัวเลือก / กดปุ่ม`
- ช่องที่ต้องกรอก:
  - `format` *(required)* : pdf หรือ xlsx
- ปุ่ม / Controls ในหน้านี้:
  - `[Download Cash Flow]` → เรียก export endpoint
  - `[Cancel]` → ปิด dialog

**Frontend behavior:**

- `GET /api/finance/reports/cash-flow/export?periodFrom=&periodTo=&format=`
- reuse `periodFrom` / `periodTo` จาก filter บนหน้าจอ — ห้ามให้ผู้ใช้แก้ค่าใน export dialog
- ถ้า endpoint ใดถูกเปลี่ยนเป็น async export job ให้ follow polling/readback contract ใน `Documents/SD_Flow/Finance/document_exports.md`

**System / AI behavior:** สร้างไฟล์

**Success:** ดาวน์โหลดสำเร็จ

**Error:** 400/5xx — คง preview report เดิมไว้, show retry ด้วย query/format เดิม

**Notes:** ชุด endpoint เดียวกับที่ใช้ใน `R2-09_Document_Print_Export.md` สำหรับ reporting exports

---
