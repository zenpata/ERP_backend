# Finance Module - Quotation & Sales Order (Normalized)

อ้างอิง: `Documents/Release_2.md`

## API Inventory
- `GET /api/finance/quotations`
- `POST /api/finance/quotations`
- `GET /api/finance/quotations/:id`
- `PATCH /api/finance/quotations/:id`
- `PATCH /api/finance/quotations/:id/status`
- `POST /api/finance/quotations/:id/convert-to-so`
- `GET /api/finance/quotations/:id/pdf`
- `GET /api/finance/sales-orders`
- `POST /api/finance/sales-orders`
- `GET /api/finance/sales-orders/:id`
- `PATCH /api/finance/sales-orders/:id/status`
- `POST /api/finance/sales-orders/:id/convert-to-invoice`

## Endpoint Details

### API: `GET /api/finance/quotations`

**Purpose**
- ดึงรายการ quotation สำหรับตารางหน้า quotation list

**FE Screen**
- `/finance/quotations`

**Params**
- Path Params: ไม่มี
- Query Params: `page`, `limit`, `search`, `status`, `customerId`

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
      "id": "qt_001",
      "quotNo": "QT-2026-0001",
      "customerId": "cust_001",
      "customerCode": "C001",
      "customerName": "บริษัท ABC จำกัด",
      "issueDate": "2026-04-15",
      "validUntil": "2026-04-30",
      "subtotalBeforeVat": 10000,
      "vatAmount": 700,
      "totalAmount": 10700,
      "status": "draft",
      "updatedAt": "2026-04-15T09:00:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 5 }
}
```

**Sequence Diagram**
```mermaid
sequenceDiagram
    autonumber
    participant FE as Frontend
    participant BE as Backend Finance API
    participant DB as PostgreSQL

    FE->>BE: GET /api/finance/quotations?status=draft&page=1&limit=20
    par parallel queries
        BE->>DB: SELECT q.id, q.quotNo, q.customerId, c.code as customerCode,\n  c.name as customerName, q.issueDate, q.validUntil,\n  q.subtotalBeforeVat, q.vatAmount, q.totalAmount,\n  q.status, q.updatedAt\n  FROM quotations q\n  JOIN customers c ON c.id=q.customerId\n  WHERE (:status IS NULL OR q.status=:status)\n    AND (:customerId IS NULL OR q.customerId=:customerId)\n    AND (:search IS NULL OR q.quotNo ILIKE '%'||:search||'%'\n      OR c.name ILIKE '%'||:search||'%')\n  ORDER BY q.updatedAt DESC\n  LIMIT :limit OFFSET :offset
        BE->>DB: SELECT COUNT(*) as total FROM quotations q\n  JOIN customers c ON c.id=q.customerId\n  WHERE (same filters)
    end
    DB-->>BE: rows[] + total
    BE-->>FE: 200 {data: rows[], meta: {page, limit, total}}
