# Finance Module - Bank Accounts (Normalized)

อ้างอิง: `Documents/Release_2.md`

## API Inventory
- `GET /api/finance/bank-accounts`
- `GET /api/finance/bank-accounts/options`
- `POST /api/finance/bank-accounts`
- `GET /api/finance/bank-accounts/:id`
- `PATCH /api/finance/bank-accounts/:id`
- `PATCH /api/finance/bank-accounts/:id/activate`
- `GET /api/finance/bank-accounts/:id/transactions`
- `POST /api/finance/bank-accounts/:id/transactions`
- `POST /api/finance/bank-accounts/:id/reconcile`

## Endpoint Details

### API: `GET /api/finance/bank-accounts`

**Purpose**
- ดึงรายชื่อบัญชีธนาคารทั้งหมด (Sub-flow A — List)

**FE Screen**
- BankAccountList (document: `Documents/UI_Flow_mockup/Page/R2-05_Cash_Bank_Management/BankAccountList.md`)

**Params**
- Path Params: ไม่มี
- Query Params: `page`, `limit`, `isActive` (optional)

**Request Headers**
```json
{
  "Authorization": "Bearer <access_token>"
}
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
      "id": "uuid",
      "code": "BA-001",
      "accountName": "บัญชีหลัก",
      "accountNo": "***9921",
      "bankName": "ธนาคารกสิกรไทย",
      "currentBalance": 1240500,
      "isActive": true,
      "currency": "THB"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 5
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

    FE->>BE: GET /api/finance/bank-accounts?isActive=true&page=1&limit=50
    BE->>DB: SELECT id, code, accountName, accountNo, bankName,\n  currentBalance, isActive, currency\n  FROM bank_accounts\n  WHERE (isActive=:isActive IF provided)\n  ORDER BY code ASC\n  LIMIT :limit OFFSET :offset
    DB-->>BE: bank_accounts[]
    BE-->>FE: 200 {data: accounts[], pagination}
```

---

### API: `GET /api/finance/bank-accounts/options`

**Purpose**
- Dropdown list สำหรับ AR payment / AP payment form — active accounts only

**FE Screen**
- Invoice payment form, AP Bill payment form → bank account dropdown

**Params**
- Path Params: ไม่มี
- Query Params: `search` (accountName/code), `currency` (optional)

**Request Headers**
```json
{
  "Authorization": "Bearer <access_token>"
}
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
      "id": "bk_001",
      "code": "BA-001",
      "accountName": "บัญชีหลัก",
      "bankName": "ธนาคารกสิกรไทย"
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

    FE->>BE: GET /api/finance/bank-accounts/options?search=กสิกร
    BE->>DB: SELECT id, code, accountName, bankName\n  FROM bank_accounts\n  WHERE isActive=true\n    AND (accountName ILIKE :search OR code ILIKE :search)\n  ORDER BY code ASC\n  LIMIT 50
    DB-->>BE: options[]
    BE-->>FE: 200 {data: options[]}
```

---

### API: `POST /api/finance/bank-accounts`

**Purpose**
- สร้างบัญชีธนาคารใหม่ (Sub-flow C — Create)

**FE Screen**
- BankAccountForm (document: `Documents/UI_Flow_mockup/Page/R2-05_Cash_Bank_Management/BankAccountForm.md`)

**Params**
- Path Params: ไม่มี
- Query Params: ไม่มี

**Request Headers**
```json
{
  "Authorization": "Bearer <access_token>",
  "Content-Type": "application/json"
}
```

**Request Body**
```json
{
  "code": "BA-001",
  "accountName": "บัญชีหลัก",
  "accountNo": "1234567890",
  "bankName": "ธนาคารกสิกรไทย",
  "branchName": "สาขากลาง",
  "accountType": "saving",
  "currency": "THB",
  "openingBalance": 500000,
  "glAccountId": "uuid-optional"
}
```

