# Finance Module - Accounting Core (Normalized)

อ้างอิง: `Documents/Release_1.md`

## API Inventory
- `GET /api/finance/accounts`
- `POST /api/finance/accounts`
- `PATCH /api/finance/accounts/:id`
- `PATCH /api/finance/accounts/:id/activate`
- `GET /api/finance/journal-entries`
- `GET /api/finance/journal-entries/:id`
- `POST /api/finance/journal-entries`
- `POST /api/finance/journal-entries/:id/post`
- `POST /api/finance/journal-entries/:id/reverse`
- `GET /api/finance/income-expense/summary`
- `GET /api/finance/income-expense/entries`
- `POST /api/finance/income-expense/entries`
- `POST /api/finance/integrations/payroll/:runId/post`
- `POST /api/finance/integrations/pm-expenses/:expenseId/post`
- `POST /api/finance/integrations/pm-budgets/:budgetId/post-adjustment`
- `GET /api/finance/integrations/sources/:module/:sourceId/entries`
- `GET /api/finance/config/source-mappings`
- `POST /api/finance/config/source-mappings`
- `PATCH /api/finance/config/source-mappings/:id`
- `PATCH /api/finance/config/source-mappings/:id/activate`
- `GET /api/finance/income-expense/categories`
- `POST /api/finance/income-expense/categories`
- `PATCH /api/finance/income-expense/categories/:id`
- `PATCH /api/finance/income-expense/categories/:id/activate`

## Endpoint Details

### API: `GET /api/finance/accounts`

**Purpose**: ดึงผังบัญชีทั้งหมด — ใช้เป็น picker ใน journal entry / source mapping forms

**FE Screen**: `/finance/accounts`

**Params**: Path ไม่มี, Query `type` (asset|liability|equity|income|expense), `isActive` (boolean)

**Request Headers**
```json
{ "Authorization": "Bearer <access_token>" }
```

**Request Body**
```json
{}
```

**Response Body (200)**
```json
{
  "data": [
    {
      "id": "acc_1100",
      "code": "1100",
      "name": "Cash at Bank",
      "type": "asset",
      "normalBalance": "debit",
      "parentId": null,
      "isActive": true
    }
  ]
}
```

**Sequence Diagram**
```mermaid
sequenceDiagram
    autonumber
    participant FE as Frontend
    participant BE as Backend API
    participant DB as PostgreSQL

    FE->>BE: GET /api/finance/accounts?type=expense&isActive=true
    BE->>DB: SELECT id, code, name, type, normalBalance, parentId, isActive\n  FROM chart_of_accounts\n  WHERE (type=:type IF provided)\n    AND (isActive=:isActive IF provided)\n  ORDER BY code ASC
    DB-->>BE: accounts[]
    BE-->>FE: 200 {data: accounts[]}
```

---

### API: `POST /api/finance/accounts`

**Purpose**: สร้างบัญชีใหม่ใน Chart of Accounts — ตรวจ duplicate code

**FE Screen**: `/finance/accounts`

**Params**: Path ไม่มี, Query ไม่มี

**Request Headers**
```json
{ "Authorization": "Bearer <access_token>" }
```

**Request Body**
```json
{
  "code": "5100",
  "name": "Salary Expense",
  "type": "expense",
  "normalBalance": "debit",
  "parentId": null,
  "description": null
}
```

**Response Body (201)**
```json
{
  "data": { "id": "acc_5100", "code": "5100", "name": "Salary Expense", "isActive": true },
  "message": "Account created"
}
```

**Sequence Diagram**
```mermaid
sequenceDiagram
    autonumber
    participant FE as Frontend
    participant BE as Backend API
    participant DB as PostgreSQL

    FE->>BE: POST /api/finance/accounts {code, name, type, normalBalance, parentId?}
    BE->>DB: SELECT id FROM chart_of_accounts WHERE code=:code
    alt duplicate code
        BE-->>FE: 422 {error:"Account code already exists"}
    else ok
        alt parentId provided
            BE->>DB: SELECT id FROM chart_of_accounts WHERE id=:parentId AND isActive=true
            alt parent not found
                BE-->>FE: 422 {error:"Parent account not found or inactive"}
            end
        end
        BE->>DB: INSERT chart_of_accounts\n  {code, name, type, normalBalance, parentId, isActive:true, createdAt}
        DB-->>BE: accountId
        BE-->>FE: 201 {data: {id, code, name, isActive:true}}
    end
```

---

### API: `PATCH /api/finance/accounts/:id`

**Purpose**: แก้ไขข้อมูลบัญชี — code ไม่เปลี่ยน

**FE Screen**: `/finance/accounts`

**Params**: Path `id`, Query ไม่มี

**Request Headers**
```json
{ "Authorization": "Bearer <access_token>" }
```

**Request Body**
```json
{ "name": "Salary Expense - Updated", "description": "Includes all compensation" }
```

**Response Body (200)**
```json
{
  "data": { "id": "acc_5100", "name": "Salary Expense - Updated", "updatedAt": "2026-04-27T10:00:00Z" },
  "message": "Account updated"
}
```

**Sequence Diagram**
```mermaid
sequenceDiagram
    autonumber
    participant FE as Frontend
    participant BE as Backend API
    participant DB as PostgreSQL

    FE->>BE: PATCH /api/finance/accounts/:id {name, description}
    BE->>DB: SELECT id FROM chart_of_accounts WHERE id=:id
    alt not found
        BE-->>FE: 404 {error:"Account not found"}
    else ok
        BE->>DB: UPDATE chart_of_accounts\n  SET name=:name, description=:description, updatedAt=NOW()\n  WHERE id=:id
        DB-->>BE: updated
        BE-->>FE: 200 {data: {id, name, updatedAt}}
    end
```

---

### API: `PATCH /api/finance/accounts/:id/activate`

