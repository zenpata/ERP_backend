# Finance Module - Budget vs Actual (Finance-PM Integration)

อ้างอิง: `Documents/Requirements/Release_3_Finance_Gaps.md` — Feature R3-07

## API Inventory
- `GET /api/finance/reports/budget-vs-actual`
- `GET /api/finance/reports/budget-vs-actual/:projectId`
- `POST /api/internal/pm/expense-approved` ← webhook จาก PM module

### Integration Hooks
- `POST /api/pm/expenses/:id/approve` (PM module) → fires webhook → `POST /api/internal/pm/expense-approved`

---

## Endpoint Details

### API: `GET /api/finance/reports/budget-vs-actual`

**Purpose**
- รายงาน Budget vs Actual สรุประดับ organization: เปรียบ project budgets กับ actual GL expenses ต่อ period
- แสดง committed cost (pending expenses) แยกต่างหากจาก actual

**FE Screen**
- `/finance/reports/budget-vs-actual`

**Params**
- Query Params: `periodFrom` (YYYY-MM), `periodTo` (YYYY-MM), `projectId` (optional filter), `costCenterId` (optional), `page`, `limit`

**Response Body (200)**
```json
{
  "data": {
    "period": "2026-01 to 2026-04",
    "summary": {
      "totalBudget": 2500000,
      "totalActual": 1875000,
      "totalCommitted": 125000,
      "totalVariance": 500000,
      "variancePct": 20.0,
      "utilizationPct": 75.0
    },
    "rows": [
      {
        "projectId": "proj_001",
        "projectName": "ERP Implementation",
        "costCenter": "IT",
        "budget": 1200000,
        "actual": 950000,
        "committed": 75000,
        "variance": 175000,
        "variancePct": 14.6,
        "utilizationPct": 79.2,
        "status": "on_track"
      },
      {
        "projectId": "proj_002",
        "projectName": "Office Renovation",
        "costCenter": "Admin",
        "budget": 500000,
        "actual": 475000,
        "committed": 50000,
        "variance": -25000,
        "variancePct": -5.0,
        "utilizationPct": 105.0,
        "status": "over_budget"
      }
    ]
  },
  "pagination": { "page": 1, "limit": 20, "total": 5 }
}
```

**Sequence Diagram**
```mermaid
sequenceDiagram
    autonumber
    participant FE as Frontend
    participant BE as Backend API
    participant DB as PostgreSQL

    FE->>BE: GET /api/finance/reports/budget-vs-actual\n  ?periodFrom=2026-01&periodTo=2026-04
    BE->>DB: SELECT p.id, p.name, p.costCenter,\n  pb.budgetAmount,\n  SUM(je_amount) as actual,\n  SUM(pending_expense) as committed\n  FROM projects p\n  LEFT JOIN project_budgets pb ON pb.projectId=p.id\n  LEFT JOIN journal_entries je\n    ON je.projectId=p.id\n    AND je.status='posted'\n    AND je.date BETWEEN :periodFrom AND :periodTo\n  LEFT JOIN pm_expenses pe\n    ON pe.projectId=p.id\n    AND pe.status='pending'\n  GROUP BY p.id, pb.budgetAmount
    DB-->>BE: rows[]
    BE->>BE: calculate variance = budget - actual\n  variancePct = (variance / budget) * 100\n  utilizationPct = ((actual + committed) / budget) * 100\n  status = over_budget if utilizationPct > 100\n           warning if utilizationPct > 90\n           on_track otherwise
    BE->>BE: calculate summary totals
    BE-->>FE: 200 {data: {period, summary, rows[]}}
```

---

### API: `GET /api/finance/reports/budget-vs-actual/:projectId`

**Purpose**
- Drill-down รายงาน Budget vs Actual ระดับ project: breakdown ต่อ cost category / GL account + expense timeline

**FE Screen**
- `/finance/reports/budget-vs-actual/:projectId`

**Response Body (200)**
```json
{
  "data": {
    "project": {
      "id": "proj_001",
      "name": "ERP Implementation",
      "costCenter": "IT",
      "totalBudget": 1200000,
      "totalActual": 950000,
      "totalCommitted": 75000,
      "variance": 175000,
      "utilizationPct": 85.4,
      "status": "on_track"
    },
    "breakdown": [
      {
        "glAccountId": "acc_5500",
        "glAccountCode": "5500",
        "glAccountName": "IT Consulting Expense",
        "budget": 600000,
        "actual": 480000,
        "committed": 50000,
        "variance": 70000,
        "variancePct": 11.7
      },
      {
        "glAccountId": "acc_5600",
        "glAccountCode": "5600",
        "glAccountName": "Software License",
        "budget": 300000,
        "actual": 300000,
        "committed": 0,
        "variance": 0,
        "variancePct": 0.0
      }
    ],
    "recentExpenses": [
      {
        "expenseId": "exp_015",
        "description": "AWS ค่าบริการ เม.ย. 2026",
        "amount": 45000,
        "glAccountCode": "5600",
        "status": "posted",
        "approvedAt": "2026-04-20T10:00:00Z",
        "journalEntryId": "je_045"
      }
    ]
  }
}
```