**Response Body (201)**
```json
{
  "data": {
    "id": "uuid",
    "code": "BA-001",
    "accountName": "บัญชีหลัก",
    "currentBalance": 500000,
    "isActive": true
  },
  "message": "บัญชีธนาคารถูกสร้างสำเร็จ"
}
```

**Sequence Diagram**
```mermaid
sequenceDiagram
    autonumber
    participant FE as Frontend
    participant BE as Backend API
    participant DB as PostgreSQL

    FE->>BE: POST /api/finance/bank-accounts\n  {code, accountName, accountNo, bankName, openingBalance, ...}
    BE->>DB: SELECT id FROM bank_accounts WHERE code=:code
    alt duplicate code
        BE-->>FE: 422 {error:"Bank account code already exists"}
    else ok
        BE->>DB: SELECT id FROM bank_accounts WHERE accountNo=:accountNo
        alt duplicate accountNo
            BE-->>FE: 422 {error:"Account number already registered"}
        else ok
            alt glAccountId provided
                BE->>DB: SELECT id FROM chart_of_accounts\n  WHERE id=:glAccountId AND isActive=true
                alt not found
                    BE-->>FE: 422 {error:"GL account not found or inactive"}
                end
            end
            BE->>DB: INSERT bank_accounts\n  {code, accountName, accountNo, bankName, branchName,\n   accountType, currency, currentBalance:openingBalance,\n   glAccountId, isActive:true, createdAt}
            DB-->>BE: bankAccountId
            BE-->>FE: 201 {data: {id, code, accountName, currentBalance, isActive:true}}
        end
    end
```

---

### API: `GET /api/finance/bank-accounts/:id`

**Purpose**
- ดูรายละเอียด bank account ครบ พร้อม balance summary

**FE Screen**
- BankAccountDetail (document: `Documents/UI_Flow_mockup/Page/R2-05_Cash_Bank_Management/BankAccountList.md`)

**Params**
- Path Params: `id` (bank account ID)
- Query Params: ไม่มี

**Request Headers**
```json
{
  "Authorization": "Bearer <access_token>"
}
```

**Request Body**
```json
{}
```

**Response Body (200)**
```json
{
  "data": {
    "id": "bk_001",
    "code": "BA-001",
    "accountName": "บัญชีหลัก",
    "accountNo": "***9921",
    "bankName": "ธนาคารกสิกรไทย",
    "branchName": "สาขากลาง",
    "accountType": "saving",
    "currency": "THB",
    "currentBalance": 1240500,
    "glAccountId": "coa_001",
    "isActive": true,
    "createdAt": "2026-01-01T00:00:00Z",
    "updatedAt": "2026-04-27T08:00:00Z"
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

    FE->>BE: GET /api/finance/bank-accounts/:id
    BE->>DB: SELECT * FROM bank_accounts WHERE id=:id
    alt not found
        BE-->>FE: 404 {error:"Bank account not found"}
    else found
        DB-->>BE: bank account row
        BE-->>FE: 200 {data: account}
    end
```

---

### API: `PATCH /api/finance/bank-accounts/:id`

**Purpose**
- แก้ไขข้อมูล bank account — code และ accountNo ไม่เปลี่ยน

**FE Screen**
- BankAccountForm edit mode

**Params**
- Path Params: `id` (bank account ID)
- Query Params: ไม่มี

**Request Headers**
```json
{
  "Authorization": "Bearer <access_token>",
  "Content-Type": "application/json"
}
```

**Request Body**
```json
{
  "accountName": "บัญชีหลัก (ปรับปรุง)",
  "bankName": "ธนาคารกสิกรไทย",
  "branchName": "สาขาสีลม",
  "glAccountId": "coa_001"
}
```

**Response Body (200)**
```json
{
  "data": {
    "id": "bk_001",
    "accountName": "บัญชีหลัก (ปรับปรุง)",
    "updatedAt": "2026-04-27T10:00:00Z"
  },
  "message": "อัปเดตบัญชีธนาคารสำเร็จ"
}
```

