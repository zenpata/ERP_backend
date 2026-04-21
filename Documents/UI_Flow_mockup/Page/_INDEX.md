# UI Flow Mockup — สารบัญหน้า (spec + preview)

เอกสาร **`.md`** ในโฟลเดอร์ย่อย `R1-*` / `R2-*` สอดคล้องกับ [`Documents/UX_Flow/Functions`](../../UX_Flow/Functions) (หนึ่งโฟลเดอร์ = หนึ่ง UX function) และอ้าง [`design-system.md`](../design-system.md) สำหรับ pattern ตอนสร้าง HTML

เทมเพลต spec: [`_PAGE_SPEC_TEMPLATE.md`](./_PAGE_SPEC_TEMPLATE.md) · วิธีแปลงจาก UX_Flow: [`../UX_TO_UI_SPEC_WORKFLOW.md`](../UX_TO_UI_SPEC_WORKFLOW.md) · **`.md` → `.preview.html`:** [`MD_TO_PREVIEW_HTML_MANUAL.md`](./MD_TO_PREVIEW_HTML_MANUAL.md)

**สไตล์ร่วมของไฟล์ preview:** [`_Shared/preview-base.css`](./_Shared/preview-base.css)

---

## หน้าที่มี static preview (ถอดจาก `erp_frontend`)

