# Release 2 Traceability (Mermaid)

เอกสารนี้แสดง mapping แบบ traceable ระหว่าง `Page → API → Table` สำหรับ **feature ใหม่ทั้งหมดใน Release 2**

> สำหรับ Release 1 features ดูที่ `Documents/Release_1_traceability_mermaid.md`
> รายละเอียด requirements ดูที่ `Documents/Release_2.md`

---

## Feature 3.1 — Customer Management (Full CRUD)

```mermaid
flowchart LR
  subgraph PAGES_CUST["Pages"]
    P_CUST["/finance/customers"]
    P_CUST_NEW["/finance/customers/new"]
    P_CUST_ID["/finance/customers/:id"]
    P_CUST_EDIT["/finance/customers/:id/edit"]
  end

  subgraph APIS_CUST["API Endpoints"]
    A_CUST_LIST["GET /api/finance/customers"]
    A_CUST_OPT["GET /api/finance/customers/options"]
    A_CUST_GET["GET /api/finance/customers/:id"]
    A_CUST_CREATE["POST /api/finance/customers"]
    A_CUST_PATCH["PATCH /api/finance/customers/:id"]
    A_CUST_ACT["PATCH /api/finance/customers/:id/activate"]
    A_CUST_DEL["DELETE /api/finance/customers/:id"]
  end

  subgraph TABLES_CUST["DB Tables"]
    T_CUSTOMERS["customers\n(+code, taxId, address\ncontactName, phone, email\ncreditLimit ← Gap E\ncreditTermDays\nisActive, deletedAt, notes)"]
    T_INVOICES_REF["invoices\n(ref: customerId, balanceDue ← Gap E)"]
  end

  subgraph GAP_E["Integration — Gap E: Credit Check"]
    GE_INV["POST /api/finance/invoices\nPOST /api/finance/quotations\n→ check currentAR vs creditLimit\n→ return creditWarning if exceeded"]
  end

  P_CUST --> A_CUST_LIST
  P_CUST --> A_CUST_ACT
  P_CUST --> A_CUST_DEL
  P_CUST_NEW --> A_CUST_CREATE
  P_CUST_ID --> A_CUST_GET
  P_CUST_EDIT --> A_CUST_GET
  P_CUST_EDIT --> A_CUST_PATCH

  A_CUST_LIST --> T_CUSTOMERS
  A_CUST_OPT --> T_CUSTOMERS
  A_CUST_GET --> T_CUSTOMERS
  A_CUST_GET --> T_INVOICES_REF
  A_CUST_CREATE --> T_CUSTOMERS
  A_CUST_PATCH --> T_CUSTOMERS
  A_CUST_ACT --> T_CUSTOMERS
  T_CUSTOMERS -->|"creditLimit"| GE_INV
  T_INVOICES_REF -->|"SUM(balanceDue)"| GE_INV
  A_CUST_DEL --> T_CUSTOMERS
```

---

## Feature 3.2 — AR Payment Tracking

```mermaid
flowchart LR
  subgraph PAGES_AR["Pages"]
    P_INV_ID["/finance/invoices/:id"]
    P_INV_LIST["/finance/invoices"]
    P_AR_AGING["/finance/reports/ar-aging"]
  end

  subgraph APIS_AR["API Endpoints"]
    A_INV_PAY_CREATE["POST /api/finance/invoices/:id/payments"]
    A_INV_PAY_LIST["GET /api/finance/invoices/:id/payments"]
    A_INV_STATUS["PATCH /api/finance/invoices/:id/status"]
    A_AR_AGING["GET /api/finance/reports/ar-aging"]
  end

  subgraph TABLES_AR["DB Tables"]
    T_INV_PAYMENTS["invoice_payments\n(invoiceId, paymentDate\namount, paymentMethod\nbankAccountId, referenceNo)"]
    T_INVOICES_AR["invoices\n(+paidAmount, balanceDue\nsentAt, voidedAt)"]
    T_BANK_ACCTS_AR["bank_accounts (ref)"]
    T_CUSTOMERS_AR["customers (ref)"]
  end

  P_INV_ID --> A_INV_PAY_CREATE
  P_INV_ID --> A_INV_PAY_LIST
  P_INV_ID --> A_INV_STATUS
  P_INV_LIST --> A_AR_AGING
  P_AR_AGING --> A_AR_AGING

  A_INV_PAY_CREATE --> T_INV_PAYMENTS
  A_INV_PAY_CREATE --> T_INVOICES_AR
  A_INV_PAY_LIST --> T_INV_PAYMENTS
  A_INV_STATUS --> T_INVOICES_AR
  A_AR_AGING --> T_INVOICES_AR
  A_AR_AGING --> T_INV_PAYMENTS
  A_AR_AGING --> T_CUSTOMERS_AR
  A_INV_PAY_CREATE --> T_BANK_ACCTS_AR
```

---

## Feature 3.3 — Thai Tax (VAT + WHT)

