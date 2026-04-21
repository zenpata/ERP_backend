# GlobalDashboard

คู่มือแปลง UX → spec: [`../../UX_TO_UI_SPEC_WORKFLOW.md`](../../UX_TO_UI_SPEC_WORKFLOW.md)

**Route:** `/dashboard`

---

## Metadata

| Key | Value |
|-----|--------|
| **UX flow** | [`R2-13_Global_Dashboard.md`](../../../UX_Flow/Functions/R2-13_Global_Dashboard.md) |
| **UX sub-flow / steps** | Sub-flow A Bootstrap · B Finance · C HR · D PM · E Alerts · F RBAC |
| **Design system** | [`design-system.md`](../../design-system.md) — §3 Page layout, §3.3 KPI cards |
| **Global FE behaviors** | [`_GLOBAL_FRONTEND_BEHAVIORS.md`](../../../UX_Flow/_GLOBAL_FRONTEND_BEHAVIORS.md) |
| **Preview** | [`GlobalDashboard.preview.html`](./GlobalDashboard.preview.html) · [`../_Shared/preview-base.css`](../_Shared/preview-base.css) · [`MD_TO_PREVIEW_HTML_MANUAL.md`](../MD_TO_PREVIEW_HTML_MANUAL.md) |

---

## เป้าหมายหน้าจอ

หน้า `/dashboard` เป็น **หน้าหลักของผู้บริหาร/ผู้จัดการ** ที่รวม KPI ฝั่ง Finance, HR, PM และ Alerts ไว้ใน payload เดียว (`GET /api/dashboard/summary`) เพื่อให้ผู้ใช้เห็นสุขภาพองค์กรและ drill-down ไปหน้าปฏิบัติการที่เกี่ยวข้องได้ในคลิกเดียว

## ลำดับ flow (อ้างอิง UX Sub-flow A–F)

1. **A — Bootstrap:** เข้า `/dashboard` → skeleton → `GET /api/dashboard/summary` (401 → login, 403 → access denied, 500 → retry)
2. **B / C / D:** แต่ละโมดูล render จาก payload (`data.finance` / `data.hr` / `data.pm`)
3. **E — Alerts:** รายการจาก `data.alerts[]` — navigate ตาม `alert.url` จาก BE
4. **F — RBAC:** ซ่อน / แจ้งเตือนตาม **การมีหรือไม่มี key โมดูลใน response** และ `meta` (ไม่เรียก `auth/me` เพื่อตัดสินบนหน้านี้)

ผู้ใช้สามารถ **สแกน Alerts (คอลัมน์ขวา) ก่อน** แล้วค่อยอ่าน KPI ฝั่งซ้ายตามลำดับการทำงานจริง — layout ยังเป็น Finance → HR → PM ทางซ้ายตาม BR

## ผู้ใช้และสิทธิ์

- **Actor:** CEO / Management / ผู้ที่ได้รับสิทธิ์ดูข้อมูลข้ามโมดูล
- **RBAC gate (บนหน้านี้):** แต่ละ widget group แสดงเมื่อ **`data.finance` / `data.hr` / `data.pm` ปรากฏใน payload** — BE **omit** key ทั้งก้อนเมื่อไม่มีสิทธิ์ (ห้ามคืน `null` หรือ `{}` แทนการ omit)
- **`GET /api/auth/me`:** ใช้สำหรับ bootstrap session ทั่วแอปเท่านั้น — **ห้ามใช้ตัดสินว่า section ไหนจะแสดงบน `/dashboard`** (ล็อกตาม [R2-13_Global_Dashboard.md](../../../UX_Flow/Functions/R2-13_Global_Dashboard.md) Sub-flow F)
- **`permissionTrimmedModules[]`:** ใช้เพื่อ **ข้อความอธิบาย / แบนเนอร์เตือน** (empty-state copy) เท่านั้น — ห้ามนำไปคำนวณสิทธิ์ซ้ำที่ FE
- **`widgetVisibilityMode = omit_widget`:** เมื่อโมดูลถูก trim — **ไม่แสดง KPI grid** ของโมดูลนั้น; ทางเลือก UI: แสดงหัวข้อโมดูล + `rbac-notice` (ดู preview) หรือซ่อนทั้ง section โดยมีแค่แบนเนอร์ด้านบน (ดู implementation ปัจจุบัน)
- 401 → redirect `/login`; 403 → แสดง Access Denied page; 500 → retry

