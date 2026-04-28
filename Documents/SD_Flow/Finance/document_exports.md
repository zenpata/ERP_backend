# Document Exports (Normalized)

อ้างอิง: `Documents/Requirements/Release_2.md`

## API Inventory
- `GET /api/finance/invoices/:id/pdf`
- `GET /api/finance/invoices/:id/preview`
- `GET /api/finance/ap/vendor-invoices/:id/pdf`
- `GET /api/finance/quotations/:id/pdf`
- `GET /api/finance/purchase-orders/:id/pdf`
- `GET /api/finance/tax/wht-certificates/:id/pdf`
- `GET /api/finance/reports/profit-loss/export`
- `GET /api/finance/reports/balance-sheet/export`
- `GET /api/finance/reports/cash-flow/export`
- `GET /api/finance/tax/vat-summary/export`
- `GET /api/finance/tax/pnd-report/export`
- `GET /api/hr/payroll/runs/:runId/payslips/:payslipId/pdf`
- `GET /api/hr/payroll/runs/:runId/payslips/export`

## Endpoint Details

### API: `GET /api/finance/invoices/:id/pdf`

**Purpose**
- Generate และ return PDF ของ Invoice สำหรับส่งให้ลูกค้า

**FE Screen**
- Invoice detail → ปุ่ม "ดาวน์โหลด PDF"

**Params**
- Path Params: `id` (invoice ID)
- Query Params: ไม่มี

**Request Headers**
```json
{
  "Authorization": "Bearer <access_token>"
}
```

**Request Body**
```json
// no request body
```

**Response Body (200)**
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="invoice-{invoiceNo}.pdf"

<binary pdf stream>
```

**Sequence Diagram**
```mermaid
sequenceDiagram
    autonumber
    participant FE as Frontend
    participant BE as Backend API
    participant DB as PostgreSQL
    participant PDF as PDF Engine

    FE->>BE: GET /api/finance/invoices/:id/pdf
    BE->>DB: SELECT i.*, c.name as customerName, c.taxId, c.address\n  FROM invoices i\n  JOIN customers c ON c.id=i.customerId\n  WHERE i.id=:id
    alt not found
        BE-->>FE: 404 {error:"Invoice not found"}
    else found
        BE->>DB: SELECT * FROM invoice_items WHERE invoiceId=:id ORDER BY id ASC
        DB-->>BE: invoice + customer + items[]
        BE->>PDF: renderPDF(template:'invoice',\n  data:{invoice, customer, items[], companyProfile})
        PDF-->>BE: pdf buffer
        BE-->>FE: 200 Content-Type:application/pdf (binary stream)
    end