```mermaid
flowchart LR
  subgraph PAGES_TAX["Pages"]
    P_TAX["/finance/tax"]
    P_VAT["/finance/tax/vat-report"]
    P_WHT["/finance/tax/wht"]
  end

  subgraph APIS_TAX["API Endpoints"]
    A_TAX_RATES["GET/POST/PATCH /api/finance/tax/rates"]
    A_VAT_SUM["GET /api/finance/tax/vat-summary"]
    A_VAT_EXP["GET /api/finance/tax/vat-summary/export"]
    A_WHT_LIST["GET /api/finance/tax/wht-certificates"]
    A_WHT_CREATE["POST /api/finance/tax/wht-certificates"]
    A_WHT_PDF["GET /api/finance/tax/wht-certificates/:id/pdf"]
    A_PND_RPT["GET /api/finance/tax/pnd-report"]
    A_PND_EXP["GET /api/finance/tax/pnd-report/export"]
  end

  subgraph TABLES_TAX["DB Tables"]
    T_TAX_RATES["tax_rates\n(type, code, rate\npndForm, incomeType)"]
    T_WHT_CERTS["wht_certificates\n(certificateNo, vendorId, employeeId ← Gap D\napBillId, pndForm\nbaseAmount, whtRate, whtAmount)"]
    T_INVOICES_TAX["invoices\n(+subtotalBeforeVat\nvatRate, vatAmount\nwhtRate, whtAmount)"]
    T_AP_BILLS_TAX["finance_ap_bills\n(+vatAmount, whtAmount\nnetPayable)"]
    T_INV_ITEMS_TAX["invoice_items\n(+vatRate, vatAmount)"]
    T_PAYSLIPS_TAX["payslips\n(ref: grossSalary ← Gap D)"]
    T_PAY_ITEMS_TAX["payslip_items\n(code=WHT, amount ← Gap D)"]
    T_EMP_TAX_D["employees\n(ref: PND1 payee ← Gap D)"]
  end

  subgraph GAP_D["Integration — Gap D: Payroll WHT → WHT Cert Auto-Create"]
    TRG_PND1["payroll/mark-paid\n→ loop payslips with WHT > 0\n→ auto INSERT wht_certificates\n(pndForm=PND1, employeeId)"]
  end

  P_TAX --> A_VAT_SUM
  P_TAX --> A_WHT_LIST
  P_TAX --> A_PND_RPT
  P_VAT --> A_VAT_SUM
  P_VAT --> A_VAT_EXP
  P_WHT --> A_WHT_LIST
  P_WHT --> A_WHT_CREATE
  P_WHT --> A_WHT_PDF
  P_WHT --> A_PND_RPT
  P_WHT --> A_PND_EXP

  A_TAX_RATES --> T_TAX_RATES
  A_VAT_SUM --> T_INVOICES_TAX
  A_VAT_SUM --> T_AP_BILLS_TAX
  A_WHT_LIST --> T_WHT_CERTS
  A_WHT_CREATE --> T_WHT_CERTS
  A_WHT_CREATE --> T_AP_BILLS_TAX
  A_PND_RPT --> T_WHT_CERTS
  A_PND_RPT --> T_TAX_RATES

  TRG_PND1 --> T_PAYSLIPS_TAX
  TRG_PND1 --> T_PAY_ITEMS_TAX
  TRG_PND1 --> T_EMP_TAX_D
  TRG_PND1 --> T_WHT_CERTS
```

---

## Feature 3.4 — Financial Statements

```mermaid
flowchart LR
  subgraph PAGES_FS["Pages"]
    P_REPORTS["/finance/reports (hub)"]
    P_PL["/finance/reports/profit-loss"]
    P_BS["/finance/reports/balance-sheet"]
    P_CF["/finance/reports/cash-flow"]
  end

  subgraph APIS_FS["API Endpoints"]
    A_PL["GET /api/finance/reports/profit-loss"]
    A_BS["GET /api/finance/reports/balance-sheet"]
    A_CF["GET /api/finance/reports/cash-flow"]
    A_PL_EXP["GET /api/finance/reports/profit-loss/export"]
    A_BS_EXP["GET /api/finance/reports/balance-sheet/export"]
    A_CF_EXP["GET /api/finance/reports/cash-flow/export"]
  end

  subgraph TABLES_FS["DB Tables (existing, read)"]
    T_COA["chart_of_accounts"]
    T_JE["journal_entries"]
    T_JL["journal_lines"]
    T_IE_ENT["income_expense_entries"]
    T_INV_FS["invoices"]
    T_AP_FS["finance_ap_bills"]
    T_BK_FS["bank_transactions (new)"]
  end

  P_REPORTS --> A_PL
  P_REPORTS --> A_BS
  P_REPORTS --> A_CF
  P_PL --> A_PL
  P_PL --> A_PL_EXP
  P_BS --> A_BS
  P_BS --> A_BS_EXP
  P_CF --> A_CF
  P_CF --> A_CF_EXP

  A_PL --> T_JL
  A_PL --> T_COA
  A_PL --> T_IE_ENT
  A_BS --> T_JL
  A_BS --> T_COA
  A_BS --> T_JE
  A_CF --> T_BK_FS
  A_CF --> T_INV_FS
  A_CF --> T_AP_FS
```

---

## Feature 3.5 — Cash / Bank Management

```mermaid
flowchart LR
  subgraph PAGES_BK["Pages"]
    P_BK["/finance/bank-accounts"]
    P_BK_ID["/finance/bank-accounts/:id"]
  end

  subgraph APIS_BK["API Endpoints"]
    A_BK_LIST["GET /api/finance/bank-accounts"]
    A_BK_OPT["GET /api/finance/bank-accounts/options"]
    A_BK_CREATE["POST /api/finance/bank-accounts"]
    A_BK_GET["GET /api/finance/bank-accounts/:id"]
    A_BK_PATCH["PATCH /api/finance/bank-accounts/:id"]
    A_BK_ACT["PATCH /api/finance/bank-accounts/:id/activate"]
    A_BK_TXN_LIST["GET /api/finance/bank-accounts/:id/transactions"]
    A_BK_TXN_CREATE["POST /api/finance/bank-accounts/:id/transactions"]
    A_BK_RECON["POST /api/finance/bank-accounts/:id/reconcile"]
  end

  subgraph TABLES_BK["DB Tables"]
    T_BK_ACCTS["bank_accounts\n(code, accountName\naccountNo, bankName\nopeningBalance, currentBalance\nglAccountId)"]
    T_BK_TXN["bank_transactions\n(bankAccountId, transactionDate\namount, type\nreferenceType, referenceId\nreconciled)"]
    T_COA_BK["chart_of_accounts (ref)"]
    T_AP_PAY_BK["finance_ap_vendor_invoice_payments\n(+bankAccountId)"]
    T_INV_PAY_BK["invoice_payments\n(+bankAccountId)"]
  end

  P_BK --> A_BK_LIST
  P_BK --> A_BK_CREATE
  P_BK --> A_BK_ACT
  P_BK_ID --> A_BK_GET
  P_BK_ID --> A_BK_PATCH
  P_BK_ID --> A_BK_TXN_LIST
  P_BK_ID --> A_BK_TXN_CREATE
  P_BK_ID --> A_BK_RECON

  A_BK_LIST --> T_BK_ACCTS
  A_BK_OPT --> T_BK_ACCTS
  A_BK_CREATE --> T_BK_ACCTS
  A_BK_GET --> T_BK_ACCTS
  A_BK_PATCH --> T_BK_ACCTS
  A_BK_ACT --> T_BK_ACCTS
  A_BK_TXN_LIST --> T_BK_TXN
  A_BK_TXN_CREATE --> T_BK_TXN
  A_BK_TXN_CREATE --> T_BK_ACCTS
  A_BK_RECON --> T_BK_TXN
  A_BK_GET --> T_COA_BK
```