**Purpose**: เปิด/ปิดการใช้งานบัญชี — inactive บล็อก posting ใหม่

**FE Screen**: `/finance/accounts`

**Params**: Path `id`, Query ไม่มี

**Request Headers**
```json
{ "Authorization": "Bearer <access_token>" }
```

**Request Body**
```json
{ "isActive": false }
```

**Response Body (200)**
```json
{
  "data": { "id": "acc_5100", "isActive": false, "updatedAt": "2026-04-27T10:00:00Z" },
  "message": "Account deactivated"
}
```

**Sequence Diagram**
```mermaid
sequenceDiagram
    autonumber
    participant FE as Frontend
    participant BE as Backend API
    participant DB as PostgreSQL

    FE->>BE: PATCH /api/finance/accounts/:id/activate {isActive: false}
    BE->>DB: SELECT id FROM chart_of_accounts WHERE id=:id
    alt not found
        BE-->>FE: 404 {error:"Account not found"}
    else ok
        BE->>DB: UPDATE chart_of_accounts\n  SET isActive=:isActive, updatedAt=NOW()\n  WHERE id=:id
        DB-->>BE: updated
        BE-->>FE: 200 {data: {id, isActive, updatedAt}}
    end
```

---

### API: `GET /api/finance/journal-entries`

**Purpose**: ดึงรายการ journal entries พร้อม filter และ pagination

**FE Screen**: `/finance/journal`

**Params**: Path ไม่มี, Query `page`, `limit`, `status` (draft|posted|reversed), `sourceModule`, `dateFrom`, `dateTo`

**Request Headers**
```json
{ "Authorization": "Bearer <access_token>" }
```

**Request Body**
```json
{}
```

**Response Body (200)**
```json
{
  "data": [
    {
      "id": "je_001",
      "referenceNo": "JE-2026-0001",
      "date": "2026-04-30",
      "description": "Month-end adjustment",
      "status": "posted",
      "sourceModule": "manual",
      "totalDebit": 15000,
      "totalCredit": 15000,
      "createdBy": "usr_001"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 45 }
}
```

**Sequence Diagram**
```mermaid
sequenceDiagram
    autonumber
    participant FE as Frontend
    participant BE as Backend API
    participant DB as PostgreSQL

    FE->>BE: GET /api/finance/journal-entries?status=posted&page=1
    BE->>DB: SELECT je.id, je.referenceNo, je.date, je.description,\n  je.status, je.sourceModule, je.createdBy,\n  SUM(jl.debit) as totalDebit, SUM(jl.credit) as totalCredit\n  FROM journal_entries je\n  LEFT JOIN journal_lines jl ON jl.journalId=je.id\n  WHERE (je.status=:status IF provided)\n    AND (je.sourceModule=:sourceModule IF provided)\n    AND (je.date BETWEEN :dateFrom AND :dateTo IF provided)\n  GROUP BY je.id\n  ORDER BY je.date DESC\n  LIMIT :limit OFFSET :offset
    DB-->>BE: journal_entries[]
    BE-->>FE: 200 {data: journal_entries[], pagination}
```

---

### API: `GET /api/finance/journal-entries/:id`

**Purpose**: ดึงรายละเอียด journal entry ครบ + lines พร้อม account info

**FE Screen**: `/finance/journal/:id`

**Params**: Path `id`, Query ไม่มี

**Request Headers**
```json
{ "Authorization": "Bearer <access_token>" }
```

**Request Body**
```json
{}
```

**Response Body (200)**
```json
{
  "data": {
    "id": "je_001",
    "referenceNo": "JE-2026-0001",
    "date": "2026-04-30",
    "description": "Month-end adjustment",
    "status": "posted",
    "sourceModule": "manual",
    "sourceType": null,
    "sourceId": null,
    "lines": [
      {
        "id": "jl_001",
        "accountId": "acc_5100",
        "accountCode": "5100",
        "accountName": "Salary Expense",
        "debit": 15000,
        "credit": 0,
        "description": "April salary"
      }
    ],
    "createdBy": { "id": "usr_001", "name": "นาย ก" },
    "postedAt": "2026-04-30T18:00:00Z"
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

    FE->>BE: GET /api/finance/journal-entries/:id
    BE->>DB: SELECT * FROM journal_entries WHERE id=:id
    alt not found
        BE-->>FE: 404 {error:"Journal entry not found"}
    else found
        BE->>DB: SELECT jl.*, coa.code as accountCode, coa.name as accountName\n  FROM journal_lines jl\n  JOIN chart_of_accounts coa ON coa.id=jl.accountId\n  WHERE jl.journalId=:id\n  ORDER BY jl.id ASC
        DB-->>BE: journal + lines[]
        BE-->>FE: 200 {data: journal + lines[]}
    end
```

---

### API: `POST /api/finance/journal-entries`

**Purpose**: สร้าง draft journal entry — validate balanced (totalDebit = totalCredit)

**FE Screen**: `/finance/journal/new`

**Params**: Path ไม่มี, Query ไม่มี

**Request Headers**
```json
{ "Authorization": "Bearer <access_token>" }
```

**Request Body**
```json
{
  "date": "2026-04-30",
  "description": "Month-end adjustment",
  "lines": [
    { "accountId": "acc_5100", "debit": 15000, "credit": 0, "description": "April salary" },
    { "accountId": "acc_2300", "debit": 0, "credit": 15000, "description": "Accrued payroll" }
  ]
}
```

**Response Body (201)**
```json
{
  "data": {
    "id": "je_001",
    "referenceNo": "JE-2026-0001",
    "status": "draft",
    "totalDebit": 15000,
    "totalCredit": 15000
  },
  "message": "Journal entry created"
}
```

