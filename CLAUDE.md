# ERP Backend — CLAUDE.md
> AI Development Rules, Architecture Guide & Project Standards  
> **Runtime**: Bun · **Framework**: Elysia · **ORM**: Drizzle · **DB**: PostgreSQL

---

## 1. Project Overview

ระบบ ERP สำหรับ SME ไทย (<50 คน) ประกอบด้วย 3 module หลัก:

| Module | Scope |
|--------|-------|
| **HR** | พนักงาน, การลา, เวลาทำงาน, เงินเดือน, ประกันสังคม |
| **Finance** | AR/AP, General Ledger, Fixed Assets, Reports, ภาษีไทย |
| **PM** | Projects, Tasks, Milestones, Timesheets |

Architecture: **Modular Monolith** — แต่ละ module self-contained พร้อมแยกเป็น repo ได้ในอนาคต  
Pattern: **Separated Frontend/Backend** — ไม่มี BFF หรือ API Gateway ใน phase 1

---

## 2. Tech Stack

```
Runtime         Bun (latest stable)
Framework       Elysia (latest stable)
ORM             Drizzle ORM + Drizzle Kit
Database        PostgreSQL 16+ (UTF-8, th_TH collation)
Auth            JWT (jose) + Bun.password (bcrypt)
Validation      Elysia type system (built-in)
Testing         bun test (built-in, Jest-compatible)
Linting         Biome (formatter + linter, replaces ESLint+Prettier)
Language        TypeScript (strict mode, no exceptions)
```

---

## 3. Folder Structure

```
erp-backend/
├── src/
│   ├── modules/                        ← module แต่ละตัว self-contained
│   │   ├── hr/
│   │   │   ├── index.ts                ← export Elysia plugin (entry point)
│   │   │   ├── hr.routes.ts            ← route definitions /api/hr/*
│   │   │   ├── hr.service.ts           ← business logic (no HTTP concern)
│   │   │   ├── hr.schema.ts            ← Drizzle table definitions
│   │   │   ├── hr.types.ts             ← TypeScript types & interfaces
│   │   │   ├── hr.validation.ts        ← Elysia input validation schemas
│   │   │   └── submodules/
│   │   │       ├── employee/
│   │   │       │   ├── employee.routes.ts
│   │   │       │   ├── employee.service.ts
│   │   │       │   ├── employee.schema.ts
│   │   │       │   └── employee.types.ts
│   │   │       ├── attendance/
│   │   │       ├── leave/
│   │   │       └── payroll/
│   │   │           ├── payroll.service.ts
│   │   │           └── payroll.tax.ts   ← คำนวณภาษี ภ.ง.ด., ประกันสังคม
│   │   │
│   │   ├── finance/
│   │   │   ├── index.ts
│   │   │   ├── finance.routes.ts
│   │   │   ├── finance.service.ts
│   │   │   ├── finance.schema.ts
│   │   │   ├── finance.types.ts
│   │   │   ├── finance.validation.ts
│   │   │   └── submodules/
│   │   │       ├── ar/                  ← Accounts Receivable
│   │   │       ├── ap/                  ← Accounts Payable
│   │   │       ├── gl/                  ← General Ledger
│   │   │       ├── assets/              ← Fixed Assets
│   │   │       └── reports/             ← P&L, Balance Sheet, Cash Flow
│   │   │
│   │   └── pm/
│   │       ├── index.ts
│   │       ├── pm.routes.ts
│   │       ├── pm.service.ts
│   │       ├── pm.schema.ts
│   │       ├── pm.types.ts
│   │       ├── pm.validation.ts
│   │       └── submodules/
│   │           ├── project/
│   │           ├── task/
│   │           ├── milestone/
│   │           └── timesheet/
│   │
│   ├── shared/                          ← ทุก module ใช้ได้ ห้าม import module อื่น
│   │   ├── db/
│   │   │   ├── client.ts               ← Drizzle connection singleton
│   │   │   └── migrations/             ← Drizzle Kit generated migrations
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts       ← JWT verify + decode
│   │   │   ├── rbac.middleware.ts       ← Role-based access control
│   │   │   └── error.middleware.ts      ← Global error handler
│   │   ├── utils/
│   │   │   ├── thai-tax.ts             ← VAT 7%, WHT rate table, SSO 5%
│   │   │   ├── thai-date.ts            ← พ.ศ./ค.ศ. conversion
│   │   │   └── thai-id.ts              ← validate เลข ปชช. 13 หลัก, นิติบุคคล
│   │   └── types/
│   │       └── common.types.ts         ← ApiResponse<T>, Pagination, UserRef, etc.
│   │
│   └── app.ts                           ← Elysia root instance, mount all modules
│
├── tests/
│   ├── modules/
│   │   ├── hr/
│   │   ├── finance/
│   │   └── pm/
│   └── shared/
│
├── drizzle.config.ts
├── biome.json
├── .env.example
├── .env                                 ← ห้าม commit (gitignore)
├── CLAUDE.md                            ← ไฟล์นี้
└── package.json
```

