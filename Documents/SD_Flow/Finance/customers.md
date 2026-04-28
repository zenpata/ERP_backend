# Finance Module - Customers (Normalized)

อ้างอิง: `Documents/Requirements/Release_2.md` — Feature 3.1 Customer Management

## API Inventory
- `GET /api/finance/customers`
- `GET /api/finance/customers/options`
- `GET /api/finance/customers/:id`
- `POST /api/finance/customers`
- `PATCH /api/finance/customers/:id`
- `PATCH /api/finance/customers/:id/activate`
- `DELETE /api/finance/customers/:id`

---

## Endpoint Details

### API: `GET /api/finance/customers`

**Purpose**
- ดึงรายการลูกค้าทั้งหมด พร้อม filter isActive, search และ AR overdue indicator

**FE Screen**
- `/finance/customers`

**Params**
- Query Params: `search` (name/code/taxId), `isActive` (boolean), `page`, `limit`

**Response Body (200)**
```json
{
  "data": [
    {
      "id": "cust_001",
      "code": "CUST-001",
      "name": "บริษัท ABC จำกัด",
      "taxId": "0105561234567",
      "creditLimit": 500000,
      "creditTermDays": 30,
      "isActive": true,
      "hasOverdueInvoice": true,
      "deletedAt": null
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 35 }
}
```

**Sequence Diagram**
```mermaid
sequenceDiagram
    autonumber
    participant FE as Frontend
    participant BE as Backend API
    participant DB as PostgreSQL

    FE->>BE: GET /api/finance/customers?isActive=true&search=ABC&page=1
    BE->>DB: SELECT c.*,\n  EXISTS(\n    SELECT 1 FROM invoices i\n    WHERE i.customerId=c.id\n      AND i.status='overdue'\n      AND i.balanceDue > 0\n  ) as hasOverdueInvoice\n  FROM customers c\n  WHERE c.isActive=true\n    AND c.deletedAt IS NULL\n    AND (c.name ILIKE '%ABC%' OR c.code ILIKE '%ABC%' OR c.taxId ILIKE '%ABC%')\n  ORDER BY c.name ASC\n  LIMIT :limit OFFSET :offset
    DB-->>BE: customers[]
    BE-->>FE: 200 {data: customers[], pagination}
```

---

### API: `GET /api/finance/customers/options`

**Purpose**
- Dropdown list สำหรับ invoice/quotation/SO form — active customers + credit warning flag

**FE Screen**
- Invoice / Quotation / SO create form → customer dropdown

**Params**
- Query Params: `search` (name/code), `activeOnly` (boolean, default true)

**Response Body (200)**
```json
{
  "data": [
    {
      "id": "cust_001",
      "code": "CUST-001",
      "name": "บริษัท ABC จำกัด",
      "taxId": "0105561234567",
      "isActive": true,
      "creditWarning": false,
      "hasOverdueInvoice": true
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

    FE->>BE: GET /api/finance/customers/options?search=ABC&activeOnly=true
    BE->>DB: SELECT c.id, c.code, c.name, c.taxId, c.isActive, c.creditLimit,\n  COALESCE(SUM(i.balanceDue),0) as arBalance,\n  EXISTS(\n    SELECT 1 FROM invoices WHERE customerId=c.id AND status='overdue'\n  ) as hasOverdueInvoice\n  FROM customers c\n  LEFT JOIN invoices i ON i.customerId=c.id AND i.balanceDue > 0\n  WHERE c.isActive=true AND c.deletedAt IS NULL\n    AND (c.name ILIKE :search OR c.code ILIKE :search)\n  GROUP BY c.id\n  ORDER BY c.name ASC LIMIT 50
    DB-->>BE: customers[]
    BE->>BE: per row: creditWarning = (arBalance >= creditLimit*0.9 AND creditLimit > 0)
    BE-->>FE: 200 {data: options[]}
```

---

### API: `GET /api/finance/customers/:id`

**Purpose**
- ดู customer detail + arSummary + invoiceHistorySummary

**FE Screen**
- `/finance/customers/:id`