---

## Feature 3.6 — Purchase Order (PO)

```mermaid
flowchart LR
  subgraph PAGES_PO["Pages"]
    P_PO["/finance/purchase-orders"]
    P_PO_NEW["/finance/purchase-orders/new"]
    P_PO_ID["/finance/purchase-orders/:id"]
    P_AP_UPD["/finance/ap (updated)"]
  end

  subgraph APIS_PO["API Endpoints"]
    A_PO_LIST["GET /api/finance/purchase-orders"]
    A_PO_OPT["GET /api/finance/purchase-orders/options"]
    A_PO_CREATE["POST /api/finance/purchase-orders"]
    A_PO_GET["GET /api/finance/purchase-orders/:id"]
    A_PO_PATCH["PATCH /api/finance/purchase-orders/:id"]
    A_PO_STATUS["PATCH /api/finance/purchase-orders/:id/status"]
    A_PO_GR_CREATE["POST /api/finance/purchase-orders/:id/goods-receipts"]
    A_PO_GR_LIST["GET /api/finance/purchase-orders/:id/goods-receipts"]
    A_PO_AP_LIST["GET /api/finance/purchase-orders/:id/ap-bills"]
    A_PO_PDF["GET /api/finance/purchase-orders/:id/pdf"]
  end

  subgraph TABLES_PO["DB Tables"]
    T_PO["purchase_orders\n(poNo, vendorId, requestedBy\napprovedBy, status\ndepartmentId, projectBudgetId\nsubtotal, vatAmount, total)"]
    T_PO_ITEMS["po_items\n(poId, itemNo, description\nquantity, unitPrice\nlineTotal, receivedQty)"]
    T_GR["goods_receipts\n(grNo, poId, receivedDate\nreceivedBy)"]
    T_GR_ITEMS["gr_items\n(grId, poItemId, receivedQty)"]
    T_VENDORS_PO["vendors (ref)"]
    T_DEPTS_PO["departments (ref)"]
    T_PM_BUD_PO["pm_budgets\n(+committedAmount ← Gap C\nallocated, actualSpend, remaining)"]
    T_AP_BILLS_PO["finance_ap_bills\n(+poId)"]
  end

  subgraph GAP_C["Integration — Gap C: PO → PM Budget Committed"]
    TRG_BUD_COMMIT["PO approve\n→ pm_budgets.committedAmount += poTotal\n[PATCH /pm/budgets/:id/committed]"]
    TRG_BUD_CANCEL["PO cancel\n→ pm_budgets.committedAmount -= poTotal"]
    TRG_BUD_PAID["AP Bill paid (linked PO)\n→ committed -= amount, actualSpend += amount"]
  end

  P_PO --> A_PO_LIST
  P_PO_NEW --> A_PO_CREATE
  P_PO_ID --> A_PO_GET
  P_PO_ID --> A_PO_PATCH
  P_PO_ID --> A_PO_STATUS
  P_PO_ID --> A_PO_GR_CREATE
  P_PO_ID --> A_PO_GR_LIST
  P_PO_ID --> A_PO_AP_LIST
  P_PO_ID --> A_PO_PDF
  P_AP_UPD --> A_PO_OPT

  A_PO_LIST --> T_PO
  A_PO_LIST --> T_VENDORS_PO
  A_PO_CREATE --> T_PO
  A_PO_CREATE --> T_PO_ITEMS
  A_PO_GET --> T_PO
  A_PO_GET --> T_PO_ITEMS
  A_PO_GET --> T_GR
  A_PO_GET --> T_GR_ITEMS

  A_PO_STATUS --> TRG_BUD_COMMIT
  A_PO_STATUS --> TRG_BUD_CANCEL
  TRG_BUD_COMMIT --> T_PM_BUD_PO
  TRG_BUD_CANCEL --> T_PM_BUD_PO
  TRG_BUD_PAID --> T_PM_BUD_PO
  T_AP_BILLS_PO --> TRG_BUD_PAID
  A_PO_GET --> T_AP_BILLS_PO
  A_PO_PATCH --> T_PO
  A_PO_PATCH --> T_PO_ITEMS
  A_PO_STATUS --> T_PO
  A_PO_GR_CREATE --> T_GR
  A_PO_GR_CREATE --> T_GR_ITEMS
  A_PO_GR_CREATE --> T_PO_ITEMS
  A_PO_GR_LIST --> T_GR
  A_PO_GR_LIST --> T_GR_ITEMS
  A_PO_OPT --> T_PO
  A_PO_CREATE --> T_DEPTS_PO
  A_PO_CREATE --> T_PM_BUD_PO
```

---

## Feature 3.7 — Attendance & Time Tracking