**Sequence Diagram**
```mermaid
sequenceDiagram
    autonumber
    participant FE as Frontend
    participant BE as Backend API
    participant DB as PostgreSQL

    FE->>BE: GET /api/finance/reports/budget-vs-actual/:projectId
    BE->>DB: SELECT project WHERE id=:projectId
    alt not found
        BE-->>FE: 404 {error:"Project not found"}
    else found
        par parallel queries
            BE->>DB: SELECT pb.glAccountId, coa.code, coa.name,\n  pb.budgetAmount,\n  SUM(je_amount) as actual,\n  SUM(pending) as committed\n  FROM project_budget_lines pb\n  JOIN chart_of_accounts coa ON coa.id=pb.glAccountId\n  LEFT JOIN journal_lines jl ON jl.projectId=:projectId\n    AND jl.accountId=pb.glAccountId\n  GROUP BY pb.glAccountId
            BE->>DB: SELECT pm_expenses (recent 20)\n  WHERE projectId=:projectId\n  ORDER BY approvedAt DESC
        end
        DB-->>BE: breakdown[] + recentExpenses[]
        BE->>BE: calculate variance, utilizationPct per row
        BE-->>FE: 200 {data: {project, breakdown[], recentExpenses[]}}
    end
```

---

### Webhook: `POST /api/internal/pm/expense-approved`

**Purpose**
- รับ webhook จาก PM module เมื่อ expense ถูก approve → auto-post journal entry เข้า Finance GL
- ทำให้ actual expense ใน Finance รับรู้ทันทีเมื่อ PM approve

**Auth**
- Internal service key เท่านั้น (ไม่ใช่ Bearer token ของ user)

**Request Body**
```json
{
  "expenseId": "exp_015",
  "projectId": "proj_001",
  "description": "AWS ค่าบริการ เม.ย. 2026",
  "amount": 45000,
  "expenseDate": "2026-04-20",
  "approvedBy": "usr_002",
  "glAccountId": "acc_5600",
  "costCenter": "IT"
}
```

**Response Body (200)**
```json
{
  "data": {
    "journalEntryId": "je_045",
    "status": "posted",
    "debitAccount": "acc_5600",
    "creditAccount": "acc_2100",
    "amount": 45000
  },
  "message": "Expense journal posted"
}
```

**Sequence Diagram**
```mermaid
sequenceDiagram
    autonumber
    participant PM as PM Module
    participant BE as Finance API
    participant DB as PostgreSQL
    participant JE as Journal Engine
    participant LOCK as Period Lock

    Note over PM,JE: PM expense approved → trigger webhook
    PM->>BE: POST /api/internal/pm/expense-approved\n  {expenseId, projectId, amount, expenseDate, glAccountId}

    BE->>DB: SELECT FROM pm_expense_journal_log WHERE expenseId=:expenseId
    alt already posted (idempotency check)
        BE-->>PM: 200 {data: {journalEntryId: existing, status:'already_posted'}}
    else not posted yet
        BE->>LOCK: checkPeriodLock(expenseDate)
        alt period locked
            BE->>DB: INSERT pm_expense_journal_log\n  {expenseId, status:'skipped', reason:'period_locked'}
            BE-->>PM: 422 {error:"Period locked — expense journal not posted", code:"PERIOD_LOCKED"}
        else open
            BE->>DB: SELECT glAccountId exists in chart_of_accounts\n  + resolve accrual/AP credit account from source_mappings\n  WHERE module='pm_expense'
            BE->>JE: createAutoJournal {\n  date: expenseDate,\n  description: expense.description,\n  source: 'pm_expense',\n  referenceId: expenseId,\n  projectId: projectId,\n  lines: [\n    {accountId: glAccountId, debit: amount, credit: 0, department: costCenter},\n    {accountId: accrualAccountId, debit: 0, credit: amount}\n  ]\n}
            JE->>DB: INSERT journal_entries + journal_lines (status='posted')
            JE->>DB: UPDATE account_balances
            DB-->>JE: journalEntryId
            JE-->>BE: journalEntryId

            BE->>DB: INSERT pm_expense_journal_log\n  {expenseId, journalEntryId, status:'posted', postedAt:NOW()}
            DB-->>BE: ok
            BE-->>PM: 200 {data: {journalEntryId, status:'posted'}}
        end
    end
```

---

## Coverage Lock Notes

### Budget vs Actual Status Thresholds
| utilizationPct | Status | FE Color |
|---|---|---|
| < 90% | `on_track` | 🟢 green |
| 90–100% | `warning` | 🟡 yellow |
| > 100% | `over_budget` | 🔴 red |

- Warning เมื่อ utilization > 90% → แสดง badge + in-app notification ให้ `pm_manager` และ `accounting_manager`

### Committed Cost
- `committed` = SUM ของ PM expenses ที่ `status = 'pending'` (ยังไม่ approved)
- ใช้เป็น "forecast" เพื่อเตือนก่อนที่จะ over budget จริง
- ไม่ถือเป็น actual จนกว่า PM จะ approve → journal posted

### GL Account Mapping สำหรับ PM Expenses
- mapping ตาม `finance_config.source_mappings` table:
  - `module = 'pm_expense'`
  - `debitAccountId` → ดึงจาก expense request (per category)
  - `creditAccountId` → accrual payable account (global config หรือ per project)
- ถ้าไม่มี mapping → webhook return 422 `GL_MAPPING_NOT_FOUND`

### Idempotency
- ตรวจสอบ `pm_expense_journal_log` ก่อน post ทุกครั้ง
- ถ้า expenseId มีแล้ว → return existing journalEntryId (ไม่ duplicate post)

### Budget Line Structure
- `project_budget_lines` (per GL account per project) เชื่อมกับ `project_budgets` (total per project)
- Budget drill-down ใช้ `project_budget_lines` เปรียบกับ `journal_lines.projectId`

### Drill-down Report Performance
- ควร index: `journal_lines(projectId, accountId)`, `pm_expenses(projectId, status)`