```

---

### API: `POST /api/finance/quotations`

**Purpose**
- สร้าง quotation พร้อมรายการสินค้า/บริการ

**FE Screen**
- `/finance/quotations/new`

**Params**
- Path Params: ไม่มี
- Query Params: ไม่มี

**Request Headers**
```json
{ "Authorization": "Bearer <access_token>" }
```

**Request Body**
```json
{
  "customerId": "cust_001",
  "issueDate": "2026-04-15",
  "validUntil": "2026-04-30",
  "notes": "ราคานี้ไม่รวมค่าติดตั้ง",
  "termsAndConditions": "ชำระภายใน 30 วัน",
  "items": [
    {
      "description": "ค่า Software License",
      "quantity": 1,
      "unitPrice": 10000,
      "vatRate": 7
    }
  ]
}
```

**Response Body (201)**
```json
{
  "data": {
    "id": "qt_001",
    "quotNo": "QT-2026-0001",
    "status": "draft",
    "subtotalBeforeVat": 10000,
    "vatAmount": 700,
    "totalAmount": 10700
  },
  "creditWarning": null,
  "message": "Created"
}
```

**Sequence Diagram**
```mermaid
sequenceDiagram
    autonumber
    participant U as sales_officer
    participant FE as Frontend
    participant BE as Backend Finance API
    participant DB as PostgreSQL

    U->>FE: กรอก quotation form + กด Save
    FE->>BE: POST /api/finance/quotations\n  {customerId, issueDate, validUntil, notes, items[]}
    BE->>BE: validate required: customerId, issueDate, validUntil, items[].length >= 1\n  validate validUntil >= issueDate\n  validate all items: quantity > 0, unitPrice >= 0
    alt validation fails
        BE-->>FE: 422 {error: "validation message"}
    else ok
        BE->>DB: SELECT id, name, creditLimit, currentBalance\n  FROM customers WHERE id=:customerId AND isActive=true
        alt customer not found/inactive
            BE-->>FE: 422 {error:"Customer not found or inactive"}
        else found
            BE->>BE: compute per-line: lineTotal = quantity * unitPrice\n  vatAmount = ROUND(lineTotal * vatRate/100, 2)\n  subtotalBeforeVat = SUM(lineTotals)\n  totalVat = SUM(vatAmounts)\n  totalAmount = subtotalBeforeVat + totalVat
            BE->>DB: SELECT NEXTVAL('quotation_seq') as seq
            DB-->>BE: seq
            BE->>BE: quotNo = 'QT-' || YEAR || '-' || LPAD(seq, 4, '0')
            BE->>DB: INSERT quotations\n  {quotNo, customerId, issueDate, validUntil, notes,\n   termsAndConditions, subtotalBeforeVat, vatAmount,\n   totalAmount, status:'draft', createdBy, createdAt}
            DB-->>BE: quotationId
            BE->>DB: INSERT quotation_items (bulk)\n  {quotationId, itemNo, description, quantity, unitPrice, vatRate, lineTotal}
            DB-->>BE: items inserted
            BE->>BE: check creditWarning:\n  if (customer.creditLimit AND totalAmount + currentBalance > creditLimit)\n    creditWarning = {creditLimit, currentBalance, wouldExceedBy}
            BE-->>FE: 201 {data: {id, quotNo, status, subtotalBeforeVat, vatAmount, totalAmount}, creditWarning}
            FE-->>U: navigate → quotation detail page
        end
    end
```

---

### API: `GET /api/finance/quotations/:id`

**Purpose**
- ดึงรายละเอียด quotation เดียว พร้อม items และ linked SO

**FE Screen**
- `/finance/quotations/:id`

**Params**
- Path Params: `id` (string, required)
- Query Params: ไม่มี

**Request Headers**
```json
{ "Authorization": "Bearer <access_token>" }
```

**Response Body (200)**
```json
{
  "data": {
    "id": "qt_001",
    "quotNo": "QT-2026-0001",
    "customerId": "cust_001",
    "customerName": "บริษัท ABC จำกัด",
    "customerSnapshot": { "address": "123 ถ.สุขุมวิท", "taxId": "0105555001234" },
    "issueDate": "2026-04-15",
    "validUntil": "2026-04-30",
    "subtotalBeforeVat": 10000,
    "vatAmount": 700,
    "totalAmount": 10700,
    "status": "draft",
    "notes": "ราคานี้ไม่รวมค่าติดตั้ง",
    "termsAndConditions": "ชำระภายใน 30 วัน",
    "items": [
      {
        "id": "qi_001",
        "itemNo": 1,
        "description": "ค่า Software License",
        "quantity": 1,
        "unitPrice": 10000,
        "vatRate": 7,
        "lineTotal": 10000
      }
    ],
    "salesOrderId": null,
    "createdBy": "user_001",
    "createdAt": "2026-04-15T09:00:00Z"
  }
}
```

**Sequence Diagram**
```mermaid
sequenceDiagram
    autonumber
    participant FE as Frontend
    participant BE as Backend Finance API
    participant DB as PostgreSQL

    FE->>BE: GET /api/finance/quotations/:id
    BE->>DB: SELECT q.*, c.name as customerName,\n  c.address as customerAddress, c.taxId as customerTaxId\n  FROM quotations q\n  JOIN customers c ON c.id=q.customerId\n  WHERE q.id=:id
    alt not found
        BE-->>FE: 404 {error:"Quotation not found"}
    else found
        par parallel queries
            BE->>DB: SELECT id, itemNo, description, quantity,\n  unitPrice, vatRate, lineTotal\n  FROM quotation_items WHERE quotationId=:id\n  ORDER BY itemNo ASC
            BE->>DB: SELECT id FROM sales_orders WHERE quotationId=:id LIMIT 1
        end
        DB-->>BE: quotation + items[] + salesOrderId
        BE->>BE: build customerSnapshot = {address, taxId}
        BE-->>FE: 200 {data: quotation + items[] + salesOrderId + customerSnapshot}
    end