**Sequence Diagram**
```mermaid
sequenceDiagram
    autonumber
    participant FE as Frontend
    participant BE as Backend API
    participant DB as PostgreSQL

    FE->>BE: PATCH /api/finance/bank-accounts/:id\n  {accountName, branchName, glAccountId, ...}
    BE->>DB: SELECT * FROM bank_accounts WHERE id=:id
    alt not found
        BE-->>FE: 404 {error:"Bank account not found"}
    else ok
        alt glAccountId provided
            BE->>DB: SELECT id FROM chart_of_accounts\n  WHERE id=:glAccountId AND isActive=true
            alt not found
                BE-->>FE: 422 {error:"GL account not found or inactive"}
            end
        end
        BE->>DB: UPDATE bank_accounts\n  SET accountName=:accountName, branchName=:branchName,\n    glAccountId=:glAccountId, updatedAt=NOW()\n  WHERE id=:id
        DB-->>BE: updated
        BE-->>FE: 200 {data: {id, accountName, updatedAt}}
    end
```

---

### API: `PATCH /api/finance/bank-accounts/:id/activate`

**Purpose**
- Toggle isActive: deactivate บล็อก posting ใหม่ แต่ยังอ่าน history ได้

**FE Screen**
- BankAccountList → toggle active/inactive

**Params**
- Path Params: `id` (bank account ID)
- Query Params: ไม่มี

**Request Headers**
```json
{
  "Authorization": "Bearer <access_token>",
  "Content-Type": "application/json"
}
```

**Request Body**
```json
{ "isActive": false }
```

**Response Body (200)**
```json
{
  "data": {
    "id": "bk_001",
    "isActive": false,
    "updatedAt": "2026-04-27T10:00:00Z"
  },
  "message": "บัญชีธนาคารถูก deactivate สำเร็จ"
}
```

**Sequence Diagram**
```mermaid
sequenceDiagram
    autonumber
    participant FE as Frontend
    participant BE as Backend API
    participant DB as PostgreSQL

    FE->>BE: PATCH /api/finance/bank-accounts/:id/activate {isActive: false}
    BE->>DB: SELECT * FROM bank_accounts WHERE id=:id
    alt not found
        BE-->>FE: 404 {error:"Bank account not found"}
    else ok
        BE->>DB: UPDATE bank_accounts\n  SET isActive=:isActive, updatedAt=NOW()\n  WHERE id=:id
        DB-->>BE: updated
        BE-->>FE: 200 {data: {id, isActive, updatedAt}}
    end
```

---

### API: `GET /api/finance/bank-accounts/:id/transactions`

**Purpose**
- ดึงรายการเคลื่อนไหวของบัญชี (Sub-flow F — Transactions list)

**FE Screen**
- BankTransactions (document: `Documents/UI_Flow_mockup/Page/R2-05_Cash_Bank_Management/BankTransactions.md`)

**Params**
- Path Params: `id` (bank account ID)
- Query Params: `from` (date), `to` (date), `reconciled` (true/false), `type` (deposit/withdrawal/transfer), `page`, `limit`

