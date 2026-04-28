# Finance Module - Bank Statement Import & Auto-match

อ้างอิง: `Documents/Requirements/Release_3_Finance_Gaps.md` — Feature R3-04

## API Inventory
- `POST /api/finance/bank-accounts/:id/import-statement`
- `GET /api/finance/bank-accounts/:id/statement-imports`
- `GET /api/finance/statement-imports/:importId/lines`
- `POST /api/finance/statement-imports/:importId/confirm-matches`
- `PATCH /api/finance/statement-lines/:lineId/match`
- `POST /api/finance/statement-lines/:lineId/create-transaction`

---

## Endpoint Details

### API: `POST /api/finance/bank-accounts/:id/import-statement`

**Purpose**
- Upload CSV/Excel bank statement → parse → detect duplicate → run auto-match engine

**FE Screen**
- Bank Account Detail → Tab "Reconcile" → drag-drop zone

**Params**
- Path Params: `id` (bankAccountId)
- Query Params: ไม่มี

**Request Headers**
```json
{
  "Authorization": "Bearer <access_token>",
  "Content-Type": "multipart/form-data"
}
```

**Request Body (multipart)**
```
file: <CSV or XLSX file>
columnMapping: {
  "date": "วันที่",
  "description": "รายการ",
  "credit": "เงินเข้า",
  "debit": "เงินออก",
  "balance": "คงเหลือ",
  "reference": "อ้างอิง"
}
```

**Response Body (201)**
```json
{
  "data": {
    "importId": "imp_001",
    "totalLines": 45,
    "matchSummary": {
      "exact": 12,
      "probable": 8,
      "unmatched": 25
    },
    "periodFrom": "2026-04-01",
    "periodTo": "2026-04-30"
  },
  "message": "Statement imported and auto-matched"
}
```

**Sequence Diagram**
```mermaid
sequenceDiagram
    autonumber
    participant U as finance_manager
    participant FE as Frontend
    participant BE as Backend API
    participant MATCH as Match Engine
    participant DB as PostgreSQL

    U->>FE: drag & drop CSV file
    FE->>BE: POST /api/finance/bank-accounts/:id/import-statement\n  (multipart: file + columnMapping)

    BE->>BE: parse CSV / Excel → rows[]
    BE->>BE: validate column mapping (ต้องมี date, amount)
    alt parse error
        BE-->>FE: 422 {error:"Cannot parse file", details}
    else ok
        BE->>BE: detect periodFrom = min(txDate), periodTo = max(txDate)
        BE->>DB: SELECT id FROM bank_statement_imports\n  WHERE bankAccountId=:id\n    AND periodFrom=:from AND periodTo=:to
        alt duplicate import
            BE-->>FE: 409 {error:"Statement already imported for 2026-04", existingImportId}
        else new
            BE->>DB: INSERT bank_statement_imports {bankAccountId, fileName, periodFrom, periodTo, totalLines}
            BE->>DB: INSERT bank_statement_lines[] (status='unmatched')
            DB-->>BE: importId

            BE->>MATCH: runAutoMatch(importId, bankAccountId, periodFrom, periodTo)

            Note over MATCH,DB: Auto-Match Engine
            MATCH->>DB: SELECT ar_payments WHERE paymentDate BETWEEN\n  (periodFrom-3d) AND (periodTo+3d)
            MATCH->>DB: SELECT ap_payments WHERE paymentDate BETWEEN\n  (periodFrom-3d) AND (periodTo+3d)
            MATCH->>MATCH: for each statement line:\n  1. exact: amount + date match (±0) + referenceNo match\n  2. probable: amount match + date (±3 days)\n  3. unmatched: no match
            MATCH->>DB: UPDATE statement_lines SET matchStatus, matchedTxId, matchedTxType
            MATCH-->>BE: {exact:N, probable:M, unmatched:K}

            BE->>DB: UPDATE bank_statement_imports SET matchedLines=N+M
            BE-->>FE: 201 {data: {importId, totalLines, matchSummary}}
            FE-->>U: redirect → /finance/bank-accounts/:id/reconcile/:importId
        end
    end
```

---

### API: `GET /api/finance/bank-accounts/:id/statement-imports`

**Purpose**
- ดูประวัติ import ทั้งหมดของบัญชีนั้น

**FE Screen**
- Bank Account Detail → Tab "Reconcile" → import history

