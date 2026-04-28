# Finance Module - Fixed Assets & Depreciation

อ้างอิง: `Documents/Requirements/Release_3_Finance_Gaps.md` — Feature R3-06

## API Inventory
- `GET /api/finance/fixed-assets`
- `POST /api/finance/fixed-assets`
- `GET /api/finance/fixed-assets/:id`
- `PATCH /api/finance/fixed-assets/:id`
- `GET /api/finance/fixed-assets/:id/schedule`
- `POST /api/finance/fixed-assets/:id/dispose`
- `GET /api/finance/reports/asset-register`
- `POST /api/internal/fixed-assets/run-monthly-depreciation` ← cron only

---

## Endpoint Details

### API: `GET /api/finance/fixed-assets`

**Purpose**
- ดูรายการสินทรัพย์ถาวรทั้งหมด

**FE Screen**
- `/finance/fixed-assets`

**Params**
- Query Params: `status` (active|disposed|fully_depreciated), `category`, `page`, `limit`

**Response Body (200)**
```json
{
  "data": [
    {
      "id": "fa_001",
      "assetNo": "FA-2026-001",
      "name": "MacBook Pro 16",
      "category": "computer_equipment",
      "acquisitionDate": "2026-01-15",
      "acquisitionCost": 85000,
      "accumulatedDepreciation": 7083,
      "netBookValue": 77917,
      "status": "active",
      "usefulLifeMonths": 60,
      "monthsDepreciated": 5
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

    FE->>BE: GET /api/finance/fixed-assets?status=active
    BE->>DB: SELECT fa.*,\n  SUM(s.depAmount) as accumDep,\n  fa.acquisitionCost - SUM(s.depAmount) as nbv\n  FROM fixed_assets fa\n  LEFT JOIN asset_depreciation_schedule s\n    ON s.assetId=fa.id AND s.status='posted'\n  WHERE fa.status='active'\n  GROUP BY fa.id
    DB-->>BE: assets[]
    BE-->>FE: 200 {data: assets[]}
```

---

### API: `POST /api/finance/fixed-assets`

**Purpose**
- บันทึกสินทรัพย์ใหม่ + auto-generate depreciation schedule

**FE Screen**
- `/finance/fixed-assets/new`

**Request Body**
```json
{
  "name": "MacBook Pro 16",
  "category": "computer_equipment",
  "acquisitionDate": "2026-01-15",
  "acquisitionCost": 85000,
  "salvageValue": 5000,
  "usefulLifeMonths": 60,
  "depreciationMethod": "straight_line",
  "assetAccountId": "acc_1700",
  "accumDepAccountId": "acc_1701",
  "depExpenseAccountId": "acc_5600",
  "notes": "สำหรับทีม Dev"
}
```

**Response Body (201)**
```json
{
  "data": {
    "id": "fa_001",
    "assetNo": "FA-2026-001",
    "monthlyDepreciation": 1333.33,
    "scheduleGeneratedMonths": 60,
    "firstDepreciationDate": "2026-01-31"
  },
  "message": "Asset created and depreciation schedule generated"
}
```

**Sequence Diagram**
```mermaid
sequenceDiagram
    autonumber
    participant U as accounting_manager
    participant FE as Frontend
    participant BE as Backend API
    participant DB as PostgreSQL

    U->>FE: กรอก asset form
    FE->>BE: POST /api/finance/fixed-assets\n  {name, acquisitionDate, acquisitionCost, salvageValue,\n   usefulLifeMonths, depreciationMethod, assetAccountId,\n   accumDepAccountId, depExpenseAccountId, ...}
    BE->>DB: SELECT id FROM chart_of_accounts\n  WHERE id IN (:assetAccountId, :accumDepAccountId, :depExpenseAccountId)\n    AND isActive=true
    alt any account not found or inactive
        BE-->>FE: 422 {error:"GL account not found or inactive"}
    else ok
        BE->>BE: monthlyDep = (acquisitionCost - salvageValue) / usefulLifeMonths\n  auto-generate assetNo = "FA-{YYYY}-{SEQ:3}"
        BE->>DB: INSERT fixed_assets\n  {assetNo, name, category, acquisitionDate, acquisitionCost,\n   salvageValue, usefulLifeMonths, depreciationMethod,\n   monthlyDepreciation:monthlyDep, assetAccountId,\n   accumDepAccountId, depExpenseAccountId,\n   status:'active', notes, createdBy, createdAt}
        DB-->>BE: assetId

        Note over BE,DB: Generate Depreciation Schedule
        BE->>BE: loop i=1 to usefulLifeMonths:\n  periodDate = LAST_DAY(acquisitionDate + i months)\n  accumDep = monthlyDep * i\n  nbv = acquisitionCost - accumDep
        BE->>DB: INSERT asset_depreciation_schedule[]\n  (assetId, periodDate, depAmount:monthlyDep,\n   accumDep, nbv, status:'scheduled')
        DB-->>BE: ok

        BE-->>FE: 201 {data: {id, assetNo, monthlyDepreciation:monthlyDep,\n  scheduleGeneratedMonths:usefulLifeMonths,\n  firstDepreciationDate}}
        FE-->>U: navigate → asset detail
    end
```

