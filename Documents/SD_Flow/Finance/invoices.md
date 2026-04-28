# Finance Module - Invoices / AR (Normalized)

อ้างอิง: `Documents/Requirements/Release_1.md` — Feature 1.6, `Documents/Requirements/Release_2.md`

## API Inventory
- `GET /api/finance/invoices`
- `POST /api/finance/invoices`
- `GET /api/finance/invoices/:id`
- `PATCH /api/finance/invoices/:id/status`
- `POST /api/finance/invoices/:id/payments`
- `GET /api/finance/invoices/:id/payments`

---

## Endpoint Details

### API: `GET /api/finance/invoices`

**Purpose**
- ดึงรายการ invoices ทั้งหมด พร้อม filter และ pagination พร้อม read model ครบ

**FE Screen**
- `/finance/invoices`

**Params**
- Query Params: `status` (draft|sent|partially_paid|paid|overdue|voided), `customerId`, `issueDateFrom` (YYYY-MM-DD), `issueDateTo` (YYYY-MM-DD), `search` (invoiceNo/customerName), `source` (manual|recurring), `page`, `limit`

**Response Body (200)**
```json
{
  "data": [
    {
      "id": "inv_001",
      "invoiceNo": "INV-2026-0001",
      "customerId": "cust_001",
      "customerName": "บริษัท ABC จำกัด",
      "issueDate": "2026-04-10",
      "dueDate": "2026-04-25",
      "subtotal": 15000,
      "vatAmount": 1050,
      "grandTotal": 16050,
      "paidAmount": 0,
      "balanceDue": 16050,
      "status": "sent",
      "source": "manual",
      "sentAt": "2026-04-10T10:00:00Z"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 42 }
}
```

**Sequence Diagram**
```mermaid
sequenceDiagram
    autonumber
    participant FE as Frontend
    participant BE as Backend API
    participant DB as PostgreSQL

    FE->>BE: GET /api/finance/invoices?status=sent&page=1
    BE->>DB: SELECT i.*, c.name as customerName,\n  SUM(ii.lineTotal) as subtotal,\n  SUM(ii.vatAmount) as vatAmount,\n  COALESCE(SUM(p.amount), 0) as paidAmount\n  FROM invoices i\n  JOIN customers c ON c.id=i.customerId\n  LEFT JOIN invoice_items ii ON ii.invoiceId=i.id\n  LEFT JOIN invoice_payments p ON p.invoiceId=i.id\n  WHERE i.status='sent'\n  GROUP BY i.id, c.name\n  ORDER BY i.issueDate DESC\n  LIMIT :limit OFFSET :offset
    DB-->>BE: invoices[]
    BE->>BE: compute per row:\n  grandTotal = subtotal + vatAmount\n  balanceDue = grandTotal - paidAmount
    BE-->>FE: 200 {data: invoices[], pagination}
```

---

### API: `POST /api/finance/invoices`

**Purpose**
- สร้าง invoice ใหม่ (draft) พร้อม line items — auto-compute VAT, auto-gen invoiceNo

**FE Screen**
- `/finance/invoices/new`

**Request Body**
```json
{
  "customerId": "cust_001",
  "issueDate": "2026-04-10",
  "dueDate": "2026-04-25",
  "notes": "April IT service fee",
  "items": [
    {
      "description": "Monthly IT Service",
      "quantity": 1,
      "unitPrice": 15000,
      "taxRate": 7,
      "productId": null
    }
  ]
}
```