| Route | UX function | Spec | Preview |
|-------|-------------|------|---------|
| Shell (หลัง login) | R1-01 | [_Shared/AppShell.md](./_Shared/AppShell.md) | [AppShell.preview.html](./_Shared/AppShell.preview.html) |
| `/login` | R1-01 | [Login.md](./R1-01_Auth_Login_and_Session/Login.md) | [Login.preview.html](./R1-01_Auth_Login_and_Session/Login.preview.html) |
| `—` (bootstrap) | R1-01 | [SessionBootstrap.md](./R1-01_Auth_Login_and_Session/SessionBootstrap.md) | [SessionBootstrap.preview.html](./R1-01_Auth_Login_and_Session/SessionBootstrap.preview.html) |
| modal / settings | R1-01 | [ChangePassword.md](./R1-01_Auth_Login_and_Session/ChangePassword.md) | [ChangePassword.preview.html](./R1-01_Auth_Login_and_Session/ChangePassword.preview.html) |
| `—` (dialog) | R1-01 | [LogoutConfirm.md](./R1-01_Auth_Login_and_Session/LogoutConfirm.md) | [LogoutConfirm.preview.html](./R1-01_Auth_Login_and_Session/LogoutConfirm.preview.html) |
| `/hr/employees` | R1-02 | [EmployeeList.md](./R1-02_HR_Employee_Management/EmployeeList.md) | [EmployeeList.preview.html](./R1-02_HR_Employee_Management/EmployeeList.preview.html) |
| `/hr/employees/:id` | R1-02 | [EmployeeDetail.md](./R1-02_HR_Employee_Management/EmployeeDetail.md) | [EmployeeDetail.preview.html](./R1-02_HR_Employee_Management/EmployeeDetail.preview.html) |
| `/hr/employees/new`, `.../edit` | R1-02 | [EmployeeForm.md](./R1-02_HR_Employee_Management/EmployeeForm.md) | [EmployeeForm.preview.html](./R1-02_HR_Employee_Management/EmployeeForm.preview.html) |
| `/hr/organization` | R1-03 | [Organization.md](./R1-03_HR_Organization_Management/Organization.md) | [Organization.preview.html](./R1-03_HR_Organization_Management/Organization.preview.html) |
| `—` (โมดัลจาก `/hr/organization`) | R1-03 | [DepartmentForm.md](./R1-03_HR_Organization_Management/DepartmentForm.md) | [DepartmentForm.preview.html](./R1-03_HR_Organization_Management/DepartmentForm.preview.html) |
| `—` (โมดัลจาก `/hr/organization`) | R1-03 | [PositionForm.md](./R1-03_HR_Organization_Management/PositionForm.md) | [PositionForm.preview.html](./R1-03_HR_Organization_Management/PositionForm.preview.html) |
| `/hr/leaves` | R1-04 | [LeaveList.md](./R1-04_HR_Leave_Management/LeaveList.md) | [LeaveList.preview.html](./R1-04_HR_Leave_Management/LeaveList.preview.html) |
| `/hr/payroll` | R1-05 | [Payroll.md](./R1-05_HR_Payroll/Payroll.md) | [Payroll.preview.html](./R1-05_HR_Payroll/Payroll.preview.html) |
| `/hr/payroll/runs/:runId` (TBD) | R1-05 | [PayrollRunDetail.md](./R1-05_HR_Payroll/PayrollRunDetail.md) | [PayrollRunDetail.preview.html](./R1-05_HR_Payroll/PayrollRunDetail.preview.html) |
| `/finance/invoices` | R1-06 | [InvoiceList.md](./R1-06_Finance_Invoice_AR/InvoiceList.md) | [InvoiceList.preview.html](./R1-06_Finance_Invoice_AR/InvoiceList.preview.html) |
| `/finance/invoices/new` | R1-06 | [InvoiceForm.md](./R1-06_Finance_Invoice_AR/InvoiceForm.md) | [InvoiceForm.preview.html](./R1-06_Finance_Invoice_AR/InvoiceForm.preview.html) |
| `/finance/invoices/:id` | R1-06 | [InvoiceDetail.md](./R1-06_Finance_Invoice_AR/InvoiceDetail.md) | [InvoiceDetail.preview.html](./R1-06_Finance_Invoice_AR/InvoiceDetail.preview.html) |
| `/finance/vendors` | R1-07 | [VendorList.md](./R1-07_Finance_Vendor_Management/VendorList.md) | [VendorList.preview.html](./R1-07_Finance_Vendor_Management/VendorList.preview.html) |
| `/finance/vendors/new`, `.../edit` | R1-07 | [VendorForm.md](./R1-07_Finance_Vendor_Management/VendorForm.md) | [VendorForm.preview.html](./R1-07_Finance_Vendor_Management/VendorForm.preview.html) |
| `/finance/ap` | R1-08 | [ApList.md](./R1-08_Finance_Accounts_Payable/ApList.md) | [ApList.preview.html](./R1-08_Finance_Accounts_Payable/ApList.preview.html) |
| `/finance/ap/new` | R1-08 | [ApBillForm.md](./R1-08_Finance_Accounts_Payable/ApBillForm.md) | [ApBillForm.preview.html](./R1-08_Finance_Accounts_Payable/ApBillForm.preview.html) |
| `/finance/ap/:id` | R1-08 | [ApDetail.md](./R1-08_Finance_Accounts_Payable/ApDetail.md) | [ApDetail.preview.html](./R1-08_Finance_Accounts_Payable/ApDetail.preview.html) |
| `/finance/reports` | R1-10 | [Reports.md](./R1-10_Finance_Reports_Summary/Reports.md) | [Reports.preview.html](./R1-10_Finance_Reports_Summary/Reports.preview.html) |
| `/pm/dashboard` | R1-14 | [Dashboard.md](./R1-14_PM_Dashboard/Dashboard.md) | [Dashboard.preview.html](./R1-14_PM_Dashboard/Dashboard.preview.html) |
| `/pm/budgets` | R1-11 | [BudgetList.md](./R1-11_PM_Budget_Management/BudgetList.md) | [BudgetList.preview.html](./R1-11_PM_Budget_Management/BudgetList.preview.html) |
| `/pm/budgets/new`, `.../edit` | R1-11 | [BudgetForm.md](./R1-11_PM_Budget_Management/BudgetForm.md) | [BudgetForm.preview.html](./R1-11_PM_Budget_Management/BudgetForm.preview.html) |
| `/pm/budgets/:id` | R1-11 | [BudgetDetail.md](./R1-11_PM_Budget_Management/BudgetDetail.md) | [BudgetDetail.preview.html](./R1-11_PM_Budget_Management/BudgetDetail.preview.html) |
| `/pm/expenses` | R1-12 | [ExpenseList.md](./R1-12_PM_Expense_Management/ExpenseList.md) | [ExpenseList.preview.html](./R1-12_PM_Expense_Management/ExpenseList.preview.html) |
| `/pm/expenses/new`, `/pm/expenses/:id` | R1-12 | [ExpenseForm.md](./R1-12_PM_Expense_Management/ExpenseForm.md) | [ExpenseForm.preview.html](./R1-12_PM_Expense_Management/ExpenseForm.preview.html) |
| `/pm/progress` | R1-13 | [ProgressList.md](./R1-13_PM_Progress_Tasks/ProgressList.md) | [ProgressList.preview.html](./R1-13_PM_Progress_Tasks/ProgressList.preview.html) |
| `/pm/progress/new`, `.../edit` | R1-13 | [TaskForm.md](./R1-13_PM_Progress_Tasks/TaskForm.md) | [TaskForm.preview.html](./R1-13_PM_Progress_Tasks/TaskForm.preview.html) |
| `/settings/users` | R1-15 | [Users.md](./R1-15_Settings_User_Management/Users.md) | [Users.preview.html](./R1-15_Settings_User_Management/Users.preview.html) |
| `/settings/roles` | R1-16 | [Roles.md](./R1-16_Settings_Role_and_Permission/Roles.md) | [Roles.preview.html](./R1-16_Settings_Role_and_Permission/Roles.preview.html) |
| `/settings/roles/new` | R1-16 | [RoleCreate.md](./R1-16_Settings_Role_and_Permission/RoleCreate.md) | [RoleCreate.preview.html](./R1-16_Settings_Role_and_Permission/RoleCreate.preview.html) |
| `—` (โมดัลจาก `/settings/roles`) | R1-16 | [RoleDelete.md](./R1-16_Settings_Role_and_Permission/RoleDelete.md) | [RoleDelete.preview.html](./R1-16_Settings_Role_and_Permission/RoleDelete.preview.html) |