---

### API: `GET /api/finance/fixed-assets/:id`

**Purpose**
- ดู asset detail ครบ + depreciation to-date

**FE Screen**
- `/finance/fixed-assets/:id`

**Params**
- Path Params: `id` (asset ID)
- Query Params: ไม่มี

**Response Body (200)**
```json
{
  "data": {
    "id": "fa_001",
    "assetNo": "FA-2026-001",
    "name": "MacBook Pro 16",
    "category": "computer_equipment",
    "acquisitionDate": "2026-01-15",
    "acquisitionCost": 85000,
    "salvageValue": 5000,
    "usefulLifeMonths": 60,
    "depreciationMethod": "straight_line",
    "monthlyDepreciation": 1333.33,
    "accumulatedDepreciation": 6666.65,
    "netBookValue": 78333.35,
    "status": "active",
    "assetAccountId": "acc_1700",
    "accumDepAccountId": "acc_1701",
    "depExpenseAccountId": "acc_5600",
    "notes": "สำหรับทีม Dev",
    "monthsDepreciated": 5
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

    FE->>BE: GET /api/finance/fixed-assets/:id
    BE->>DB: SELECT * FROM fixed_assets WHERE id=:id
    alt not found
        BE-->>FE: 404 {error:"Fixed asset not found"}
    else found
        BE->>DB: SELECT SUM(depAmount) as accumulatedDep,\n  COUNT(*) as monthsDepreciated\n  FROM asset_depreciation_schedule\n  WHERE assetId=:id AND status='posted'
        DB-->>BE: asset + accumulatedDep + monthsDepreciated
        BE->>BE: netBookValue = acquisitionCost - accumulatedDepreciation
        BE-->>FE: 200 {data: asset + accumulatedDep + netBookValue}
    end
```

---

### API: `PATCH /api/finance/fixed-assets/:id`

**Purpose**
- แก้ไข asset metadata (name, notes, category) — ไม่เปลี่ยน financial fields หลังบันทึก

**FE Screen**
- Asset detail → edit mode

**Params**
- Path Params: `id` (asset ID)
- Query Params: ไม่มี

**Request Body**
```json
{
  "name": "MacBook Pro 16 (IT-001)",
  "category": "computer_equipment",
  "notes": "อัปเกรด RAM 64GB"
}
```

**Response Body (200)**
```json
{
  "data": { "id": "fa_001", "name": "MacBook Pro 16 (IT-001)", "updatedAt": "2026-04-27T10:00:00Z" },
  "message": "Asset updated"
}
```

**Sequence Diagram**
```mermaid
sequenceDiagram
    autonumber
    participant FE as Frontend
    participant BE as Backend API
    participant DB as PostgreSQL

    FE->>BE: PATCH /api/finance/fixed-assets/:id {name, category, notes}
    BE->>DB: SELECT id, status FROM fixed_assets WHERE id=:id
    alt not found
        BE-->>FE: 404 {error:"Fixed asset not found"}
    else status = disposed
        BE-->>FE: 422 {error:"Cannot edit a disposed asset"}
    else ok
        BE->>DB: UPDATE fixed_assets\n  SET name=:name, category=:category, notes=:notes, updatedAt=NOW()\n  WHERE id=:id
        DB-->>BE: updated
        BE-->>FE: 200 {data: {id, name, updatedAt}}
    end
```

---