---

## โครง layout

**ประเภทหน้า:** Dashboard (ไม่ใช่ list / form / detail)

```
[App Shell: Sidebar + Header]
  [Page Header: ชื่อหน้า + freshness timestamp + [Refresh Dashboard]]
  [2-column layout]
    [Left column ~2/3]: Finance section → HR section → PM section
    [Right column ~1/3]: Alerts panel
```

**2-column grid:** `grid-template-columns: 1fr 300px` — alerts อยู่ด้านขวาตลอด (ตาม BR §3.13)

**KPI card pattern:** `kpi-icon` (icon tile) + `stat-val` (ตัวเลขใหญ่) + `stat-lbl` (ชื่อ metric) + `hint` (context / drill-down label)  
Cards ที่มี drill-down ใช้ `<a>` wrapper + hover border highlight

---

## เนื้อหาและฟิลด์

### Finance Widgets (`data.finance`)

| Field API | Label | Format | Semantic color | Drill-down target |
|-----------|-------|--------|----------------|-------------------|
| `revenueThisMonth` | รายได้เดือนนี้ | ฿xxx,xxx | primary | `/finance/reports` (แท็บสรุปหรือกำไรขาดทุน ตามดีไซน์ FE) |
| `revenueYTD` | รายได้รวม YTD | ฿x.xM | primary | `/finance/reports` |
| `expenseThisMonth` | ค่าใช้จ่ายเดือนนี้ | ฿xxx,xxx | accent (neutral) | `/finance/reports` |
| `netProfitThisMonth` | กำไรสุทธิเดือนนี้ | ฿xxx,xxx | success (green) | `/finance/reports` |
| `arOutstanding` | ลูกหนี้ค้างชำระ | ฿xxx,xxx | warning (amber) | `/finance/reports` (แท็บ AR aging ถ้า FE รองรับ deep-link; ไม่บังคับ query string) |
| `apOverdueCount` | AP ค้างจ่าย | x รายการ | destructive (red) | `/finance/ap` |
| `cashBalance` | ยอดเงินสดรวม | ฿x.xxM | success | `/finance/bank-accounts` |

> ⚠️ `cashBalance` ขึ้นอยู่กับ **Feature 3.5** (bank_accounts table) — ถ้า key หายไปจาก payload ให้ FE แสดง `—` หรือซ่อน tile; ห้าม fallback เป็น `0`

### HR Widgets (`data.hr`)

| Field API | Label | Format | Semantic color | Drill-down target |
|-----------|-------|--------|----------------|-------------------|
| `totalHeadcount` | พนักงานทั้งหมด | xx คน | primary | — (info only) |
| `pendingLeaveRequests` | ใบลา รออนุมัติ | x รายการ | warning | `/hr/leaves?status=pending` |
| `pendingOTApprovals` | OT รออนุมัติ | x รายการ | warning | `/hr/overtime` |
| `nextPayrollDate` | รอบเงินเดือนถัดไป | d MMM YY | accent | `/hr/payroll` |

### PM Widgets (`data.pm`)

| Field API | Label | Format | Semantic color | Drill-down target |
|-----------|-------|--------|----------------|-------------------|
| `activeBudgets` | งบประมาณ Active | x โครงการ | primary | `/pm/budgets` |
| `tasksInProgress` | งานกำลังดำเนินการ | xx งาน | accent | `/pm/progress` |
| `tasksOverdue` | งานค้าง (Overdue) | x งาน | destructive | `/pm/progress?status=overdue` |
| `avgBudgetUtilization` | การใช้งบ Avg. | xx% + progress bar | success | `/pm/budgets` หรือ `/pm/dashboard` (ตาม convention ทีม) |