```mermaid
flowchart LR
  subgraph PAGES_ATT["Pages"]
    P_ATT["/hr/attendance"]
    P_OT["/hr/overtime"]
    P_PAY_UPD["/hr/payroll (updated)"]
  end

  subgraph APIS_ATT["API Endpoints"]
    A_WS_LIST["GET /api/hr/work-schedules"]
    A_WS_CREATE["POST /api/hr/work-schedules"]
    A_WS_PATCH["PATCH /api/hr/work-schedules/:id"]
    A_WS_ASSIGN["POST /api/hr/work-schedules/:id/assign"]
    A_ATT_LIST["GET /api/hr/attendance"]
    A_ATT_IN["POST /api/hr/attendance/check-in"]
    A_ATT_OUT["PATCH /api/hr/attendance/:id/check-out"]
    A_ATT_SUM["GET /api/hr/attendance/summary"]
    A_OT_LIST["GET /api/hr/overtime"]
    A_OT_CREATE["POST /api/hr/overtime"]
    A_OT_APPROVE["PATCH /api/hr/overtime/:id/approve"]
    A_OT_REJECT["PATCH /api/hr/overtime/:id/reject"]
    A_HOL_LIST["GET /api/hr/holidays"]
    A_HOL_CREATE["POST /api/hr/holidays"]
    A_HOL_DEL["DELETE /api/hr/holidays/:id"]
  end

  subgraph TABLES_ATT["DB Tables (existing schema, now activated)"]
    T_WS["work_schedules"]
    T_EMP_SCH["employee_schedules"]
    T_ATT["attendance_records\n(checkIn, checkOut\nworkingHours, otHours)"]
    T_HOL["holidays"]
    T_OT["overtime_requests"]
    T_EMP_ATT["employees (ref)"]
    T_PAY_RUNS_ATT["payroll_runs (integration)"]
    T_PAYSLIPS_ATT["payslips (integration)"]
    T_PAY_ITEMS_ATT["payslip_items\n(+ABSENT_DEDUCTION ← Gap A R2\n+OT_PAY)"]
    T_LEAVE_REQ_ATT["leave_requests (ref: Gap A check)"]
  end

  subgraph GAP_A_R2["Integration — Gap A R2: Attendance → Payroll"]
    TRG_ATT_PAY["payroll/process\n→ scan attendance_records\n→ absentDays = schedule − actual − holiday\n→ INSERT payslip_items (ABSENT_DEDUCTION)\n→ OT: approved OT hours → OT_PAY"]
  end

  subgraph GAP_F["Integration — Gap F: Absent Alert"]
    TRG_ABSENT["Cron 07:00 daily\n→ find employees: no check-in today\n  + no approved leave today\n→ INSERT notifications (to manager)"]
  end

  P_ATT --> A_ATT_LIST
  P_ATT --> A_ATT_IN
  P_ATT --> A_ATT_OUT
  P_ATT --> A_ATT_SUM
  P_ATT --> A_WS_LIST
  P_OT --> A_OT_LIST
  P_OT --> A_OT_CREATE
  P_OT --> A_OT_APPROVE
  P_OT --> A_OT_REJECT
  P_PAY_UPD --> A_ATT_SUM

  A_WS_LIST --> T_WS
  A_WS_CREATE --> T_WS
  A_WS_PATCH --> T_WS
  A_WS_ASSIGN --> T_EMP_SCH
  A_WS_ASSIGN --> T_WS
  A_ATT_LIST --> T_ATT
  A_ATT_LIST --> T_EMP_ATT
  A_ATT_IN --> T_ATT
  A_ATT_OUT --> T_ATT
  A_ATT_SUM --> T_ATT
  A_ATT_SUM --> T_OT
  A_ATT_SUM --> T_HOL
  A_OT_LIST --> T_OT
  A_OT_LIST --> T_EMP_ATT
  A_OT_CREATE --> T_OT
  A_OT_APPROVE --> T_OT
  A_OT_REJECT --> T_OT
  A_HOL_LIST --> T_HOL
  A_HOL_CREATE --> T_HOL
  A_HOL_DEL --> T_HOL

  TRG_ATT_PAY --> T_ATT
  TRG_ATT_PAY --> T_OT
  TRG_ATT_PAY --> T_HOL
  TRG_ATT_PAY --> T_PAY_ITEMS_ATT
  TRG_ABSENT --> T_ATT
  TRG_ABSENT --> T_LEAVE_REQ_ATT
  TRG_ABSENT --> T_EMP_ATT
```

---

## Feature 3.8 — Company / Organization Settings

```mermaid
flowchart LR
  subgraph PAGES_CO["Pages"]
    P_CO["/settings/company"]
    P_FP["/settings/fiscal-periods"]
  end

  subgraph APIS_CO["API Endpoints"]
    A_CO_GET["GET /api/settings/company"]
    A_CO_PUT["PUT /api/settings/company"]
    A_CO_LOGO["POST /api/settings/company/logo"]
    A_FP_LIST["GET /api/settings/fiscal-periods"]
    A_FP_CUR["GET /api/settings/fiscal-periods/current"]
    A_FP_GEN["POST /api/settings/fiscal-periods/generate"]
    A_FP_CLOSE["PATCH /api/settings/fiscal-periods/:id/close"]
    A_FP_REOPEN["PATCH /api/settings/fiscal-periods/:id/reopen"]
  end

  subgraph TABLES_CO["DB Tables"]
    T_CO_SET["company_settings\n(companyName, taxId, address\nlogoUrl, fiscalYearStart\nvatRegistered, prefixes)"]
    T_FP["fiscal_periods\n(year, month, startDate\nendDate, status, closedBy)"]
    T_USERS_CO["users (ref: closedBy)"]
  end

  P_CO --> A_CO_GET
  P_CO --> A_CO_PUT
  P_CO --> A_CO_LOGO
  P_FP --> A_FP_LIST
  P_FP --> A_FP_GEN
  P_FP --> A_FP_CLOSE
  P_FP --> A_FP_REOPEN

  A_CO_GET --> T_CO_SET
  A_CO_PUT --> T_CO_SET
  A_CO_LOGO --> T_CO_SET
  A_FP_LIST --> T_FP
  A_FP_CUR --> T_FP
  A_FP_GEN --> T_FP
  A_FP_CLOSE --> T_FP
  A_FP_CLOSE --> T_USERS_CO
  A_FP_REOPEN --> T_FP
```

---

## Feature 3.9 — Document Print / Export

