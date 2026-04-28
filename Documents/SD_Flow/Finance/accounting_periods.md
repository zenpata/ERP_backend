# Finance Module - Accounting Periods (Period Lock)

อ้างอิง: `Documents/Requirements/Release_3_Finance_Gaps.md` — Feature R3-08

## API Inventory
- `GET /api/finance/accounting-periods`
- `POST /api/finance/accounting-periods`
- `POST /api/finance/accounting-periods/:period/lock`
- `POST /api/finance/accounting-periods/:period/unlock`

## Cross-cutting Concern
Period Lock เป็น **validation hook** ที่ทุก endpoint ที่สร้าง/แก้ transaction ต้องเรียกก่อน commit:
- `POST /api/finance/journal-entries`
- `POST /api/finance/invoices`
- `PATCH /api/finance/invoices/:id/status`
- `POST /api/finance/ap/vendor-invoices`
- `POST /api/finance/ap/vendor-invoices/:id/payments`
- `POST /api/finance/tax/wht-certificates`
- `POST /api/inventory/products/:id/adjust`

Error code มาตรฐาน: `PERIOD_LOCKED` (HTTP 422)

---

## Endpoint Details

### API: `GET /api/finance/accounting-periods`

**Purpose**
- ดึงรายการ accounting periods พร้อมสถานะ open/locked

**FE Screen**
- `/finance/settings/accounting-periods`