**Request Headers**
```json
{
  "Authorization": "Bearer <access_token>"
}
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
      "id": "uuid",
      "transactionDate": "2026-04-15",
      "description": "โอนเข้า — ลูกค้าโอน",
      "type": "deposit",
      "amount": 50000,
      "runningBalance": 1240500,
      "referenceType": "invoice_payment",
      "referenceId": "INV-001",
      "sourceModule": "ar",
      "reconciled": true,
      "reconciledAt": "2026-04-15T10:30:00Z",
      "reconciledBy": "user-uuid"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 12
  },
  "summary": {
    "openingBalance": 1190500,
    "closingBalance": 1240500,
    "totalDeposits": 50000,
    "totalWithdrawals": 0
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

    FE->>BE: GET /api/finance/bank-accounts/:id/transactions\n  ?from=2026-04-01&to=2026-04-30&page=1
    BE->>DB: SELECT id FROM bank_accounts WHERE id=:id
    alt not found
        BE-->>FE: 404 {error:"Bank account not found"}
    else found
        par parallel queries
            BE->>DB: SELECT t.id, t.transactionDate, t.description, t.type,\n  t.amount, t.referenceType, t.referenceId, t.sourceModule,\n  t.reconciled, t.reconciledAt, t.reconciledBy\n  FROM bank_account_transactions t\n  WHERE t.bankAccountId=:id\n    AND (t.transactionDate BETWEEN :from AND :to IF provided)\n    AND (t.reconciled=:reconciled IF provided)\n    AND (t.type=:type IF provided)\n  ORDER BY t.transactionDate DESC, t.id DESC\n  LIMIT :limit OFFSET :offset
            BE->>DB: SELECT SUM(CASE WHEN type='deposit' THEN amount ELSE 0 END) as totalDeposits,\n  SUM(CASE WHEN type IN ('withdrawal','transfer') THEN amount ELSE 0 END) as totalWithdrawals\n  FROM bank_account_transactions\n  WHERE bankAccountId=:id\n    AND (transactionDate BETWEEN :from AND :to IF provided)
        end
        DB-->>BE: transactions[], summary
        BE->>BE: compute runningBalance per row (server-side)\n  openingBalance = currentBalance - totalDeposits + totalWithdrawals\n  closingBalance = currentBalance
        BE-->>FE: 200 {data: transactions[], pagination, summary}
    end
```

---

### API: `POST /api/finance/bank-accounts/:id/transactions`

**Purpose**
- บันทึกรายการเคลื่อนไหวด้วยมือ (Sub-flow G — Manual transaction)

**FE Screen**
- BankTransactions form (document: `Documents/UI_Flow_mockup/Page/R2-05_Cash_Bank_Management/BankTransactions.md`)

**Params**
- Path Params: `id` (bank account ID)
- Query Params: ไม่มี

**Request Headers**
```json
{
  "Authorization": "Bearer <access_token>",
  "Content-Type": "application/json"
}
```

**Request Body**
```json
{
  "transactionDate": "2026-04-12",
  "description": "ค่าธรรมเนียมธนาคาร",
  "type": "withdrawal",
  "amount": 25,
  "referenceType": "manual"
}
```

**Response Body (201)**
```json
{
  "data": {
    "id": "uuid",
    "transactionDate": "2026-04-12",
    "description": "ค่าธรรมเนียมธนาคาร",
    "type": "withdrawal",
    "amount": 25,
    "reconciled": false
  },
  "message": "บันทึกรายการสำเร็จ"
}
```

**Sequence Diagram**
```mermaid
sequenceDiagram
    autonumber
    participant FE as Frontend
    participant BE as Backend API
    participant DB as PostgreSQL

    FE->>BE: POST /api/finance/bank-accounts/:id/transactions\n  {transactionDate, description, type, amount, referenceType:'manual'}
    BE->>DB: SELECT id, isActive FROM bank_accounts WHERE id=:id
    alt not found
        BE-->>FE: 404 {error:"Bank account not found"}
    else isActive = false
        BE-->>FE: 422 {error:"Cannot post to inactive bank account"}
    else ok
        BE->>BE: validate amount > 0\n  validate type IN ('deposit','withdrawal','transfer')
        alt invalid amount or type
            BE-->>FE: 400 {error:"Invalid amount or transaction type"}
        else ok
            BE->>DB: INSERT bank_account_transactions\n  {bankAccountId:id, transactionDate, description,\n   type, amount, referenceType:'manual', referenceId:null,\n   sourceModule:'manual', reconciled:false, createdBy}
            DB-->>BE: transactionId
            BE->>DB: UPDATE bank_accounts\n  SET currentBalance = currentBalance\n    + CASE WHEN type='deposit' THEN amount ELSE -amount END,\n  updatedAt=NOW()\n  WHERE id=:id
            DB-->>BE: updated balance
            BE-->>FE: 201 {data: {id, transactionDate, description, type, amount, reconciled:false}}
        end
    end
```

