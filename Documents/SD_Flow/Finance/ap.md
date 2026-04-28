# Finance Module - Accounts Payable (Normalized)

อ้างอิง: `Documents/Requirements/Release_1.md` — Feature 1.8, `Documents/Requirements/Release_2.md`

## API Inventory
- `GET /api/finance/ap/vendor-invoices`
- `GET /api/finance/ap/vendor-invoices/:id`
- `POST /api/finance/ap/vendor-invoices`
- `PATCH /api/finance/ap/vendor-invoices/:id/status`
- `POST /api/finance/ap/vendor-invoices/:id/payments`

---

## Endpoint Details

### API: `GET /api/finance/ap/vendor-invoices`

**Purpose**
- ดึงรายการ AP bills ทั้งหมดพร้อม filter status, vendor, วันที่ และ pagination

**FE Screen**
- `/finance/ap`

**Params**
- Query Params: `status` (draft|submitted|approved|rejected|paid|partially_paid), `vendorId`, `invoiceDateFrom` (YYYY-MM-DD), `invoiceDateTo` (YYYY-MM-DD), `search` (documentNo/vendorInvoiceNo), `page`, `limit`

**Response Body (200)**
```json
{
  "data": [
    {
      "id": "ap_001",
      "documentNo": "AP-2026-0001",
      "vendorId": "ven_001",
      "vendorName": "บ.XYZ ซัพพลาย จำกัด",
      "vendorInvoiceNo": "V-INV-778",
      "invoiceDate": "2026-04-05",
      "dueDate": "2026-05-05",
      "totalAmount": 12000,
      "paidAmount": 4000,
      "remainingAmount": 8000,
      "paymentCount": 1,
      "status": "partially_paid",
      "statusSummary": {
        "documentStatus": "approved",
        "paymentStatus": "partially_paid",
        "isOverdue": false,
        "lastPaymentDate": "2026-04-20"
      }
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 15 }
}
```

**Sequence Diagram**
```mermaid
sequenceDiagram
    autonumber
    participant FE as Frontend
    participant BE as Backend API
    participant DB as PostgreSQL

    FE->>BE: GET /api/finance/ap/vendor-invoices?status=approved&page=1
    BE->>DB: SELECT b.*, v.name as vendorName,\n  SUM(p.amount) as paidAmount,\n  COUNT(p.id) as paymentCount,\n  MAX(p.paymentDate) as lastPaymentDate\n  FROM finance_ap_bills b\n  JOIN vendors v ON v.id=b.vendorId\n  LEFT JOIN finance_ap_vendor_invoice_payments p ON p.billId=b.id\n  WHERE b.status='approved'\n  GROUP BY b.id, v.name\n  ORDER BY b.invoiceDate DESC\n  LIMIT :limit OFFSET :offset
    DB-->>BE: bills[]
    BE->>BE: compute per row:\n  remainingAmount = totalAmount - paidAmount\n  statusSummary.paymentStatus = unpaid/partially_paid/paid\n  statusSummary.isOverdue = (dueDate < today AND remainingAmount > 0)
    BE-->>FE: 200 {data: bills[], pagination}
```

---

### API: `GET /api/finance/ap/vendor-invoices/:id`

**Purpose**
- ดู AP bill detail พร้อม line items, ประวัติการชำระเงิน (payments), และ statusSummary ครบ

**FE Screen**
- `/finance/ap/:id`