```mermaid
flowchart LR
  subgraph PAGES_PDF["Pages (updated with Print button)"]
    P_INV_PDF["/finance/invoices/:id"]
    P_AP_PDF["/finance/ap (detail)"]
    P_PO_PDF["/finance/purchase-orders/:id"]
    P_QUOT_PDF["/finance/quotations/:id"]
    P_WHT_PDF["/finance/tax/wht"]
    P_PAY_PDF["/hr/payroll (payslips)"]
    P_RPT_PDF["/finance/reports/profit-loss\n/finance/reports/balance-sheet"]
  end

  subgraph APIS_PDF["API Endpoints"]
    A_INV_PDF["GET /api/finance/invoices/:id/pdf"]
    A_INV_PRV["GET /api/finance/invoices/:id/preview"]
    A_AP_PDF["GET /api/finance/ap/vendor-invoices/:id/pdf"]
    A_PO_PDF2["GET /api/finance/purchase-orders/:id/pdf"]
    A_QUOT_PDF["GET /api/finance/quotations/:id/pdf"]
    A_WHT_PDF2["GET /api/finance/tax/wht-certificates/:id/pdf"]
    A_SLIP_PDF["GET /api/hr/payroll/runs/:runId/payslips/:id/pdf"]
    A_SLIP_EXP["GET /api/hr/payroll/runs/:runId/payslips/export"]
    A_PL_EXP2["GET /api/finance/reports/profit-loss/export"]
    A_BS_EXP2["GET /api/finance/reports/balance-sheet/export"]
    A_CF_EXP2["GET /api/finance/reports/cash-flow/export"]
    A_VAT_EXP2["GET /api/finance/tax/vat-summary/export"]
    A_PND_EXP2["GET /api/finance/tax/pnd-report/export"]
  end

  subgraph TABLES_PDF["DB Tables (read-only for rendering)"]
    T_CO_PDF["company_settings (header)"]
    T_INV_PDF2["invoices + invoice_items + customers"]
    T_AP_PDF2["finance_ap_bills + items + vendors"]
    T_PO_PDF2["purchase_orders + po_items + vendors"]
    T_QUOT_PDF2["quotations + quotation_items + customers"]
    T_WHT_PDF2["wht_certificates + vendors"]
    T_SLIP_PDF2["payslips + payslip_items + employees"]
    T_JL_PDF["journal_lines + chart_of_accounts"]
  end

  P_INV_PDF --> A_INV_PDF
  P_INV_PDF --> A_INV_PRV
  P_AP_PDF --> A_AP_PDF
  P_PO_PDF --> A_PO_PDF2
  P_QUOT_PDF --> A_QUOT_PDF
  P_WHT_PDF --> A_WHT_PDF2
  P_PAY_PDF --> A_SLIP_PDF
  P_PAY_PDF --> A_SLIP_EXP
  P_RPT_PDF --> A_PL_EXP2
  P_RPT_PDF --> A_BS_EXP2
  P_RPT_PDF --> A_CF_EXP2

  A_INV_PDF --> T_CO_PDF
  A_INV_PDF --> T_INV_PDF2
  A_AP_PDF --> T_CO_PDF
  A_AP_PDF --> T_AP_PDF2
  A_PO_PDF2 --> T_CO_PDF
  A_PO_PDF2 --> T_PO_PDF2
  A_QUOT_PDF --> T_CO_PDF
  A_QUOT_PDF --> T_QUOT_PDF2
  A_WHT_PDF2 --> T_CO_PDF
  A_WHT_PDF2 --> T_WHT_PDF2
  A_SLIP_PDF --> T_CO_PDF
  A_SLIP_PDF --> T_SLIP_PDF2
  A_PL_EXP2 --> T_JL_PDF
  A_PL_EXP2 --> T_CO_PDF
```

---

## Feature 3.10 — Notification / Workflow Alerts

```mermaid
flowchart LR
  subgraph PAGES_NOTIF["Pages"]
    P_NOTIF["/notifications"]
    P_NOTIF_SET["/settings/notifications"]
    P_HEADER["Header (bell icon)"]
  end

  subgraph APIS_NOTIF["API Endpoints"]
    A_NOTIF_LIST["GET /api/notifications"]
    A_NOTIF_COUNT["GET /api/notifications/unread-count"]
    A_NOTIF_READ["PATCH /api/notifications/:id/read"]
    A_NOTIF_ALL["POST /api/notifications/mark-all-read"]
    A_NOTIF_CFG_GET["GET /api/settings/notification-configs"]
    A_NOTIF_CFG_PUT["PUT /api/settings/notification-configs"]
  end

  subgraph TABLES_NOTIF["DB Tables"]
    T_NOTIF["notifications\n(userId, type, title\nmessage, entityType\nentityId, actionUrl, isRead)"]
    T_NOTIF_CFG["notification_configs\n(userId, eventType\nchannelInApp, channelEmail)"]
    T_USERS_NOTIF["users (ref)"]
  end

  subgraph TRIGGERS_NOTIF["Workflow Triggers (BE internal)"]
    TRG_LEAVE["Leave approve/reject → notify"]
    TRG_PAYROLL["Payroll approve → notify"]
    TRG_AP["AP approve/reject → notify"]
    TRG_PO["PO approve/reject → notify"]
    TRG_INV_DUE["Cron 08:00: Invoice overdue → notify Finance team"]
    TRG_BUDGET["Budget utilization > 80% → notify PM Manager"]
    TRG_ABSENT_N["[Gap F] Cron 07:00: Employee absent\n(no check-in + no leave)\n→ notify Manager"]
    TRG_CREDIT["[Gap G] POST /invoices or /quotations:\ncustomer overdue → creditWarning notify\ncredit exceeded → creditExceeded notify"]
  end

  P_HEADER --> A_NOTIF_COUNT
  P_HEADER --> A_NOTIF_LIST
  P_NOTIF --> A_NOTIF_LIST
  P_NOTIF --> A_NOTIF_READ
  P_NOTIF --> A_NOTIF_ALL
  P_NOTIF_SET --> A_NOTIF_CFG_GET
  P_NOTIF_SET --> A_NOTIF_CFG_PUT

  A_NOTIF_LIST --> T_NOTIF
  A_NOTIF_COUNT --> T_NOTIF
  A_NOTIF_READ --> T_NOTIF
  A_NOTIF_ALL --> T_NOTIF
  A_NOTIF_CFG_GET --> T_NOTIF_CFG
  A_NOTIF_CFG_PUT --> T_NOTIF_CFG

  TRG_LEAVE --> T_NOTIF
  TRG_PAYROLL --> T_NOTIF
  TRG_AP --> T_NOTIF
  TRG_PO --> T_NOTIF
  TRG_INV_DUE --> T_NOTIF
  TRG_BUDGET --> T_NOTIF
  TRG_ABSENT_N --> T_NOTIF
  TRG_CREDIT --> T_NOTIF
```