### Alerts Panel (`data.alerts[]`)

| Field | คำอธิบาย |
|-------|---------|
| `type` | ชนิด alert — ใช้ map ไป label ภาษาไทย (invoice_overdue, ap_overdue, leave_pending, …) |
| `count` | จำนวนรายการ — ถ้า `count = 0` ซ่อน row หรือแสดง "ไม่มีเรื่องเร่งด่วน" |
| `url` | FE ใช้ค่าจาก BE โดยตรง (`router.push(url)` / `<Link to={url}>`) — ห้าม hardcode map เองที่ FE |

**ตัวอย่าง URL จาก BE (ปัจจุบัน):** `invoice_overdue` → `/finance/reports`; `ap_overdue` → `/finance/ap`; `leave_pending` → `/hr/leaves` — ถ้า BE เปลี่ยน path ให้ตาม BE เสมอ

**Fallback modal (ถ้า url ไม่ตรง route):**
- แสดง URL ที่คลิก
- ปุ่ม "ไปหน้าหลักของโมดูล" — map จาก `type` (finance → `/finance`, hr → `/hr`, pm → `/pm`)
- ปุ่ม "ปิด" กลับ dashboard

### Meta

| Field | แสดงผลที่ FE |
|-------|-------------|
| `asOf` | แสดงใน page header: "อัปเดตล่าสุด: {date} · {time}" |
| `freshnessSeconds` | แสดงข้อความ "ข้อมูลอาจล่าช้าสูงสุด X นาที" ถัดจาก asOf |
| `permissionTrimmedModules[]` | ใช้ข้อความอธิบาย / แบนเนอร์ (เช่น "โมดูลที่ถูกตัด: finance, pm") — **ไม่ใช้เป็นแหล่งเดียวในการซ่อน widget**; การซ่อนอิง **การไม่มี key** `data.finance` ฯลฯ |
| `widgetVisibilityMode` | ถ้า = `omit_widget` → ไม่แสดง KPI ของโมดูลที่ถูก trim — ห้ามแสดงการ์ดตัวเลขว่างปลอม |

---

## การกระทำ (CTA)

| ปุ่ม / Link | ตำแหน่ง | Action |
|-------------|---------|--------|
| `[↻ รีเฟรชข้อมูล]` | Page header (top-right) | Re-fetch `GET /api/dashboard/summary`; แสดง loading skeleton ระหว่างรอ |
| `[ดูรายงานการเงิน →]` | Finance section header | Navigate `/finance/reports` |
| KPI card (Finance) | แต่ละการ์ด | Navigate ตาม drill-down target ในตารางด้านบน |
| `[จัดการ HR →]` | HR section header | Navigate `/hr` |
| KPI card (HR) | ใบลา / OT / เงินเดือน | Navigate ตาม drill-down target |
| `[ดู PM Dashboard →]` | PM section header | Navigate `/pm/dashboard` |
| KPI card (PM) | แต่ละการ์ด | Navigate ตาม drill-down target |
| `[Open Alert URL]` | แต่ละ row ใน Alerts panel | `router.push(alert.url)` + fallback modal ถ้า route ไม่พบ |

---

## สถานะพิเศษ

| State | Trigger | UI behavior |
|-------|---------|-------------|
| **Loading** | FE เรียก API / กด Refresh | Skeleton shimmer ทั้ง 4 sections (Finance grid, HR grid, PM grid, Alerts list); ปุ่ม Refresh disabled |
| **Error** | API 500 หรือ network fail | Banner `alert-error` + ปุ่ม "↻ ลองโหลดใหม่" — ไม่แสดง widget ใด |
| **RBAC partial** | BE omit `data.finance` ฯลฯ และส่ง `permissionTrimmedModules` | ไม่ render KPI ของโมดูลที่ถูก omit — ทางเลือก: `rbac-notice` ใต้หัวข้อโมดูล (preview) หรือแบนเนอร์ด้านบนอย่างเดียว (FE จริง) |
| **No alerts** | `data.alerts` เป็น [] หรือทุก count = 0 | Alerts panel แสดง "✅ ไม่มีเรื่องเร่งด่วนในขณะนี้" |
| **Alert URL not found** | `router.push(url)` ล้มเหลว | Fallback modal: แสดง URL + ลิงก์ไปหน้าหลักโมดูล + ปุ่มปิด |