**Sequence Diagram**
```mermaid
sequenceDiagram
    autonumber
    participant FE as Frontend
    participant BE as Backend API
    participant DB as PostgreSQL
    participant LOCK as Period Lock

    FE->>BE: POST /api/finance/journal-entries {date, description, lines:[...]}
    BE->>BE: totalDebit = SUM(lines.debit)\n  totalCredit = SUM(lines.credit)
    alt totalDebit != totalCredit
        BE-->>FE: 422 {error:"Journal entry must be balanced",\n  totalDebit, totalCredit}
    else ok
        BE->>LOCK: checkPeriodLock(date)
        alt period locked
            BE-->>FE: 422 {error:"Period locked", code:"PERIOD_LOCKED"}
        else open
            BE->>DB: SELECT id FROM chart_of_accounts\n  WHERE id IN (:accountIds) AND isActive=true
            alt any account inactive or not found
                BE-->>FE: 422 {error:"One or more accounts not found or inactive"}
            else ok
                BE->>BE: auto-generate referenceNo = "JE-{YYYY}-{SEQ:4}"
                BE->>DB: INSERT journal_entries\n  {referenceNo, date, description, status:'draft',\n   sourceModule:'manual', createdBy, createdAt}
                DB-->>BE: journalId
                BE->>DB: INSERT journal_lines[]\n  (journalId, accountId, debit, credit, description)
                DB-->>BE: ok
                BE-->>FE: 201 {data: {id, referenceNo, status:'draft', totalDebit, totalCredit}}
            end
        end
    end
```

---

### API: `POST /api/finance/journal-entries/:id/post`

**Purpose**: Post journal entry — re-validate balanced + period lock + update account balances

**FE Screen**: `/finance/journal/:id` → ปุ่ม "Post"

**Params**: Path `id`, Query ไม่มี

**Request Headers**
```json
{ "Authorization": "Bearer <access_token>" }
```

**Request Body**
```json
{}
```

**Response Body (200)**
```json
{
  "data": { "id": "je_001", "status": "posted", "postedAt": "2026-04-30T18:00:00Z" },
  "message": "Journal entry posted"
}
```

**Sequence Diagram**
```mermaid
sequenceDiagram
    autonumber
    participant FE as Frontend
    participant BE as Backend API
    participant DB as PostgreSQL
    participant LOCK as Period Lock

    FE->>BE: POST /api/finance/journal-entries/:id/post
    BE->>DB: SELECT je.*, SUM(jl.debit) as totalDebit, SUM(jl.credit) as totalCredit\n  FROM journal_entries je\n  JOIN journal_lines jl ON jl.journalId=je.id\n  WHERE je.id=:id GROUP BY je.id
    alt not found
        BE-->>FE: 404 {error:"Journal entry not found"}
    else status != draft
        BE-->>FE: 422 {error:"Only draft entries can be posted"}
    else totalDebit != totalCredit
        BE-->>FE: 422 {error:"Cannot post unbalanced journal entry"}
    else ok
        BE->>LOCK: checkPeriodLock(je.date)
        alt period locked
            BE-->>FE: 422 {error:"Period locked", code:"PERIOD_LOCKED"}
        else open
            BE->>DB: UPDATE journal_entries\n  SET status='posted', postedAt=NOW(), postedBy=:userId\n  WHERE id=:id
            DB-->>BE: updated
            BE-->>FE: 200 {data: {id, status:'posted', postedAt}}
        end
    end
```

---

### API: `POST /api/finance/journal-entries/:id/reverse`

**Purpose**: Reverse posted journal — สร้าง entry ใหม่ที่ invert debit/credit + mark original reversed

**FE Screen**: `/finance/journal/:id` → ปุ่ม "Reverse"

**Params**: Path `id`, Query ไม่มี

**Request Headers**
```json
{ "Authorization": "Bearer <access_token>" }
```

**Request Body**
```json
{ "reversalDate": "2026-05-01", "reason": "Error correction" }
```

**Response Body (201)**
```json
{
  "data": {
    "id": "je_rev_001",
    "referenceNo": "JE-REV-2026-0001",
    "status": "posted",
    "reversedJournalId": "je_001"
  },
  "message": "Journal entry reversed"
}
```

**Sequence Diagram**
```mermaid
sequenceDiagram
    autonumber
    participant FE as Frontend
    participant BE as Backend API
    participant DB as PostgreSQL
    participant LOCK as Period Lock

    FE->>BE: POST /api/finance/journal-entries/:id/reverse\n  {reversalDate, reason}
    BE->>DB: SELECT * FROM journal_entries WHERE id=:id
    alt not found
        BE-->>FE: 404 {error:"Journal entry not found"}
    else status != posted
        BE-->>FE: 422 {error:"Only posted entries can be reversed"}
    else already reversed
        BE-->>FE: 409 {error:"Journal entry has already been reversed"}
    else ok
        BE->>LOCK: checkPeriodLock(reversalDate)
        alt period locked
            BE-->>FE: 422 {error:"Reversal period is locked", code:"PERIOD_LOCKED"}
        else open
            BE->>DB: SELECT * FROM journal_lines WHERE journalId=:id
            DB-->>BE: original lines[]
            BE->>BE: auto-generate reversalRefNo = "JE-REV-{YYYY}-{SEQ:4}"
            BE->>DB: INSERT journal_entries\n  {referenceNo:reversalRefNo, date:reversalDate,\n   description:"Reversal of "+original.referenceNo,\n   status:'posted', sourceModule:'manual',\n   reversedJournalId:id, createdBy, createdAt:NOW()}
            DB-->>BE: reversalJournalId
            BE->>DB: INSERT journal_lines[] — invert each original line:\n  (accountId, debit:original.credit, credit:original.debit, description)
            DB-->>BE: ok
            BE->>DB: UPDATE journal_entries SET isReversed=true WHERE id=:id
            DB-->>BE: ok
            BE-->>FE: 201 {data: {id:reversalJournalId, referenceNo, status:'posted', reversedJournalId:id}}
        end
    end
```

