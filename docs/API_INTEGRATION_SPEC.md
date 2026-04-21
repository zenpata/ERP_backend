# ERP — สเปกการเชื่อม Frontend ↔ Backend

เอกสารนี้สรุปผลจากการไล่เทียบ `erp_frontend` (การเรียก `VITE_API_URL` = `http://localhost:3000/api`) กับ `erp_backend` (prefix `/api` ใน `app.ts`)  
**เป้าหมาย:** ระบุ flow ที่ยังไม่มี API, สเปกที่ไม่ตรงกัน, และ requirement สำหรับ implement ต่อ

---

## 1. มาตรฐาน response (ควรยึดตาม backend ปัจจุบัน)

ทุก endpoint สำเร็จ:

```json
{
  "success": true,
  "data": <T>,
  "meta": { "page", "perPage", "total", "totalPages" }
}
```

- รายการ (list): `data` เป็น **array** โดยตรง ไม่ใช่ `{ items, pagination }` ห่ออยู่ข้างใน `data`
- Frontend ใช้ `apiFetchList` แปลงเป็น `{ items, pagination }` ภายใน hook ได้ (แบบ `useEmployees`)

ข้อผิดพลาด:

```json
{
  "success": false,
  "error": { "code": "...", "message": "...", "details": {} }
}
```

**หมายเหตุ:** `erp_frontend/src/shared/types/common.types.ts` ยังนิยาม `ApiErrorResponse` แบบเก่า (`error: string`) — ควรปรับให้ตรง backend เมื่อทำ error handling รวมศูนย์

---

## 2. สรุป matrix: Frontend เรียกอะไร / Backend มีหรือไม่

| พื้นที่ | Method + Path (ต่อท้าย `/api/`) | สถานะ Backend | หมายเหตุ |
|--------|--------------------------------|---------------|----------|
| Auth | `POST auth/login` | มี | ส่ง `accessToken`, `refreshToken`, `user` — ตรงกับ `extractTokenFromLoginPayload` |
| Auth | `POST auth/logout` | มี | |
| Auth | `POST auth/refresh` | มี | Frontend ยังไม่เห็นการใช้ refresh flow |
| Auth | `GET auth/me` | มี | ต้องมี Bearer |
| Auth | `PATCH auth/me/password` | มี | Frontend ยังไม่มีหน้าเปลี่ยนรหัส |
| HR | `GET/POST hr/departments`, `PATCH/DELETE hr/departments/:id` | มี | |
| HR | `GET hr/positions?departmentId=`, CRUD | มี | |
| HR | `GET hr/employees` (pagination + filters) | มี | ใช้ `meta` ตรงกับ `apiFetchList` |
| HR | `GET hr/employees/:id`, `POST`, `PATCH`, `DELETE` | มี | |
| HR | `GET hr/employees/me` | มี | Frontend ยังไม่เห็น hook เรียกโดยตรง |
| HR | **`GET hr/payroll`** | **ไม่มี route** | มี `PayrollService` ใน backend แต่ **ไม่ได้ mount ใน `hr/index.ts`** |
| Finance | **`GET finance/invoices`**, **`GET finance/invoices/:id`**, **`POST finance/invoices`** | **ไม่มี** | `finance/index.ts` มีแค่ `/health` |
| Finance | **`GET finance/reports/summary`** | **ไม่มี** | `useFinanceSummary` จะล้มเหลว |
| Finance | AP (`finance/ap/...`) | **ไม่มี** | หน้า `ApListPage` เป็น placeholder ไม่เรียก API |
| PM | `pm/budgets`, `pm/budgets/:id`, `summary`, `status` | มี | |
| PM | `pm/expenses`, CRUD, `PATCH .../status` | มี | Query `sortBy`/`sortDirection` จาก frontend **backend ไม่รองรับ** (เงียบ ignore) |
| PM | `pm/progress`, `summary`, CRUD, `status`, `progress` | มี | |
| Settings | `settings/users`, `users/:id/roles`, `users/:id/activate` | มี | ทั้งกลุ่มใช้ `requireRole(super_admin)` |
| Settings | `settings/roles` + CRUD + `PUT .../permissions` | มี | |
| Settings | `GET settings/permissions` | มี | Frontend **ยังไม่มี hook** (ใช้เมื่อทำ UI เลือก permission) |

---

## 3. Requirement — Finance module (ยังไม่ implement บน backend)

### 3.1 `GET /api/finance/invoices`

- **Query:** `page`, `perPage`, `search`, `status`, `customerId`, `dateFrom`, `dateTo`, (optional) `sortBy`, `sortDirection`
- **Response:** `{ success, data: Invoice[], meta }`  
- **ข้อมูลต่อแถว:** อย่างน้อยให้ตรงฟิลด์ใน `erp_frontend/.../finance.types.ts` → `Invoice` (รวม `items` สำหรับ detail อาจโหลดแยกหรือรวม list แบบย่อ)

### 3.2 `GET /api/finance/invoices/:id`

- **Response:** `{ success, data: Invoice }` (รวม `items[]` แบบเต็ม)

### 3.3 `POST /api/finance/invoices`

- **Body:** ตาม `CreateInvoiceInput` ใน frontend
- **Response:** `{ success, data: Invoice }`

### 3.4 `GET /api/finance/reports/summary`