**Response Body (200)**
```json
{
  "data": {
    "id": "cust_001",
    "code": "CUST-001",
    "name": "บริษัท ABC จำกัด",
    "taxId": "0105561234567",
    "address": "123 ถ.สีลม กรุงเทพฯ 10500",
    "contactName": "คุณ ก",
    "phone": "02-123-4567",
    "email": "finance@abc.com",
    "creditLimit": 500000,
    "creditTermDays": 30,
    "notes": null,
    "isActive": true,
    "deletedAt": null,
    "arSummary": {
      "currentAR": 125000,
      "overdueAmount": 50000,
      "overdueInvoiceCount": 1,
      "lastInvoiceDate": "2026-04-10"
    },
    "invoiceHistorySummary": {
      "totalInvoiced": 850000,
      "totalPaid": 725000,
      "invoiceCount": 12
    }
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

    FE->>BE: GET /api/finance/customers/:id
    BE->>DB: SELECT customer WHERE id=:id AND deletedAt IS NULL
    alt not found
        BE-->>FE: 404 {error:"Customer not found"}
    else found
        par parallel queries
            BE->>DB: SELECT SUM(balanceDue) as currentAR,\n  SUM(CASE WHEN status='overdue' THEN balanceDue ELSE 0 END) as overdueAmount,\n  COUNT(CASE WHEN status='overdue' THEN 1 END) as overdueCount,\n  MAX(issueDate) as lastInvoiceDate\n  FROM invoices WHERE customerId=:id AND balanceDue > 0
            BE->>DB: SELECT SUM(totalAmount) as totalInvoiced,\n  SUM(paidAmount) as totalPaid,\n  COUNT(*) as invoiceCount\n  FROM invoices WHERE customerId=:id
        end
        DB-->>BE: customer + arSummary data + invoiceHistorySummary data
        BE-->>FE: 200 {data: customer + arSummary + invoiceHistorySummary}
    end
```

---

### API: `POST /api/finance/customers`

**Purpose**
- สร้างลูกค้าใหม่ — auto-generate `code` ถ้าไม่ระบุ, ตรวจ duplicate taxId

**FE Screen**
- `/finance/customers/new`

**Request Body**
```json
{
  "code": "CUST-036",
  "name": "บริษัท XYZ จำกัด",
  "taxId": "0105570000001",
  "address": "456 ถ.สุขุมวิท กรุงเทพฯ",
  "contactName": "คุณ ข",
  "phone": "02-456-7890",
  "email": "info@xyz.com",
  "creditLimit": 300000,
  "creditTermDays": 30,
  "notes": null
}
```

**Response Body (201)**
```json
{
  "data": { "id": "cust_036", "code": "CUST-036", "name": "บริษัท XYZ จำกัด", "isActive": true },
  "message": "Customer created"
}
```

**Sequence Diagram**
```mermaid
sequenceDiagram
    autonumber
    participant FE as Frontend
    participant BE as Backend API
    participant DB as PostgreSQL

    FE->>BE: POST /api/finance/customers {name, taxId, creditLimit, ...}
    BE->>DB: SELECT id FROM customers WHERE taxId=:taxId AND deletedAt IS NULL
    alt duplicate taxId
        BE-->>FE: 422 {error:"Customer with this Tax ID already exists"}
    else ok
        BE->>BE: if code not provided: auto-generate "CUST-{SEQ:3}"
        BE->>DB: INSERT customers {code, name, taxId, address, contactName,\n  phone, email, creditLimit, creditTermDays, notes, isActive:true, createdAt}
        DB-->>BE: customerId
        BE-->>FE: 201 {data: {id, code, name, isActive:true}}
    end
```

---

### API: `PATCH /api/finance/customers/:id`

**Purpose**
- แก้ไขข้อมูลลูกค้า — code ไม่เปลี่ยน

**FE Screen**
- `/finance/customers/:id/edit`

**Request Body**
```json
{
  "name": "บริษัท XYZ (ประเทศไทย) จำกัด",
  "creditLimit": 500000,
  "creditTermDays": 45,
  "email": "finance@xyz.co.th"
}
```

**Response Body (200)**
```json
{
  "data": { "id": "cust_036", "name": "บริษัท XYZ (ประเทศไทย) จำกัด", "isActive": true },
  "message": "Customer updated"
}
```

