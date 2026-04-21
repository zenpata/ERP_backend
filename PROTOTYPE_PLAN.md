# ERP Prototype — Development Plan
> **Scope:** HR (Employee Management) + PM (Budget / Expense / Progress)  
> **Strategy:** Backend API first → Frontend integration  
> **Stack:** Bun · Elysia · Drizzle · PostgreSQL (backend) | React 19 · TanStack Query · shadcn/ui (frontend)

---

## 📊 Current State Assessment

### Backend (`erp_backend/`) — ✅ Scaffold พร้อม
| ไฟล์/โฟลเดอร์ | สถานะ | หมายเหตุ |
|---|---|---|
| `shared/db/client.ts` | ✅ Done | Drizzle connection |
| `shared/middleware/auth.middleware.ts` | ✅ Done | JWT verify |
| `shared/middleware/rbac.middleware.ts` | ✅ Done | Role-based access |
| `shared/middleware/error.middleware.ts` | ✅ Done | Global error handler |
| `shared/utils/thai-*.ts` | ✅ Done | Thai tax, date, ID |
| `shared/types/common.types.ts` | ✅ Done | ApiResponse<T>, Pagination |
| `hr/hr.schema.ts` + `hr.types.ts` | ✅ Done | DB schema + types |
| `hr/submodules/employee/employee.routes.ts` | 🔶 Partial | Routes scaffolded |
| `hr/submodules/employee/employee.service.ts` | 🔶 Partial | Service scaffolded |
| `pm/pm.schema.ts` + `pm.types.ts` | ✅ Done | DB schema + types |
| `pm/` routes & services | ❌ Missing | ต้องสร้างทั้งหมด |
| Auth routes (`/api/auth/*`) | ❌ Missing | ต้องสร้าง |
| DB Migration | ✅ Done | `0000_huge_sage.sql` |

### Frontend (`erp_frontend/`) — ✅ Scaffold พร้อม
| ไฟล์/โฟลเดอร์ | สถานะ | หมายเหตุ |
|---|---|---|
| `shared/` components, hooks, utils | ✅ Done | AppShell, Sidebar, Header, DataTable |
| `shared/api/client.ts` + `queryKeys.ts` | ✅ Done | ky + TanStack Query keys |
| `shared/stores/auth.store.ts` | ✅ Done | Zustand auth store |
| `hr/pages/EmployeeListPage.tsx` | 🔶 Partial | Shell สร้างแล้ว ยัง mock |
| `hr/hooks/useEmployees.ts` | 🔶 Partial | Query hooks scaffolded |
| `pm/` pages + hooks | ❌ Missing | ต้องสร้างเกือบทั้งหมด |

### Wireframe Reference
ไฟล์: `erp_wireframe.jsx` — ใช้เป็น UI reference สำหรับ layout, fields, UX flow  
**สิ่งที่ต้อง implement ตาม wireframe:**
- Login page → `/login`
- HR: Employee List, Employee Form, Employee Profile, Organization
- PM: Dashboard, Budget List/Form/Detail, Expense List/Form, Progress List/Task Form
- Settings: User management, Roles & Permissions

---

## 🎯 Phase 1 — Backend API

> **เป้าหมาย:** API ครบทุก endpoint ที่ Frontend ต้องการ พร้อม test

### 📋 Implementation Order (ตาม dependency)

```
1. Auth Module          ← ทุกอย่างขึ้นอยู่กับ auth
2. HR: Department/Position  ← Employee ต้องการ FK
3. HR: Employee CRUD    ← core HR
4. PM: Budget CRUD      ← Expense ต้องการ FK
5. PM: Expense CRUD     ← Approval workflow
6. PM: Progress CRUD    ← Task tracking
```

---

### Step 1 — Auth Module

**สร้างไฟล์:**
```
src/modules/auth/
├── auth.routes.ts
├── auth.service.ts
└── auth.types.ts
```

**Endpoints ที่ต้องสร้าง:**
```
POST   /api/auth/login           Body: { email, password }
POST   /api/auth/logout          Header: Bearer token
POST   /api/auth/refresh         Body: { refreshToken }
GET    /api/auth/me              Header: Bearer token → return user + permissions
PATCH  /api/auth/me/password     Body: { currentPassword, newPassword }
```