---

### API: `POST /api/finance/bank-accounts/:id/reconcile`

**Purpose**
- ทำการกระทบยอด — mark รายการที่ตรงกับ bank statement (Sub-flow H — Reconcile)

**FE Screen**
- BankReconciliation (document: `Documents/UI_Flow_mockup/Page/R2-05_Cash_Bank_Management/BankReconciliation.md`)

**Params**
- Path Params: `id` (bank account ID)
- Query Params: ไม่มี

**Request Headers**
```json
{
  "Authorization": "Bearer <access_token>",
  "Content-Type": "application/json"
}
```

**Request Body**
```json
{
  "transactionIds": [
    "uuid-1",
    "uuid-2"
  ]
}
```

**Response Body (201)**
```json
{
  "data": {
    "reconciledCount": 2,
    "matchedIds": ["uuid-1", "uuid-2"],
    "reconciledAt": "2026-04-15T14:30:00Z",
    "reconciledBy": "user-uuid"
  },
  "message": "กระทบยอด 2 รายการสำเร็จ"
}
```

**Sequence Diagram**
```mermaid
sequenceDiagram
    autonumber
    participant FE as Frontend
    participant BE as Backend API
    participant DB as PostgreSQL

    FE->>BE: POST /api/finance/bank-accounts/:id/reconcile\n  {transactionIds: [uuid-1, uuid-2]}
    BE->>DB: SELECT id FROM bank_accounts WHERE id=:id
    alt not found
        BE-->>FE: 404 {error:"Bank account not found"}
    else ok
        BE->>BE: validate transactionIds[] is non-empty array
        alt empty array
            BE-->>FE: 400 {error:"transactionIds must not be empty"}
        else ok
            BE->>DB: SELECT id, bankAccountId, reconciled\n  FROM bank_account_transactions\n  WHERE id IN (:transactionIds)\n    AND bankAccountId=:id
            DB-->>BE: found transactions[]
            BE->>BE: check all requested IDs belong to this account\n  filter out already reconciled
            alt some IDs not found or belong to different account
                BE-->>FE: 422 {error:"Some transaction IDs are invalid or belong to another account",\n  invalidIds: [...]}
            else ok
                BE->>DB: UPDATE bank_account_transactions\n  SET reconciled=true,\n    reconciledAt=NOW(),\n    reconciledBy=:userId\n  WHERE id IN (:unreconciled transactionIds)
                DB-->>BE: updated rows
                BE-->>FE: 201 {data: {reconciledCount, matchedIds, reconciledAt, reconciledBy}}
            end
        end
    end
```

---

## Coverage Lock Addendum (2026-04-16)

### Required Contracts
- account list ต้องคืน `{ id, code, accountName, accountNo, bankName, currentBalance, isActive, currency }`
- account options (dropdown) ต้องคืน `{ id, code, accountName, bankName }` filter `isActive = true`
- transactions endpoint query params ต้องรองรับ `from`, `to`, `type`, `reconciled`, `page`, `limit`
- transaction row ต้องมี `id`, `transactionDate`, `description`, `type` (deposit/withdrawal/transfer), `amount`, `referenceType`, `referenceId`, `sourceModule`, `reconciled`, `reconciledAt`, `reconciledBy`
- reconcile request ต้องเป็น batch: `{ transactionIds: [uuid, ...] }` — ไม่ใช่ single match
- reconcile response ต้องมี `reconciledCount`, `matchedIds`, `reconciledAt`, `reconciledBy`
- ถ้ามี movement ที่มาจาก AR/AP payment ต้อง set `sourceModule` และ `referenceId` ชี้ไปยัง invoice/AP bill

### Side Effects Lock
- AR/AP payment create ที่ระบุ `bankAccountId` ต้องสร้าง movement row ใน bank ledger
- inactive bank account ต้อง block new postings แต่ยังอ่าน history ได้