**Sequence Diagram**
```mermaid
sequenceDiagram
    autonumber
    participant FE as Frontend
    participant BE as Backend API
    participant DB as PostgreSQL

    FE->>BE: PATCH /api/finance/customers/:id {name, creditLimit, ...}
    BE->>DB: SELECT customer WHERE id=:id AND deletedAt IS NULL
    alt not found
        BE-->>FE: 404 {error:"Customer not found"}
    else ok
        BE->>DB: UPDATE customers SET name=:name, creditLimit=:creditLimit,\n  creditTermDays=:creditTermDays, email=:email, ..., updatedAt=NOW()\n  WHERE id=:id
        DB-->>BE: updated
        BE-->>FE: 200 {data: updated customer fields}
    end
```

---

### API: `PATCH /api/finance/customers/:id/activate`

**Purpose**
- Toggle isActive: deactivate ซ่อนจาก dropdown แต่ยังดู history ได้

**Request Body**
```json
{ "isActive": false }
```

**Response Body (200)**
```json
{
  "data": { "id": "cust_036", "isActive": false, "updatedAt": "2026-04-27T10:00:00Z" },
  "message": "Customer deactivated"
}
```

**Sequence Diagram**
```mermaid
sequenceDiagram
    autonumber
    participant FE as Frontend
    participant BE as Backend API
    participant DB as PostgreSQL

    FE->>BE: PATCH /api/finance/customers/:id/activate {isActive: false}
    BE->>DB: SELECT customer WHERE id=:id AND deletedAt IS NULL
    alt not found
        BE-->>FE: 404
    else ok
        BE->>DB: UPDATE customers SET isActive=:isActive, updatedAt=NOW() WHERE id=:id
        DB-->>BE: updated
        BE-->>FE: 200 {data: {id, isActive, updatedAt}}
    end
```

---

### API: `DELETE /api/finance/customers/:id`

**Purpose**
- Soft delete ลูกค้า — บล็อกถ้ามี unpaid invoices

**Response Body (200)**
```json
{ "message": "Customer deleted" }
```

**Sequence Diagram**
```mermaid
sequenceDiagram
    autonumber
    participant FE as Frontend
    participant BE as Backend API
    participant DB as PostgreSQL

    FE->>BE: DELETE /api/finance/customers/:id
    BE->>DB: SELECT customer WHERE id=:id AND deletedAt IS NULL
    alt not found
        BE-->>FE: 404
    else ok
        BE->>DB: SELECT COUNT(*) as unpaidCount, SUM(balanceDue) as outstanding\n  FROM invoices\n  WHERE customerId=:id AND balanceDue > 0
        alt unpaidCount > 0
            BE-->>FE: 409 {error:"Cannot delete customer with unpaid invoices",\n  conflict: {unpaidInvoiceCount, outstandingAmount}}
        else no open invoices
            BE->>DB: UPDATE customers SET deletedAt=NOW() WHERE id=:id
            DB-->>BE: ok
            BE-->>FE: 200 {message:"Customer deleted"}
        end
    end
```

---

## Coverage Lock Notes

### code Auto-generation
- Format: `CUST-{3-digit seq}` เช่น `CUST-001`
- User ระบุ code เองได้ — ถ้าไม่ระบุระบบ auto-generate

### Duplicate taxId Guard
- taxId ต้อง unique ต่อ non-deleted customers → 422 ถ้าซ้ำ

### Soft Delete Guard
- ลบได้เฉพาะ customers ที่ไม่มี unpaid invoices
- 409 conflict response ต้องมี `unpaidInvoiceCount`, `outstandingAmount`

### creditWarning Flag
- `creditWarning = true` เมื่อ `arBalance >= creditLimit * 0.9 AND creditLimit > 0`
- FE แสดง badge "ใกล้เต็ม credit limit" ใน options dropdown

### isActive vs deletedAt
- `isActive = false` → ซ่อนจาก `options` endpoint แต่ยังดู detail/history ได้
- `deletedAt IS NOT NULL` → soft deleted, ไม่แสดงใน list หรือ options