### API: `GET /api/finance/fixed-assets/:id/schedule`

**Purpose**
- ดู depreciation schedule ทั้งหมดของสินทรัพย์นั้น (past + future)

**FE Screen**
- Asset detail → Depreciation Schedule tab

**Response Body (200)**
```json
{
  "data": [
    {
      "id": "sch_001",
      "periodDate": "2026-01-31",
      "depAmount": 1333.33,
      "accumDep": 1333.33,
      "nbv": 83666.67,
      "status": "posted",
      "journalId": "je_dep_001"
    },
    {
      "id": "sch_002",
      "periodDate": "2026-02-28",
      "depAmount": 1333.33,
      "accumDep": 2666.67,
      "nbv": 82333.33,
      "status": "posted",
      "journalId": "je_dep_002"
    },
    {
      "id": "sch_060",
      "periodDate": "2031-01-31",
      "depAmount": 1333.37,
      "accumDep": 80000,
      "nbv": 5000,
      "status": "scheduled",
      "journalId": null
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

    FE->>BE: GET /api/finance/fixed-assets/:id/schedule
    BE->>DB: SELECT asset_depreciation_schedule\n  WHERE assetId=:id ORDER BY periodDate ASC
    DB-->>BE: schedule[]
    BE-->>FE: 200 {data: schedule[]}
```

---

### API: `POST /api/finance/fixed-assets/:id/dispose`

**Purpose**
- บันทึกการขาย/ทิ้งสินทรัพย์ + คำนวณ gain/loss + post disposal journal

**FE Screen**
- Asset detail → "บันทึก Disposal" button

**Request Body**
```json
{
  "disposalDate": "2026-04-28",
  "disposalProceeds": 50000,
  "reason": "ขายให้พนักงาน"
}
```

**Response Body (200)**
```json
{
  "data": {
    "assetId": "fa_001",
    "status": "disposed",
    "nbvAtDisposal": 77917,
    "proceeds": 50000,
    "gainLoss": -27917,
    "gainLossType": "loss",
    "journalEntryId": "je_disp_001"
  },
  "message": "Asset disposed"
}
```

**Sequence Diagram**
```mermaid
sequenceDiagram
    autonumber
    participant U as accounting_manager
    participant FE as Frontend
    participant BE as Backend API
    participant DB as PostgreSQL
    participant JE as Journal Engine

    U->>FE: กรอก disposal form: disposalDate, proceeds, reason
    FE->>BE: POST /api/finance/fixed-assets/:id/dispose
    BE->>DB: SELECT asset WHERE id=:id AND status='active'
    alt not found or not active
        BE-->>FE: 422 {error:"Asset not found or already disposed"}
    else ok
        BE->>DB: SELECT SUM(depAmount) as accumDep\n  FROM schedule WHERE assetId=:id AND status='posted'
        DB-->>BE: accumDep
        BE->>BE: nbv = acquisitionCost - accumDep
        BE->>BE: gainLoss = proceeds - nbv\n  (positive = gain, negative = loss)

        Note over BE,JE: Post Disposal Journal
        BE->>JE: createAutoJournal {\n  lines: [\n    debit:  accumDepAccount,  amount: accumDep,\n    debit:  cashAccount,       amount: proceeds,\n    debit:  lossOnDisposal*,   amount: |gainLoss| (if loss),\n    credit: assetAccount,      amount: acquisitionCost,\n    credit: gainOnDisposal*,   amount: |gainLoss| (if gain)\n  ],\n  source: 'asset_disposal'\n}
        JE->>DB: INSERT + post journal
        DB-->>BE: journalId

        BE->>DB: UPDATE fixed_assets SET\n  status='disposed',\n  disposalDate, disposalProceeds
        BE->>DB: UPDATE remaining scheduled entries SET status='skipped'
        DB-->>BE: ok
        BE-->>FE: 200 {data: {nbvAtDisposal, proceeds, gainLoss, journalEntryId}}
        FE-->>U: แสดง disposal summary + journal link
    end
```

---

### API: `POST /api/internal/fixed-assets/run-monthly-depreciation` ← Cron Only

**Purpose**
- Cron job รันสิ้นเดือนเพื่อ post depreciation journal entries สำหรับ scheduled entries ที่ครบกำหนด

