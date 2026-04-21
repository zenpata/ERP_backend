# BalanceSheetReport

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
| **Preview** | [`BalanceSheetReport.preview.html`](./BalanceSheetReport.preview.html) · [`../_Shared/preview-base.css`](../_Shared/preview-base.css) · [`MD_TO_PREVIEW_HTML_MANUAL.md`](../MD_TO_PREVIEW_HTML_MANUAL.md) |

---

## เป้าหมายหน้าจอ

ตรวจสอบสินทรัพย์ = หนี้สิน + ส่วนของผู้ถือหุ้น ณ วันที่อ้างอิง (`asOfDate`) — point-in-time snapshot ไม่ใช่ ranged report

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

## Sub-flow C — Balance Sheet (งบดุล)

**กลุ่ม endpoint:** `GET /api/finance/reports/balance-sheet`, `GET /api/finance/reports/balance-sheet/export`

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
    SCR1[“🖥 ① ดูงบดุล ณ วันที่กำหนด\n─────────────────\nUser เห็น: filter asOfDate + ตาราง assets/liabilities/equity”]:::screen
    U1([“👤 ① User Action\nกรอก asOfDate / กด Preview”]):::user
    SYS1[“⚙ ① System / API\nGET /api/finance/reports/balance-sheet?asOfDate=”]:::system
    D1{{“① โหลดสำเร็จ?”}}:::decision
    ERR1[“⚠ Error ①\nไม่มี asOfDate / 400 / 403 / 5xx”]:::error

    START -->|”เปิดหน้า”| SCR1
    SCR1 --> U1
    U1 -->|”Preview Report”| SYS1
    SYS1 --> D1
    SCR2[“🖥 ② Handoff: Export Balance Sheet\n─────────────────\nUser เห็น: report + ปุ่ม Export (active)”]:::screen
    D1 -- “✅ ผ่าน” --> SCR2
    D1 -- “❌ ไม่ผ่าน” --> ERR1
    ERR1 -->|”Retry”| SCR1
    U2([“👤 ② User Action\nเลือก format / Download หรือ Cancel”]):::user
    D2{{“② format?”}}:::decision
    ENDOK([“⏹ End (ไฟล์ได้รับ)”]):::terminal
    ENDCANCEL([“⏹ End (Cancel)”]):::terminal
    ERR2[“⚠ Error ②\nexport fail / timeout”]:::error
    SYS2[“⚙ ② GET .../balance-sheet/export?asOfDate=&format=”]:::system
    SCR2 --> U2
    U2 --> D2
    D2 -- “Download” --> SYS2
    D2 -- “Cancel” --> ENDCANCEL
    SYS2 --> ENDOK
    SYS2 -->|”Error”| ERR2
    ERR2 -->|”Retry”| SCR2
```

---

### Step C1 — ดูงบดุล ณ วันที่กำหนด

**Goal:** ตรวจสอบสินทรัพย์ = หนี้สิน + ส่วนของผู้ถือหุ้น ณ `asOfDate`

**User sees:** `/finance/reports/balance-sheet` tree/section ที่ bind จาก `series[]` และ summary/check hint จาก `totals` + `meta`

**User can do:** เลือก `asOfDate` (YYYY-MM-DD) — report นี้เป็น point-in-time snapshot ห้ามใช้ ranged wording เช่น from/to

**User Action:**
- ประเภท: `กรอกข้อมูล / เลือกตัวเลือก`
- ช่องที่ต้องกรอก:
  - `asOfDate` *(required)* : วันที่ของงบดุล (YYYY-MM-DD)
- ปุ่ม / Controls ในหน้านี้:
  - `[Preview Report]` → เรียก `GET /api/finance/reports/balance-sheet`
  - `[Export]` → ไปขั้นตอน export (active เฉพาะเมื่อ report โหลดสำเร็จ)

**Frontend behavior:**

- `GET /api/finance/reports/balance-sheet?asOfDate=`
- bind `data.series[]`, `data.totals`, `data.meta` โดยตรง; แสดง sections ตาม payload BE สำหรับ assets / liabilities / equity
- FE ไม่เช็คสมดุลเองแล้วเปลี่ยนตัวเลข — แสดง warning ได้ถ้า API ส่ง flag/disclaimer ว่าข้อมูลยังไม่ final

**System / AI behavior:** cumulative balance per account ถึงวันที่กำหนด

**Success:** โครงสร้างงบถูกต้องตามประเภทบัญชี asset/liability/equity

**Error:** 400 ไม่ส่ง asOfDate; 403

**Notes:** ต้องมี `accountType` ใน CoA ครบตาม BR §3.4; ถ้า response มี `isEstimated` / `disclaimer` / `lastUpdatedAt` ต้องแสดงใน UX ไม่ suppress

### Step C2 — Handoff: Export Balance Sheet

**Goal:** ส่งออกงบดุลเป็น PDF/XLSX

**User sees:** ปุ่ม Export + dialog เลือก `format` (active เฉพาะหลัง preview สำเร็จ)

**User can do:** เลือกชนิดไฟล์, ดาวน์โหลด, หรือยกเลิก

**User Action:**
- ประเภท: `เลือกตัวเลือก / กดปุ่ม`
- ช่องที่ต้องกรอก:
  - `format` *(required)* : pdf หรือ xlsx
- ปุ่ม / Controls ในหน้านี้:
  - `[Download Balance Sheet]` → เรียก export endpoint
  - `[Cancel]` → ปิด dialog

**Frontend behavior:**

- `GET /api/finance/reports/balance-sheet/export?asOfDate=&format=`
- reuse `asOfDate` จาก filter บนหน้าจอ — ห้ามให้ผู้ใช้แก้ค่าใน export dialog

**System / AI behavior:** render ไฟล์จาก dataset เดียวกับ on-screen report

**Success:** ไฟล์ครบ

**Error:** 403/400/5xx — คง preview report เดิมไว้, show retry ด้วย asOfDate เดิม

**Notes:** Endpoint ระบุใน `Documents/SD_Flow/Finance/document_exports.md`

---