---

### API: `GET /api/finance/income-expense/summary`

**Purpose**: สรุปรายรับรายจ่ายตาม period — KPI ฝั่ง income-expense ledger

**FE Screen**: `/finance/income-expense`

**Params**: Path ไม่มี, Query `periodFrom` (YYYY-MM, required), `periodTo` (YYYY-MM, required)

**Request Headers**
```json
{ "Authorization": "Bearer <access_token>" }
```

**Request Body**
```json
{}
```

**Response Body (200)**
```json
{
  "data": {
    "period": { "from": "2026-01", "to": "2026-04" },
    "totalIncome": 850000,
    "totalExpense": 420000,
    "netBalance": 430000,
    "entryCount": 38
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

    FE->>BE: GET /api/finance/income-expense/summary?periodFrom=2026-01&periodTo=2026-04
    BE->>BE: validate periodFrom <= periodTo
    alt invalid params
        BE-->>FE: 400 {error:"Invalid period range"}
    else ok
        par parallel queries
            BE->>DB: SELECT SUM(amount) as totalIncome, COUNT(*) as incomeCount\n  FROM income_expense_entries\n  WHERE side='credit'\n    AND DATE_TRUNC('month', date) BETWEEN :from AND :to
            BE->>DB: SELECT SUM(amount) as totalExpense, COUNT(*) as expenseCount\n  FROM income_expense_entries\n  WHERE side='debit'\n    AND DATE_TRUNC('month', date) BETWEEN :from AND :to
        end
        DB-->>BE: income + expense totals
        BE->>BE: netBalance = totalIncome - totalExpense\n  entryCount = incomeCount + expenseCount
        BE-->>FE: 200 {data: {period, totalIncome, totalExpense, netBalance, entryCount}}
    end
```

---

### API: `GET /api/finance/income-expense/entries`

**Purpose**: ดึงรายการ ledger entries พร้อม filter category/type/period

**FE Screen**: `/finance/income-expense`

**Params**: Path ไม่มี, Query `page`, `limit`, `type` (income|expense), `categoryId`, `dateFrom`, `dateTo`

**Request Headers**
```json
{ "Authorization": "Bearer <access_token>" }
```

**Request Body**
```json
{}
```

**Response Body (200)**
```json
{
  "data": [
    {
      "id": "ie_001",
      "date": "2026-04-25",
      "categoryId": "cat_001",
      "categoryName": "Salary Expense",
      "side": "debit",
      "amount": 1500,
      "description": "April petty cash",
      "createdBy": "usr_001"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 38 }
}
```

**Sequence Diagram**
```mermaid
sequenceDiagram
    autonumber
    participant FE as Frontend
    participant BE as Backend API
    participant DB as PostgreSQL

    FE->>BE: GET /api/finance/income-expense/entries?type=expense&page=1
    BE->>DB: SELECT ie.id, ie.date, ie.categoryId, ic.name as categoryName,\n  ie.side, ie.amount, ie.description, ie.createdBy\n  FROM income_expense_entries ie\n  JOIN income_expense_categories ic ON ic.id=ie.categoryId\n  WHERE (ic.type=:type IF provided)\n    AND (ie.categoryId=:categoryId IF provided)\n    AND (ie.date BETWEEN :dateFrom AND :dateTo IF provided)\n  ORDER BY ie.date DESC\n  LIMIT :limit OFFSET :offset
    DB-->>BE: entries[]
    BE-->>FE: 200 {data: entries[], pagination}
```

---

### API: `POST /api/finance/income-expense/entries`

**Purpose**: บันทึกรายการ manual income/expense entry

**FE Screen**: `/finance/income-expense/new`

**Params**: Path ไม่มี, Query ไม่มี

**Request Headers**
```json
{ "Authorization": "Bearer <access_token>" }
```

**Request Body**
```json
{
  "categoryId": "cat_001",
  "date": "2026-04-25",
  "amount": 1500,
  "side": "debit",
  "description": "April petty cash"
}
```

**Response Body (201)**
```json
{
  "data": { "id": "ie_001", "categoryId": "cat_001", "amount": 1500, "side": "debit" },
  "message": "Entry created"
}
```

**Sequence Diagram**
```mermaid
sequenceDiagram
    autonumber
    participant FE as Frontend
    participant BE as Backend API
    participant DB as PostgreSQL

    FE->>BE: POST /api/finance/income-expense/entries\n  {categoryId, date, amount, side, description}
    BE->>DB: SELECT id, isActive FROM income_expense_categories WHERE id=:categoryId
    alt not found or inactive
        BE-->>FE: 422 {error:"Category not found or inactive"}
    else ok
        BE->>BE: validate amount > 0\n  validate side IN ('debit','credit')
        alt invalid
            BE-->>FE: 400 {error:"Invalid amount or side"}
        else ok
            BE->>DB: INSERT income_expense_entries\n  {categoryId, date, amount, side, description, createdBy, createdAt}
            DB-->>BE: entryId
            BE-->>FE: 201 {data: {id, categoryId, amount, side}}
        end
    end
```

---

### API: `POST /api/finance/integrations/payroll/:runId/post`

**Purpose**: Post payroll run เข้า GL — ใช้ source mapping เพื่อ resolve debit/credit accounts

**FE Screen**: Payroll run detail → ปุ่ม "Post to Finance"

**Params**: Path `runId`, Query ไม่มี

**Request Headers**
```json
{ "Authorization": "Bearer <access_token>" }
```

**Request Body**
```json
{}
```

**Response Body (201)**
```json
{
  "data": { "journalEntryId": "je_010", "referenceNo": "JE-2026-0010" },
  "message": "Payroll posted to accounting"
}
```