---

## 4. Module Boundary Rules (สำคัญมาก)

### 4.1 ห้าม cross-module import โดยตรง

```ts
// ❌ ห้ามทำ — module ยุ่งกัน
import { EmployeeService } from '../hr/submodules/employee/employee.service'

// ✅ ทำแบบนี้ — ผ่าน shared types เท่านั้น
import type { EmployeeRef } from '../../shared/types/common.types'
```

### 4.2 Cross-module communication ทำผ่าน service interface

ถ้า Finance ต้องการข้อมูล HR (เช่น payroll → GL) ให้ inject service ผ่าน Elysia plugin dependency:

```ts
// finance/submodules/gl/gl.service.ts
export class GlService {
  constructor(private readonly payrollRef: PayrollRef) {}
  // PayrollRef เป็น interface ใน shared/types ไม่ใช่ HR class โดยตรง
}
```

### 4.3 Shared คือของกลางเดียวที่ import ร่วมได้

```
Module A  ──imports──▶  shared/  ◀──imports──  Module B
Module A  ✗──────────────────────────────────▶  Module B
```

---

## 5. Naming Conventions

### Files
| ประเภท | Pattern | ตัวอย่าง |
|--------|---------|---------|
| Routes | `[module].routes.ts` | `employee.routes.ts` |
| Service | `[module].service.ts` | `payroll.service.ts` |
| Schema (DB) | `[module].schema.ts` | `invoice.schema.ts` |
| Types | `[module].types.ts` | `hr.types.ts` |
| Validation | `[module].validation.ts` | `finance.validation.ts` |
| Utility | `[name].ts` | `thai-tax.ts` |
| Test | `[module].test.ts` | `payroll.test.ts` |
| Middleware | `[name].middleware.ts` | `auth.middleware.ts` |

### Variables & Functions
```ts
// camelCase สำหรับ variables และ functions
const employeeId = '...'
function calculateWithholdingTax() {}

// PascalCase สำหรับ class, interface, type
interface InvoicePayload {}
type TaxRate = number
class PayrollService {}

// SCREAMING_SNAKE_CASE สำหรับ constants
const VAT_RATE = 0.07
const SSO_RATE = 0.05
const MAX_CREDIT_LIMIT = 1_000_000
```

### Database Tables
```ts
// snake_case, plural
employees, invoices, journal_entries, fixed_assets, project_tasks

// Foreign keys: [table_singular]_id
employee_id, invoice_id, project_id
```

### API Routes
```
GET    /api/[module]/[resource]           ← list
GET    /api/[module]/[resource]/:id       ← get one
POST   /api/[module]/[resource]           ← create
PUT    /api/[module]/[resource]/:id       ← full update
PATCH  /api/[module]/[resource]/:id       ← partial update
DELETE /api/[module]/[resource]/:id       ← delete

ตัวอย่าง:
GET    /api/finance/invoices
POST   /api/finance/invoices
GET    /api/finance/invoices/:id
PATCH  /api/finance/invoices/:id/status
POST   /api/finance/invoices/:id/payments
```

---

## 6. API Response Standard

ทุก endpoint ต้อง return format นี้เสมอ:

```ts
// Success
{
  "success": true,
  "data": T,
  "meta": {                    // optional สำหรับ list
    "page": 1,
    "perPage": 20,
    "total": 150,
    "totalPages": 8
  }
}

// Error
{
  "success": false,
  "error": {
    "code": "INVOICE_NOT_FOUND",   // SCREAMING_SNAKE_CASE
    "message": "ไม่พบ invoice ที่ระบุ",
    "details": {}                  // optional validation errors
  }
}
```

```ts
// shared/types/common.types.ts
export type ApiResponse<T> = {
  success: true
  data: T
  meta?: PaginationMeta
} | {
  success: false
  error: {
    code: string
    message: string
    details?: Record<string, string[]>
  }
}
```