```

---

### API: `PATCH /api/finance/quotations/:id`

**Purpose**
- แก้ไข quotation (draft เท่านั้น)

**FE Screen**
- `/finance/quotations/:id` → edit mode

**Params**
- Path Params: `id` (string, required)

**Request Headers**
```json
{ "Authorization": "Bearer <access_token>" }
```

**Request Body**
```json
{
  "validUntil": "2026-05-15",
  "notes": "ราคารวมค่าขนส่ง",
  "items": [
    { "description": "ค่า Software License", "quantity": 2, "unitPrice": 10000, "vatRate": 7 }
  ]
}
```

**Response Body (200)**
```json
{
  "data": {
    "id": "qt_001",
    "subtotalBeforeVat": 20000,
    "vatAmount": 1400,
    "totalAmount": 21400,
    "updatedAt": "2026-04-16T10:00:00Z"
  },
  "message": "Updated"
}
```

**Sequence Diagram**
```mermaid
sequenceDiagram
    autonumber
    participant FE as Frontend
    participant BE as Backend Finance API
    participant DB as PostgreSQL

    FE->>BE: PATCH /api/finance/quotations/:id\n  {validUntil, notes, items[]}
    BE->>DB: SELECT id, status FROM quotations WHERE id=:id
    alt not found
        BE-->>FE: 404 {error:"Quotation not found"}
    else status != 'draft'
        BE-->>FE: 422 {error:"Only draft quotations can be edited"}
    else draft
        BE->>BE: validate if items provided:\n  all items quantity > 0, unitPrice >= 0\n  validUntil >= issueDate (if validUntil provided)
        alt validation fails
            BE-->>FE: 422 {error: "validation message"}
        else ok
            BE->>BE: recompute totals from new items if items provided
            BE->>DB: UPDATE quotations\n  SET validUntil, notes, termsAndConditions,\n    subtotalBeforeVat, vatAmount, totalAmount, updatedAt=NOW()\n  WHERE id=:id
            alt items provided
                BE->>DB: DELETE FROM quotation_items WHERE quotationId=:id
                BE->>DB: INSERT quotation_items (bulk) — new items
            end
            DB-->>BE: updated
            BE-->>FE: 200 {data: {id, subtotalBeforeVat, vatAmount, totalAmount, updatedAt}}
        end
    end
```

---

### API: `PATCH /api/finance/quotations/:id/status`

**Purpose**
- เปลี่ยนสถานะ quotation: sent / accepted / rejected (`expired` เป็น system-derived ไม่ใช่ manual)

**FE Screen**
- `/finance/quotations/:id`

**Params**
- Path Params: `id` (string, required)

**Request Headers**
```json
{ "Authorization": "Bearer <access_token>" }
```

**Request Body**
```json
{ "status": "sent" }
```

**Response Body (200)**
```json
{ "data": { "id": "qt_001", "status": "sent" }, "message": "Status updated" }
```

**Sequence Diagram**
```mermaid
sequenceDiagram
    autonumber
    participant FE as Frontend
    participant BE as Backend Finance API
    participant DB as PostgreSQL

    FE->>BE: PATCH /api/finance/quotations/:id/status {status}
    BE->>BE: validate status IN ('sent','accepted','rejected')
    alt invalid status value
        BE-->>FE: 422 {error:"Invalid status. Must be sent, accepted, or rejected"}
    else valid
        BE->>DB: SELECT id, status FROM quotations WHERE id=:id
        alt not found
            BE-->>FE: 404 {error:"Quotation not found"}
        else invalid transition
            Note over BE: allowed: draft→sent, sent→accepted, sent→rejected
            BE-->>FE: 422 {error:"Invalid status transition from {current} to {requested}"}
        else ok
            BE->>DB: UPDATE quotations SET status=:status, updatedAt=NOW() WHERE id=:id
            DB-->>BE: updated
            BE-->>FE: 200 {data: {id, status}}
        end
    end