- **Query:** `dateFrom`, `dateTo`, `period` (optional) — สอดคล้อง BR/UI หลักใช้ **`periodFrom` / `periodTo`** เป็นเดือน `YYYY-MM`
- **Response:** `{ success, data: FinanceSummary }` โดย `FinanceSummary` ตรงกับ `useReports.ts` (totalAr, totalAp, totalRevenue, totalExpenses, netProfit, period) — **ไม่มี** array รายเดือนใน body
- **รูปแบบการโหลดหลายครั้ง (FE ชั่วคราวสำหรับกราฟรายเดือน):** ถ้าหน้า reports ต้องการแนวโน้มรายเดือน ให้ FE เรียก endpoint เดิมซ้ำโดยตั้ง `periodFrom = periodTo = Mi` ทีละเดือน `Mi` ในช่วงที่ผู้ใช้เลือก (บวกหนึ่งครั้งสำหรับช่วงเต็มสำหรับการ์ด KPI) — จำกัดจำนวนเดือนและ concurrency; เมื่อ BE เพิ่ม `monthlySeries` ในคำตอบเดียวควรเลิกแพทเทิร์นนี้ — ดู `Documents/UI_Flow_mockup/Page/R1-10_Finance_Reports_Summary/Reports.md`

### 3.5 AP (อนาคต)

- เมื่อต้องการเชื่อม `ApListPage`: กำหนด `GET /api/finance/ap` (list + meta) และ type `ApRecord` ตาม frontend

---

## 4. Requirement — HR Payroll API (service มีแล้ว แต่ไม่มี HTTP)

### 4.1 เป้าหมาย UI ปัจจุบัน

- `PayrollPage` ใช้ `usePayrollList()` และคาดหวัง `data.items` (รูปแบบ `PaginatedResponse`)

### 4.2 แนะนำสเปก HTTP (เลือกอย่างใดอย่างหนึ่งให้สอดคล้องทั้งคู่)

**แนวทาง A (แนะนำ — สอดคล้อง PM/HR employees):**

- `GET /api/hr/payroll`  
- **Response:** `{ success, data: PayrollRecordRow[], meta }`  
- Frontend: เปลี่ยน `usePayroll` ให้ใช้ `apiFetchList` แล้ว map เป็น `{ items, pagination }` เหมือน `useEmployees`

**แนวทาง B:**

- `GET /api/hr/payroll`  
- **Response:** `{ success, data: { items: T[], pagination: {...} } }` **ไม่มี meta ระดับบน**  
- Frontend: ใช้ `apiFetch` โดยตรงโดย `T = PaginatedResponse<PayrollRecord>`

### 4.3 ฟิลด์ `PayrollRecord` (frontend)

ให้ backend map จาก `payslips` / run จริง ให้ตรงกับ:

- `id`, `employeeId`, `employeeCode`, `employeeName`, `period`, `baseSalary`, `otHours`, `otAmount`, `deductions`, `netSalary`, `status`, `paidAt?`, `createdAt`, `updatedAt`

### 4.4 Flow ธุรกิจที่มีใน `PayrollService` (สำหรับ requirement รอบถัดไป)

- run: `createRun` → `processRun` → `approveRun` → `markPaid`  
- พิจารณาเพิ่ม endpoint แยก เช่น `POST /hr/payroll/runs`, `POST /hr/payroll/runs/:id/process`, ฯลฯ เมื่อ UI พร้อม

---

## 5. Bug / สเปกผิดบน Frontend (แก้ควบคู่กับ backend)

| ปัญหา | รายละเอียด |
|-------|-------------|
| **Invoice list** | `useInvoices` ใช้ `apiFetch<ListInvoiceResponse>` — คาดหวัง `data` เป็น `{ items, pagination }` แต่มาตรฐาน API คือ `data: []` + `meta`. ควรเปลี่ยนเป็น `apiFetchList<Invoice>` แล้ว map เหมือน `useEmployees` |
| **Payroll list** | เหมือนกัน: ใช้ `apiFetch<PaginatedResponse<...>>` ผิดรูปแบบ; ควรใช้ `apiFetchList` หรือรอแนวทาง B ในข้อ 4.2 |
| **ปุ่มสร้าง Invoice** | `InvoiceListPage` navigate ไป `/finance/invoices/new` แต่ **`router.tsx` ไม่มี route นี้** — ต้องเพิ่มหน้า form หรือลบปุ่มชั่วคราว |

---

## 6. ข้อจำกัด / พฤติกรรมที่ควรรู้

- **Settings:** ทุก path ใต้ `/api/settings/*` ต้องเป็น role `super_admin` — user ที่ไม่ใช่จะได้ 403
- **PM expense list:** พารามิเตอร์เรียงลำดับจาก UI ส่งไปแล้ว backend ยังไม่ implement
- **Finance:** โมดูลเป็น stub; หน้า finance ทั้งหมดที่เรียก API จะ error จนกว่าจะ implement routes

---

## 7. Checklist งาน implement (สำหรับทีม)

1. [x] Backend: `finance` routes — `GET/POST /finance/invoices`, `GET /finance/invoices/:id`, `GET /finance/customers`, `GET /finance/ap`, `GET /finance/reports/summary`  
2. [x] Backend: `GET /hr/payroll` (pagination + `meta`) + mount ใน `hr/index.ts`  
3. [x] Frontend: `useInvoices`, `usePayrollList` ใช้ `apiFetchList`  
4. [x] Frontend: `/finance/invoices/new` + `InvoiceFormPage`  
5. [ ] Frontend: ปรับ `ApiErrorResponse` ให้ตรง `{ error: { code, message, details } }` (เมื่อทำ global error handler)

---

*อัปเดตล่าสุด: สอดคล้องกับ codebase ณ การตรวจใน repo (erp_frontend / erp_backend)*