**Business Logic:**
- `login`: ตรวจ email/password → issue JWT access token (7d) + refresh token
- `me`: return user object พร้อม roles และ permissions array (สำหรับ frontend RBAC)
- ใช้ `Bun.password.verify()` สำหรับ bcrypt comparison
- JWT payload: `{ sub: userId, email, roles: string[] }`

**Response ตัวอย่าง (`GET /api/auth/me`):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "hr@erp.com",
    "employee": { "id": "uuid", "name": "สมหญิง รักดี", "code": "EMP-002" },
    "roles": ["hr_admin"],
    "permissions": ["hr:employee:view", "hr:employee:create", "hr:employee:edit"]
  }
}
```

---

### Step 2 — HR: Department & Position

**สร้างไฟล์:**
```
src/modules/hr/submodules/department/
├── department.routes.ts
└── department.service.ts

src/modules/hr/submodules/position/
├── position.routes.ts
└── position.service.ts
```

**Endpoints:**
```
GET    /api/hr/departments               → list ทั้งหมด (ใช้ใน dropdown)
POST   /api/hr/departments               Body: { name, description?, parentId? }
PATCH  /api/hr/departments/:id           Body: partial
DELETE /api/hr/departments/:id           Soft check: ถ้ามีพนักงานอยู่ → error

GET    /api/hr/positions                 Query: ?departmentId=
POST   /api/hr/positions                 Body: { name, departmentId?, level }
PATCH  /api/hr/positions/:id
DELETE /api/hr/positions/:id
```

---

### Step 3 — HR: Employee CRUD (Complete)

**ไฟล์ที่มีอยู่แล้ว (partial):**
```
src/modules/hr/submodules/employee/employee.routes.ts  ← ต้องอ่านและ complete
src/modules/hr/submodules/employee/employee.service.ts ← ต้องอ่านและ complete
```

**Endpoints ที่ต้องครบ:**
```
GET    /api/hr/employees                 Query: ?search, ?departmentId, ?status, ?type, ?page, ?perPage
POST   /api/hr/employees                 Body: CreateEmployeePayload (ดู schema)
GET    /api/hr/employees/:id             รวม department + position + manager
PATCH  /api/hr/employees/:id             Partial update
DELETE /api/hr/employees/:id             Soft delete → status = 'terminated'
GET    /api/hr/employees/me              Self-service: ดูข้อมูลตัวเอง
```

**Business Rules:**
- `national_id` ต้องผ่าน `validateNationalId()` จาก `shared/utils/thai-id.ts`
- `employee_code` auto-generate format `EMP-{3-digit padded number}`
- `base_salary` ต้องเป็น Decimal ไม่ใช่ float
- soft delete: ห้าม hard delete → set `status = 'terminated'`, `end_date = today`
- Permission check: `hr:employee:create` / `hr:employee:edit` / `hr:employee:delete`

---

### Step 4 — PM: Budget CRUD

**สร้างไฟล์:**
```
src/modules/pm/submodules/budget/
├── budget.routes.ts
├── budget.service.ts
└── budget.validation.ts
```

**Endpoints:**
```
GET    /api/pm/budgets                   Query: ?status, ?module, ?page, ?perPage
POST   /api/pm/budgets                   Body: CreateBudgetPayload
GET    /api/pm/budgets/:id               รวม expense summary
PUT    /api/pm/budgets/:id               Full update (เฉพาะ Draft หรือ On Hold)
DELETE /api/pm/budgets/:id               เฉพาะ Draft
PATCH  /api/pm/budgets/:id/status        Body: { status, note? }
GET    /api/pm/budgets/:id/summary       → spent, remaining, % utilization แยก by category
```

**Status Workflow:**
```
Draft → Approved → Active → On Hold → Active
                ↘ Closed             ↘ Closed