---

## Feature 3.11 — Sales Order / Quotation

```mermaid
flowchart LR
  subgraph PAGES_SO["Pages"]
    P_QUOT["/finance/quotations"]
    P_QUOT_NEW["/finance/quotations/new"]
    P_QUOT_ID["/finance/quotations/:id"]
    P_SO["/finance/sales-orders"]
    P_SO_ID["/finance/sales-orders/:id"]
    P_INV_NEW_SO["/finance/invoices/new (updated)"]
  end

  subgraph APIS_SO["API Endpoints"]
    A_QUOT_LIST["GET /api/finance/quotations"]
    A_QUOT_CREATE["POST /api/finance/quotations"]
    A_QUOT_GET["GET /api/finance/quotations/:id"]
    A_QUOT_PATCH["PATCH /api/finance/quotations/:id"]
    A_QUOT_STATUS["PATCH /api/finance/quotations/:id/status"]
    A_QUOT_CONV["POST /api/finance/quotations/:id/convert-to-so"]
    A_QUOT_PDF2["GET /api/finance/quotations/:id/pdf"]
    A_SO_LIST["GET /api/finance/sales-orders"]
    A_SO_CREATE["POST /api/finance/sales-orders"]
    A_SO_GET["GET /api/finance/sales-orders/:id"]
    A_SO_STATUS["PATCH /api/finance/sales-orders/:id/status"]
    A_SO_CONV["POST /api/finance/sales-orders/:id/convert-to-invoice"]
  end

  subgraph TABLES_SO["DB Tables"]
    T_QUOT["quotations\n(quotNo, customerId\nissueDate, validUntil\nstatus, subtotal, vatAmount, total)"]
    T_QUOT_ITEMS["quotation_items\n(quotId, itemNo\ndescription, qty, unitPrice, lineTotal)"]
    T_SO["sales_orders\n(soNo, customerId, quotationId\nstatus, subtotal, vatAmount, total)"]
    T_SO_ITEMS["so_items\n(soId, itemNo\ndescription, qty, unitPrice\nlineTotal, invoicedQty)"]
    T_CUST_SO["customers (ref)"]
    T_INV_SO["invoices\n(+soId)"]
    T_INV_ITEMS_SO["invoice_items (copied from so_items)"]
  end

  P_QUOT --> A_QUOT_LIST
  P_QUOT_NEW --> A_QUOT_CREATE
  P_QUOT_ID --> A_QUOT_GET
  P_QUOT_ID --> A_QUOT_PATCH
  P_QUOT_ID --> A_QUOT_STATUS
  P_QUOT_ID --> A_QUOT_CONV
  P_QUOT_ID --> A_QUOT_PDF2
  P_SO --> A_SO_LIST
  P_SO_ID --> A_SO_GET
  P_SO_ID --> A_SO_STATUS
  P_SO_ID --> A_SO_CONV
  P_INV_NEW_SO --> A_SO_LIST

  A_QUOT_LIST --> T_QUOT
  A_QUOT_LIST --> T_CUST_SO
  A_QUOT_CREATE --> T_QUOT
  A_QUOT_CREATE --> T_QUOT_ITEMS
  A_QUOT_GET --> T_QUOT
  A_QUOT_GET --> T_QUOT_ITEMS
  A_QUOT_PATCH --> T_QUOT
  A_QUOT_PATCH --> T_QUOT_ITEMS
  A_QUOT_STATUS --> T_QUOT
  A_QUOT_CONV --> T_SO
  A_QUOT_CONV --> T_SO_ITEMS
  A_QUOT_CONV --> T_QUOT
  A_SO_LIST --> T_SO
  A_SO_LIST --> T_CUST_SO
  A_SO_CREATE --> T_SO
  A_SO_CREATE --> T_SO_ITEMS
  A_SO_GET --> T_SO
  A_SO_GET --> T_SO_ITEMS
  A_SO_GET --> T_INV_SO
  A_SO_STATUS --> T_SO
  A_SO_CONV --> T_INV_SO
  A_SO_CONV --> T_INV_ITEMS_SO
  A_SO_CONV --> T_SO_ITEMS
```

---

## Feature 3.12 — Audit Trail

```mermaid
flowchart LR
  subgraph PAGES_AUD["Pages"]
    P_AUDIT["/settings/audit-logs"]
    P_EMP_AUD["/hr/employees/:id (history section)"]
    P_INV_AUD["/finance/invoices/:id (history section)"]
    P_AP_AUD["/finance/ap (detail, history section)"]
  end

  subgraph APIS_AUD["API Endpoints"]
    A_AUDIT_LIST["GET /api/settings/audit-logs"]
    A_AUDIT_ENT["GET /api/settings/audit-logs/:entityType/:entityId"]
  end

  subgraph TABLES_AUD["DB Tables"]
    T_AUDIT["audit_logs\n(userId, userEmail, action\nmodule, entityType, entityId\nentityLabel, oldValues, newValues\nipAddress, createdAt)"]
    T_USERS_AUD["users (ref)"]
  end

  subgraph TRIGGERS_AUD["BE: AuditService.log() called after"]
    TRG_EMP_AUD["employees: create/update/terminate"]
    TRG_INV_AUD["invoices: create/status_change/payment"]
    TRG_AP_AUD["ap_bills: create/status_change/payment"]
    TRG_PO_AUD["purchase_orders: create/approve/cancel"]
    TRG_PAY_AUD["payroll_runs: create/process/approve"]
    TRG_LEAVE_AUD["leave_requests: create/approve/reject"]
    TRG_ROLE_AUD["user_roles: grant/revoke"]
  end

  P_AUDIT --> A_AUDIT_LIST
  P_EMP_AUD --> A_AUDIT_ENT
  P_INV_AUD --> A_AUDIT_ENT
  P_AP_AUD --> A_AUDIT_ENT

  A_AUDIT_LIST --> T_AUDIT
  A_AUDIT_LIST --> T_USERS_AUD
  A_AUDIT_ENT --> T_AUDIT

  TRG_EMP_AUD --> T_AUDIT
  TRG_INV_AUD --> T_AUDIT
  TRG_AP_AUD --> T_AUDIT
  TRG_PO_AUD --> T_AUDIT
  TRG_PAY_AUD --> T_AUDIT
  TRG_LEAVE_AUD --> T_AUDIT
  TRG_ROLE_AUD --> T_AUDIT
```

