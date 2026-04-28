# Finance Module - Vendors (Normalized)

อ้างอิง: `Documents/Requirements/Release_1.md` — Feature 1.7

## API Inventory
- `GET /api/finance/vendors/options`
- `GET /api/finance/vendors`
- `GET /api/finance/vendors/:id`
- `POST /api/finance/vendors`
- `PATCH /api/finance/vendors/:id`
- `PATCH /api/finance/vendors/:id/activate`
- `DELETE /api/finance/vendors/:id`

---

## Endpoint Details

### API: `GET /api/finance/vendors/options`

**Purpose**
- Dropdown list สำหรับ AP Bill form — active vendors only

**FE Screen**
- AP Bill create form → vendor dropdown

**Params**
- Query Params: `search` (name/code)

**Response Body (200)**
```json
{
  "data": [
    {
      "id": "ven_001",
      "code": "VEND-001",
      "name": "บ.XYZ ซัพพลาย จำกัด",
      "taxId": "0105550000001",
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

    FE->>BE: GET /api/finance/vendors/options?search=XYZ
    BE->>DB: SELECT id, code, name, taxId, isActive\n  FROM vendors\n  WHERE isActive=true AND deletedAt IS NULL\n    AND (name ILIKE :search OR code ILIKE :search)\n  ORDER BY name ASC LIMIT 50
    DB-->>BE: vendors[]
    BE-->>FE: 200 {data: options[]}
```

---

### API: `GET /api/finance/vendors`

**Purpose**
- ดึงรายการ vendors ทั้งหมด พร้อม filter isActive, search, includeDeleted

**FE Screen**
- `/finance/vendors`

**Params**
- Query Params: `search` (name/code/taxId), `isActive` (boolean), `includeDeleted` (boolean, default false), `page`, `limit`

**Response Body (200)**
```json
{
  "data": [
    {
      "id": "ven_001",
      "code": "VEND-001",
      "name": "บ.XYZ ซัพพลาย จำกัด",
      "taxId": "0105550000001",
      "contactName": "คุณ ค",
      "phone": "02-987-6543",
      "paymentTermDays": 30,
      "isActive": true,
      "deletedAt": null
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 18 }
}
```

**Sequence Diagram**
```mermaid
sequenceDiagram
    autonumber
    participant FE as Frontend
    participant BE as Backend API
    participant DB as PostgreSQL

    FE->>BE: GET /api/finance/vendors?isActive=true&search=XYZ&page=1
    BE->>DB: SELECT id, code, name, taxId, contactName, phone, paymentTermDays, isActive, deletedAt\n  FROM vendors\n  WHERE (isActive=:isActive IF provided)\n    AND (deletedAt IS NULL IF NOT includeDeleted)\n    AND (name ILIKE :search OR code ILIKE :search OR taxId ILIKE :search)\n  ORDER BY name ASC\n  LIMIT :limit OFFSET :offset
    DB-->>BE: vendors[]
    BE-->>FE: 200 {data: vendors[], pagination}
```

---

### API: `GET /api/finance/vendors/:id`

**Purpose**
- ดู vendor detail ครบ + usageSummary (AP bills count/total)

**FE Screen**
- `/finance/vendors/:id`

**Response Body (200)**
```json
{
  "data": {
    "id": "ven_001",
    "code": "VEND-001",
    "name": "บ.XYZ ซัพพลาย จำกัด",
    "taxId": "0105550000001",
    "address": "789 ถ.พระราม 4 กรุงเทพฯ",
    "contactName": "คุณ ค",
    "phone": "02-987-6543",
    "email": "sales@xyz.com",
    "paymentTermDays": 30,
    "isActive": true,
    "deletedAt": null,
    "usageSummary": {
      "totalBills": 8,
      "openBillCount": 2,
      "openBillAmount": 45000,
      "lastBillDate": "2026-04-05"
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

    FE->>BE: GET /api/finance/vendors/:id
    BE->>DB: SELECT vendor WHERE id=:id
    alt not found
        BE-->>FE: 404 {error:"Vendor not found"}
    else found
        BE->>DB: SELECT COUNT(*) as totalBills,\n  COUNT(CASE WHEN status NOT IN ('paid','rejected') THEN 1 END) as openBillCount,\n  SUM(CASE WHEN status NOT IN ('paid','rejected') THEN remainingAmount ELSE 0 END) as openBillAmount,\n  MAX(invoiceDate) as lastBillDate\n  FROM finance_ap_bills WHERE vendorId=:id
        DB-->>BE: vendor + usageSummary
        BE-->>FE: 200 {data: vendor + usageSummary}
    end
```

---

### API: `POST /api/finance/vendors`

**Purpose**
- สร้าง vendor ใหม่ — auto-generate `code` ถ้าไม่ระบุ, ตรวจ duplicate taxId

**FE Screen**
- `/finance/vendors/new` หรือ inline create ใน AP Bill form

**Request Body**
```json
{
  "code": "VEND-019",
  "name": "บ.XYZ ซัพพลาย จำกัด",
  "taxId": "0105550000001",
  "address": "789 ถ.พระราม 4 กรุงเทพฯ",
  "contactName": "คุณ ค",
  "phone": "02-987-6543",
  "email": "sales@xyz.com",
  "paymentTermDays": 30
}
```