**Sequence Diagram**
```mermaid
sequenceDiagram
    autonumber
    participant FE as Frontend
    participant BE as Backend API
    participant DB as PostgreSQL
    participant JE as Journal Engine

    FE->>BE: POST /api/finance/integrations/payroll/:runId/post
    BE->>DB: SELECT pr.id, pr.status, pr.totalNetPay,\n  pr.totalTax, pr.totalDeductions\n  FROM payroll_runs pr WHERE pr.id=:runId
    alt not found
        BE-->>FE: 404 {error:"Payroll run not found"}
    else status != finalized
        BE-->>FE: 422 {error:"Payroll run must be finalized before posting"}
    else already posted
        BE-->>FE: 409 {error:"Payroll run already posted to accounting",\n  journalEntryId: existing}
    else ok
        BE->>DB: SELECT * FROM finance_source_mappings\n  WHERE sourceModule='hr' AND sourceType='payroll_run' AND isActive=true
        alt mapping not found
            BE-->>FE: 422 {error:{code:"SOURCE_MAPPING_NOT_FOUND",\n  message:"ไม่พบ finance source mapping สำหรับ hr/payroll_run",\n  retryable:false, suggestedAction:"create_or_activate_source_mapping"}}
        else ok
            BE->>JE: createAutoJournal {\n  date: pr.paymentDate, source:'payroll',\n  referenceId: runId,\n  lines: [\n    {accountId: mapping.debitAccountId, debit: pr.totalNetPay},\n    {accountId: mapping.creditAccountId, credit: pr.totalNetPay}\n  ]\n}
            JE->>DB: INSERT + post journal_entry + journal_lines
            DB-->>BE: journalEntryId, referenceNo
            BE->>DB: UPDATE payroll_runs SET financeJournalId=:journalEntryId WHERE id=:runId
            DB-->>BE: ok
            BE-->>FE: 201 {data: {journalEntryId, referenceNo}}
        end
    end
```

---

### API: `POST /api/finance/integrations/pm-expenses/:expenseId/post`

**Purpose**: Post PM expense เข้า GL — debit expense account / credit accrual account

**FE Screen**: PM Expense approval → auto-trigger หรือ manual post

**Params**: Path `expenseId`, Query ไม่มี

**Request Headers**
```json
{ "Authorization": "Bearer <access_token>" }
```

**Request Body**
```json
{}
```

**Response Body (201)**
```json
{
  "data": { "journalEntryId": "je_011", "referenceNo": "JE-2026-0011" },
  "message": "PM expense posted to accounting"
}
```

**Sequence Diagram**
```mermaid
sequenceDiagram
    autonumber
    participant FE as Frontend
    participant BE as Backend API
    participant DB as PostgreSQL
    participant JE as Journal Engine

    FE->>BE: POST /api/finance/integrations/pm-expenses/:expenseId/post
    BE->>DB: SELECT pe.id, pe.status, pe.amount, pe.expenseDate,\n  pe.categoryId\n  FROM pm_expenses pe WHERE pe.id=:expenseId
    alt not found
        BE-->>FE: 404 {error:"PM Expense not found"}
    else status != approved
        BE-->>FE: 422 {error:"Only approved PM expenses can be posted"}
    else already posted
        BE-->>FE: 409 {error:"PM Expense already posted", journalEntryId: existing}
    else ok
        BE->>DB: SELECT * FROM finance_source_mappings\n  WHERE sourceModule='pm' AND sourceType='expense' AND isActive=true
        alt mapping not found
            BE-->>FE: 422 {error:{code:"SOURCE_MAPPING_NOT_FOUND",\n  sourceModule:"pm", sourceType:"expense",\n  suggestedAction:"create_or_activate_source_mapping"}}
        else ok
            BE->>JE: createAutoJournal {\n  date: pe.expenseDate, source:'pm_expense',\n  referenceId: expenseId,\n  lines: [\n    {accountId: mapping.debitAccountId, debit: pe.amount},\n    {accountId: mapping.creditAccountId, credit: pe.amount}\n  ]\n}
            JE->>DB: INSERT + post journal
            DB-->>BE: journalEntryId, referenceNo
            BE->>DB: UPDATE pm_expenses SET financeJournalId=:journalEntryId WHERE id=:expenseId
            DB-->>BE: ok
            BE-->>FE: 201 {data: {journalEntryId, referenceNo}}
        end
    end
```

---

### API: `POST /api/finance/integrations/pm-budgets/:budgetId/post-adjustment`

**Purpose**: Post budget adjustment journal — ปรับ committed/actual สำหรับ PM budget ที่เปลี่ยนแปลง

**FE Screen**: PM Budget adjustment → auto-trigger

**Params**: Path `budgetId`, Query ไม่มี

**Request Headers**
```json
{ "Authorization": "Bearer <access_token>" }
```

**Request Body**
```json
{
  "adjustmentType": "committed",
  "delta": 15000,
  "reason": "PO approved"
}
```

**Response Body (201)**
```json
{
  "data": { "journalEntryId": "je_012", "referenceNo": "JE-2026-0012" },
  "message": "Budget adjustment posted"
}
```