```

**Business Rules:**
- แก้ไขข้อมูลได้เฉพาะ status = `Draft` หรือ `On Hold`
- เพิ่ม Expense ได้เฉพาะเมื่อ status = `Active`
- `budget_id` auto-generate format `BDG-{3-digit}`
- `/budgets/:id/summary` คืน:
  ```json
  {
    "totalBudget": 500000,
    "spent": 125000,
    "remaining": 375000,
    "utilizationPct": 25,
    "byCategory": [
      { "category": "Labor", "spent": 80000 },
      { "category": "Software/License", "spent": 45000 }
    ]
  }
  ```

---

### Step 5 — PM: Expense CRUD + Approval

**สร้างไฟล์:**
```
src/modules/pm/submodules/expense/
├── expense.routes.ts
├── expense.service.ts
└── expense.validation.ts
```

**Endpoints:**
```
GET    /api/pm/expenses                  Query: ?status, ?category, ?budgetId, ?startDate, ?endDate, ?page
POST   /api/pm/expenses                  Body: CreateExpensePayload
GET    /api/pm/expenses/:id
PUT    /api/pm/expenses/:id              เฉพาะ Draft
DELETE /api/pm/expenses/:id              เฉพาะ Draft หรือ Rejected
PATCH  /api/pm/expenses/:id/status       Body: { status, approvedBy?, note? }
POST   /api/pm/expenses/:id/receipt      Multipart: file upload
```

**Status Workflow:**
```
Draft → Pending Approval → Approved → Paid
                         ↘ Rejected → Draft (re-submit)
```

**Business Rules (สำคัญมาก):**
- สร้างได้เฉพาะเมื่อ Budget ที่ link มี status = `Active`
- ก่อน POST → validate: `amount + ยอด Approved/Paid ที่มีอยู่ ≤ totalBudget`
- ถ้าเกิน → return 422 พร้อม error code `BUDGET_EXCEEDED`
- เมื่อ status → `Paid`: trigger update remaining budget (Drizzle transaction)
- `approved_by` ต้องระบุเมื่อ Approve หรือ Reject
- `expense_id` auto-generate format `EXP-{3-digit}`

---

### Step 6 — PM: Progress / Task CRUD

**สร้างไฟล์:**
```
src/modules/pm/submodules/progress/
├── progress.routes.ts
├── progress.service.ts
└── progress.validation.ts
```

**Endpoints:**
```
GET    /api/pm/progress                  Query: ?module, ?phase, ?status, ?priority, ?assignee, ?page
POST   /api/pm/progress                  Body: CreateTaskPayload
GET    /api/pm/progress/:id
PUT    /api/pm/progress/:id
DELETE /api/pm/progress/:id              เฉพาะ Not Started หรือ Cancelled
PATCH  /api/pm/progress/:id/status       Body: { status, note? }
PATCH  /api/pm/progress/:id/progress     Body: { progressPct: 0–100 }
GET    /api/pm/progress/summary          Query: ?module → aggregate per-module avg progress
```

**Business Rules:**
- `progress_pct` อัปเดตได้อิสระ 0–100 ไม่ขึ้นกับ status
- เมื่อ status = `Done` → auto-set `actual_end_date = today` (Drizzle)
- status `On Hold` ต้องมี `note` ใน body
- `task_id` auto-generate format `TSK-{3-digit}`
- `/progress/summary` response:
  ```json
  {
    "byModule": [
      { "module": "HR", "avgProgress": 68, "taskCount": 12, "doneCount": 8 },
      { "module": "Finance", "avgProgress": 40, "taskCount": 10, "doneCount": 4 }
    ],
    "overall": { "avgProgress": 40, "taskCount": 35, "doneCount": 14 }
  }
  ```

---

### Step 7 — Settings: User & Role Management

**สร้างไฟล์:**
```
src/modules/settings/
├── settings.routes.ts
├── settings.service.ts
└── index.ts
```

**Endpoints:**
```
GET    /api/settings/users               list users (super_admin เท่านั้น)
PATCH  /api/settings/users/:id/roles     Body: { roleIds: string[] }
PATCH  /api/settings/users/:id/activate  Body: { isActive: boolean }
GET    /api/settings/roles               list roles + permissions
POST   /api/settings/roles               สร้าง custom role
PATCH  /api/settings/roles/:id           แก้ชื่อ/description (ถ้าไม่ใช่ system role)
DELETE /api/settings/roles/:id           ถ้าไม่ใช่ system role เท่านั้น
GET    /api/settings/permissions         list permissions ทั้งหมด
PUT    /api/settings/roles/:id/permissions  Body: { permissionIds: string[] }
```

---

## 🎨 Phase 2 — Frontend Integration

> **เป้าหมาย:** wire `erp_wireframe.jsx` เข้ากับ API จริง  
> **อ่าน wireframe ก่อนทุกครั้ง:** `erp_wireframe.jsx` คือ source of truth ด้านหน้าตา/UX/fields

### การ migrate wireframe → production components

Wireframe ใช้ inline Tailwind + mock data, frontend จริงต้องใช้:
- `shadcn/ui` components แทน raw HTML
- `TanStack Query` hooks แทน mock data
- `React Hook Form + Zod` แทน uncontrolled inputs
- `i18n keys` แทน hardcode Thai text
- `formatThaiDate()` / `formatCurrency()` สำหรับ display

---

### Frontend Task List (ตาม priority)

#### 1. Auth Flow (ทำก่อนทุกอย่าง)
```
src/shared/components/LoginPage.tsx     ← อ้างอิง wireframe Login section
src/shared/hooks/useAuth.ts             ← useLogin(), useLogout(), useMe()
src/shared/stores/auth.store.ts         ← เก็บ token + user + permissions
src/shared/components/ProtectedRoute.tsx ← ตรวจ role + redirect
src/app/router.tsx                      ← protected routes ทุก module
```

**TanStack Query hooks ที่ต้องสร้าง:**
```ts
useLogin()    // POST /api/auth/login
useLogout()   // POST /api/auth/logout
useMe()       // GET /api/auth/me (ใช้สำหรับ load user หลัง refresh)
```

---

#### 2. HR Module Pages

**สร้าง/ปรับปรุง:**
```
src/modules/hr/pages/EmployeeListPage.tsx     ← wireframe: hr-employees
src/modules/hr/pages/EmployeeFormPage.tsx     ← wireframe: hr-employee-form (ใหม่)
src/modules/hr/pages/EmployeeProfilePage.tsx  ← wireframe: hr-employee-profile
src/modules/hr/pages/OrganizationPage.tsx     ← wireframe: hr-org (ใหม่)