**Response Body (200)**
```json
{
  "data": {
    "id": "ap_001",
    "documentNo": "AP-2026-0001",
    "vendorId": "ven_001",
    "vendorName": "บ.XYZ ซัพพลาย จำกัด",
    "vendorInvoiceNo": "V-INV-778",
    "invoiceDate": "2026-04-05",
    "dueDate": "2026-05-05",
    "notes": "Office supplies April",
    "totalAmount": 12000,
    "paidAmount": 4000,
    "remainingAmount": 8000,
    "paymentCount": 1,
    "status": "partially_paid",
    "statusSummary": {
      "documentStatus": "approved",
      "paymentStatus": "partially_paid",
      "isOverdue": false,
      "lastPaymentDate": "2026-04-20"
    },
    "items": [
      {
        "id": "api_001",
        "description": "Printer supplies",
        "quantity": 10,
        "unitPrice": 1200,
        "lineTotal": 12000
      }
    ],
    "payments": [
      {
        "id": "pay_001",
        "paymentDate": "2026-04-20",
        "amount": 4000,
        "paymentMethod": "bank_transfer",
        "referenceNo": "BANK-REF-001",
        "bankAccountId": "bk_001",
        "bankTransactionId": "txn_001"
      }
    ],
    "approvedBy": { "id": "usr_002", "name": "นาง ข" },
    "approvedAt": "2026-04-06T10:00:00Z",
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

    FE->>BE: GET /api/finance/ap/vendor-invoices/:id
    BE->>DB: SELECT bill WHERE id=:id
    alt not found
        BE-->>FE: 404 {error:"AP bill not found"}
    else found
        par parallel queries
            BE->>DB: SELECT items FROM finance_ap_vendor_invoice_items WHERE billId=:id
            BE->>DB: SELECT payments FROM finance_ap_vendor_invoice_payments\n  WHERE billId=:id ORDER BY paymentDate ASC
            BE->>DB: SELECT vendor details WHERE id=bill.vendorId
        end
        DB-->>BE: bill + items[] + payments[] + vendor
        BE->>BE: compute:\n  paidAmount = SUM(payments.amount)\n  remainingAmount = totalAmount - paidAmount\n  paymentCount = COUNT(payments)\n  lastPaymentDate = MAX(payments.paymentDate)\n  isOverdue = (dueDate < today AND remainingAmount > 0)
        BE-->>FE: 200 {data: bill + items[] + payments[] + statusSummary}
    end
```

---

### API: `POST /api/finance/ap/vendor-invoices`

**Purpose**
- สร้าง AP bill ใหม่ (draft) — รองรับ inline create vendor ถ้ายังไม่มีในระบบ

**FE Screen**
- `/finance/ap` → inline create form หรือ modal

**Request Body**
```json
{
  "vendorId": "ven_001",
  "vendorInvoiceNo": "V-INV-778",
  "invoiceDate": "2026-04-05",
  "dueDate": "2026-05-05",
  "notes": "Office supplies April",
  "items": [
    { "description": "Printer supplies", "quantity": 10, "unitPrice": 1200 }
  ]
}
```

**Response Body (201)**
```json
{
  "data": {
    "id": "ap_001",
    "documentNo": "AP-2026-0001",
    "status": "draft",
    "totalAmount": 12000,
    "remainingAmount": 12000
  },
  "message": "AP bill created"
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

    U->>FE: กรอก AP bill form (vendor, invoiceDate, dueDate, items)
    FE->>BE: POST /api/finance/ap/vendor-invoices\n  {vendorId, vendorInvoiceNo, invoiceDate, dueDate, items:[...]}

    BE->>LOCK: checkPeriodLock(invoiceDate)
    alt period locked
        BE-->>FE: 422 {error:"Period YYYY-MM is locked", code:"PERIOD_LOCKED"}
    else open
        BE->>DB: SELECT vendors WHERE id=:vendorId AND isActive=true
        alt vendor not found or inactive
            BE-->>FE: 422 {error:"Vendor not found or inactive"}
        else ok
            BE->>DB: SELECT FROM finance_ap_bills WHERE vendorInvoiceNo=:vendorInvoiceNo AND vendorId=:vendorId
            alt duplicate vendorInvoiceNo
                BE-->>FE: 422 {error:"Duplicate vendor invoice number for this vendor"}
            else new
                BE->>BE: calculate lineTotal = quantity * unitPrice per item\n  totalAmount = SUM(lineTotal)
                BE->>BE: auto-generate documentNo = "AP-{YYYY}-{SEQ:4}"
                BE->>DB: INSERT finance_ap_bills {vendorId, vendorInvoiceNo, invoiceDate, dueDate,\n  documentNo, status:'draft', totalAmount, notes, createdBy}
                DB-->>BE: billId
                BE->>DB: INSERT finance_ap_vendor_invoice_items[] (billId, description, quantity, unitPrice, lineTotal)
                DB-->>BE: ok
                BE-->>FE: 201 {data: {id, documentNo, status:'draft', totalAmount, remainingAmount}}
                FE-->>U: bill row ปรากฏใน AP table (status: Draft)
            end
        end
    end
```