---

## 7. Elysia Patterns

### Route definition
```ts
// hr/submodules/employee/employee.routes.ts
import { Elysia, t } from 'elysia'
import { EmployeeService } from './employee.service'
import { authMiddleware } from '../../../shared/middleware/auth.middleware'

export const employeeRoutes = new Elysia({ prefix: '/employees' })
  .use(authMiddleware)
  .get('/', async ({ query }) => {
    const result = await EmployeeService.list(query)
    return { success: true, data: result.data, meta: result.meta }
  }, {
    query: t.Object({
      page: t.Optional(t.Numeric({ minimum: 1 })),
      perPage: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
      search: t.Optional(t.String()),
    })
  })
  .post('/', async ({ body }) => {
    const employee = await EmployeeService.create(body)
    return { success: true, data: employee }
  }, {
    body: t.Object({
      firstnameTh: t.String({ minLength: 1 }),
      lastnameTh: t.String({ minLength: 1 }),
      nationalId: t.String({ pattern: '^[0-9]{13}$' }),
      // ...
    })
  })
```

### Service pattern
```ts
// employee.service.ts — pure business logic, no Elysia/HTTP dependency
export const EmployeeService = {
  async list(query: ListEmployeeQuery): Promise<PaginatedResult<Employee>> {
    // ...
  },
  async create(payload: CreateEmployeePayload): Promise<Employee> {
    // validate business rules
    // persist to DB
    // return result
  }
}
```

### Module plugin (index.ts)
```ts
// hr/index.ts
import { Elysia } from 'elysia'
import { employeeRoutes } from './submodules/employee/employee.routes'
import { attendanceRoutes } from './submodules/attendance/attendance.routes'
import { leaveRoutes } from './submodules/leave/leave.routes'
import { payrollRoutes } from './submodules/payroll/payroll.routes'

export const hrModule = new Elysia({ prefix: '/hr' })
  .use(employeeRoutes)
  .use(attendanceRoutes)
  .use(leaveRoutes)
  .use(payrollRoutes)
```

### App root
```ts
// app.ts
import { Elysia } from 'elysia'
import { hrModule } from './modules/hr'
import { financeModule } from './modules/finance'
import { pmModule } from './modules/pm'
import { errorMiddleware } from './shared/middleware/error.middleware'

export const app = new Elysia()
  .use(errorMiddleware)
  .group('/api', app => app
    .use(hrModule)
    .use(financeModule)
    .use(pmModule)
  )
  .listen(3000)
```

---

## 8. Database Rules (Drizzle ORM)

### Schema definition
```ts
// ใช้ pgTable เสมอ, ไม่ใช้ raw SQL
import { pgTable, uuid, varchar, timestamp, numeric, boolean } from 'drizzle-orm/pg-core'

export const invoices = pgTable('invoices', {
  id: uuid('id').primaryKey().defaultRandom(),
  invoiceNumber: varchar('invoice_number', { length: 20 }).notNull().unique(),
  customerId: uuid('customer_id').notNull().references(() => customers.id),
  subtotal: numeric('subtotal', { precision: 15, scale: 2 }).notNull(),
  vatAmount: numeric('vat_amount', { precision: 15, scale: 2 }).notNull(),
  total: numeric('total', { precision: 15, scale: 2 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('draft'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})
```

### Migration workflow
```bash
# สร้าง migration จาก schema changes
bun drizzle-kit generate

# apply migration
bun drizzle-kit migrate

# ห้ามแก้ migration file ที่ generate แล้ว
# ถ้าต้องการเปลี่ยน ให้สร้าง migration ใหม่
```

### Query rules
```ts
// ✅ ใช้ Drizzle query builder เสมอ
const invoice = await db.query.invoices.findFirst({
  where: eq(invoices.id, id),
  with: { customer: true, items: true }
})

// ❌ ห้าม raw SQL ยกเว้นกรณีที่ Drizzle ทำไม่ได้จริงๆ
// ถ้าต้องใช้ raw SQL ต้อง comment อธิบายว่าทำไม
```

### Numeric fields (เงิน)
```ts
// ใช้ numeric precision 15, scale 2 เสมอสำหรับตัวเลขเงิน
// ห้ามใช้ float หรือ real (เกิด floating point error)
amount: numeric('amount', { precision: 15, scale: 2 })

// คำนวณในโค้ดใช้ string arithmetic หรือ library เช่น Decimal.js
import Decimal from 'decimal.js'
const total = new Decimal(subtotal).plus(vatAmount).toString()
```