src/modules/hr/components/EmployeeTable.tsx
src/modules/hr/components/EmployeeForm.tsx    ← 3 sections ตาม wireframe
src/modules/hr/components/DeptPositionManager.tsx

src/modules/hr/hooks/useEmployees.ts          ← update ให้ครบทุก operation
src/modules/hr/hooks/useDepartments.ts        ← ใหม่
src/modules/hr/hooks/usePositions.ts          ← ใหม่
```

**Zod Schemas ที่ต้องสร้าง:**
```ts
// CreateEmployeeSchema
{
  nationalId: z.string().regex(/^\d{13}$/, 'เลขบัตรประชาชนต้องมี 13 หลัก'),
  firstnameTh: z.string().min(1, 'กรุณากรอกชื่อ'),
  lastnameTh: z.string().min(1, 'กรุณากรอกนามสกุล'),
  departmentId: z.string().uuid('กรุณาเลือกแผนก'),
  positionId: z.string().uuid('กรุณาเลือกตำแหน่ง'),
  employmentType: z.enum(['monthly', 'daily', 'contract']),
  hireDate: z.date(),
  baseSalary: z.number().positive('เงินเดือนต้องมากกว่า 0'),
  // ... optional fields
}
```

---

#### 3. PM Module Pages

**สร้างใหม่ทั้งหมด:**
```
src/modules/pm/pages/DashboardPage.tsx        ← wireframe: pm-dashboard
src/modules/pm/pages/BudgetListPage.tsx       ← wireframe: pm-budgets
src/modules/pm/pages/BudgetFormPage.tsx       ← wireframe: pm-budget-form
src/modules/pm/pages/BudgetDetailPage.tsx     ← wireframe: pm-budget-detail
src/modules/pm/pages/ExpenseListPage.tsx      ← wireframe: pm-expenses
src/modules/pm/pages/ExpenseFormPage.tsx      ← wireframe: pm-expense-form
src/modules/pm/pages/ProgressListPage.tsx     ← wireframe: pm-progress
src/modules/pm/pages/TaskFormPage.tsx         ← wireframe: pm-task-form

src/modules/pm/components/BudgetTable.tsx
src/modules/pm/components/BudgetForm.tsx
src/modules/pm/components/BudgetSummaryCard.tsx   ← utilization bar + by category
src/modules/pm/components/ExpenseTable.tsx
src/modules/pm/components/ExpenseForm.tsx
src/modules/pm/components/ProgressTable.tsx
src/modules/pm/components/TaskForm.tsx
src/modules/pm/components/ModuleProgressBar.tsx   ← reusable progress bar per module