---

### API: `PATCH /api/finance/ap/vendor-invoices/:id/status`

**Purpose**
- เปลี่ยน status ตาม workflow: `draft → submitted → approved` หรือ `submitted → rejected`
- `accounting_manager` หรือ `finance_manager` เป็นผู้ approve

**FE Screen**
- `/finance/ap` → ปุ่ม "Submit", "Approve", "Reject" ต่อแต่ละ bill

**Request Body**
```json
{
  "action": "approve",
  "reason": null
}
```
หรือ reject:
```json
{
  "action": "reject",
  "reason": "ข้อมูลไม่ครบถ้วน กรุณาแนบใบเสร็จ"
}
```

**Response Body (200)**
```json
{
  "data": {
    "id": "ap_001",
    "status": "approved",
    "approvedBy": "usr_002",
    "approvedAt": "2026-04-06T10:00:00Z"
  },
  "message": "AP bill approved"
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

    U->>FE: กด "Approve" button
    FE->>BE: PATCH /api/finance/ap/vendor-invoices/:id/status\n  {action:'approve'}

    BE->>DB: SELECT bill WHERE id=:id
    alt not found
        BE-->>FE: 404 {error:"AP bill not found"}
    else status transition invalid
        Note over BE: valid transitions:\n  draft→submitted (finance_manager)\n  submitted→approved (accounting_manager)\n  submitted→rejected (accounting_manager)
        BE-->>FE: 422 {error:"Invalid status transition: {current} → {action}"}
    else ok
        alt action = approve (submitted → approved)
            BE->>DB: UPDATE finance_ap_bills SET\n  status='approved', approvedBy=:userId, approvedAt=NOW()

            Note over BE,JE: Auto-post AP Journal Entry
            BE->>JE: createAutoJournal {\n  date: bill.invoiceDate,\n  source: 'ap_bill',\n  referenceId: billId,\n  lines: [\n    {accountId: expenseAccountId, debit: totalAmount},\n    {accountId: apAccountId, credit: totalAmount}\n  ]\n}
            JE->>DB: INSERT + post journal (status='posted')
            DB-->>BE: journalId

        else action = reject (submitted → rejected)
            BE->>DB: UPDATE finance_ap_bills SET\n  status='rejected', rejectionReason=:reason, updatedAt=NOW()

        else action = submit (draft → submitted)
            BE->>DB: UPDATE finance_ap_bills SET status='submitted', updatedAt=NOW()
        end

        DB-->>BE: updated
        BE-->>FE: 200 {data: {id, status, approvedBy, approvedAt}}
        FE-->>U: status badge อัปเดต
    end
```

---

### API: `POST /api/finance/ap/vendor-invoices/:id/payments`

**Purpose**
- บันทึกการจ่ายเงิน AP (full หรือ partial) พร้อม bank account linkage และ auto-post payment journal
- เพิ่ม payment ได้เฉพาะ status = `approved` หรือ `partially_paid` เท่านั้น

**FE Screen**
- `/finance/ap/:id` → ปุ่ม "บันทึกการชำระ"

**Request Body**
```json
{
  "paymentDate": "2026-04-20",
  "amount": 4000,
  "paymentMethod": "bank_transfer",
  "bankAccountId": "bk_001",
  "referenceNo": "BANK-REF-001",
  "notes": "จ่ายงวดที่ 1"
}
```