---

## 9. Thai-specific Rules

### VAT & WHT
```ts
// shared/utils/thai-tax.ts

export const VAT_RATE = 0.07  // 7% คงที่

// WHT rates ตามประเภทรายได้ (มาตรา 40)
export const WHT_RATES = {
  SERVICE: 0.03,       // ค่าบริการทั่วไป
  RENT: 0.05,          // ค่าเช่า
  INTEREST: 0.01,      // ดอกเบี้ย
  DIVIDEND: 0.10,      // เงินปันผล
  FREELANCE: 0.03,     // ค่าจ้างอิสระ
} as const

export function calculateVat(subtotal: Decimal): Decimal {
  return subtotal.mul(VAT_RATE).toDecimalPlaces(2)
}

export function calculateWht(amount: Decimal, type: keyof typeof WHT_RATES): Decimal {
  return amount.mul(WHT_RATES[type]).toDecimalPlaces(2)
}
```

### วันที่ พ.ศ.
```ts
// shared/utils/thai-date.ts
// เก็บในฐานข้อมูลเป็น ค.ศ. เสมอ
// แปลงเป็น พ.ศ. เฉพาะตอน response ถ้า client ขอ

export function toBuddhistYear(date: Date): number {
  return date.getFullYear() + 543
}

export function fromBuddhistYear(buddhistYear: number): number {
  return buddhistYear - 543
}
```

### Thai ID validation
```ts
// shared/utils/thai-id.ts
export function validateNationalId(id: string): boolean {
  if (!/^\d{13}$/.test(id)) return false
  const digits = id.split('').map(Number)
  const sum = digits.slice(0, 12).reduce((acc, d, i) => acc + d * (13 - i), 0)
  const checkDigit = (11 - (sum % 11)) % 10
  return checkDigit === digits[12]
}
```

### Social Security (ประกันสังคม)
```ts
export const SSO_RATE = 0.05          // 5% ทั้ง employer และ employee
export const SSO_MAX_SALARY = 15_000  // คำนวณจากเงินเดือนสูงสุด 15,000 บาท
export const SSO_MAX_CONTRIBUTION = SSO_MAX_SALARY * SSO_RATE  // 750 บาท/เดือน
```

---

## 10. TypeScript Rules

```ts
// tsconfig.json — strict mode บังคับ
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "exactOptionalPropertyTypes": true
  }
}
```

- **ห้ามใช้ `any`** ทุกกรณี ใช้ `unknown` แทนแล้ว narrow type
- **ห้าม type assertion (`as`)** ยกเว้นมี comment อธิบาย
- **ทุก function ต้องมี return type** ที่ชัดเจน
- **ใช้ `type` แทน `interface`** ยกเว้นกรณีที่ต้อง extend หรือ implement
- **Prefer `const`** เสมอ ใช้ `let` เฉพาะเมื่อต้อง reassign

---

## 11. Error Handling

```ts
// ใช้ custom error classes
export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 400,
    public readonly details?: Record<string, string[]>
  ) {
    super(message)
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource.toUpperCase()}_NOT_FOUND`, `ไม่พบ ${resource}`, 404)
  }
}

export class ValidationError extends AppError {
  constructor(details: Record<string, string[]>) {
    super('VALIDATION_ERROR', 'ข้อมูลไม่ถูกต้อง', 422, details)
  }
}
```

```ts
// shared/middleware/error.middleware.ts
export const errorMiddleware = new Elysia()
  .onError(({ error, set }) => {
    if (error instanceof AppError) {
      set.status = error.statusCode
      return {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        }
      }
    }
    // unexpected errors
    set.status = 500
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'เกิดข้อผิดพลาดภายในระบบ' }
    }
  })
```

---

## 12. Testing Rules

```ts
// tests/modules/finance/invoice.test.ts
import { describe, it, expect, beforeEach } from 'bun:test'

describe('InvoiceService', () => {
  describe('calculateTotal', () => {
    it('คำนวณ VAT 7% ถูกต้อง', () => {
      const result = calculateTotal({ subtotal: '100.00' })
      expect(result.vatAmount).toBe('7.00')
      expect(result.total).toBe('107.00')
    })

    it('ป้องกัน floating point error', () => {
      const result = calculateTotal({ subtotal: '0.1' })
      expect(result.vatAmount).toBe('0.01')  // ไม่ใช่ 0.010000000000000002
    })
  })
})
```

- ทุก utility function ใน `shared/utils/` ต้องมี test coverage 100%
- ทุก tax calculation ต้องมี test case ครอบคลุม edge cases
- Service tests ใช้ mock DB ไม่ใช่ DB จริง
- Integration tests รันแยกใน `tests/integration/`

---

## 13. Git Conventions

### Branch naming
```
main          ← production-ready เสมอ
dev           ← integration branch