**Sequence Diagram**
```mermaid
sequenceDiagram
    autonumber
    participant CRON as Cron Job (Month-end 23:55)
    participant BE as Backend API
    participant DB as PostgreSQL
    participant JE as Journal Engine
    participant LOCK as Period Lock Check

    CRON->>BE: POST /api/internal/fixed-assets/run-monthly-depreciation
    BE->>BE: targetPeriod = LAST_DAY(THIS_MONTH)
    BE->>DB: SELECT s.*, fa.*\n  FROM asset_depreciation_schedule s\n  JOIN fixed_assets fa ON fa.id=s.assetId\n  WHERE s.periodDate = :targetPeriod\n    AND s.status = 'scheduled'\n    AND fa.status = 'active'
    DB-->>BE: due schedules[]

    loop ทุก schedule
        BE->>LOCK: check period not locked for targetPeriod
        alt period locked
            BE->>DB: UPDATE schedule SET status='skipped', notes='Period locked'
        else ok
            BE->>JE: createAutoJournal {\n  date: periodDate,\n  debit: depExpenseAccount, amount: depAmount,\n  credit: accumDepAccount, amount: depAmount,\n  source: 'asset_depreciation',\n  referenceId: assetId\n}
            JE->>DB: INSERT + post journal (auto-posted)
            BE->>DB: UPDATE schedule SET\n  status='posted', journalId
            BE->>DB: UPDATE fixed_assets accumulatedDep += depAmount

            alt schedule is last entry (nbv = salvageValue)
                BE->>DB: UPDATE fixed_assets SET status='fully_depreciated'
            end
        end
    end

    BE-->>CRON: {posted: N, skipped: M}
```

---

### API: `GET /api/finance/reports/asset-register`

**Purpose**
- รายงาน Asset Register: list สินทรัพย์ทั้งหมดพร้อม NBV และ depreciation to-date

**Params**
- Query Params: `asOfDate` (default today), `status`, `category`

**Response Body (200)**
```json
{
  "data": {
    "asOfDate": "2026-04-28",
    "summary": {
      "totalAssets": 12,
      "totalCost": 1250000,
      "totalAccumDep": 185000,
      "totalNBV": 1065000
    },
    "rows": [
      {
        "assetNo": "FA-2026-001",
        "name": "MacBook Pro 16",
        "category": "computer_equipment",
        "acquisitionDate": "2026-01-15",
        "acquisitionCost": 85000,
        "usefulLifeMonths": 60,
        "monthsDepreciated": 5,
        "monthlyDep": 1333.33,
        "accumDep": 6666.65,
        "nbv": 78333.35,
        "status": "active"
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

    FE->>BE: GET /api/finance/reports/asset-register?asOfDate=2026-04-28
    BE->>DB: SELECT fa.*,\n  SUM(CASE WHEN s.periodDate <= :asOfDate\n    THEN s.depAmount ELSE 0 END) as accumDep\n  FROM fixed_assets fa\n  LEFT JOIN asset_depreciation_schedule s\n    ON s.assetId = fa.id AND s.status='posted'\n  GROUP BY fa.id
    DB-->>BE: assets with accumDep[]
    BE->>BE: calculate nbv = acquisitionCost - accumDep
    BE->>BE: calculate summary totals
    BE-->>FE: 200 {data: {asOfDate, summary, rows[]}}
```

---

## Coverage Lock Notes

### Depreciation Methods Supported
| Method | Formula |
|---|---|
| Straight-line | `(cost - salvageValue) / usefulLifeMonths` |
| Declining Balance | `nbv * rate / 12` (rate = 2/usefulLifeYears for 200DB) |

### Journal Accounts Required (per asset)
- `assetAccountId` — ต้นทุนสินทรัพย์ (type: asset)
- `accumDepAccountId` — ค่าเสื่อมราคาสะสม (type: asset, contra)
- `depExpenseAccountId` — ค่าเสื่อมราคา (type: expense)
- `gainOnDisposalAccountId` — กำไรจากการขายสินทรัพย์ (type: income) — global config
- `lossOnDisposalAccountId` — ขาดทุนจากการขายสินทรัพย์ (type: expense) — global config

### AssetNo Auto-generation
- Format: `FA-{YYYY}-{3-digit seq}` เช่น `FA-2026-001`
- Sequence reset ทุกปี