**Response Body (201)**
```json
{
  "data": {
    "paymentId": "pay_001",
    "billId": "ap_001",
    "paidAmount": 4000,
    "remainingAmount": 8000,
    "status": "partially_paid",
    "bankTransactionId": "txn_001",
    "journalEntryId": "je_ap_001"
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

    U->>FE: กรอก payment form: amount, paymentDate, bankAccount
    FE->>BE: POST /api/finance/ap/vendor-invoices/:id/payments\n  {paymentDate, amount, paymentMethod, bankAccountId, referenceNo}

    BE->>DB: SELECT bill WHERE id=:id
    alt not found
        BE-->>FE: 404 {error:"AP bill not found"}
    else status not payable (not approved / partially_paid)
        BE-->>FE: 422 {error:"Payment only allowed for approved bills"}
    else ok
        BE->>LOCK: checkPeriodLock(paymentDate)
        alt period locked
            BE-->>FE: 422 {error:"Period YYYY-MM is locked", code:"PERIOD_LOCKED"}
        else open
            BE->>BE: remainingAmount = bill.totalAmount - bill.paidAmount
            alt amount > remainingAmount
                BE-->>FE: 422 {error:"Payment amount exceeds remaining balance", remainingAmount}
            else amount valid
                BE->>DB: SELECT bankAccount WHERE id=:bankAccountId AND isActive=true
                alt bank account not found
                    BE-->>FE: 422 {error:"Bank account not found"}
                else ok
                    BE->>DB: INSERT finance_ap_vendor_invoice_payments\n  {billId, paymentDate, amount, paymentMethod,\n   bankAccountId, referenceNo, notes, createdBy}
                    DB-->>BE: paymentId

                    BE->>BE: newPaidAmount = bill.paidAmount + amount\n  newStatus = paid (if newPaidAmount >= totalAmount)\n             partially_paid (if 0 < newPaidAmount < totalAmount)

                    Note over BE,JE: Post Payment Journal
                    BE->>JE: createAutoJournal {\n  date: paymentDate,\n  source: 'ap_payment',\n  referenceId: billId,\n  lines: [\n    {accountId: apAccountId, debit: amount},\n    {accountId: bankGLAccountId, credit: amount}\n  ]\n}
                    JE->>DB: INSERT + post journal
                    DB-->>BE: journalId

                    BE->>DB: INSERT bank_account_transactions {\n  bankAccountId, date: paymentDate,\n  amount: -amount (outflow),\n  description: "AP Payment: " + bill.documentNo,\n  referenceType: 'ap_payment', referenceId: billId\n}
                    DB-->>BE: bankTransactionId

                    BE->>DB: UPDATE finance_ap_bills SET\n  paidAmount = newPaidAmount,\n  status = newStatus,\n  updatedAt = NOW()
                    DB-->>BE: ok
                    BE-->>FE: 201 {data: {paymentId, paidAmount, remainingAmount, status, bankTransactionId, journalEntryId}}
                    FE-->>U: payment ปรากฏใน payment history\n  status badge อัปเดต (Partially Paid / Paid)
                end
            end
        end
    end
```

---

## Coverage Lock Notes

### Status Workflow
```
draft → submitted → approved → partially_paid → paid
                 ↘ rejected
```
- `draft`: สร้างใหม่, แก้ไขได้
- `submitted`: ส่งให้ accounting_manager review
- `approved`: พร้อมบันทึกการจ่าย
- `partially_paid`: จ่ายบางส่วน (paidAmount > 0 แต่ < totalAmount)
- `paid`: จ่ายครบ (paidAmount >= totalAmount)
- `rejected`: ถูกปฏิเสธ — ต้องสร้างใหม่ถ้าต้องการดำเนินการต่อ

### documentNo Auto-generation
- Format: `AP-{YYYY}-{4-digit seq}` เช่น `AP-2026-0001`
- Sequence reset ทุกปี

### Duplicate Invoice Guard
- ตรวจ `vendorInvoiceNo + vendorId` คู่กัน ก่อน INSERT
- ป้องกัน double-posting ใบแจ้งหนี้เดียวกันจาก vendor

### AP Journal Entries
- **Approve**: DR Expense Account / CR Accounts Payable (`apAccountId`)
- **Payment**: DR Accounts Payable / CR Bank GL Account
- `apAccountId` ดึงจาก `finance_config.source_mappings` (module='ap_bill') หรือ global AP account setting

### Bank Ledger Side Effect
- `POST /id/payments` ต้อง INSERT `bank_account_transactions` (outflow)
- คืน `bankTransactionId` ใน response
- Bank balance อัปเดตผ่าน `bank_accounts.currentBalance -= amount`

### paidAmount Aggregation
- `paidAmount = SUM(finance_ap_vendor_invoice_payments.amount)` per bill
- `remainingAmount = totalAmount - paidAmount`
- `statusSummary.isOverdue = (dueDate < today AND remainingAmount > 0)`