**Response Body (201)**
```json
{
  "data": { "id": "ven_001", "code": "VEND-019", "name": "บ.XYZ ซัพพลาย จำกัด", "isActive": true },
  "message": "Vendor created"
}
```

**Sequence Diagram**
```mermaid
sequenceDiagram
    autonumber
    participant FE as Frontend
    participant BE as Backend API
    participant DB as PostgreSQL

    FE->>BE: POST /api/finance/vendors {name, taxId, paymentTermDays, ...}
    BE->>DB: SELECT id FROM vendors WHERE taxId=:taxId AND deletedAt IS NULL
    alt duplicate taxId
        BE-->>FE: 422 {error:"Vendor with this Tax ID already exists"}
    else ok
        BE->>BE: if code not provided: auto-generate "VEND-{SEQ:3}"
        BE->>DB: INSERT vendors {code, name, taxId, address, contactName,\n  phone, email, paymentTermDays, isActive:true, createdAt}
        DB-->>BE: vendorId
        BE-->>FE: 201 {data: {id, code, name, isActive:true}}
    end
```

---

### API: `PATCH /api/finance/vendors/:id`

**Purpose**
- แก้ไขข้อมูล vendor — code ไม่เปลี่ยน

**Request Body**
```json
{
  "name": "บ.XYZ ซัพพลาย (ไทย) จำกัด",
  "paymentTermDays": 45,
  "email": "procurement@xyz.co.th"
}
```

**Response Body (200)**
```json
{
  "data": { "id": "ven_001", "name": "บ.XYZ ซัพพลาย (ไทย) จำกัด", "isActive": true },
  "message": "Vendor updated"
}
```

**Sequence Diagram**
```mermaid
sequenceDiagram
    autonumber
    participant FE as Frontend
    participant BE as Backend API
    participant DB as PostgreSQL

    FE->>BE: PATCH /api/finance/vendors/:id {name, paymentTermDays, ...}
    BE->>DB: SELECT vendor WHERE id=:id AND deletedAt IS NULL
    alt not found
        BE-->>FE: 404
    else ok
        BE->>DB: UPDATE vendors SET name, paymentTermDays, email, ..., updatedAt=NOW()\n  WHERE id=:id
        DB-->>BE: updated
        BE-->>FE: 200 {data: updated vendor}
    end
```

---

### API: `PATCH /api/finance/vendors/:id/activate`

**Purpose**
- Toggle isActive: deactivate ซ่อนจาก options dropdown

**Request Body**
```json
{ "isActive": false }
```

**Response Body (200)**
```json
{
  "data": { "id": "ven_001", "isActive": false, "updatedAt": "2026-04-27T10:00:00Z" },
  "message": "Vendor deactivated"
}
```

**Sequence Diagram**
```mermaid
sequenceDiagram
    autonumber
    participant FE as Frontend
    participant BE as Backend API
    participant DB as PostgreSQL

    FE->>BE: PATCH /api/finance/vendors/:id/activate {isActive: false}
    BE->>DB: SELECT vendor WHERE id=:id AND deletedAt IS NULL
    alt not found
        BE-->>FE: 404
    else ok
        BE->>DB: UPDATE vendors SET isActive=:isActive, updatedAt=NOW() WHERE id=:id
        DB-->>BE: updated
        BE-->>FE: 200 {data: {id, isActive, updatedAt}}
    end
```

---

### API: `DELETE /api/finance/vendors/:id`

**Purpose**
- Soft delete vendor — บล็อกถ้ามี open AP bills

**Response Body (200)**
```json
{ "message": "Vendor deleted" }
```

**Sequence Diagram**
```mermaid
sequenceDiagram
    autonumber
    participant FE as Frontend
    participant BE as Backend API
    participant DB as PostgreSQL

    FE->>BE: DELETE /api/finance/vendors/:id
    BE->>DB: SELECT vendor WHERE id=:id AND deletedAt IS NULL
    alt not found
        BE-->>FE: 404
    else ok
        BE->>DB: SELECT COUNT(*) as openBillCount\n  FROM finance_ap_bills\n  WHERE vendorId=:id AND status NOT IN ('paid','rejected')
        alt openBillCount > 0
            BE-->>FE: 409 {error:"Cannot delete vendor with open AP bills",\n  conflict: {openBillCount}}
        else no open bills
            BE->>DB: UPDATE vendors SET deletedAt=NOW() WHERE id=:id
            DB-->>BE: ok
            BE-->>FE: 200 {message:"Vendor deleted"}
        end
    end
```

---

## Coverage Lock Notes

### code Auto-generation
- Format: `VEND-{3-digit seq}` เช่น `VEND-001`

### Duplicate taxId Guard
- taxId ต้อง unique ต่อ non-deleted vendors → 422

### Soft Delete Guard
- ลบได้เฉพาะ vendors ที่ไม่มี open AP bills (status ≠ paid/rejected)
- 409 conflict response ต้องมี `openBillCount`

### Visibility Rules
- inactive vendor ไม่แสดงใน `/options` แต่แสดงใน list/detail ได้
- soft-deleted ไม่แสดงใน list default — ต้องใช้ `includeDeleted=true`

### Inline Create (AP Bill form)
- AP Bill form รองรับ inline create vendor → response ต้องคืน `{id, code, name, isActive}` เพื่อ FE inject เข้า dropdown ทันที