**Sequence Diagram**
```mermaid
sequenceDiagram
    autonumber
    participant FE as Frontend
    participant BE as Backend API
    participant DB as PostgreSQL
    participant JE as Journal Engine

    FE->>BE: POST /api/finance/integrations/pm-budgets/:budgetId/post-adjustment\n  {adjustmentType, delta, reason}
    BE->>DB: SELECT id, isActive FROM project_budgets WHERE id=:budgetId
    alt not found
        BE-->>FE: 404 {error:"Project budget not found"}
    else ok
        BE->>DB: SELECT * FROM finance_source_mappings\n  WHERE sourceModule='pm' AND sourceType='budget_adjustment' AND isActive=true
        alt mapping not found
            BE-->>FE: 422 {error:{code:"SOURCE_MAPPING_NOT_FOUND",\n  sourceModule:"pm", sourceType:"budget_adjustment",\n  suggestedAction:"create_or_activate_source_mapping"}}
        else ok
            BE->>JE: createAutoJournal {\n  date: TODAY, source:'pm_budget_adjustment',\n  referenceId: budgetId,\n  lines: [\n    {accountId: mapping.debitAccountId, debit: ABS(delta)},\n    {accountId: mapping.creditAccountId, credit: ABS(delta)}\n  ],\n  description: reason\n}
            JE->>DB: INSERT + post journal
            DB-->>BE: journalEntryId, referenceNo
            BE-->>FE: 201 {data: {journalEntryId, referenceNo}}
        end
    end
```

---

### API: `GET /api/finance/integrations/sources/:module/:sourceId/entries`

**Purpose**: ดู GL journal entries ทั้งหมดที่ linked กับ source document (invoice, AP bill, payroll run, etc.)

**FE Screen**: Invoice detail / AP Bill detail / Payroll run detail → GL Entries section

**Params**: Path `module` (ar|ap|hr|pm), `sourceId`, Query ไม่มี

**Request Headers**
```json
{ "Authorization": "Bearer <access_token>" }
```

**Request Body**
```json
{}
```

**Response Body (200)**
```json
{
  "data": [
    {
      "id": "je_001",
      "referenceNo": "JE-2026-0001",
      "date": "2026-04-30",
      "description": "AR Payment",
      "status": "posted",
      "lines": [
        { "accountCode": "1100", "accountName": "Cash at Bank", "debit": 16050, "credit": 0 },
        { "accountCode": "1200", "accountName": "Accounts Receivable", "debit": 0, "credit": 16050 }
      ]
    }
  ]
}
```

**Sequence Diagram**
```mermaid
sequenceDiagram
    autonumber
    participant FE as Frontend
    participant BE as Backend API
    participant DB as PostgreSQL

    FE->>BE: GET /api/finance/integrations/sources/:module/:sourceId/entries
    BE->>DB: SELECT je.id, je.referenceNo, je.date, je.description, je.status,\n  jl.accountId, coa.code as accountCode, coa.name as accountName,\n  jl.debit, jl.credit\n  FROM journal_entries je\n  JOIN journal_lines jl ON jl.journalId=je.id\n  JOIN chart_of_accounts coa ON coa.id=jl.accountId\n  WHERE je.sourceModule=:module AND je.sourceId=:sourceId\n  ORDER BY je.date ASC, jl.id ASC
    DB-->>BE: flat rows (je + lines)
    BE->>BE: group lines[] under each journal_entry by je.id
    BE-->>FE: 200 {data: journal_entries[]}
```

---

### API: `GET /api/finance/config/source-mappings`

**Purpose**: ดึงรายการ posting mappings — ใช้ใน integration post endpoints

**FE Screen**: `/finance/settings/source-mappings`

**Params**: Path ไม่มี, Query `sourceModule` (hr|pm|ar|ap), `sourceType`, `isActive`

**Request Headers**
```json
{ "Authorization": "Bearer <access_token>" }
```

**Request Body**
```json
{}
```

**Response Body (200)**
```json
{
  "data": [
    {
      "id": "map_001",
      "sourceModule": "hr",
      "sourceType": "payroll_run",
      "debitAccountId": "acc_5100",
      "debitAccountCode": "5100",
      "debitAccountName": "Salary Expense",
      "creditAccountId": "acc_2300",
      "creditAccountCode": "2300",
      "creditAccountName": "Accrued Payroll",
      "description": "Payroll net salary posting",
      "isActive": true
    }
  ]
}
```

**Sequence Diagram**
```mermaid
sequenceDiagram
    autonumber
    participant FE as Frontend
    participant BE as Backend API
    participant DB as PostgreSQL

    FE->>BE: GET /api/finance/config/source-mappings?sourceModule=hr
    BE->>DB: SELECT sm.*, \n  da.code as debitAccountCode, da.name as debitAccountName,\n  ca.code as creditAccountCode, ca.name as creditAccountName\n  FROM finance_source_mappings sm\n  JOIN chart_of_accounts da ON da.id=sm.debitAccountId\n  JOIN chart_of_accounts ca ON ca.id=sm.creditAccountId\n  WHERE (sm.sourceModule=:sourceModule IF provided)\n    AND (sm.sourceType=:sourceType IF provided)\n    AND (sm.isActive=:isActive IF provided)\n  ORDER BY sm.sourceModule ASC, sm.sourceType ASC
    DB-->>BE: mappings[]
    BE-->>FE: 200 {data: mappings[]}
```

---

### API: `POST /api/finance/config/source-mappings`

**Purpose**: สร้าง mapping ใหม่สำหรับ source module/type pair — ตรวจ duplicate

**FE Screen**: `/finance/settings/source-mappings`

**Params**: Path ไม่มี, Query ไม่มี

**Request Headers**
```json
{ "Authorization": "Bearer <access_token>" }
```

**Request Body**
```json
{
  "sourceModule": "hr",
  "sourceType": "payroll_run",
  "debitAccountId": "acc_5100",
  "creditAccountId": "acc_2300",
  "description": "Payroll net salary posting"
}
```

**Response Body (201)**
```json
{
  "data": { "id": "map_001", "sourceModule": "hr", "sourceType": "payroll_run", "isActive": true },
  "message": "Source mapping created"
}
```