```

---

### API: `POST /api/finance/quotations/:id/convert-to-so`

**Purpose**
- แปลง quotation เป็น sales order — quotation ต้องอยู่ใน status `accepted`

**FE Screen**
- `/finance/quotations/:id`

**Params**
- Path Params: `id` (string, required)

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
  "data": {
    "salesOrderId": "so_001",
    "soNo": "SO-2026-0001",
    "quotationId": "qt_001",
    "quotationStatus": "accepted"
  },
  "message": "Converted to Sales Order"
}
```

**Sequence Diagram**
```mermaid
sequenceDiagram
    autonumber
    participant FE as Frontend
    participant BE as Backend Finance API
    participant DB as PostgreSQL

    FE->>BE: POST /api/finance/quotations/:id/convert-to-so
    BE->>DB: SELECT q.*, qi.* FROM quotations q\n  JOIN quotation_items qi ON qi.quotationId=q.id\n  WHERE q.id=:id
    alt not found
        BE-->>FE: 404 {error:"Quotation not found"}
    else status != 'accepted'
        BE-->>FE: 422 {error:"Only accepted quotations can be converted to Sales Order"}
    else already converted
        BE->>DB: SELECT id FROM sales_orders WHERE quotationId=:id
        BE-->>FE: 409 {error:"Quotation already has a linked Sales Order"}
    else ok
        BE->>DB: SELECT NEXTVAL('sales_order_seq') as seq
        DB-->>BE: seq
        BE->>BE: soNo = 'SO-' || YEAR || '-' || LPAD(seq, 4, '0')
        BE->>DB: INSERT sales_orders {\n  soNo, customerId, quotationId,\n  orderDate: TODAY(), subtotalBeforeVat, vatAmount, totalAmount,\n  status:'confirmed', createdBy, createdAt\n}
        DB-->>BE: salesOrderId
        BE->>DB: INSERT so_items (bulk from quotation_items)\n  {salesOrderId, itemNo, description, quantity,\n   unitPrice, vatRate, lineTotal, invoicedQty:0}
        DB-->>BE: items inserted
        BE-->>FE: 201 {data: {salesOrderId, soNo, quotationId, quotationStatus:'accepted'}}
        FE->>FE: navigate → sales order detail page
    end
```

---

### API: `GET /api/finance/quotations/:id/pdf`

**Purpose**
- ดาวน์โหลด PDF ของ quotation (synchronous inline download)

**FE Screen**
- `/finance/quotations/:id`

**Params**
- Path Params: `id` (string, required)

**Request Headers**
```json
{ "Authorization": "Bearer <access_token>" }
```

**Response**
- `Content-Type: application/pdf`
- `Content-Disposition: inline; filename="QT-2026-0001.pdf"`

**Sequence Diagram**
```mermaid
sequenceDiagram
    autonumber
    participant FE as Frontend
    participant BE as Backend Export API
    participant DB as PostgreSQL
    participant PDF as PDF Engine

    FE->>BE: GET /api/finance/quotations/:id/pdf
    BE->>DB: SELECT q.*, c.name, c.address, c.taxId,\n  comp.name as companyName, comp.address as companyAddress,\n  comp.taxId as companyTaxId, comp.logoUrl\n  FROM quotations q\n  JOIN customers c ON c.id=q.customerId\n  CROSS JOIN company_settings comp\n  WHERE q.id=:id
    alt not found
        BE-->>FE: 404 {error:"Quotation not found"}
    else found
        BE->>DB: SELECT * FROM quotation_items WHERE quotationId=:id ORDER BY itemNo ASC
        DB-->>BE: quotation + customer + company + items[]
        BE->>PDF: renderPDF('quotation', {\n  quotation, customer, company, items\n})
        PDF-->>BE: pdfBuffer
        BE-->>FE: 200 application/pdf (binary stream)\n  Content-Disposition: inline; filename="QT-2026-0001.pdf"
    end
```

---

### API: `GET /api/finance/sales-orders`

**Purpose**
- ดึงรายการ sales order

**FE Screen**
- `/finance/sales-orders`

**Params**
- Path Params: ไม่มี
- Query Params: `page`, `limit`, `search`, `status`, `customerId`

**Request Headers**
```json
{ "Authorization": "Bearer <access_token>" }
```