---

## R1-09 — Accounting core

โฟลเดอร์ [`R1-09_Finance_Accounting_Core`](./R1-09_Finance_Accounting_Core)

| Spec | Preview |
|------|---------|
| [ChartOfAccountsList.md](./R1-09_Finance_Accounting_Core/ChartOfAccountsList.md) | [ChartOfAccountsList.preview.html](./R1-09_Finance_Accounting_Core/ChartOfAccountsList.preview.html) |
| [ChartOfAccountsForm.md](./R1-09_Finance_Accounting_Core/ChartOfAccountsForm.md) | [ChartOfAccountsForm.preview.html](./R1-09_Finance_Accounting_Core/ChartOfAccountsForm.preview.html) |
| [JournalList.md](./R1-09_Finance_Accounting_Core/JournalList.md) | [JournalList.preview.html](./R1-09_Finance_Accounting_Core/JournalList.preview.html) |
| [JournalDetail.md](./R1-09_Finance_Accounting_Core/JournalDetail.md) | [JournalDetail.preview.html](./R1-09_Finance_Accounting_Core/JournalDetail.preview.html) |
| [JournalEditor.md](./R1-09_Finance_Accounting_Core/JournalEditor.md) | [JournalEditor.preview.html](./R1-09_Finance_Accounting_Core/JournalEditor.preview.html) |
| [IncomeExpenseLedger.md](./R1-09_Finance_Accounting_Core/IncomeExpenseLedger.md) | [IncomeExpenseLedger.preview.html](./R1-09_Finance_Accounting_Core/IncomeExpenseLedger.preview.html) |
| [FinanceIntegrationAndMapping.md](./R1-09_Finance_Accounting_Core/FinanceIntegrationAndMapping.md) | [FinanceIntegrationAndMapping.preview.html](./R1-09_Finance_Accounting_Core/FinanceIntegrationAndMapping.preview.html) |

---

## R2 — Release 2 (static preview)