**Params**
- Path Params: ไม่มี
- Query Params: `year` (optional, YYYY)

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
      "period": "2026-04",
      "status": "open",
      "lockedBy": null,
      "lockedAt": null,
      "draftCount": 2
    },
    {
      "period": "2026-03",
      "status": "locked",
      "lockedBy": { "id": "usr_001", "name": "นาย ก สมบูรณ์" },
      "lockedAt": "2026-04-05T09:00:00Z",
      "draftCount": 0
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

    FE->>BE: GET /api/finance/accounting-periods?year=2026
    par parallel queries
        BE->>DB: SELECT ap.period, ap.status, ap.lockedAt,\n  u.id as lockedById, u.name as lockedByName\n  FROM accounting_periods ap\n  LEFT JOIN users u ON u.id=ap.lockedBy\n  WHERE (:year IS NULL OR LEFT(ap.period, 4)=:year)\n  ORDER BY ap.period DESC
        BE->>DB: SELECT period, COUNT(*) as draftCount\n  FROM journal_entries\n  WHERE status='draft'\n    AND (:year IS NULL OR LEFT(TO_CHAR(entryDate,'YYYY-MM'), 4)=:year)\n  GROUP BY period
    end
    DB-->>BE: periods[] + draftCountsByPeriod{}
    BE->>BE: merge: for each period, draftCount = draftCountsByPeriod[period] ?? 0\n  build lockedBy: {id, name} if lockedById not null
    BE-->>FE: 200 {data: periods[]}
```

---

### API: `POST /api/finance/accounting-periods`

**Purpose**
- สร้าง period record ใหม่ (auto-create เมื่อ first transaction ของ period นั้น หรือ manual)

**FE Screen**
- `/finance/settings/accounting-periods`

**Params**
- Path Params: ไม่มี
- Query Params: ไม่มี

**Request Headers**
```json
{ "Authorization": "Bearer <access_token>" }
```

**Request Body**
```json
{ "period": "2026-05" }
```

**Response Body (201)**
```json
{
  "data": { "period": "2026-05", "status": "open" },
  "message": "Period created"
}
```

**Sequence Diagram**
```mermaid
sequenceDiagram
    autonumber
    participant FE as Frontend
    participant BE as Backend API
    participant DB as PostgreSQL

    FE->>BE: POST /api/finance/accounting-periods {period: "2026-05"}
    BE->>DB: SELECT * FROM accounting_periods WHERE period="2026-05"
    alt already exists
        BE-->>FE: 409 {error: "Period already exists"}
    else not exists
        BE->>DB: INSERT accounting_periods (period, status='open')
        DB-->>BE: created
        BE-->>FE: 201 {data: {period, status:'open'}}
    end
```

---

### API: `POST /api/finance/accounting-periods/:period/lock`

**Purpose**
- Lock accounting period — ป้องกัน backdating transaction ทุกประเภทในช่วงนั้น

**FE Screen**
- `/finance/settings/accounting-periods` → modal confirm

**Params**
- Path Params: `period` (YYYY-MM)
- Query Params: ไม่มี

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
    "period": "2026-03",
    "status": "locked",
    "lockedBy": "usr_001",
    "lockedAt": "2026-04-05T09:00:00Z"
  },
  "message": "Period locked"
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

    U->>FE: กด Lock period "2026-03"
    FE->>BE: GET /api/finance/accounting-periods (refresh draftCount)
    BE->>DB: SELECT COUNT(*) draft journals WHERE period='2026-03'
    DB-->>BE: draftCount=2
    BE-->>FE: draftCount=2
    FE-->>U: modal warning "มี 2 draft journal ยังไม่ post ใน มี.ค. 2026"

    U->>FE: กด "Lock เลย"
    FE->>BE: POST /api/finance/accounting-periods/2026-03/lock
    BE->>DB: SELECT status FROM accounting_periods WHERE period='2026-03'
    alt already locked
        BE-->>FE: 409 {error:"Period already locked"}
    else open
        BE->>DB: UPDATE accounting_periods SET status='locked', lockedBy, lockedAt
        DB-->>BE: updated
        BE-->>FE: 200 {data: {period, status:'locked', lockedBy, lockedAt}}
        FE-->>U: period badge เปลี่ยนเป็น "🔒 Locked"
    end
```

---

### API: `POST /api/finance/accounting-periods/:period/unlock`

**Purpose**
- Unlock period (เฉพาะ `super_admin`) — บันทึก audit trail ทุกครั้ง

**FE Screen**
- `/finance/settings/accounting-periods`

**Params**
- Path Params: `period` (YYYY-MM)
- Query Params: ไม่มี

**Request Headers**
```json
{ "Authorization": "Bearer <access_token>" }
```

**Request Body**
```json
{ "reason": "แก้ไข accrual entry ที่ผิดพลาด — อนุมัติโดย CFO" }
```

**Response Body (200)**
```json
{
  "data": {
    "period": "2026-03",
    "status": "open",
    "unlockedBy": "usr_super",
    "unlockReason": "แก้ไข accrual entry ที่ผิดพลาด — อนุมัติโดย CFO",
    "unlockedAt": "2026-04-10T10:00:00Z"
  },
  "message": "Period unlocked"
}
```

**Sequence Diagram**
```mermaid
sequenceDiagram
    autonumber
    participant U as super_admin
    participant FE as Frontend
    participant BE as Backend API
    participant DB as PostgreSQL
    participant AUDIT as Audit Log

    U->>FE: กด Unlock period "2026-03" + กรอก reason
    FE->>BE: POST /api/finance/accounting-periods/2026-03/unlock {reason}
    BE->>BE: verify role === 'super_admin'
    alt not super_admin
        BE-->>FE: 403 {error:"Only super_admin can unlock periods"}
    else authorized
        BE->>DB: UPDATE accounting_periods SET status='open', unlockedBy, unlockReason, unlockedAt
        BE->>AUDIT: INSERT audit_log (action='period_unlock', period, reason, actor)
        DB-->>BE: updated
        BE-->>FE: 200 {data: {period, status:'open'}}
        FE-->>U: period badge เปลี่ยนเป็น "Open" + แสดง unlock reason
    end
```

---

## Period Lock Validation Hook (Cross-cutting)

ทุก endpoint ที่ create/update transaction ต้องเรียก validation นี้ก่อน commit:

```mermaid
sequenceDiagram
    autonumber
    participant BE as Any Transaction Endpoint
    participant DB as PostgreSQL
    participant FE as Frontend (caller)

    Note over BE,DB: Period Lock Validation (shared subroutine)
    BE->>BE: derive targetPeriod = TO_CHAR(txDate, 'YYYY-MM')
    BE->>DB: SELECT status FROM accounting_periods\n  WHERE period=:targetPeriod
    alt period not found (null)
        BE->>DB: INSERT accounting_periods\n  {period: targetPeriod, status:'open', createdAt: NOW()}\n  ON CONFLICT (period) DO NOTHING
        Note over BE: treat as 'open' — proceed
    else status = 'locked'
        BE-->>FE: 422 {\n  error: "Period {targetPeriod} is locked",\n  code: "PERIOD_LOCKED",\n  period: "{targetPeriod}"\n}
    else status = 'open'
        Note over BE: period is open — proceed with transaction
    end
```

---

## Coverage Lock Notes

### Period Format
- ใช้ `YYYY-MM` เสมอ (เช่น `2026-04`) — ไม่รับ full date เป็น period key
- ถ้า transaction date = `2026-04-15` → period = `2026-04`

### Permission Matrix
| Action | accounting_manager | finance_manager | super_admin |
|---|---|---|---|
| View periods | ✅ | ✅ | ✅ |
| Lock period | ✅ | ❌ | ✅ |
| Unlock period | ❌ | ❌ | ✅ |

### Auto-create Period
- เมื่อ transaction แรกของ period ถูกสร้าง ระบบ auto-insert record `{period, status:'open'}` ถ้ายังไม่มี
- ไม่ต้องให้ user สร้าง period ก่อนใช้งาน