**Response Body (200)**
```json
{
  "data": [
    {
      "id": "so_001",
      "soNo": "SO-2026-0001",
      "customerId": "cust_001",
      "customerCode": "C001",
      "customerName": "บริษัท ABC จำกัด",
      "orderDate": "2026-04-16",
      "deliveryDate": null,
      "subtotalBeforeVat": 20000,
      "vatAmount": 1400,
      "totalAmount": 21400,
      "status": "confirmed",
      "updatedAt": "2026-04-16T10:00:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 3 }
}
```

**Sequence Diagram**
```mermaid
sequenceDiagram
    autonumber
    participant FE as Frontend
    participant BE as Backend Finance API
    participant DB as PostgreSQL

    FE->>BE: GET /api/finance/sales-orders?status=confirmed&page=1
    par parallel queries
        BE->>DB: SELECT so.id, so.soNo, so.customerId,\n  c.code as customerCode, c.name as customerName,\n  so.orderDate, so.deliveryDate,\n  so.subtotalBeforeVat, so.vatAmount, so.totalAmount,\n  so.status, so.updatedAt\n  FROM sales_orders so\n  JOIN customers c ON c.id=so.customerId\n  WHERE (:status IS NULL OR so.status=:status)\n    AND (:customerId IS NULL OR so.customerId=:customerId)\n    AND (:search IS NULL OR so.soNo ILIKE '%'||:search||'%'\n      OR c.name ILIKE '%'||:search||'%')\n  ORDER BY so.updatedAt DESC\n  LIMIT :limit OFFSET :offset
        BE->>DB: SELECT COUNT(*) as total FROM sales_orders so\n  JOIN customers c ON c.id=so.customerId\n  WHERE (same filters)
    end
    DB-->>BE: rows[] + total
    BE-->>FE: 200 {data: rows[], meta: {page, limit, total}}
```

---

### API: `POST /api/finance/sales-orders`

**Purpose**
- สร้าง sales order โดยตรง (ไม่ผ่าน quotation)

**FE Screen**
- `/finance/sales-orders/new`

**Request Headers**
```json
{ "Authorization": "Bearer <access_token>" }
```

**Request Body**
```json
{
  "customerId": "cust_001",
  "orderDate": "2026-04-16",
  "deliveryDate": "2026-04-30",
  "notes": "ส่งถึงสาขา A",
  "items": [
    { "description": "อุปกรณ์สำนักงาน", "quantity": 10, "unitPrice": 500, "vatRate": 7 }
  ]
}
```

**Response Body (201)**
```json
{
  "data": {
    "id": "so_001",
    "soNo": "SO-2026-0001",
    "status": "confirmed",
    "subtotalBeforeVat": 5000,
    "vatAmount": 350,
    "totalAmount": 5350
  },
  "creditWarning": null,
  "message": "Created"
}
```

**Sequence Diagram**
```mermaid
sequenceDiagram
    autonumber
    participant U as sales_officer
    participant FE as Frontend
    participant BE as Backend Finance API
    participant DB as PostgreSQL

    U->>FE: กรอก SO form + กด Save
    FE->>BE: POST /api/finance/sales-orders\n  {customerId, orderDate, deliveryDate, notes, items[]}
    BE->>BE: validate required: customerId, orderDate, items[].length >= 1\n  validate all items: quantity > 0, unitPrice >= 0
    alt validation fails
        BE-->>FE: 422 {error: "validation message"}
    else ok
        BE->>DB: SELECT id, name, creditLimit, currentBalance\n  FROM customers WHERE id=:customerId AND isActive=true
        alt customer not found/inactive
            BE-->>FE: 422 {error:"Customer not found or inactive"}
        else found
            BE->>BE: compute totals:\n  lineTotal = quantity * unitPrice per item\n  subtotalBeforeVat = SUM(lineTotals)\n  totalVat = SUM(ROUND(lineTotal * vatRate/100, 2))\n  totalAmount = subtotalBeforeVat + totalVat
            BE->>DB: SELECT NEXTVAL('sales_order_seq') as seq
            DB-->>BE: seq
            BE->>BE: soNo = 'SO-' || YEAR || '-' || LPAD(seq, 4, '0')
            BE->>DB: INSERT sales_orders\n  {soNo, customerId, quotationId:null, orderDate,\n   deliveryDate, notes, subtotalBeforeVat, vatAmount,\n   totalAmount, status:'confirmed', createdBy, createdAt}
            DB-->>BE: salesOrderId
            BE->>DB: INSERT so_items (bulk)\n  {salesOrderId, itemNo, description, quantity,\n   unitPrice, vatRate, lineTotal, invoicedQty:0}
            DB-->>BE: items inserted
            BE->>BE: check creditWarning:\n  if (customer.creditLimit AND totalAmount + currentBalance > creditLimit)\n    creditWarning = {creditLimit, currentBalance, wouldExceedBy}
            BE-->>FE: 201 {data: {id, soNo, status, subtotalBeforeVat, vatAmount, totalAmount}, creditWarning}
            FE-->>U: navigate → SO detail page
        end
    end
```