**Response Body (201)**
```json
{
  "data": {
    "id": "inv_001",
    "invoiceNo": "INV-2026-0001",
    "status": "draft",
    "subtotal": 15000,
    "vatAmount": 1050,
    "grandTotal": 16050,
    "balanceDue": 16050
  },
  "message": "Invoice created"
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
    participant LOCK as Period Lock

    U->>FE: กรอก invoice form + line items
    FE->>BE: POST /api/finance/invoices\n  {customerId, issueDate, dueDate, items:[...]}

    BE->>LOCK: checkPeriodLock(issueDate)
    alt period locked
        BE-->>FE: 422 {error:"Period YYYY-MM is locked", code:"PERIOD_LOCKED"}
    else open
        BE->>DB: SELECT customers WHERE id=:customerId AND isActive=true
        alt customer not found or inactive
            BE-->>FE: 422 {error:"Customer not found or inactive"}
        else ok
            BE->>BE: per item:\n  lineTotal = quantity * unitPrice\n  vatAmount = lineTotal * (taxRate/100)\n  subtotal = SUM(lineTotal)\n  totalVat = SUM(vatAmount)\n  grandTotal = subtotal + totalVat
            BE->>BE: auto-generate invoiceNo = "INV-{YYYY}-{SEQ:4}"
            BE->>DB: INSERT invoices {customerId, invoiceNo, issueDate, dueDate,\n  subtotal, vatAmount, grandTotal, status:'draft', notes, source:'manual', createdBy}
            DB-->>BE: invoiceId
            BE->>DB: INSERT invoice_items[] (invoiceId, description, quantity, unitPrice, lineTotal, taxRate, vatAmount, productId)
            DB-->>BE: ok
            BE-->>FE: 201 {data: {id, invoiceNo, status:'draft', subtotal, vatAmount, grandTotal, balanceDue}}
            FE-->>U: navigate → invoice detail
        end
    end
```

---

### API: `GET /api/finance/invoices/:id`

**Purpose**
- ดู invoice detail ครบ: header, line items, ประวัติการชำระ, และ linked source (SO/recurring)

**FE Screen**
- `/finance/invoices/:id`

**Response Body (200)**
```json
{
  "data": {
    "id": "inv_001",
    "invoiceNo": "INV-2026-0001",
    "customerId": "cust_001",
    "customerName": "บริษัท ABC จำกัด",
    "customerTaxId": "0105561234567",
    "issueDate": "2026-04-10",
    "dueDate": "2026-04-25",
    "status": "partially_paid",
    "source": "manual",
    "recurringTemplateId": null,
    "soId": null,
    "notes": "April IT service fee",
    "subtotal": 15000,
    "vatAmount": 1050,
    "grandTotal": 16050,
    "paidAmount": 6050,
    "balanceDue": 10000,
    "sentAt": "2026-04-10T10:00:00Z",
    "items": [
      {
        "id": "ii_001",
        "description": "Monthly IT Service",
        "quantity": 1,
        "unitPrice": 15000,
        "taxRate": 7,
        "lineTotal": 15000,
        "vatAmount": 1050,
        "productId": null
      }
    ],
    "payments": [
      {
        "id": "pay_001",
        "paymentDate": "2026-04-20",
        "amount": 6050,
        "paymentMethod": "bank_transfer",
        "referenceNo": "TRF-20260420-001",
        "bankAccountId": "bk_001"
      }
    ],
    "createdBy": { "id": "usr_001", "name": "นาย ก" }
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

    FE->>BE: GET /api/finance/invoices/:id
    BE->>DB: SELECT invoice WHERE id=:id
    alt not found
        BE-->>FE: 404 {error:"Invoice not found"}
    else found
        par parallel queries
            BE->>DB: SELECT items FROM invoice_items WHERE invoiceId=:id ORDER BY id ASC
            BE->>DB: SELECT payments FROM invoice_payments\n  WHERE invoiceId=:id ORDER BY paymentDate ASC
            BE->>DB: SELECT customer WHERE id=invoice.customerId
        end
        DB-->>BE: invoice + items[] + payments[] + customer
        BE->>BE: paidAmount = SUM(payments.amount)\n  balanceDue = grandTotal - paidAmount
        BE-->>FE: 200 {data: invoice + items[] + payments[]}
    end
```

---

### API: `PATCH /api/finance/invoices/:id/status`