---

## Feature 3.13 — Global Dashboard

```mermaid
flowchart LR
  subgraph PAGES_DASH["Pages"]
    P_DASH["/dashboard"]
  end

  subgraph APIS_DASH["API Endpoints"]
    A_DASH_SUM["GET /api/dashboard/summary"]
  end

  subgraph TABLES_DASH["DB Tables (aggregate, read-only)"]
    T_EMP_DASH["employees"]
    T_LEAVE_DASH["leave_requests"]
    T_PAY_DASH["payroll_runs"]
    T_INV_DASH["invoices + invoice_payments"]
    T_AP_DASH["finance_ap_bills"]
    T_BK_DASH["bank_accounts"]
    T_BUD_DASH["pm_budgets"]
    T_PROG_DASH["pm_progress_tasks"]
    T_OT_DASH["overtime_requests"]
  end

  P_DASH --> A_DASH_SUM

  A_DASH_SUM --> T_EMP_DASH
  A_DASH_SUM --> T_LEAVE_DASH
  A_DASH_SUM --> T_PAY_DASH
  A_DASH_SUM --> T_INV_DASH
  A_DASH_SUM --> T_AP_DASH
  A_DASH_SUM --> T_BK_DASH
  A_DASH_SUM --> T_BUD_DASH
  A_DASH_SUM --> T_PROG_DASH
  A_DASH_SUM --> T_OT_DASH
```

---

## Full Page → API → Table Map (Compact — Release 2 New Routes)

```mermaid
flowchart LR
  subgraph PAGES["New Pages (Release 2)"]
    %% Finance
    P_C["/finance/customers*"]
    P_TAX2["/finance/tax*"]
    P_RPT2["/finance/reports* (new)"]
    P_BK2["/finance/bank-accounts*"]
    P_PO2["/finance/purchase-orders*"]
    P_QT["/finance/quotations*"]
    P_SO2["/finance/sales-orders*"]
    %% HR
    P_ATT2["/hr/attendance"]
    P_OT2["/hr/overtime"]
    %% Settings
    P_CO2["/settings/company"]
    P_FP2["/settings/fiscal-periods"]
    P_AUD2["/settings/audit-logs"]
    P_NSET["/settings/notifications"]
    %% Global
    P_DASH2["/dashboard"]
    P_NOTIF2["/notifications"]
  end

  subgraph APIS["New API Groups (Release 2)"]
    A_CUST_G["Finance: /customers CRUD"]
    A_AR_G["Finance: /invoices payments+status"]
    A_TAX_G["Finance: /tax VAT+WHT+PND"]
    A_FS_G["Finance: /reports P&L+BS+CF"]
    A_BK_G["Finance: /bank-accounts CRUD"]
    A_PO_G["Finance: /purchase-orders CRUD"]
    A_QUOT_G["Finance: /quotations CRUD"]
    A_SO_G["Finance: /sales-orders CRUD"]
    A_PDF_G["All: PDF export endpoints"]
    A_ATT_G["HR: /attendance + /overtime + /holidays"]
    A_WS_G["HR: /work-schedules"]
    A_CO_G["Settings: /company + /fiscal-periods"]
    A_AUD_G["Settings: /audit-logs"]
    A_NOTIF_G["Notifications CRUD"]
    A_DASH_G["Dashboard: /summary"]
  end

  subgraph TABLES_ALL["New DB Tables (Release 2)"]
    T_NEW1["invoice_payments"]
    T_NEW2["tax_rates"]
    T_NEW3["wht_certificates"]
    T_NEW4["bank_accounts"]
    T_NEW5["bank_transactions"]
    T_NEW6["purchase_orders + po_items"]
    T_NEW7["goods_receipts + gr_items"]
    T_NEW8["company_settings"]
    T_NEW9["fiscal_periods"]
    T_NEW10["notifications"]
    T_NEW11["notification_configs"]
    T_NEW12["quotations + quotation_items"]
    T_NEW13["sales_orders + so_items"]
    T_NEW14["audit_logs"]
  end

  P_C --> A_CUST_G
  P_TAX2 --> A_TAX_G
  P_RPT2 --> A_FS_G
  P_BK2 --> A_BK_G
  P_PO2 --> A_PO_G
  P_QT --> A_QUOT_G
  P_SO2 --> A_SO_G
  P_ATT2 --> A_ATT_G
  P_OT2 --> A_ATT_G
  P_CO2 --> A_CO_G
  P_FP2 --> A_CO_G
  P_AUD2 --> A_AUD_G
  P_NSET --> A_NOTIF_G
  P_NOTIF2 --> A_NOTIF_G
  P_DASH2 --> A_DASH_G

  A_CUST_G --> T_NEW1
  A_AR_G --> T_NEW1
  A_TAX_G --> T_NEW2
  A_TAX_G --> T_NEW3
  A_BK_G --> T_NEW4
  A_BK_G --> T_NEW5
  A_PO_G --> T_NEW6
  A_PO_G --> T_NEW7
  A_CO_G --> T_NEW8
  A_CO_G --> T_NEW9
  A_NOTIF_G --> T_NEW10
  A_NOTIF_G --> T_NEW11
  A_QUOT_G --> T_NEW12
  A_SO_G --> T_NEW13
  A_AUD_G --> T_NEW14
  A_ATT_G --> T_NEW5
  A_WS_G --> T_NEW5
  A_PDF_G --> T_NEW8
```

---

## Cross-Module Integration Map — Release 1 + Release 2 (Full)