feature/[module]-[description]    feature/finance-invoice-api
fix/[module]-[description]        fix/hr-payroll-sso-calculation
refactor/[description]            refactor/shared-thai-tax-utils
```

### Commit message (Conventional Commits)
```
feat(finance): เพิ่ม API สร้าง invoice พร้อม VAT calculation
fix(hr): แก้ไขการคำนวณประกันสังคมเมื่อเงินเดือนเกิน 15,000
refactor(shared): ปรับปรุง thai-tax utility ให้ใช้ Decimal.js
test(finance): เพิ่ม test case WHT calculation ทุก type
docs(hr): อัปเดต API documentation payroll module
chore: อัปเดต dependencies
```

### PR Rules
- PR หนึ่งใบ = feature หรือ fix หนึ่งอย่าง
- ต้อง pass `bun test` ก่อน merge
- ต้อง pass `bun biome check` ก่อน merge
- ห้าม merge โดยไม่มี review (ถึงแม้ทำคนเดียว ให้ self-review)

---

## 14. Environment Variables

```bash
# .env.example
DATABASE_URL=postgresql://user:password@localhost:5432/erp_db
JWT_SECRET=your-secret-key-min-32-chars
JWT_EXPIRES_IN=7d
PORT=3000
NODE_ENV=development

# Thai-specific
TZ=Asia/Bangkok
```

---

## 15. AI Development Guidelines

> กฎสำหรับ AI ที่เขียนโค้ดในโปรเจกต์นี้

### สิ่งที่ AI ต้องทำเสมอ

- **อ่าน CLAUDE.md ก่อนเสมอ** ทุกครั้งที่เริ่ม session ใหม่
- **ตรวจสอบ shared/types/common.types.ts** ก่อนสร้าง type ใหม่ เพื่อไม่ให้ซ้ำซ้อน
- **ใช้ existing patterns** จากไฟล์ที่มีอยู่แล้ว อย่าประดิษฐ์ pattern ใหม่โดยไม่จำเป็น
- **เขียน test พร้อมกับ implementation** ไม่ใช่ทีหลัง
- **ตรวจสอบ module boundary** ทุกครั้งที่ import ไฟล์อื่น
- **ใช้ Decimal.js** สำหรับการคำนวณตัวเลขเงินทุกกรณี
- **Comment เป็นภาษาไทย** สำหรับ business logic ที่ซับซ้อน
- **Thai tax logic ต้องมี test** ทุกกรณีไม่มีข้อยกเว้น

### สิ่งที่ AI ห้ามทำ

- ห้ามใช้ `any` ใน TypeScript
- ห้าม cross-module import โดยตรง
- ห้ามเปลี่ยน API response format โดยไม่อัปเดต `common.types.ts`
- ห้าม hardcode ค่าภาษีในโค้ด — ต้องดึงจาก `shared/utils/thai-tax.ts`
- ห้ามใช้ `float` หรือ `double` สำหรับตัวเลขเงิน
- ห้าม commit `.env` ไฟล์
- ห้ามเขียน migration file เอง — ใช้ `bun drizzle-kit generate` เสมอ
- ห้ามสร้าง utility function ซ้ำกับที่มีใน `shared/utils/`

### เมื่อไม่แน่ใจ

1. ดู pattern จากไฟล์ที่ใกล้เคียงที่สุดใน codebase
2. ถ้ายังไม่แน่ใจ — ถามก่อนเขียน อย่าเดา
3. ถ้าต้องการ pattern ใหม่ — เพิ่มใน CLAUDE.md ด้วย

---

## 16. Quick Start

```bash
# 1. Clone & install
git clone [repo-url]
cd erp-backend
bun install

# 2. Setup environment
cp .env.example .env
# แก้ไข DATABASE_URL และ JWT_SECRET

# 3. Setup database
createdb erp_db
bun drizzle-kit migrate

# 4. Run development
bun --watch src/app.ts

# 5. Run tests
bun test

# 6. Lint & format
bun biome check src/
bun biome format src/ --write
```