**Purpose**
- เปลี่ยน status ตาม workflow: `draft → sent`, `sent → voided`
- เมื่อ status = `sent` → trigger inventory stock OUT + COGS journal สำหรับ product lines

**FE Screen**
- Invoice detail → ปุ่ม "ส่ง Invoice" หรือ "Void"

**Request Body**
```json
{ "status": "sent" }
```

**Response Body (200)**
```json
{
  "data": { "id": "inv_001", "status": "sent", "sentAt": "2026-04-10T10:00:00Z" },
  "message": "Invoice sent"
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
    participant INV as Inventory Service
    participant JE as Journal Engine
    participant LOCK as Period Lock

    U->>FE: กด "ส่ง Invoice"
    FE->>BE: PATCH /api/finance/invoices/:id/status {status:'sent'}

    BE->>DB: SELECT invoice WHERE id=:id
    alt not found
        BE-->>FE: 404
    else invalid transition
        BE-->>FE: 422 {error:"Invalid status transition: {current} → {target}"}
    else ok
        BE->>LOCK: checkPeriodLock(invoice.issueDate)
        alt period locked
            BE-->>FE: 422 {error:"Period locked", code:"PERIOD_LOCKED"}
        else open
            alt status = sent (draft → sent)
                BE->>DB: SELECT invoice_lines WHERE invoiceId=:id AND productId IS NOT NULL
                DB-->>BE: product lines[]

                loop ทุก product line ที่มี productId
                    BE->>INV: POST /internal/inventory/out\n  {productId, quantity, referenceType:'invoice', referenceId}
                    alt insufficient stock
                        INV-->>BE: 422 {error:"Insufficient stock for product X"}
                        Note over BE: rollback all stock movements
                        BE-->>FE: 422 {error:"Insufficient stock for [productName]"}
                    else ok
                        INV->>DB: INSERT stock_movements (OUT)
                        INV->>JE: createAutoJournal (COGS debit / Inventory credit)
                    end
                end

                BE->>DB: UPDATE invoices SET status='sent', sentAt=NOW()
                BE-->>FE: 200 {data: {id, status:'sent', sentAt}}

            else status = voided
                BE->>DB: UPDATE invoices SET status='voided', updatedAt=NOW()
                BE-->>FE: 200 {data: {id, status:'voided'}}
            end
        end
    end
```

---

### API: `POST /api/finance/invoices/:id/payments`

**Purpose**
- บันทึก AR payment (full หรือ partial) พร้อม bank ledger posting และ journal entry

**FE Screen**
- Invoice detail → ปุ่ม "บันทึกการรับชำระ"

**Request Body**
```json
{
  "paymentDate": "2026-04-20",
  "amount": 6050,
  "paymentMethod": "bank_transfer",
  "bankAccountId": "bk_001",
  "referenceNo": "TRF-20260420-001",
  "notes": "Full payment received"
}
```