**Sequence Diagram**
```mermaid
sequenceDiagram
    autonumber
    participant FE as Frontend
    participant BE as Backend API
    participant DB as PostgreSQL

    FE->>BE: POST /api/finance/config/source-mappings\n  {sourceModule, sourceType, debitAccountId, creditAccountId, description}
    BE->>DB: SELECT id FROM finance_source_mappings\n  WHERE sourceModule=:sourceModule AND sourceType=:sourceType AND isActive=true
    alt active mapping already exists
        BE-->>FE: 422 {error:"An active mapping for this source already exists"}
    else ok
        BE->>DB: SELECT id FROM chart_of_accounts\n  WHERE id IN (:debitAccountId, :creditAccountId) AND isActive=true
        alt account not found or inactive
            BE-->>FE: 422 {error:"One or more accounts not found or inactive"}
        else ok
            BE->>DB: INSERT finance_source_mappings\n  {sourceModule, sourceType, debitAccountId, creditAccountId,\n   description, isActive:true, createdAt}
            DB-->>BE: mappingId
            BE-->>FE: 201 {data: {id, sourceModule, sourceType, isActive:true}}
        end
    end
```

---

### API: `PATCH /api/finance/config/source-mappings/:id`

**Purpose**: แก้ไข account pair หรือ description ของ mapping

**FE Screen**: `/finance/settings/source-mappings`

**Params**: Path `id`, Query ไม่มี

**Request Headers**
```json
{ "Authorization": "Bearer <access_token>" }
```

**Request Body**
```json
{ "debitAccountId": "acc_6200", "creditAccountId": "acc_2300", "description": "Updated mapping" }
```

**Response Body (200)**
```json
{
  "data": { "id": "map_001", "debitAccountId": "acc_6200", "updatedAt": "2026-04-27T10:00:00Z" },
  "message": "Source mapping updated"
}
```

**Sequence Diagram**
```mermaid
sequenceDiagram
    autonumber
    participant FE as Frontend
    participant BE as Backend API
    participant DB as PostgreSQL

    FE->>BE: PATCH /api/finance/config/source-mappings/:id\n  {debitAccountId, creditAccountId, description}
    BE->>DB: SELECT id FROM finance_source_mappings WHERE id=:id
    alt not found
        BE-->>FE: 404 {error:"Source mapping not found"}
    else ok
        BE->>DB: SELECT id FROM chart_of_accounts\n  WHERE id IN (:debitAccountId, :creditAccountId) AND isActive=true
        alt account not found or inactive
            BE-->>FE: 422 {error:"One or more accounts not found or inactive"}
        else ok
            BE->>DB: UPDATE finance_source_mappings\n  SET debitAccountId=:debitAccountId,\n    creditAccountId=:creditAccountId,\n    description=:description, updatedAt=NOW()\n  WHERE id=:id
            DB-->>BE: updated
            BE-->>FE: 200 {data: {id, debitAccountId, updatedAt}}
        end
    end
```

---

### API: `PATCH /api/finance/config/source-mappings/:id/activate`

**Purpose**: เปิด/ปิดการใช้งาน mapping — inactive บล็อก auto-post future transactions

**FE Screen**: `/finance/settings/source-mappings`

**Params**: Path `id`, Query ไม่มี

**Request Headers**
```json
{ "Authorization": "Bearer <access_token>" }
```

**Request Body**
```json
{ "isActive": false }
```

**Response Body (200)**
```json
{
  "data": { "id": "map_001", "isActive": false, "updatedAt": "2026-04-27T10:00:00Z" },
  "message": "Source mapping deactivated"
}
```

**Sequence Diagram**
```mermaid
sequenceDiagram
    autonumber
    participant FE as Frontend
    participant BE as Backend API
    participant DB as PostgreSQL

    FE->>BE: PATCH /api/finance/config/source-mappings/:id/activate {isActive: false}
    BE->>DB: SELECT id FROM finance_source_mappings WHERE id=:id
    alt not found
        BE-->>FE: 404 {error:"Source mapping not found"}
    else ok
        BE->>DB: UPDATE finance_source_mappings\n  SET isActive=:isActive, updatedAt=NOW()\n  WHERE id=:id
        DB-->>BE: updated
        BE-->>FE: 200 {data: {id, isActive, updatedAt}}
    end
```

---

### API: `GET /api/finance/income-expense/categories`

**Purpose**: ดึงรายการ categories สำหรับ filter และ manual entry picker

**FE Screen**: `/finance/settings/categories`, `/finance/income-expense/new`

**Params**: Path ไม่มี, Query `type` (income|expense), `isActive`

**Request Headers**
```json
{ "Authorization": "Bearer <access_token>" }
```

**Request Body**
```json
{}
```

**Response Body (200)**
```json
{
  "data": [
    {
      "id": "cat_001",
      "name": "Salary Expense",
      "type": "expense",
      "accountCode": "5100",
      "isActive": true
    }
  ]
}
```

**Sequence Diagram**
```mermaid
sequenceDiagram
    autonumber
    participant FE as Frontend
    participant BE as Backend API
    participant DB as PostgreSQL

    FE->>BE: GET /api/finance/income-expense/categories?type=expense&isActive=true
    BE->>DB: SELECT id, name, type, accountCode, isActive\n  FROM income_expense_categories\n  WHERE (type=:type IF provided)\n    AND (isActive=:isActive IF provided)\n  ORDER BY type ASC, name ASC
    DB-->>BE: categories[]
    BE-->>FE: 200 {data: categories[]}
```

---

### API: `POST /api/finance/income-expense/categories`

**Purpose**: สร้าง category ใหม่และ map ไป accountCode

**FE Screen**: `/finance/settings/categories`

**Params**: Path ไม่มี, Query ไม่มี

**Request Headers**
```json
{ "Authorization": "Bearer <access_token>" }
```

**Request Body**
```json
{ "name": "Salary Expense", "type": "expense", "accountCode": "5100" }
```