---

### API: `GET /api/finance/sales-orders/:id`

**Purpose**
- ดึงรายละเอียด sales order พร้อม items (invoicedQty, remainingQty) และ linked invoices

**FE Screen**
- `/finance/sales-orders/:id`

**Params**
- Path Params: `id` (string, required)

**Response Body (200)**
```json
{
  "data": {
    "id": "so_001",
    "soNo": "SO-2026-0001",
    "customerId": "cust_001",
    "customerName": "บริษัท ABC จำกัด",
    "orderDate": "2026-04-16",
    "deliveryDate": "2026-04-30",
    "subtotalBeforeVat": 5000,
    "vatAmount": 350,
    "totalAmount": 5350,
    "status": "confirmed",
    "quotationId": null,
    "notes": "ส่งถึงสาขา A",
    "items": [
      {
        "id": "soi_001",
        "itemNo": 1,
        "description": "อุปกรณ์สำนักงาน",
        "quantity": 10,
        "unitPrice": 500,
        "lineTotal": 5000,
        "vatRate": 7,
        "invoicedQty": 0,
        "remainingQty": 10
      }
    ],
    "linkedInvoices": [],
    "createdBy": "user_001",
    "createdAt": "2026-04-16T10:00:00Z"
  }
}
```

**Sequence Diagram**
```mermaid
sequenceDiagram
    autonumber
    participant FE as Frontend
    participant BE as Backend Finance API
    participant DB as PostgreSQL

    FE->>BE: GET /api/finance/sales-orders/:id
    BE->>DB: SELECT so.*, c.name as customerName\n  FROM sales_orders so\n  JOIN customers c ON c.id=so.customerId\n  WHERE so.id=:id
    alt not found
        BE-->>FE: 404 {error:"Sales Order not found"}
    else found
        par parallel queries
            BE->>DB: SELECT id, itemNo, description, quantity,\n  unitPrice, lineTotal, vatRate, invoicedQty,\n  (quantity - invoicedQty) as remainingQty\n  FROM so_items WHERE salesOrderId=:id ORDER BY itemNo ASC
            BE->>DB: SELECT inv.id, inv.invoiceNo, inv.status, inv.totalAmount\n  FROM invoices inv WHERE inv.salesOrderId=:id\n  ORDER BY inv.createdAt ASC
        end
        DB-->>BE: so + items[] + linkedInvoices[]
        BE-->>FE: 200 {data: so + items[] + linkedInvoices[]}
    end
```

---

### API: `PATCH /api/finance/sales-orders/:id/status`

**Purpose**
- เปลี่ยนสถานะ SO: `confirmed` / `cancelled` (`partially_invoiced`, `invoiced` เป็น system-derived states)

**FE Screen**
- `/finance/sales-orders/:id`

**Request Headers**
```json
{ "Authorization": "Bearer <access_token>" }
```

**Request Body**
```json
{ "status": "cancelled" }
```

**Response Body (200)**
```json
{ "data": { "id": "so_001", "status": "cancelled" }, "message": "Status updated" }
```