**Response Body (200)**
```json
{
  "data": [
    {
      "importId": "imp_001",
      "fileName": "kbank_apr2026.csv",
      "periodFrom": "2026-04-01",
      "periodTo": "2026-04-30",
      "totalLines": 45,
      "matchedLines": 20,
      "status": "pending",
      "importedAt": "2026-04-28T10:00:00Z"
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

    FE->>BE: GET /api/finance/bank-accounts/:id/statement-imports
    BE->>DB: SELECT bank_statement_imports WHERE bankAccountId=:id\n  ORDER BY importedAt DESC
    DB-->>BE: imports[]
    BE-->>FE: 200 {data: imports[]}
```

---

### API: `GET /api/finance/statement-imports/:importId/lines`

**Purpose**
- ดู statement lines พร้อม match status และ linked transaction detail

**FE Screen**
- `/finance/bank-accounts/:id/reconcile/:importId`

**Params**
- Path Params: `importId`
- Query Params: `matchStatus` (exact|probable|unmatched|confirmed), `page`, `limit`

**Response Body (200)**
```json
{
  "data": [
    {
      "id": "line_001",
      "txDate": "2026-04-15",
      "description": "โอนเงิน INV-2026-039",
      "amount": 220000,
      "referenceNo": "TT20260415",
      "balance": 2100000,
      "matchStatus": "exact",
      "matchedTx": {
        "id": "pay_001",
        "type": "ar_payment",
        "invoiceNo": "INV-2026-039",
        "customerName": "บ.MNO กรุ๊ป",
        "amount": 220000,
        "paymentDate": "2026-04-15"
      },
      "confirmedAt": null
    }
  ],
  "pagination": { "page": 1, "limit": 50, "total": 45 }
}
```

**Sequence Diagram**
```mermaid
sequenceDiagram
    autonumber
    participant FE as Frontend
    participant BE as Backend API
    participant DB as PostgreSQL

    FE->>BE: GET /api/finance/statement-imports/:importId/lines?matchStatus=exact
    BE->>DB: SELECT bank_statement_lines WHERE importId=:importId\n  AND matchStatus='exact'
    BE->>DB: JOIN matched tx details\n  (ar_payments OR ap_payments based on matchedTxType)
    DB-->>BE: lines[] with tx details
    BE-->>FE: 200 {data: lines[]}
```

---

### API: `POST /api/finance/statement-imports/:importId/confirm-matches`

**Purpose**
- Bulk confirm matches — รับ filter (exact หรือ specific lineIds) แล้ว mark confirmed + reconcile linked transactions

**FE Screen**
- Reconcile page → button "Confirm All Exact Matches"

**Request Body**
```json
{
  "filter": "exact",
  "lineIds": null
}
```
หรือ confirm specific lines:
```json
{
  "filter": "specific",
  "lineIds": ["line_001", "line_003", "line_007"]
}
```

**Response Body (200)**
```json
{
  "data": { "confirmed": 12 },
  "message": "12 matches confirmed"
}
```

**Sequence Diagram**
```mermaid
sequenceDiagram
    autonumber
    participant U as finance_manager
    participant FE as Frontend
    participant BE as Backend API
    participant DB as PostgreSQL

    U->>FE: กด "Confirm All Exact Matches"
    FE->>BE: POST /api/finance/statement-imports/:importId/confirm-matches\n  {filter:'exact'}

    BE->>DB: SELECT lines WHERE importId=:importId\n  AND matchStatus='exact' AND confirmedAt IS NULL
    DB-->>BE: lines[] (N rows)

    loop ทุก line (batch transaction)
        BE->>DB: UPDATE statement_lines SET\n  matchStatus='confirmed', confirmedBy, confirmedAt
        alt matchedTxType = 'ar_payment'
            BE->>DB: UPDATE ar_payments SET reconciled=true, reconciledAt
        else matchedTxType = 'ap_payment'
            BE->>DB: UPDATE ap_payments SET reconciled=true, reconciledAt
        end
    end

    BE->>DB: UPDATE bank_statement_imports SET matchedLines += N
    BE-->>FE: 200 {data: {confirmed: N}}
    FE-->>U: lines ย้ายไปยัง "Confirmed" section
```

---

### API: `PATCH /api/finance/statement-lines/:lineId/match`

**Purpose**
- Manual match: เชื่อม statement line กับ AR/AP payment ที่เลือก หรือ reject match เดิม

**FE Screen**
- Reconcile page → Probable Match section → dropdown เลือก transaction

**Request Body**
```json
{
  "action": "match",
  "txId": "pay_007",
  "txType": "ar_payment"
}
```
หรือ reject:
```json
{
  "action": "reject"
}
```