**Response Body (201)**
```json
{
  "data": { "id": "cat_001", "name": "Salary Expense", "type": "expense", "isActive": true },
  "message": "Category created"
}
```

**Sequence Diagram**
```mermaid
sequenceDiagram
    autonumber
    participant FE as Frontend
    participant BE as Backend API
    participant DB as PostgreSQL

    FE->>BE: POST /api/finance/income-expense/categories {name, type, accountCode}
    BE->>BE: validate type IN ('income','expense')
    BE->>DB: SELECT id FROM chart_of_accounts WHERE code=:accountCode AND isActive=true
    alt account not found
        BE-->>FE: 422 {error:"Account code not found or inactive"}
    else ok
        BE->>DB: SELECT id FROM income_expense_categories\n  WHERE name=:name AND type=:type
        alt duplicate
            BE-->>FE: 422 {error:"Category with this name and type already exists"}
        else ok
            BE->>DB: INSERT income_expense_categories\n  {name, type, accountCode, isActive:true, createdAt}
            DB-->>BE: categoryId
            BE-->>FE: 201 {data: {id, name, type, isActive:true}}
        end
    end
```

---

### API: `PATCH /api/finance/income-expense/categories/:id`

**Purpose**: แก้ไข category และ account mapping

**FE Screen**: `/finance/settings/categories`

**Params**: Path `id`, Query ไม่มี

**Request Headers**
```json
{ "Authorization": "Bearer <access_token>" }
```

**Request Body**
```json
{ "name": "Salary & Compensation", "accountCode": "5100" }
```

**Response Body (200)**
```json
{
  "data": { "id": "cat_001", "name": "Salary & Compensation", "updatedAt": "2026-04-27T10:00:00Z" },
  "message": "Category updated"
}
```

**Sequence Diagram**
```mermaid
sequenceDiagram
    autonumber
    participant FE as Frontend
    participant BE as Backend API
    participant DB as PostgreSQL

    FE->>BE: PATCH /api/finance/income-expense/categories/:id {name, accountCode}
    BE->>DB: SELECT id FROM income_expense_categories WHERE id=:id
    alt not found
        BE-->>FE: 404 {error:"Category not found"}
    else ok
        alt accountCode provided
            BE->>DB: SELECT id FROM chart_of_accounts WHERE code=:accountCode AND isActive=true
            alt not found
                BE-->>FE: 422 {error:"Account code not found or inactive"}
            end
        end
        BE->>DB: UPDATE income_expense_categories\n  SET name=:name, accountCode=:accountCode, updatedAt=NOW()\n  WHERE id=:id
        DB-->>BE: updated
        BE-->>FE: 200 {data: {id, name, updatedAt}}
    end
```

---

### API: `PATCH /api/finance/income-expense/categories/:id/activate`

**Purpose**: เปิด/ปิด category — ไม่ลบประวัติที่ถูกอ้างอิงแล้ว

**FE Screen**: `/finance/settings/categories`

**Params**: Path `id`, Query ไม่มี

**Request Headers**
```json
{ "Authorization": "Bearer <access_token>" }
```

**Request Body**
```json
{ "isActive": false }
```

**Response Body (200)**
```json
{
  "data": { "id": "cat_001", "isActive": false, "updatedAt": "2026-04-27T10:00:00Z" },
  "message": "Category deactivated"
}
```

**Sequence Diagram**
```mermaid
sequenceDiagram
    autonumber
    participant FE as Frontend
    participant BE as Backend API
    participant DB as PostgreSQL

    FE->>BE: PATCH /api/finance/income-expense/categories/:id/activate {isActive: false}
    BE->>DB: SELECT id FROM income_expense_categories WHERE id=:id
    alt not found
        BE-->>FE: 404 {error:"Category not found"}
    else ok
        BE->>DB: UPDATE income_expense_categories\n  SET isActive=:isActive, updatedAt=NOW()\n  WHERE id=:id
        DB-->>BE: updated
        BE-->>FE: 200 {data: {id, isActive, updatedAt}}
    end
```

---

## Coverage Lock Addendum (2026-04-16)

### Accounts / Category Option Contracts
- `GET /api/finance/accounts`
  - item อย่างน้อยต้องมี `id`, `code`, `name`, `type`, `isActive`, `parentId`
  - ถ้าใช้เป็น picker ให้ FE สามารถ reuse endpoint นี้โดย filter `isActive=true`
- `GET /api/finance/income-expense/categories`
  - item อย่างน้อยต้องมี `id`, `name`, `type`, `accountCode`, `isActive`
- selector ฝั่ง UX ต้องยึด option source จากสอง endpoint นี้ ไม่ hardcode labels

### Journal Line Schema
- `POST /api/finance/journal-entries`
  - request body `lines[]` อย่างน้อยต้องมี `accountId`, `debit`, `credit`, `description?`
  - response detail ต้องคืน `lines[]` schema เดียวกันพร้อม account summary (`accountCode`, `accountName`)
- `GET /api/finance/journal-entries/:id`
  - detail response ต้องมี `status`, `date`, `description`, `sourceModule`, `sourceType`, `sourceId`, `lines[]`

### Source Mapping Recovery / Error Contract
- integration endpoint failures เช่น `POST /api/finance/integrations/payroll/:runId/post` ต้องตอบ error object อย่างน้อย:
```json
{
  "error": {
    "code": "SOURCE_MAPPING_NOT_FOUND",
    "message": "ไม่พบ finance source mapping สำหรับ hr/payroll_run",
    "retryable": false,
    "sourceModule": "hr",
    "sourceType": "payroll_run",
    "suggestedAction": "create_or_activate_source_mapping"
  }
}
```
- `GET /api/finance/config/source-mappings`
  - row อย่างน้อยต้องมี `id`, `sourceModule`, `sourceType`, `debitAccountId`, `creditAccountId`, `isActive`, `description`