---

## หมายเหตุ implementation

- **Single API call:** ใช้ `GET /api/dashboard/summary` เดียว — ห้ามเรียก API ย่อยของแต่ละโมดูลเพิ่มใน happy path
- **RBAC บนหน้านี้:** ตัดสินจาก **presence ของ `data.finance` / `data.hr` / `data.pm`** เท่านั้น — **ไม่** ดึง `/api/auth/me` เพื่อตัดสินการแสดง section
- **Defensive coding:** ถ้า BE ส่ง field บางส่วนหาย ให้ FE fallback เป็น `0` / `null` โดยไม่ crash
- **Freshness display:** ใช้ `meta.asOf` + `meta.freshnessSeconds` — ไม่ใช่ client timestamp
- **Cache awareness:** กด Refresh ทำ re-fetch จาก client แต่ตัวเลขอาจยังหน่วงตาม server cache window — แสดง hint นี้ให้ user เห็น
- **Alert URL:** FE เป็น router ตาม string จาก BE; ห้าม hardcode type→url map เองยกเว้น fallback modal
- **Dashboard ≠ real-time:** เป็น snapshot — ไม่ต้องทำ WebSocket หรือ polling

---

## Preview HTML notes

| หัวข้อ | รายละเอียด |
|--------|-----------|
| **Shell** | `app` (sidebar + header) |
| **States ใน preview** | `Default` · `Loading` (skeleton) · `RBAC partial` (Finance+PM hidden) · `Error` · `No alerts` |
| **Layout** | 2-column: left=Finance+HR+PM, right=Alerts panel |
| **Flow ล่าสุด (banner + คำอธิบายใต้หัวข้อ)** | RBAC จาก presence ของ `data.*` ใน summary; `permissionTrimmedModules` สำหรับข้อความ; แนะนำให้ user สแกน Alerts ก่อนแล้วค่อยอ่าน KPI ซ้าย; ลิงก์ alert ตัวอย่างตรงกับ BE (`/finance/reports`, `/finance/ap`, `/hr/leaves`) |
| **ข้อมูลจำลอง** | ตาม BR / SD ตัวอย่าง (revenue 850K, AR 280K, AP overdue 3, headcount 42, etc.) |
| **Drill-down** | KPI cards ที่ clickable ใช้ `<a>` wrapper + hover border highlight; path การเงินชี้ `/finance/reports` เป็นหลัก |

---

## Appendix — UX excerpt (reference)

ดู [`R2-13_Global_Dashboard.md`](../../../UX_Flow/Functions/R2-13_Global_Dashboard.md) สำหรับ Sub-flow A–F ครบถ้วน

### Sub-flow Summary

| Sub-flow | เนื้อหา | Step |
|----------|---------|------|
| A — Bootstrap | โหลด summary payload เดียวทั้งหน้า | A1 |
| B — Finance | แสดง 7 KPI การเงิน + drill-down | B1 |
| C — HR | แสดง 4 KPI HR + drill-down | C1 |
| D — PM | แสดง 4 KPI PM + progress bar | D1 |
| E — Alerts | แสดง alert list + deep links + fallback modal | E1 |
| F — RBAC | ซ่อน KPI จากการ omit `data.*` ใน payload; `permissionTrimmedModules` ใช้ข้อความเท่านั้น; ไม่ใช้ `auth/me` ตัดบนหน้านี้ | F1 |

### Endpoint coverage

| Endpoint | Sub-flow | หมายเหตุ |
|----------|----------|---------|
| `GET /api/dashboard/summary` | A, B, C, D, E | Single payload — finance/hr/pm/alerts/meta |
| `GET /api/auth/me` | F | Session permissions สำหรับ widget visibility |