src/modules/pm/hooks/useBudgets.ts
src/modules/pm/hooks/useExpenses.ts
src/modules/pm/hooks/useProgress.ts
```

**queryKeys ที่ต้องเพิ่ม:**
```ts
// ใน shared/api/queryKeys.ts
pm: {
  budgets: {
    list: (query?) => ['pm', 'budgets', 'list', query],
    detail: (id) => ['pm', 'budgets', id],
    summary: (id) => ['pm', 'budgets', id, 'summary'],
  },
  expenses: {
    list: (query?) => ['pm', 'expenses', 'list', query],
    detail: (id) => ['pm', 'expenses', id],
  },
  progress: {
    list: (query?) => ['pm', 'progress', 'list', query],
    summary: (query?) => ['pm', 'progress', 'summary', query],
  },
}
```

---

#### 4. Router Update

```tsx
// src/app/router.tsx — เพิ่ม routes ใหม่
{
  path: 'pm',
  element: <ProtectedRoute roles={['pm_manager', 'admin', 'super_admin']} />,
  children: [
    { index: true, element: <Navigate to="dashboard" /> },
    { path: 'dashboard', element: <DashboardPage /> },
    { path: 'budgets', element: <BudgetListPage /> },
    { path: 'budgets/new', element: <BudgetFormPage /> },
    { path: 'budgets/:id', element: <BudgetDetailPage /> },
    { path: 'budgets/:id/edit', element: <BudgetFormPage /> },
    { path: 'expenses', element: <ExpenseListPage /> },
    { path: 'expenses/new', element: <ExpenseFormPage /> },
    { path: 'expenses/:id', element: <ExpenseFormPage /> },
    { path: 'progress', element: <ProgressListPage /> },
    { path: 'progress/new', element: <TaskFormPage /> },
    { path: 'progress/:id/edit', element: <TaskFormPage /> },
  ]
},
{
  path: 'hr',
  children: [
    // ... existing routes
    { path: 'employees/new', element: <EmployeeFormPage /> },
    { path: 'employees/:id', element: <EmployeeProfilePage /> },
    { path: 'employees/:id/edit', element: <EmployeeFormPage /> },
    { path: 'organization', element: <OrganizationPage /> },
  ]
},
{
  path: 'settings',
  element: <ProtectedRoute roles={['super_admin']} />,
  children: [
    { path: 'users', element: <UsersPage /> },
    { path: 'roles', element: <RolesPage /> },
  ]
},
```

---

#### 5. Sidebar Update

```tsx
// src/shared/components/layout/Sidebar.tsx
// เพิ่ม PM routes ให้ครบตาม wireframe:
// PM: Dashboard / Budget / Expense / Progress
// Settings: จัดการ User / Roles & Permissions
```

---

## 📐 Wireframe → Code Mapping

| Wireframe Page Key | Route | Component |
|---|---|---|
| `login` | `/login` | `LoginPage.tsx` |
| `hr-employees` | `/hr/employees` | `EmployeeListPage.tsx` |
| `hr-employee-form` | `/hr/employees/new`, `/hr/employees/:id/edit` | `EmployeeFormPage.tsx` |
| `hr-employee-profile` | `/hr/employees/:id` | `EmployeeProfilePage.tsx` |
| `hr-org` | `/hr/organization` | `OrganizationPage.tsx` |
| `pm-dashboard` | `/pm/dashboard` | `DashboardPage.tsx` |
| `pm-budgets` | `/pm/budgets` | `BudgetListPage.tsx` |
| `pm-budget-form` | `/pm/budgets/new`, `/pm/budgets/:id/edit` | `BudgetFormPage.tsx` |
| `pm-budget-detail` | `/pm/budgets/:id` | `BudgetDetailPage.tsx` |
| `pm-expenses` | `/pm/expenses` | `ExpenseListPage.tsx` |
| `pm-expense-form` | `/pm/expenses/new` | `ExpenseFormPage.tsx` |
| `pm-progress` | `/pm/progress` | `ProgressListPage.tsx` |
| `pm-task-form` | `/pm/progress/new`, `/pm/progress/:id/edit` | `TaskFormPage.tsx` |
| `settings-users` | `/settings/users` | `UsersPage.tsx` |
| `settings-roles` | `/settings/roles` | `RolesPage.tsx` |

---

## ⚡ Cursor Prompt Templates

### สำหรับเริ่ม Backend Session ใหม่

```
อ่าน erp_backend/CLAUDE.md ก่อนทำงานทุกครั้ง