| Spec | Preview |
|------|---------|
| [CustomerList.md](./R2-01_Customer_Management/CustomerList.md) | [CustomerList.preview.html](./R2-01_Customer_Management/CustomerList.preview.html) |
| [CustomerDetail.md](./R2-01_Customer_Management/CustomerDetail.md) | [CustomerDetail.preview.html](./R2-01_Customer_Management/CustomerDetail.preview.html) |
| [CustomerForm.md](./R2-01_Customer_Management/CustomerForm.md) | [CustomerForm.preview.html](./R2-01_Customer_Management/CustomerForm.preview.html) |
| [ARAgingReport.md](./R2-02_AR_Payment_Tracking/ARAgingReport.md) | [ARAgingReport.preview.html](./R2-02_AR_Payment_Tracking/ARAgingReport.preview.html) |
| [ARPaymentRecording.md](./R2-02_AR_Payment_Tracking/ARPaymentRecording.md) | [ARPaymentRecording.preview.html](./R2-02_AR_Payment_Tracking/ARPaymentRecording.preview.html) |
| [TaxHub.md](./R2-03_Thai_Tax_VAT_WHT/TaxHub.md) | [TaxHub.preview.html](./R2-03_Thai_Tax_VAT_WHT/TaxHub.preview.html) |
| [VATMonthlySummary.md](./R2-03_Thai_Tax_VAT_WHT/VATMonthlySummary.md) | [VATMonthlySummary.preview.html](./R2-03_Thai_Tax_VAT_WHT/VATMonthlySummary.preview.html) |
| [PNDReport.md](./R2-03_Thai_Tax_VAT_WHT/PNDReport.md) | [PNDReport.preview.html](./R2-03_Thai_Tax_VAT_WHT/PNDReport.preview.html) |
| [WHTCertificateList.md](./R2-03_Thai_Tax_VAT_WHT/WHTCertificateList.md) | [WHTCertificateList.preview.html](./R2-03_Thai_Tax_VAT_WHT/WHTCertificateList.preview.html) |
| [FinancialStatementsHub.md](./R2-04_Financial_Statements/FinancialStatementsHub.md) | [FinancialStatementsHub.preview.html](./R2-04_Financial_Statements/FinancialStatementsHub.preview.html) |
| [BalanceSheetReport.md](./R2-04_Financial_Statements/BalanceSheetReport.md) | [BalanceSheetReport.preview.html](./R2-04_Financial_Statements/BalanceSheetReport.preview.html) |
| [ProfitAndLossReport.md](./R2-04_Financial_Statements/ProfitAndLossReport.md) | [ProfitAndLossReport.preview.html](./R2-04_Financial_Statements/ProfitAndLossReport.preview.html) |
| [CashFlowStatementReport.md](./R2-04_Financial_Statements/CashFlowStatementReport.md) | [CashFlowStatementReport.preview.html](./R2-04_Financial_Statements/CashFlowStatementReport.preview.html) |
| [BankAccountList.md](./R2-05_Cash_Bank_Management/BankAccountList.md) | [BankAccountList.preview.html](./R2-05_Cash_Bank_Management/BankAccountList.preview.html) |
| [BankAccountForm.md](./R2-05_Cash_Bank_Management/BankAccountForm.md) | [BankAccountForm.preview.html](./R2-05_Cash_Bank_Management/BankAccountForm.preview.html) |
| [BankTransactions.md](./R2-05_Cash_Bank_Management/BankTransactions.md) | [BankTransactions.preview.html](./R2-05_Cash_Bank_Management/BankTransactions.preview.html) |
| [BankReconciliation.md](./R2-05_Cash_Bank_Management/BankReconciliation.md) | [BankReconciliation.preview.html](./R2-05_Cash_Bank_Management/BankReconciliation.preview.html) |
| [PurchaseOrderList.md](./R2-06_Purchase_Order/PurchaseOrderList.md) | [PurchaseOrderList.preview.html](./R2-06_Purchase_Order/PurchaseOrderList.preview.html) |
| [PurchaseOrderForm.md](./R2-06_Purchase_Order/PurchaseOrderForm.md) | [PurchaseOrderForm.preview.html](./R2-06_Purchase_Order/PurchaseOrderForm.preview.html) |
| [PurchaseOrderDetail.md](./R2-06_Purchase_Order/PurchaseOrderDetail.md) | [PurchaseOrderDetail.preview.html](./R2-06_Purchase_Order/PurchaseOrderDetail.preview.html) |
| [GoodsReceiptList.md](./R2-06_Purchase_Order/GoodsReceiptList.md) | [GoodsReceiptList.preview.html](./R2-06_Purchase_Order/GoodsReceiptList.preview.html) |
| [AttendancePage.md](./R2-07_Attendance_and_Time_Tracking/AttendancePage.md) | [AttendancePage.preview.html](./R2-07_Attendance_and_Time_Tracking/AttendancePage.preview.html) |
| [WorkScheduleList.md](./R2-07_Attendance_and_Time_Tracking/WorkScheduleList.md) | [WorkScheduleList.preview.html](./R2-07_Attendance_and_Time_Tracking/WorkScheduleList.preview.html) |
| [WorkScheduleDetail.md](./R2-07_Attendance_and_Time_Tracking/WorkScheduleDetail.md) | [WorkScheduleDetail.preview.html](./R2-07_Attendance_and_Time_Tracking/WorkScheduleDetail.preview.html) |
| [HolidayList.md](./R2-07_Attendance_and_Time_Tracking/HolidayList.md) | [HolidayList.preview.html](./R2-07_Attendance_and_Time_Tracking/HolidayList.preview.html) |
| [OvertimeList.md](./R2-07_Attendance_and_Time_Tracking/OvertimeList.md) | [OvertimeList.preview.html](./R2-07_Attendance_and_Time_Tracking/OvertimeList.preview.html) |
| [OvertimeDetail.md](./R2-07_Attendance_and_Time_Tracking/OvertimeDetail.md) | [OvertimeDetail.preview.html](./R2-07_Attendance_and_Time_Tracking/OvertimeDetail.preview.html) |
| [CompanyProfileSettings.md](./R2-08_Company_Organization_Settings/CompanyProfileSettings.md) | [CompanyProfileSettings.preview.html](./R2-08_Company_Organization_Settings/CompanyProfileSettings.preview.html) |
| [FiscalPeriodManagement.md](./R2-08_Company_Organization_Settings/FiscalPeriodManagement.md) | [FiscalPeriodManagement.preview.html](./R2-08_Company_Organization_Settings/FiscalPeriodManagement.preview.html) |
| [PrintExportPatterns.md](./R2-09_Document_Print_Export/PrintExportPatterns.md) | [PrintExportPatterns.preview.html](./R2-09_Document_Print_Export/PrintExportPatterns.preview.html) |
| [NotificationCenter.md](./R2-10_Notification_Workflow_Alerts/NotificationCenter.md) | [NotificationCenter.preview.html](./R2-10_Notification_Workflow_Alerts/NotificationCenter.preview.html) |
| [NotificationPreferences.md](./R2-10_Notification_Workflow_Alerts/NotificationPreferences.md) | [NotificationPreferences.preview.html](./R2-10_Notification_Workflow_Alerts/NotificationPreferences.preview.html) |
| [QuotationList.md](./R2-11_Sales_Order_Quotation/QuotationList.md) | [QuotationList.preview.html](./R2-11_Sales_Order_Quotation/QuotationList.preview.html) |
| [QuotationForm.md](./R2-11_Sales_Order_Quotation/QuotationForm.md) | [QuotationForm.preview.html](./R2-11_Sales_Order_Quotation/QuotationForm.preview.html) |
| [SalesOrderList.md](./R2-11_Sales_Order_Quotation/SalesOrderList.md) | [SalesOrderList.preview.html](./R2-11_Sales_Order_Quotation/SalesOrderList.preview.html) |
| [SalesOrderForm.md](./R2-11_Sales_Order_Quotation/SalesOrderForm.md) | [SalesOrderForm.preview.html](./R2-11_Sales_Order_Quotation/SalesOrderForm.preview.html) |
| [AuditLogViewer.md](./R2-12_Audit_Trail/AuditLogViewer.md) | [AuditLogViewer.preview.html](./R2-12_Audit_Trail/AuditLogViewer.preview.html) |
| [EntityAuditTrail.md](./R2-12_Audit_Trail/EntityAuditTrail.md) | [EntityAuditTrail.preview.html](./R2-12_Audit_Trail/EntityAuditTrail.preview.html) |
| [GlobalDashboard.md](./R2-13_Global_Dashboard/GlobalDashboard.md) | [GlobalDashboard.preview.html](./R2-13_Global_Dashboard/GlobalDashboard.preview.html) |

---

**หมายเหตุ:** หน้า redirect (`/`, `/hr`, `/finance`, `/pm`, `/settings`) เป็น logic ใน `router.tsx` — ไม่มี UI แยก

**วิธีดู preview:** double-click ไฟล์ `.preview.html` หรือเปิดผ่าน Live Server (โหลด `preview-base.css` ตาม path สัมพันธ์จากโฟลเดอร์เดียวกับไฟล์ preview)