**Response Body (200)**
```json
{
  "data": {
    "id": "line_005",
    "matchStatus": "confirmed",
    "matchedTxId": "pay_007",
    "matchedTxType": "ar_payment"
  }
}
```

**Sequence Diagram**
```mermaid
sequenceDiagram
    autonumber
    participant U as finance_manager
    participant FE as Frontend
    participant BE as Backend API
    participant DB as PostgreSQL

    U->>FE: เลือก AR payment จาก dropdown → กด Confirm
    FE->>BE: PATCH /api/finance/statement-lines/:lineId/match\n  {action:'match', txId:'pay_007', txType:'ar_payment'}

    BE->>DB: SELECT line WHERE id=:lineId AND matchStatus != 'confirmed'
    alt already confirmed
        BE-->>FE: 422 {error:"Line already confirmed"}
    else ok
        BE->>DB: UPDATE statement_lines SET\n  matchStatus='confirmed', matchedTxId, matchedTxType,\n  confirmedBy, confirmedAt
        BE->>DB: UPDATE ar_payments SET reconciled=true WHERE id=:txId
        DB-->>BE: ok
        BE-->>FE: 200 {data: updated line}
        FE-->>U: line ย้ายไปยัง Confirmed section
    end
```

---

### API: `POST /api/finance/statement-lines/:lineId/create-transaction`

**Purpose**
- สร้าง manual bank transaction จาก unmatched statement line (เช่น ค่าธรรมเนียมธนาคาร, ดอกเบี้ยรับ)

**FE Screen**
- Reconcile page → Unmatched section → "สร้าง Manual Transaction"

**Request Body**
```json
{
  "transactionType": "expense",
  "categoryId": "cat_bank_fee",
  "description": "ค่าธรรมเนียมโอนเงิน",
  "glAccountId": "acc_6900"
}
```

**Response Body (201)**
```json
{
  "data": {
    "lineId": "line_025",
    "transactionId": "txn_manual_001",
    "matchStatus": "confirmed"
  },
  "message": "Manual transaction created and matched"
}
```

**Sequence Diagram**
```mermaid
sequenceDiagram
    autonumber
    participant U as finance_manager
    participant FE as Frontend
    participant BE as Backend API
    participant DB as PostgreSQL
    participant JE as Journal Engine

    U->>FE: เลือก category + กด "สร้าง Transaction"
    FE->>BE: POST /api/finance/statement-lines/:lineId/create-transaction\n  {transactionType, categoryId, description, glAccountId}

    BE->>DB: SELECT line WHERE id=:lineId AND matchStatus='unmatched'
    alt not unmatched
        BE-->>FE: 422 {error:"Line is not unmatched"}
    else ok
        BE->>DB: INSERT bank_account_transactions {\n  bankAccountId, date:line.txDate,\n  amount:line.amount, description,\n  type:transactionType, isManual:true\n}
        BE->>JE: createAutoJournal {\n  debit: glAccountId (if expense),\n  credit: bankGLAccountId,\n  amount: line.amount,\n  source: 'bank_manual'\n}
        JE->>DB: INSERT + post journal
        BE->>DB: UPDATE statement_lines SET\n  matchStatus='confirmed',\n  matchedTxId=newTxId,\n  matchedTxType='manual_tx',\n  confirmedBy, confirmedAt
        DB-->>BE: ok
        BE-->>FE: 201 {data: {lineId, transactionId, matchStatus:'confirmed'}}
        FE-->>U: line ย้ายไปยัง Confirmed section
    end
```

---

## Coverage Lock Notes

### Column Mapping Presets (UX)
ควรมี preset สำหรับธนาคารไทยหลัก:
| ธนาคาร | date col | credit col | debit col | ref col |
|---|---|---|---|---|
| กสิกรไทย | วันที่ | เงินเข้า | เงินออก | เลขที่อ้างอิง |
| ไทยพาณิชย์ | Date | Deposit | Withdrawal | Ref |
| กรุงเทพ | วันที่ทำรายการ | จำนวนเงิน(เข้า) | จำนวนเงิน(ออก) | เลขที่เอกสาร |

### Auto-match Scoring
| Condition | Match Status |
|---|---|
| amount exact + date exact + referenceNo contains invoiceNo | `exact` |
| amount exact + date ±3 days | `probable` |
| anything else | `unmatched` |

### Reconciliation Completion
- import status เปลี่ยนเป็น `completed` เมื่อ unmatched lines = 0
- สร้าง reconciliation summary: matched ✓N | total ฿X | difference ฿Y (vs system balance)