ตอนนี้จะทำ: [Step X — ชื่อ Step]

ไฟล์ที่เกี่ยวข้อง:
- erp_backend/src/modules/hr/hr.schema.ts (อ่านก่อน — schema อยู่ที่นี่)
- erp_backend/src/shared/types/common.types.ts (อ่านก่อน — response format)
- erp_backend/src/modules/hr/submodules/employee/employee.routes.ts (reference pattern)

งานที่ต้องทำ:
[วาง task list จาก step ที่ต้องการ]

Rules:
- ห้ามใช้ any
- ใช้ Decimal.js สำหรับตัวเลขเงินทุกกรณี
- ทุก response ต้องใช้ ApiResponse<T> format
- เขียน test ไปพร้อมกับ implementation
```

### สำหรับเริ่ม Frontend Session ใหม่

```
อ่าน erp_frontend/CLAUDE.md ก่อนทำงานทุกครั้ง
อ่าน erp_wireframe.jsx เพื่อดู UI reference ของ page ที่จะทำ

ตอนนี้จะทำ: [Page/Component ที่ต้องการ]

Wireframe key: [pm-dashboard / hr-employees / etc.]

ไฟล์ที่ต้องอ่านก่อน:
- erp_wireframe.jsx (UI reference — layout, fields, UX flow)
- erp_frontend/src/shared/types/common.types.ts
- erp_frontend/src/shared/api/queryKeys.ts
- erp_frontend/src/shared/components/DataTable.tsx (reuse ถ้าเป็น table)

งานที่ต้องทำ:
1. สร้าง [ComponentName].tsx ตาม wireframe section [xxx]
2. สร้าง use[Name].ts hook ที่ call API จริง
3. เพิ่ม Zod schema สำหรับ form validation
4. เพิ่ม route ใน router.tsx
5. เพิ่ม i18n keys ใน locales/th/[module].json

Rules:
- ห้ามใช้ any
- ทุก form ต้องมี React Hook Form + Zod
- ทุก date display ผ่าน formatThaiDate()
- ทุก currency display ผ่าน formatCurrency()
- ทุก text ใน UI ต้องใช้ i18n key
```

---

## 🔄 Integration Testing Checklist

ก่อน ship แต่ละ feature ต้องผ่านทุกข้อ:

**Backend:**
- [ ] `bun test` ผ่านทั้งหมด
- [ ] `bun biome check src/` ไม่มี error
- [ ] ทดสอบ happy path ผ่าน Swagger / curl
- [ ] ทดสอบ error cases (validation, 404, permission denied)
- [ ] Business rules ทำงานถูกต้อง (เช่น budget exceeded check)

**Frontend:**
- [ ] `bun test` ผ่านทั้งหมด
- [ ] Form validation ทำงานถูกต้อง พร้อม error message ภาษาไทย
- [ ] Loading states แสดงขณะ fetching
- [ ] Error states แสดงเมื่อ API error
- [ ] วันที่แสดงเป็น พ.ศ.
- [ ] ตัวเลขเงินแสดงพร้อม ฿ และ comma separator
- [ ] ทดสอบกับ role ต่างๆ (super_admin, hr_admin, employee)

---

## 📁 Files Reference

| ไฟล์ | ใช้สำหรับ |
|---|---|
| `erp_wireframe.jsx` | UI reference — layout, fields, UX flow ทุก page |
| `api_spec.yaml` | OpenAPI spec — PM module endpoints (import ใน Swagger) |
| `erp_backend/CLAUDE.md` | Backend coding rules และ patterns ทั้งหมด |
| `erp_frontend/CLAUDE.md` | Frontend coding rules และ patterns ทั้งหมด |
| `erp_backend/src/modules/hr/hr.schema.ts` | HR DB schema — employees, departments, positions, users, roles |
| `erp_backend/src/modules/pm/pm.schema.ts` | PM DB schema — budgets, expenses, tasks |
| `erp_backend/src/shared/db/migrations/0000_huge_sage.sql` | Migration ที่ run แล้ว — ดู current DB state |