**Sequence Diagram**
```mermaid
sequenceDiagram
    autonumber
    participant FE as Frontend
    participant BE as Backend Finance API
    participant DB as PostgreSQL

    FE->>BE: PATCH /api/finance/sales-orders/:id/status {status}
    BE->>BE: validate status IN ('confirmed','cancelled')
    alt invalid status value
        BE-->>FE: 422 {error:"Status must be confirmed or cancelled"}
    else valid
        BE->>DB: SELECT id, status FROM sales_orders WHERE id=:id
        alt not found
            BE-->>FE: 404 {error:"Sales Order not found"}
        else status = 'cancelled'
            BE-->>FE: 422 {error:"Sales Order is already cancelled"}
        else status = 'invoiced'
            BE-->>FE: 422 {error:"Cannot change status of fully invoiced Sales Order"}
        else ok
            alt requested = 'cancelled'
                BE->>DB: SELECT COUNT(*) FROM invoices\n  WHERE salesOrderId=:id AND status NOT IN ('voided')
                alt has non-voided invoices
                    BE-->>FE: 422 {error:"Cannot cancel SO with existing invoices"}
                end
            end
            BE->>DB: UPDATE sales_orders\n  SET status=:status, updatedAt=NOW()\n  WHERE id=:id
            DB-->>BE: updated
            BE-->>FE: 200 {data: {id, status}}
        end
    end
```

---

### API: `POST /api/finance/sales-orders/:id/convert-to-invoice`

**Purpose**
- แปลง SO เป็น invoice โดยใช้เฉพาะ remaining quantity; ถ้าไม่มียอดคงเหลือให้ตอบ 409

**FE Screen**
- `/finance/sales-orders/:id`

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
  "data": {
    "invoiceId": "inv_001",
    "invoiceNo": "INV-2026-0001",
    "salesOrderId": "so_001",
    "salesOrderStatus": "invoiced"
  },
  "message": "Converted to Invoice"
}
```

**Sequence Diagram**
```mermaid
sequenceDiagram
    autonumber
    participant FE as Frontend
    participant BE as Backend Finance API
    participant DB as PostgreSQL

    FE->>BE: POST /api/finance/sales-orders/:id/convert-to-invoice
    BE->>DB: SELECT so.id, so.status, so.customerId\n  FROM sales_orders so WHERE so.id=:id
    alt not found
        BE-->>FE: 404 {error:"Sales Order not found"}
    else status = 'cancelled'
        BE-->>FE: 422 {error:"Cannot convert cancelled Sales Order"}
    else ok
        BE->>DB: SELECT id, itemNo, description, quantity,\n  unitPrice, vatRate, lineTotal, invoicedQty,\n  (quantity - invoicedQty) as remainingQty\n  FROM so_items WHERE salesOrderId=:id
        DB-->>BE: items with remainingQty
        BE->>BE: invoicableItems = items WHERE remainingQty > 0
        alt invoicableItems is empty
            BE-->>FE: 409 {error:"All items have been fully invoiced"}
        else has remaining qty
            BE->>BE: compute invoice totals from invoicableItems\n  lineTotal = remainingQty * unitPrice\n  subtotalBeforeVat = SUM(lineTotals)\n  totalVat = SUM(ROUND(lineTotal * vatRate/100, 2))\n  totalAmount = subtotalBeforeVat + totalVat
            BE->>DB: SELECT NEXTVAL('invoice_seq') as seq
            DB-->>BE: seq
            BE->>BE: invoiceNo = 'INV-' || YEAR || '-' || LPAD(seq, 4, '0')
            BE->>DB: INSERT invoices {\n  invoiceNo, customerId, salesOrderId,\n  issueDate: TODAY(), subtotalBeforeVat, vatAmount,\n  totalAmount, status:'draft', createdBy, createdAt\n}
            DB-->>BE: invoiceId
            BE->>DB: INSERT invoice_items (bulk from invoicableItems)\n  {invoiceId, itemNo, description, quantity:remainingQty,\n   unitPrice, vatRate, lineTotal}
            DB-->>BE: items inserted
            BE->>DB: UPDATE so_items\n  SET invoicedQty = quantity\n  WHERE salesOrderId=:id AND (quantity - invoicedQty) > 0
            BE->>BE: newStatus = (all items fully invoiced) ? 'invoiced' : 'partially_invoiced'
            BE->>DB: UPDATE sales_orders SET status=:newStatus, updatedAt=NOW() WHERE id=:id
            DB-->>BE: updated
            BE-->>FE: 201 {data: {invoiceId, invoiceNo, salesOrderId, salesOrderStatus: newStatus}}
            FE->>FE: navigate → invoice detail page
        end
    end