```

---

### API: `GET /api/finance/invoices/:id/preview`

**Purpose**
- Return HTML preview ของ Invoice — FE แสดง inline ใน modal ก่อน print/send

**FE Screen**
- Invoice detail → ปุ่ม "Preview" → modal

**Params**
- Path Params: `id` (invoice ID)
- Query Params: ไม่มี

**Request Headers**
```json
{
  "Authorization": "Bearer <access_token>"
}
```

**Request Body**
```json
// no request body
```

**Response Body (200)**
```json
{
  "data": {
    "html": "<html>...</html>",
    "documentNo": "INV-2026-0001"
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
    participant PDF as PDF Engine

    FE->>BE: GET /api/finance/invoices/:id/preview
    BE->>DB: SELECT i.*, c.name as customerName, c.taxId, c.address\n  FROM invoices i\n  JOIN customers c ON c.id=i.customerId\n  WHERE i.id=:id
    alt not found
        BE-->>FE: 404 {error:"Invoice not found"}
    else found
        BE->>DB: SELECT * FROM invoice_items WHERE invoiceId=:id ORDER BY id ASC
        DB-->>BE: invoice + customer + items[]
        BE->>PDF: renderHTML(template:'invoice',\n  data:{invoice, customer, items[], companyProfile})
        PDF-->>BE: html string
        BE-->>FE: 200 {data: {html, documentNo: invoice.invoiceNo}}
    end
```

---

### API: `GET /api/finance/ap/vendor-invoices/:id/pdf`

**Purpose**
- Generate PDF ของ AP Bill / vendor invoice สำหรับ archive หรือ approval workflow

**FE Screen**
- AP Bill detail → ปุ่ม "ดาวน์โหลด PDF"

**Params**
- Path Params: `id` (AP bill ID)
- Query Params: ไม่มี

**Request Headers**
```json
{
  "Authorization": "Bearer <access_token>"
}
```

**Request Body**
```json
// no request body
```

**Response Body (200)**
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="vendor-invoice-{documentNo}.pdf"

<binary pdf stream>
```

**Sequence Diagram**
```mermaid
sequenceDiagram
    autonumber
    participant FE as Frontend
    participant BE as Backend API
    participant DB as PostgreSQL
    participant PDF as PDF Engine

    FE->>BE: GET /api/finance/ap/vendor-invoices/:id/pdf
    BE->>DB: SELECT ab.*, v.name as vendorName, v.taxId, v.address\n  FROM finance_ap_bills ab\n  JOIN vendors v ON v.id=ab.vendorId\n  WHERE ab.id=:id
    alt not found
        BE-->>FE: 404 {error:"AP Bill not found"}
    else found
        BE->>DB: SELECT * FROM finance_ap_bill_items WHERE billId=:id ORDER BY id ASC
        DB-->>BE: ap_bill + vendor + items[]
        BE->>PDF: renderPDF(template:'ap_bill',\n  data:{ap_bill, vendor, items[], companyProfile})
        PDF-->>BE: pdf buffer
        BE-->>FE: 200 Content-Type:application/pdf (binary stream)
    end
```

---

### API: `GET /api/finance/quotations/:id/pdf`

**Purpose**
- Generate PDF ของ Quotation สำหรับส่งให้ลูกค้า

**FE Screen**
- Quotation detail → ปุ่ม "ดาวน์โหลด PDF"

**Params**
- Path Params: `id` (quotation ID)
- Query Params: ไม่มี

**Request Headers**
```json
{
  "Authorization": "Bearer <access_token>"
}
```

**Request Body**
```json
// no request body
```

**Response Body (200)**
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="quotation-{quotationNo}.pdf"

<binary pdf stream>
```

**Sequence Diagram**
```mermaid
sequenceDiagram
    autonumber
    participant FE as Frontend
    participant BE as Backend API
    participant DB as PostgreSQL
    participant PDF as PDF Engine

    FE->>BE: GET /api/finance/quotations/:id/pdf
    BE->>DB: SELECT q.*, c.name as customerName, c.taxId, c.address\n  FROM quotations q\n  JOIN customers c ON c.id=q.customerId\n  WHERE q.id=:id
    alt not found
        BE-->>FE: 404 {error:"Quotation not found"}
    else found
        BE->>DB: SELECT * FROM quotation_items WHERE quotationId=:id ORDER BY id ASC
        DB-->>BE: quotation + customer + items[]
        BE->>PDF: renderPDF(template:'quotation',\n  data:{quotation, customer, items[], companyProfile})
        PDF-->>BE: pdf buffer
        BE-->>FE: 200 Content-Type:application/pdf (binary stream)
    end
```

---

### API: `GET /api/finance/purchase-orders/:id/pdf`

**Purpose**
- Generate PDF ของ Purchase Order สำหรับส่งให้ vendor

**FE Screen**
- PO detail → ปุ่ม "ดาวน์โหลด PDF"

**Params**
- Path Params: `id` (PO ID)
- Query Params: ไม่มี

**Request Headers**
```json
{
  "Authorization": "Bearer <access_token>"
}
```

**Request Body**
```json
// no request body
```

**Response Body (200)**
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="purchase-order-{poNo}.pdf"

<binary pdf stream>
```

**Sequence Diagram**
```mermaid
sequenceDiagram
    autonumber
    participant FE as Frontend
    participant BE as Backend API
    participant DB as PostgreSQL
    participant PDF as PDF Engine

    FE->>BE: GET /api/finance/purchase-orders/:id/pdf
    BE->>DB: SELECT po.*, v.name as vendorName, v.taxId, v.address,\n  v.contactName, v.phone\n  FROM purchase_orders po\n  JOIN vendors v ON v.id=po.vendorId\n  WHERE po.id=:id
    alt not found
        BE-->>FE: 404 {error:"Purchase Order not found"}
    else found
        BE->>DB: SELECT * FROM purchase_order_items WHERE poId=:id ORDER BY id ASC
        DB-->>BE: po + vendor + items[]
        BE->>PDF: renderPDF(template:'purchase_order',\n  data:{po, vendor, items[], companyProfile})
        PDF-->>BE: pdf buffer
        BE-->>FE: 200 Content-Type:application/pdf (binary stream)
    end
```

---

### API: `GET /api/finance/tax/wht-certificates/:id/pdf`

**Purpose**
- Generate PDF ใบรับรองการหักภาษี ณ ที่จ่าย (WHT Certificate) สำหรับ vendor/payee

**FE Screen**
- WHT Certificate detail → ปุ่ม "ดาวน์โหลด PDF"

**Params**
- Path Params: `id` (WHT certificate ID)
- Query Params: ไม่มี

**Request Headers**
```json
{
  "Authorization": "Bearer <access_token>"
}
```

**Request Body**
```json
// no request body
```

**Response Body (200)**
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="wht-certificate-{certificateNo}.pdf"

<binary pdf stream>
```

**Sequence Diagram**
```mermaid
sequenceDiagram
    autonumber
    participant FE as Frontend
    participant BE as Backend API
    participant DB as PostgreSQL
    participant PDF as PDF Engine

    FE->>BE: GET /api/finance/tax/wht-certificates/:id/pdf
    BE->>DB: SELECT wc.*, v.name as vendorName, v.taxId, v.address\n  FROM wht_certificates wc\n  JOIN vendors v ON v.id=wc.vendorId\n  WHERE wc.id=:id
    alt not found
        BE-->>FE: 404 {error:"WHT Certificate not found"}
    else found
        BE->>DB: SELECT * FROM wht_certificate_items WHERE certificateId=:id ORDER BY id ASC
        DB-->>BE: certificate + vendor + items[]
        BE->>PDF: renderPDF(template:'wht_certificate',\n  data:{certificate, vendor, items[], companyProfile})
        PDF-->>BE: pdf buffer
        BE-->>FE: 200 Content-Type:application/pdf (binary stream)
    end
```

---

### API: `GET /api/finance/reports/profit-loss/export`

**Purpose**
- Export งบกำไรขาดทุน ตาม period และ format ที่เลือก (pdf/xlsx)

**FE Screen**
- `/finance/reports/profit-loss` → ปุ่ม "Export"

**Params**
- Path Params: ไม่มี
- Query Params: `periodFrom` *(required, YYYY-MM)*, `periodTo` *(required, YYYY-MM)*, `format` *(required: pdf | xlsx)*

**Request Headers**
```json
{
  "Authorization": "Bearer <access_token>"
}
```

**Request Body**
```json
// no request body
```

**Response Body (200) — format=pdf**
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="profit-loss-{periodFrom}-{periodTo}.pdf"

<binary pdf stream>
```

**Response Body (200) — format=xlsx**
```
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="profit-loss-{periodFrom}-{periodTo}.xlsx"

<binary xlsx stream>
```

**Sequence Diagram**
```mermaid
sequenceDiagram
    autonumber
    participant FE as Frontend
    participant BE as Backend API
    participant DB as PostgreSQL
    participant EXP as Export Engine

    FE->>BE: GET /api/finance/reports/profit-loss/export\n  ?periodFrom=2026-01&periodTo=2026-04&format=pdf
    BE->>BE: validate periodFrom <= periodTo\n  validate format IN ('pdf','xlsx')
    alt invalid params
        BE-->>FE: 400 {error:"Invalid period range or format"}
    else ok
        BE->>DB: SELECT coa.code, coa.name, coa.type,\n  SUM(CASE WHEN coa.type='income'\n    THEN jl.credit - jl.debit\n    ELSE jl.debit - jl.credit END) as amount\n  FROM journal_lines jl\n  JOIN journal_entries je ON je.id=jl.journalId\n  JOIN chart_of_accounts coa ON coa.id=jl.accountId\n  WHERE je.status='posted'\n    AND coa.type IN ('income','expense')\n    AND DATE_TRUNC('month', je.date) BETWEEN :from AND :to\n  GROUP BY coa.id ORDER BY coa.code ASC
        DB-->>BE: series rows
        BE->>BE: compute totals: revenue, expenses, netProfit
        BE->>EXP: render(format, template:'profit_loss',\n  data:{series[], totals, meta:{periodFrom, periodTo}})
        EXP-->>BE: file buffer (pdf or xlsx)
        BE-->>FE: 200 Content-Type:<format> (binary stream)
    end
```

---

### API: `GET /api/finance/reports/balance-sheet/export`

**Purpose**
- Export งบดุล ณ วันที่ระบุ ตาม format ที่เลือก (pdf/xlsx)

**FE Screen**
- `/finance/reports/balance-sheet` → ปุ่ม "Export"

**Params**
- Path Params: ไม่มี
- Query Params: `asOfDate` *(required, YYYY-MM-DD)*, `format` *(required: pdf | xlsx)*

**Request Headers**
```json
{
  "Authorization": "Bearer <access_token>"
}
```

**Request Body**
```json
// no request body
```

**Response Body (200) — format=pdf**
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="balance-sheet-{asOfDate}.pdf"

<binary pdf stream>
```

**Response Body (200) — format=xlsx**
```
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="balance-sheet-{asOfDate}.xlsx"

<binary xlsx stream>
```

**Sequence Diagram**
```mermaid
sequenceDiagram
    autonumber
    participant FE as Frontend
    participant BE as Backend API
    participant DB as PostgreSQL
    participant EXP as Export Engine

    FE->>BE: GET /api/finance/reports/balance-sheet/export\n  ?asOfDate=2026-04-27&format=xlsx
    BE->>BE: validate asOfDate format (YYYY-MM-DD)\n  validate format IN ('pdf','xlsx')
    alt invalid params
        BE-->>FE: 400 {error:"asOfDate is required (YYYY-MM-DD) and format must be pdf or xlsx"}
    else ok
        BE->>DB: SELECT coa.code, coa.name, coa.type,\n  SUM(CASE WHEN coa.normalBalance='debit'\n    THEN jl.debit - jl.credit\n    ELSE jl.credit - jl.debit END) as amount\n  FROM journal_lines jl\n  JOIN journal_entries je ON je.id=jl.journalId\n  JOIN chart_of_accounts coa ON coa.id=jl.accountId\n  WHERE je.status='posted'\n    AND coa.type IN ('asset','liability','equity')\n    AND je.date <= :asOfDate\n  GROUP BY coa.id HAVING SUM(...) != 0\n  ORDER BY coa.type, coa.code ASC
        DB-->>BE: series rows
        BE->>BE: compute totalAssets, totalLiabilities, totalEquity, isBalanced
        BE->>EXP: render(format, template:'balance_sheet',\n  data:{series[], totals, meta:{asOfDate}})
        EXP-->>BE: file buffer (pdf or xlsx)
        BE-->>FE: 200 Content-Type:<format> (binary stream)
    end
```

---

### API: `GET /api/finance/reports/cash-flow/export`

**Purpose**
- Export งบกระแสเงินสด ตาม period และ format ที่เลือก (pdf/xlsx)

**FE Screen**
- `/finance/reports/cash-flow` → ปุ่ม "Export"

**Params**
- Path Params: ไม่มี
- Query Params: `periodFrom` *(required, YYYY-MM)*, `periodTo` *(required, YYYY-MM)*, `format` *(required: pdf | xlsx)*

**Request Headers**
```json
{
  "Authorization": "Bearer <access_token>"
}
```

**Request Body**
```json
// no request body
```

**Response Body (200) — format=pdf**
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="cash-flow-{periodFrom}-{periodTo}.pdf"

<binary pdf stream>
```

**Response Body (200) — format=xlsx**
```
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="cash-flow-{periodFrom}-{periodTo}.xlsx"

<binary xlsx stream>
```

**Sequence Diagram**
```mermaid
sequenceDiagram
    autonumber
    participant FE as Frontend
    participant BE as Backend API
    participant DB as PostgreSQL
    participant EXP as Export Engine

    FE->>BE: GET /api/finance/reports/cash-flow/export\n  ?periodFrom=2026-01&periodTo=2026-04&format=xlsx
    BE->>BE: validate periodFrom <= periodTo\n  validate format IN ('pdf','xlsx')
    alt invalid params
        BE-->>FE: 400 {error:"Invalid period range or format"}
    else ok
        par parallel cash flow queries
            BE->>DB: SELECT SUM(amount) as arCashIn\n  FROM bank_account_transactions\n  WHERE referenceType='ar_payment'\n    AND transactionDate BETWEEN :from AND :to
            BE->>DB: SELECT SUM(amount) as apCashOut\n  FROM bank_account_transactions\n  WHERE referenceType='ap_payment'\n    AND transactionDate BETWEEN :from AND :to
            BE->>DB: SELECT SUM(amount) as payrollCashOut\n  FROM bank_account_transactions\n  WHERE referenceType='payroll'\n    AND transactionDate BETWEEN :from AND :to
            BE->>DB: SELECT SUM(amount) as assetPurchase\n  FROM bank_account_transactions\n  WHERE referenceType='asset_acquisition'\n    AND transactionDate BETWEEN :from AND :to
        end
        DB-->>BE: cash flow sources
        BE->>BE: build series[], compute totals (operating/investing/financing/net)
        BE->>EXP: render(format, template:'cash_flow',\n  data:{series[], totals, meta:{periodFrom, periodTo}})
        EXP-->>BE: file buffer (pdf or xlsx)
        BE-->>FE: 200 Content-Type:<format> (binary stream)
    end
```

---

### API: `GET /api/finance/tax/vat-summary/export`

**Purpose**
- Export สรุป VAT รายเดือน (PP.30) ตาม month/year และ format ที่เลือก

**FE Screen**
- `/finance/tax/vat-summary` → ปุ่ม "Export"

**Params**
- Path Params: ไม่มี
- Query Params: `month` *(required, 1-12)*, `year` *(required, YYYY)*, `format` *(required: pdf | xlsx)*

**Request Headers**
```json
{
  "Authorization": "Bearer <access_token>"
}
```

**Request Body**
```json
// no request body
```

**Response Body (200) — format=pdf**
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="vat-summary-{year}-{month}.pdf"

<binary pdf stream>
```

**Response Body (200) — format=xlsx**
```
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="vat-summary-{year}-{month}.xlsx"

<binary xlsx stream>
```

**Sequence Diagram**
```mermaid
sequenceDiagram
    autonumber
    participant FE as Frontend
    participant BE as Backend API
    participant DB as PostgreSQL
    participant EXP as Export Engine

    FE->>BE: GET /api/finance/tax/vat-summary/export\n  ?month=4&year=2026&format=pdf
    BE->>BE: validate month (1-12), year (YYYY)\n  validate format IN ('pdf','xlsx')
    alt invalid params
        BE-->>FE: 400 {error:"month, year and format are required"}
    else ok
        par parallel queries
            BE->>DB: SELECT i.invoiceNo, i.issueDate, c.name, c.taxId,\n  i.subtotal, i.vatAmount, i.grandTotal\n  FROM invoices i\n  JOIN customers c ON c.id=i.customerId\n  WHERE EXTRACT(MONTH FROM i.issueDate)=:month\n    AND EXTRACT(YEAR FROM i.issueDate)=:year\n    AND i.status NOT IN ('draft','voided')\n  ORDER BY i.issueDate ASC
            BE->>DB: SELECT ab.documentNo, ab.issueDate, v.name, v.taxId,\n  ab.subtotal, ab.vatAmount, ab.totalAmount\n  FROM finance_ap_bills ab\n  JOIN vendors v ON v.id=ab.vendorId\n  WHERE EXTRACT(MONTH FROM ab.issueDate)=:month\n    AND EXTRACT(YEAR FROM ab.issueDate)=:year\n    AND ab.status NOT IN ('draft','rejected')\n  ORDER BY ab.issueDate ASC
        end
        DB-->>BE: outputVat[] (invoices), inputVat[] (ap bills)
        BE->>BE: compute: outputVatTotal, inputVatTotal, netVat
        BE->>EXP: render(format, template:'vat_summary',\n  data:{outputVat[], inputVat[], totals, meta:{month, year}})
        EXP-->>BE: file buffer (pdf or xlsx)
        BE-->>FE: 200 Content-Type:<format> (binary stream)
    end
```

---

### API: `GET /api/finance/tax/pnd-report/export`

**Purpose**
- Export รายงาน PND ตามแบบฟอร์ม (PND1/3/53) month/year และ format ที่เลือก

**FE Screen**
- `/finance/tax/pnd-report` → ปุ่ม "Export"

**Params**
- Path Params: ไม่มี
- Query Params: `form` *(required: PND1 | PND3 | PND53)*, `month` *(required, 1-12)*, `year` *(required, YYYY)*, `format` *(required: pdf | xlsx)*

**Request Headers**
```json
{
  "Authorization": "Bearer <access_token>"
}
```

**Request Body**
```json
// no request body
```

**Response Body (200) — format=pdf**
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="pnd-report-{form}-{year}-{month}.pdf"

<binary pdf stream>
```

**Response Body (200) — format=xlsx**
```
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="pnd-report-{form}-{year}-{month}.xlsx"

<binary xlsx stream>
```

**Sequence Diagram**
```mermaid
sequenceDiagram
    autonumber
    participant FE as Frontend
    participant BE as Backend API
    participant DB as PostgreSQL
    participant EXP as Export Engine

    FE->>BE: GET /api/finance/tax/pnd-report/export\n  ?form=PND3&month=4&year=2026&format=pdf
    BE->>BE: validate form IN ('PND1','PND3','PND53')\n  validate month (1-12), year (YYYY)\n  validate format IN ('pdf','xlsx')
    alt invalid params
        BE-->>FE: 400 {error:"form, month, year and format are required"}
    else ok
        alt form = PND1 (personal income tax — employee salaries)
            BE->>DB: SELECT e.taxId, e.name, ps.salaryAmount,\n  ps.withheldTax, ps.whtRate\n  FROM payroll_slips ps\n  JOIN employees e ON e.id=ps.employeeId\n  WHERE EXTRACT(MONTH FROM ps.periodDate)=:month\n    AND EXTRACT(YEAR FROM ps.periodDate)=:year
        else form = PND3 or PND53 (WHT on vendor payments)
            BE->>DB: SELECT wc.certificateNo, wc.paymentDate,\n  v.taxId, v.name,\n  wci.incomeType, wci.amount, wci.whtRate, wci.withheldTax\n  FROM wht_certificates wc\n  JOIN vendors v ON v.id=wc.vendorId\n  JOIN wht_certificate_items wci ON wci.certificateId=wc.id\n  WHERE EXTRACT(MONTH FROM wc.paymentDate)=:month\n    AND EXTRACT(YEAR FROM wc.paymentDate)=:year\n  ORDER BY wc.paymentDate ASC
        end
        DB-->>BE: wht rows
        BE->>BE: aggregate by payee, compute totalIncome, totalWithheld
        BE->>EXP: render(format, template:form,\n  data:{rows[], totals, meta:{form, month, year, companyProfile}})
        EXP-->>BE: file buffer (pdf or xlsx)
        BE-->>FE: 200 Content-Type:<format> (binary stream)
    end
```

---

### API: `GET /api/hr/payroll/runs/:runId/payslips/:payslipId/pdf`

**Purpose**
- ดาวน์โหลด payslip PDF รายบุคคล — synchronous inline download

**FE Screen**
- Payroll run detail → payslip row → ปุ่ม "ดาวน์โหลด"

**Params**
- Path Params: `runId` *(required)*, `payslipId` *(required)*
- Query Params: ไม่มี

**Request Headers**
```json
{
  "Authorization": "Bearer <access_token>"
}
```

**Request Body**
```json
// no request body
```

**Response Body (200)**
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="payslip-{employeeName}-{period}.pdf"

<binary pdf stream>
```

**Sequence Diagram**
```mermaid
sequenceDiagram
    autonumber
    participant FE as Frontend
    participant BE as Backend API
    participant DB as PostgreSQL
    participant PDF as PDF Engine

    FE->>BE: GET /api/hr/payroll/runs/:runId/payslips/:payslipId/pdf
    BE->>DB: SELECT ps.*, pr.periodFrom, pr.periodTo,\n  e.name as employeeName, e.taxId, e.department, e.position\n  FROM payroll_slips ps\n  JOIN payroll_runs pr ON pr.id=ps.runId\n  JOIN employees e ON e.id=ps.employeeId\n  WHERE ps.id=:payslipId AND ps.runId=:runId
    alt not found
        BE-->>FE: 404 {error:"Payslip not found"}
    else found
        BE->>DB: SELECT * FROM payroll_slip_lines\n  WHERE payslipId=:payslipId ORDER BY lineOrder ASC
        DB-->>BE: payslip + employee + lines[]
        BE->>PDF: renderPDF(template:'payslip',\n  data:{payslip, employee, lines[], companyProfile})
        PDF-->>BE: pdf buffer
        BE-->>FE: 200 Content-Type:application/pdf (binary stream)
    end
```

---

### API: `GET /api/hr/payroll/runs/:runId/payslips/export`

**Purpose**
- Export payslips ทั้ง run เป็น ZIP bundle — synchronous (small run) หรือ async (large run)

**FE Screen**
- Payroll run detail → ปุ่ม "Export ทั้งหมด"

**Params**
- Path Params: `runId` *(required)*
- Query Params: ไม่มี

**Request Headers**
```json
{
  "Authorization": "Bearer <access_token>"
}
```

**Request Body**
```json
// no request body
```

**Response Body (200) — synchronous (small run)**
```
Content-Type: application/zip
Content-Disposition: attachment; filename="payslips-run-{runId}.zip"

<binary zip stream>
```

**Response Body (202) — async (large run)**
```json
{
  "jobId": "job_abc123",
  "status": "processing",
  "estimatedReadyAt": "2026-04-19T10:05:00Z"
}
```

**Poll endpoint (async):** `GET /api/hr/payroll/runs/:runId/payslips/export/:jobId/status`
```json
{
  "jobId": "job_abc123",
  "status": "done",
  "downloadUrl": "https://...",
  "expiresAt": "2026-04-19T11:05:00Z"
}
```

**Sequence Diagram**
```mermaid
sequenceDiagram
    autonumber
    participant FE as Frontend
    participant BE as Backend API
    participant DB as PostgreSQL
    participant PDF as PDF Engine
    participant JQ as Job Queue

    FE->>BE: GET /api/hr/payroll/runs/:runId/payslips/export
    BE->>DB: SELECT id, status FROM payroll_runs WHERE id=:runId
    alt not found
        BE-->>FE: 404 {error:"Payroll run not found"}
    else status = draft
        BE-->>FE: 422 {error:"Cannot export payslips for draft payroll run"}
    else ok
        BE->>DB: SELECT COUNT(*) as payslipCount FROM payroll_slips WHERE runId=:runId
        DB-->>BE: payslipCount
        alt payslipCount <= 50 (synchronous threshold)
            BE->>DB: SELECT ps.*, e.name, e.department FROM payroll_slips ps\n  JOIN employees e ON e.id=ps.employeeId\n  WHERE ps.runId=:runId
            BE->>DB: SELECT psl.* FROM payroll_slip_lines psl\n  JOIN payroll_slips ps ON ps.id=psl.payslipId\n  WHERE ps.runId=:runId
            DB-->>BE: all slips + lines
            loop ทุก payslip
                BE->>PDF: renderPDF(template:'payslip', data:{slip, employee, lines[]})
                PDF-->>BE: pdf buffer
            end
            BE->>BE: zip all PDFs → buffer
            BE-->>FE: 200 Content-Type:application/zip (binary stream)
        else payslipCount > 50 (async)
            BE->>JQ: enqueueJob('export_payslips', {runId, requestedBy})
            JQ-->>BE: jobId, estimatedReadyAt
            BE-->>FE: 202 {jobId, status:'processing', estimatedReadyAt}
        end
    end
```

---

## Coverage Lock Addendum (2026-04-16)

### Response Type Rules
- inline download: `Content-Type` + `Content-Disposition` ต้องส่งชื่อไฟล์ชัดเจน
- async export: response ต้องคืน `{ jobId, status, estimatedReadyAt }`
- poll status endpoint ต้องคืน `downloadUrl` เมื่อเสร็จ และ `expiresAt` สำหรับลิงก์

### Format Matrix Lock
- invoice: `pdf`, `xlsx` (optional)
- payslip: `pdf`, `zip`
- reports: `pdf`, `xlsx`, `csv` (ตาม report type)

### Retention / Expiry
- export artifacts มี retention ตาม policy และต้องตอบ `410 Gone` เมื่อ link หมดอายุ
- ถ้า export endpoint เป็น synchronous inline download ต้องระบุชัดว่าไม่มี `jobId`
- ถ้า export endpoint เป็น asynchronous job ต้องระบุ polling/readback contract ให้ UX ใช้ต่อได้