แผนผังรวมแสดงการส่งข้อมูลข้ามโมดูลทั้งหมด ทั้ง R1 + R2 รวมทุก Gap A-G

```mermaid
flowchart TD
  subgraph AUTH["Auth / RBAC"]
    USERS_F["users\n(userId ↔ employeeId)"]
    ROLES_F["roles / permissions"]
  end

  subgraph HR["HR Module"]
    EMP_F["Employees\n(baseSalary, departmentId\ntaxId, socialSecurityNo)"]
    DEPT_F["Departments\n(approval chain)"]
    LEAVE_F["Leave Management\n(leave_types.paidLeave ← Gap A R1)"]
    ATT_F["Attendance Records\n(checkIn/Out, workingHours ← Gap A R2)"]
    OT_F["OT Requests\n(approved OT hours)"]
    PAY_F["Payroll Run\n(process → mark-paid)"]
    SS_F["ss_records\n(employerContrib ← Gap B)"]
    PAYSLIPS_F["payslips + payslip_items\n(UNPAID_LEAVE, ABSENT_DED, OT_PAY)"]
  end

  subgraph FINANCE["Finance Module"]
    CUST_F["Customers\n(creditLimit ← Gap E)"]
    QUOT_F["Quotations\n(credit check ← Gap E, G)"]
    SO_F["Sales Orders"]
    INV_F["Invoices / AR\n(balanceDue, overdue ← Gap G)"]
    AR_PAY_F["AR Payments\n(invoice_payments)"]
    AP_F["AP Bills\n(poId ← 3-way match)"]
    PO_F["Purchase Orders\n(projectBudgetId ← Gap C)"]
    GR_F["Goods Receipts\n(3-way matching)"]
    TAX_F["WHT Certificates\n(employeeId ← Gap D / PND1)"]
    VAT_F["VAT Summary"]
    BANK_F["Bank Accounts\n(transactions)"]
    JNL_F["Journal Entries\n(debit / credit lines)"]
    STMT_F["Financial Statements\n(P&L, BS, CF)"]
  end

  subgraph PM["PM Module"]
    BUD_F["PM Budgets\n(allocated, committedAmount ← Gap C\nactualSpend, remaining)"]
    EXP_F["PM Expenses"]
    PROG_F["Progress Tasks\n(assigneeId → employees)"]
  end

  subgraph SETTINGS["Settings / Cross-Module"]
    CO_F["Company Settings\n(vatRegistered, prefix, logo)"]
    FP_F["Fiscal Periods\n(open/closed)"]
    NOTIF_F["Notifications\n(Gap F absent + Gap G credit)"]
    AUDIT_F["Audit Trail\n(all modules)"]
    DASH_F["Global Dashboard\n(HR+Finance+PM KPIs)"]
  end

  %% Auth links
  USERS_F -->|"employeeId"| EMP_F
  ROLES_F -.->|"permission guard"| HR
  ROLES_F -.->|"permission guard"| FINANCE
  ROLES_F -.->|"permission guard"| PM

  %% HR internal
  DEPT_F -->|"approval chain"| LEAVE_F
  EMP_F -->|"assigneeId"| PROG_F
  EMP_F -->|"schedule"| ATT_F

  %% Gap A R1: Leave → Payroll
  LEAVE_F -->|"[Gap A R1] approved unpaid leave\n→ UNPAID_LEAVE_DEDUCTION"| PAY_F

  %% Gap A R2: Attendance → Payroll
  ATT_F -->|"[Gap A R2] absent days\n→ ABSENT_DEDUCTION"| PAY_F
  OT_F -->|"approved OT hours\n→ OT_PAY"| PAY_F

  %% Gap F: Attendance → Notification
  ATT_F -->|"[Gap F] no check-in + no leave\nCron 07:00 → notify manager"| NOTIF_F

  %% Gap B: SS Employer → Journal
  PAY_F -->|"mark-paid: salary JE\nDR:SalaryExp/CR:Cash"| JNL_F
  SS_F -->|"[Gap B] DR:SSEmpExp/CR:SSPayable"| JNL_F
  PAY_F -->|"income/expense entry"| JNL_F

  %% Gap D: Payroll WHT → WHT Cert
  PAYSLIPS_F -->|"[Gap D] WHT > 0\nauto-create PND1 cert"| TAX_F

  %% Finance pipeline
  CUST_F -->|"[Gap E] credit check"| INV_F
  CUST_F -->|"[Gap E] credit check"| QUOT_F
  QUOT_F -->|"accept"| SO_F
  SO_F -->|"create invoice"| INV_F
  INV_F -->|"payment"| AR_PAY_F
  AR_PAY_F -->|"receipt"| BANK_F

  %% Gap G: Overdue warning
  INV_F -->|"[Gap G] overdue + create invoice/quotation\n→ notify creator"| NOTIF_F

  %% PO pipeline
  PO_F -->|"[Gap C] approve: committed++"| BUD_F
  PO_F -->|"GR + 3-way match"| GR_F
  GR_F -->|"received → link AP"| AP_F
  AP_F -->|"[Gap C] paid: committed--, actualSpend++"| BUD_F
  AP_F -->|"payment"| BANK_F
  PO_F -->|"link"| AP_F

  %% PM → Finance
  EXP_F -->|"approve: DR:ProjExp/CR:AP"| JNL_F
  BUD_F -->|"budget adj JE"| JNL_F

  %% Tax
  INV_F -->|"vatAmount"| VAT_F
  AP_F -->|"inputVAT"| VAT_F

  %% Reporting
  JNL_F -->|"aggregated"| STMT_F
  CO_F -->|"vatRate, prefix, logo"| INV_F
  CO_F -->|"prefix"| PO_F
  CO_F -->|"header"| STMT_F
  FP_F -->|"block post after close"| JNL_F

  %% Cross-module support
  AUDIT_F -.->|"log all create/update/delete"| HR
  AUDIT_F -.->|"log all create/update/delete"| FINANCE
  DASH_F -->|"aggregate KPIs"| HR
  DASH_F -->|"aggregate KPIs"| FINANCE
  DASH_F -->|"aggregate KPIs"| PM
```