```

---

## Coverage Lock Addendum (2026-04-16)

### Contract Usage Note
- sequence/examples ด้านบนยังย่อเกินไปสำหรับ field-level implementation; ถ้ามีความต่างระหว่าง placeholder กับการใช้งานจริง ให้ยึด addendum นี้เป็น source of truth

### Quotation contracts
- `GET /api/finance/quotations` query ที่ล็อกคือ `page`, `limit`, `search`, `status`, `customerId?`
- quotation list item อย่างน้อยต้องมี `id`, `quotNo`, `customerId`, `customerCode?`, `customerName`, `issueDate`, `validUntil`, `subtotalBeforeVat`, `vatAmount`, `totalAmount`, `status`, `updatedAt`
- `POST /api/finance/quotations` และ `PATCH /api/finance/quotations/:id` body ที่ล็อกคือ `customerId`, `issueDate`, `validUntil`, `notes?`, `termsAndConditions?`, `items[]`
- `items[]` ต้องใช้ `description`, `quantity`, `unitPrice`, `vatRate?`; `lineTotal`, `subtotalBeforeVat`, `vatAmount`, `totalAmount` เป็น server-computed fields
- `GET /api/finance/quotations/:id` ต้องคืน header fields + `items[]`, `createdBy`, `createdAt`, `customerSnapshot?`, `salesOrderId?`
- `PATCH /api/finance/quotations/:id/status` body ใช้ persisted status values คือ `{ "status": "sent" | "accepted" | "rejected" }`; `expired` เป็น system-derived state ไม่ใช่ manual action หลัก
- response หลัง quotation create ต้องรองรับ `creditWarning?`; ถ้ามีให้ถือเป็น advisory payload ไม่ใช่ hard error

### Sales order contracts
- `GET /api/finance/sales-orders` query ที่ล็อกคือ `page`, `limit`, `search`, `status`, `customerId?`
- sales-order list item อย่างน้อยต้องมี `id`, `soNo`, `customerId`, `customerCode?`, `customerName`, `orderDate`, `deliveryDate?`, `subtotalBeforeVat`, `vatAmount`, `totalAmount`, `status`, `updatedAt`
- `POST /api/finance/sales-orders` body ที่ล็อกคือ `customerId`, `orderDate`, `deliveryDate?`, `notes?`, `items[]`
- `GET /api/finance/sales-orders/:id` ต้องคืน header fields + `quotationId?`, `items[]`, `linkedInvoices[]`
- `so.items[]` อย่างน้อยต้องมี `id`, `itemNo`, `description`, `quantity`, `unitPrice`, `lineTotal`, `vatRate`, `invoicedQty`, `remainingQty`
- `linkedInvoices[]` อย่างน้อยต้องมี `id`, `invoiceNo`, `status`, `totalAmount`
- `PATCH /api/finance/sales-orders/:id/status` body ใช้ `{ "status": "confirmed" | "cancelled" }`; `partially_invoiced` และ `invoiced` เป็น system-derived states

### Conversion / picker / export rules
- `POST /api/finance/quotations/:id/convert-to-so` success response ต้องคืนอย่างน้อย `salesOrderId`, `soNo`, `quotationId`, `quotationStatus`
- `POST /api/finance/sales-orders/:id/convert-to-invoice` success response ต้องคืนอย่างน้อย `invoiceId`, `invoiceNo`, `salesOrderId`, `salesOrderStatus`
- convert-to-invoice ต้องใช้เฉพาะ remaining quantity จาก `quantity - invoicedQty`; ถ้าไม่มียอดคงเหลือให้ตอบ `409`
- customer picker ของ quotation / sales-order create ต้อง reuse `GET /api/finance/customers/options`
- `creditWarning` เป็น canonical บน quotation create; direct sales-order create อาจ reuse warning envelope เดียวกันได้ แต่ UX ต้องถือว่าเป็น optional advisory field
- `GET /api/finance/quotations/:id/pdf` เป็น synchronous inline PDF download และต้องอิง dataset เดียวกับ quotation detail

### Validation locks
- `customerId`, `issueDate`, `validUntil`, `orderDate` เป็น required ตาม document type
- quotation update (`PATCH /api/finance/quotations/:id`) ใช้ได้เฉพาะ `status = draft`
- `validUntil` ต้องไม่น้อยกว่า `issueDate`
- ทุกเอกสารต้องมี `items[]` อย่างน้อย 1 รายการ และ `quantity > 0`, `unitPrice >= 0`