**Response Body (201)**
```json
{
  "data": {
    "paymentId": "pay_001",
    "invoiceId": "inv_001",
    "paidAmount": 6050,
    "balanceDue": 10000,
    "invoiceStatus": "partially_paid",
    "bankTransactionId": "txn_001",
    "journalEntryId": "je_ar_001"
  },
  "message": "Payment recorded"
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
    participant LOCK as Period Lock

    U->>FE: กรอก payment form
    FE->>BE: POST /api/finance/invoices/:id/payments\n  {paymentDate, amount, bankAccountId, paymentMethod}

    BE->>DB: SELECT invoice WHERE id=:id
    alt not found
        BE-->>FE: 404
    else status = draft, paid, or voided
        BE-->>FE: 422 {error:"Payment not allowed for current invoice status"}
    else ok
        BE->>LOCK: checkPeriodLock(paymentDate)
        alt period locked
            BE-->>FE: 422 {error:"Period locked", code:"PERIOD_LOCKED"}
        else open
            BE->>BE: currentBalanceDue = grandTotal - paidAmount
            alt amount > currentBalanceDue
                BE-->>FE: 422 {error:"Payment exceeds balance due", balanceDue: currentBalanceDue}
            else ok
                BE->>DB: SELECT bank_accounts WHERE id=:bankAccountId AND isActive=true
                alt not found
                    BE-->>FE: 422 {error:"Bank account not found"}
                else ok
                    BE->>DB: INSERT invoice_payments\n  {invoiceId, paymentDate, amount, paymentMethod,\n   bankAccountId, referenceNo, notes, createdBy}
                    DB-->>BE: paymentId

                    BE->>BE: newPaidAmount = currentPaid + amount\n  newStatus = paid (>= grandTotal) | partially_paid

                    Note over BE,JE: Post AR Payment Journal
                    BE->>JE: createAutoJournal {\n  date: paymentDate, source:'ar_payment',\n  lines: [\n    {accountId: bankGLAccountId, debit: amount},\n    {accountId: arAccountId, credit: amount}\n  ]\n}
                    JE->>DB: INSERT + post journal
                    DB-->>BE: journalId

                    BE->>DB: INSERT bank_account_transactions {\n  bankAccountId, amount:+amount (inflow),\n  referenceType:'ar_payment', referenceId:invoiceId\n}
                    DB-->>BE: bankTransactionId

                    BE->>DB: UPDATE invoices SET\n  paidAmount=newPaidAmount,\n  balanceDue=grandTotal-newPaidAmount,\n  status=newStatus
                    DB-->>BE: ok
                    BE-->>FE: 201 {data: {paymentId, paidAmount, balanceDue, invoiceStatus, bankTransactionId, journalEntryId}}
                end
            end
        end
    end
```

---

### API: `GET /api/finance/invoices/:id/payments`

**Purpose**
- ดูรายการ payments ทั้งหมดของ invoice พร้อม bank reference

**FE Screen**
- Invoice detail → Payment History section

**Response Body (200)**
```json
{
  "data": [
    {
      "id": "pay_001",
      "paymentDate": "2026-04-20",
      "amount": 6050,
      "paymentMethod": "bank_transfer",
      "referenceNo": "TRF-20260420-001",
      "bankAccountId": "bk_001",
      "bankAccountName": "กสิกรไทย xxx-1234",
      "bankTransactionId": "txn_001",
      "createdBy": { "id": "usr_001", "name": "นาย ก" },
      "createdAt": "2026-04-20T14:30:00Z"
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

    FE->>BE: GET /api/finance/invoices/:id/payments
    BE->>DB: SELECT p.*, ba.name as bankAccountName\n  FROM invoice_payments p\n  LEFT JOIN bank_accounts ba ON ba.id=p.bankAccountId\n  WHERE p.invoiceId=:id\n  ORDER BY p.paymentDate ASC
    DB-->>BE: payments[]
    BE-->>FE: 200 {data: payments[]}
```

---

## Coverage Lock Notes

### Status Workflow
```
draft → sent → partially_paid → paid
             ↘ voided
overdue (cron daily: set when dueDate < today AND status = sent)
```

### invoiceNo Auto-generation
- Format: `INV-{YYYY}-{4-digit seq}` เช่น `INV-2026-0001`
- Sequence reset ทุกปี

### Read Model Fields (mandatory)
- `subtotal`, `vatAmount`, `grandTotal`, `paidAmount`, `balanceDue` ต้องอยู่ใน response ทุก list/detail call

### Inventory Hook
- เมื่อ status → `sent`: trigger stock OUT + COGS journal ต่อทุก product line (productId != null)
- Service items (productId = null หรือ trackInventory=false) → skip
- Insufficient stock → rollback status change → 422

### Bank Ledger Side Effect
- `POST /id/payments` → INSERT `bank_account_transactions` (inflow) + GL journal
- คืน `bankTransactionId` + `journalEntryId` ใน response
