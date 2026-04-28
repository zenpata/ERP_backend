type WithId = { id: string }

export type MockLeaveType = {
  id: string
  code: string
  name: string
  maxDaysPerYear: string
  isActive: boolean
  paidLeave?: boolean
}

export type MockLeave = {
  id: string
  employeeId: string
  employeeCode: string
  employeeFirstname: string
  employeeLastname: string
  leaveTypeId: string
  leaveTypeCode: string
  leaveTypeName: string
  startDate: string
  endDate: string
  daysCount: string
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  reason: string | null
  rejectionReason: string | null
  createdAt: string
}

export type MockPayrollRun = {
  id: string
  periodMonth: number
  periodYear: number
  status: 'draft' | 'processing' | 'approved' | 'paid'
  totalGross: string | null
  totalDeductions: string | null
  totalNet: string | null
  processedAt: string | null
  approvedBy: string | null
  approvedAt: string | null
  paidAt: string | null
  createdBy: string | null
  createdAt: string
  updatedAt: string
  payslipCount: number
}

export type MockPayrollRecord = {
  id: string
  employeeId: string
  employeeCode: string
  employeeName: string
  period: string
  baseSalary: number
  otHours: number
  otAmount: number
  deductions: number
  netSalary: number
  status: 'draft' | 'processing' | 'approved' | 'paid'
  createdAt: string
  updatedAt: string
}

export type MockInvoice = {
  id: string
  invoiceNumber: string
  customerId: string
  customerName: string
  issueDate: string
  dueDate: string
  items: Array<{
    id: string
    description: string
    quantity: number
    unitPrice: number
    amount: number
    vatRate: number
    vatAmount: number
  }>
  subtotal: number
  vatAmount: number
  whtAmount: number
  withholdingAmount: number
  totalAmount: number
  grandTotal: number
  paidAmount: number
  balanceDue: number
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
  notes?: string
  createdAt: string
  updatedAt: string
}

export type MockVendor = {
  id: string
  code: string
  name: string
  taxId?: string
  address?: string
  phone?: string
  email?: string
  paymentTermDays: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type MockApBill = {
  id: string
  referenceNumber: string
  vendorInvoiceNumber?: string
  vendorId: string
  vendorName: string
  vendorCode: string
  issueDate: string
  dueDate: string
  receivedDate: string
  subtotal: number
  vatAmount: number
  whtAmount: number
  totalAmount: number
  paidAmount: number
  remainingAmount: number
  status: 'pending' | 'approved' | 'paid' | 'overdue' | 'rejected'
  expenseCategory?: string
  createdAt: string
  updatedAt: string
}

export type MockCustomer = {
  id: string
  code: string
  name: string
  creditLimit: string
  creditTermDays: number
  isActive: boolean
  hasOverdueInvoice: boolean
  createdAt: string
  updatedAt: string
}

export type MockBudget = {
  id: string
  budgetCode: string
  projectName: string
  totalAmount: string
  budgetType: string
  moduleTags: string[]
  ownerName: string
  status: 'Draft' | 'Approved' | 'Active' | 'On Hold' | 'Closed'
  startDate: string
  endDate: string
  spentAmount?: string
}

export type MockExpense = {
  id: string
  title: string
  budgetId: string
  amount: string
  expenseDate: string
  category: string
  paymentMethod: string
  status: 'Draft' | 'Pending Approval' | 'Approved' | 'Paid' | 'Rejected'
  requestedByName: string
}

export type MockTask = {
  id: string
  title: string
  module: string
  phase: string
  status: 'Not Started' | 'In Progress' | 'Done' | 'On Hold' | 'Cancelled'
  priority: 'High' | 'Medium' | 'Low'
  progressPct: number
  startDate: string
  targetDate: string
  assigneeName: string
}

export type MockRole = {
  id: string
  name: string
  description?: string
  isSystem: boolean
  permissions: Array<{ id: string; code: string }>
}

export type MockUser = {
  id: string
  email: string
  name: string
  isActive: boolean
  roles: Array<{ id: string; name: string }>
}

export type MockNotification = {
  id: string
  title: string
  body?: string
  readAt?: string
  actionUrl?: string
  createdAt: string
}

export type MockErpState = {
  nowIso: string
  leaveTypes: MockLeaveType[]
  leaves: MockLeave[]
  payrollRuns: MockPayrollRun[]
  payrollRecords: MockPayrollRecord[]
  customers: MockCustomer[]
  invoices: MockInvoice[]
  invoicePayments: Array<{
    id: string
    invoiceId: string
    paymentDate: string
    amount: number
    paymentMethod: string
    referenceNo?: string
    createdAt: string
  }>
  vendors: MockVendor[]
  apBills: MockApBill[]
  chartAccounts: Array<{
    id: string
    code: string
    name: string
    type: string
    parentId: string | null
    isActive: boolean
    createdAt: string
  }>
  journalEntries: Array<{
    id: string
    entryNumber: string
    type: string
    date: string
    description: string
    totalDebit: string
    totalCredit: string
    createdAt: string
  }>
  bankAccounts: Array<{
    id: string
    code: string
    accountName: string
    accountNo: string
    bankName: string
    currentBalance: number
    isActive: boolean
    currency: string
  }>
  bankTransactions: Record<
    string,
    Array<{
      id: string
      transactionDate: string
      description: string
      type: string
      amount: number
      runningBalance: number
      sourceModule: string
      reconciled: boolean
      createdAt: string
    }>
  >
  taxRates: Array<{
    id: string
    type: string
    code: string
    rate: number
    description: string
    pndForm: string | null
    incomeType: string | null
    isActive: boolean
    createdAt: string
  }>
  quotations: Array<{
    id: string
    quotNo: string
    customerId: string
    customerCode?: string
    customerName: string
    issueDate: string
    validUntil: string
    subtotalBeforeVat: number
    vatAmount: number
    totalAmount: number
    status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired'
    updatedAt: string
    items: Array<{ id: string; itemNo: number; description: string; quantity: number; unitPrice: number; lineTotal: number; vatRate: number }>
    salesOrderId?: string
  }>
  salesOrders: Array<{
    id: string
    soNo: string
    customerId: string
    customerCode?: string
    customerName: string
    orderDate: string
    deliveryDate?: string
    subtotalBeforeVat: number
    vatAmount: number
    totalAmount: number
    status: 'draft' | 'confirmed' | 'partially_invoiced' | 'invoiced' | 'cancelled'
    updatedAt: string
    quotationId?: string
    items: Array<{ id: string; itemNo: number; description: string; quantity: number; unitPrice: number; lineTotal: number; vatRate: number; invoicedQty: number; remainingQty: number }>
    linkedInvoices: Array<{ id: string; invoiceNo: string; status: string; totalAmount: number }>
  }>
  purchaseOrders: Array<{
    id: string
    poNo: string
    vendorId: string
    vendorSummary: { name: string; code: string }
    issueDate: string
    expectedDeliveryDate?: string
    status: 'draft' | 'submitted' | 'approved' | 'partially_received' | 'received' | 'closed' | 'cancelled'
    totalAmount: number
    updatedAt: string
  }>
  budgets: MockBudget[]
  expenses: MockExpense[]
  tasks: MockTask[]
  roles: MockRole[]
  users: MockUser[]
  permissions: Array<{ id: string; code: string; description: string | null }>
  companySettings: {
    id: string
    companyName: string
    companyNameEn?: string
    taxId?: string
    logoUrl?: string
    currency: string
    defaultVatRate: number
    invoicePrefix?: string
    address?: string
    phone?: string
  }
  fiscalPeriods: Array<{
    id: string
    year: number
    month: number
    startDate: string
    endDate: string
    status: 'open' | 'closed'
  }>
  notificationConfigs: { emailDigest: boolean; pushEnabled: boolean }
  auditLogs: Array<{
    id: string
    occurredAt: string
    actorUserId?: string
    entityType: string
    entityId?: string
    action: string
  }>
  notifications: MockNotification[]
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function nextId(prefix: string, rows: WithId[]): string {
  return `${prefix}-${rows.length + 1}`.padEnd(prefix.length + 3, '0')
}

export function createRealisticMockState(): MockErpState {
  const nowIso = '2026-04-24T09:00:00.000Z'

  const leaveTypes: MockLeaveType[] = [
    { id: 'lt-annual', code: 'annual', name: 'ลาพักร้อน', maxDaysPerYear: '10', isActive: true, paidLeave: true },
    { id: 'lt-sick', code: 'sick', name: 'ลาป่วย', maxDaysPerYear: '30', isActive: true, paidLeave: true },
    { id: 'lt-unpaid', code: 'unpaid', name: 'ลาโดยไม่รับค่าจ้าง', maxDaysPerYear: '365', isActive: true, paidLeave: false },
  ]

  const leaves: MockLeave[] = [
    {
      id: 'leave-001',
      employeeId: 'emp-001',
      employeeCode: 'EMP-0001',
      employeeFirstname: 'สมหญิง',
      employeeLastname: 'รักดี',
      leaveTypeId: 'lt-annual',
      leaveTypeCode: 'annual',
      leaveTypeName: 'ลาพักร้อน',
      startDate: '2026-04-20',
      endDate: '2026-04-22',
      daysCount: '3',
      status: 'pending',
      reason: 'พักผ่อนกับครอบครัว',
      rejectionReason: null,
      createdAt: nowIso,
    },
  ]

  const payrollRuns: MockPayrollRun[] = [
    {
      id: 'run-2026-04',
      periodMonth: 4,
      periodYear: 2026,
      status: 'processing',
      totalGross: '85000',
      totalDeductions: '4500',
      totalNet: '80500',
      processedAt: nowIso,
      approvedBy: null,
      approvedAt: null,
      paidAt: null,
      createdBy: 'user-admin',
      createdAt: nowIso,
      updatedAt: nowIso,
      payslipCount: 2,
    },
  ]

  const payrollRecords: MockPayrollRecord[] = [
    {
      id: 'pay-001',
      employeeId: 'emp-001',
      employeeCode: 'EMP-0001',
      employeeName: 'สมหญิง รักดี',
      period: '2026-04',
      baseSalary: 50000,
      otHours: 2,
      otAmount: 1000,
      deductions: 2300,
      netSalary: 48700,
      status: 'approved',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ]

  const customers: MockCustomer[] = [
    {
      id: 'cus-001',
      code: 'CUST-TH-001',
      name: 'บริษัท ไทยโซลูชัน จำกัด',
      creditLimit: '1000000',
      creditTermDays: 30,
      isActive: true,
      hasOverdueInvoice: true,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ]

  const invoices: MockInvoice[] = [
    {
      id: 'inv-001',
      invoiceNumber: 'INV-2026-0001',
      customerId: 'cus-001',
      customerName: 'บริษัท ไทยโซลูชัน จำกัด',
      issueDate: '2026-04-01',
      dueDate: '2026-04-30',
      items: [
        {
          id: 'inv-item-001',
          description: 'ค่าบริการ ERP Implementation',
          quantity: 1,
          unitPrice: 150000,
          amount: 150000,
          vatRate: 7,
          vatAmount: 10500,
        },
      ],
      subtotal: 150000,
      vatAmount: 10500,
      whtAmount: 0,
      withholdingAmount: 0,
      totalAmount: 160500,
      grandTotal: 160500,
      paidAmount: 0,
      balanceDue: 160500,
      status: 'sent',
      notes: 'งวดแรกของโครงการ',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ]

  const vendors: MockVendor[] = [
    {
      id: 'ven-001',
      code: 'VEND-0001',
      name: 'หจก. ไอที ซัพพลาย',
      taxId: '0105548123456',
      phone: '02-111-2222',
      email: 'accounting@itsupply.co.th',
      paymentTermDays: 30,
      isActive: true,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ]

  const apBills: MockApBill[] = [
    {
      id: 'ap-001',
      referenceNumber: 'AP-2026-0001',
      vendorInvoiceNumber: 'VINV-7788',
      vendorId: 'ven-001',
      vendorName: 'หจก. ไอที ซัพพลาย',
      vendorCode: 'VEND-0001',
      issueDate: '2026-04-05',
      dueDate: '2026-05-05',
      receivedDate: '2026-04-06',
      subtotal: 50000,
      vatAmount: 3500,
      whtAmount: 0,
      totalAmount: 53500,
      paidAmount: 0,
      remainingAmount: 53500,
      status: 'pending',
      expenseCategory: 'Software',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ]

  const chartAccounts = [
    { id: 'coa-1001', code: '1000', name: 'Cash', type: 'asset', parentId: null, isActive: true, createdAt: nowIso },
    { id: 'coa-4001', code: '4000', name: 'Service Revenue', type: 'income', parentId: null, isActive: true, createdAt: nowIso },
  ]

  const journalEntries = [
    {
      id: 'je-001',
      entryNumber: 'JE-2026-0001',
      type: 'manual',
      date: '2026-04-01',
      description: 'เปิดรอบบัญชี',
      totalDebit: '100000.00',
      totalCredit: '100000.00',
      createdAt: nowIso,
    },
  ]

  const bankAccounts = [
    {
      id: 'bank-001',
      code: 'KTB-001',
      accountName: 'ERP Operating Account',
      accountNo: '123-4-56789-0',
      bankName: 'Krungthai',
      currentBalance: 500000,
      isActive: true,
      currency: 'THB',
    },
  ]

  const bankTransactions = {
    'bank-001': [
      {
        id: 'bank-tx-001',
        transactionDate: '2026-04-10',
        description: 'เงินรับจากลูกค้า',
        type: 'deposit',
        amount: 250000,
        runningBalance: 500000,
        sourceModule: 'finance',
        reconciled: true,
        createdAt: nowIso,
      },
    ],
  }

  const taxRates = [
    {
      id: 'tax-001',
      type: 'VAT',
      code: 'VAT7',
      rate: 7,
      description: 'VAT 7%',
      pndForm: null,
      incomeType: null,
      isActive: true,
      createdAt: nowIso,
    },
  ]

  const quotations = [
    {
      id: 'qt-001',
      quotNo: 'QT-2026-0001',
      customerId: 'cus-001',
      customerCode: 'CUST-TH-001',
      customerName: 'บริษัท ไทยโซลูชัน จำกัด',
      issueDate: '2026-04-01',
      validUntil: '2026-05-01',
      subtotalBeforeVat: 100000,
      vatAmount: 7000,
      totalAmount: 107000,
      status: 'draft' as const,
      updatedAt: nowIso,
      items: [
        {
          id: 'qt-item-001',
          itemNo: 1,
          description: 'Setup and onboarding',
          quantity: 1,
          unitPrice: 100000,
          lineTotal: 100000,
          vatRate: 7,
        },
      ],
    },
  ]

  const salesOrders = [
    {
      id: 'so-001',
      soNo: 'SO-2026-0001',
      customerId: 'cus-001',
      customerCode: 'CUST-TH-001',
      customerName: 'บริษัท ไทยโซลูชัน จำกัด',
      orderDate: '2026-04-02',
      deliveryDate: '2026-04-30',
      subtotalBeforeVat: 120000,
      vatAmount: 8400,
      totalAmount: 128400,
      status: 'draft' as const,
      updatedAt: nowIso,
      items: [
        {
          id: 'so-item-001',
          itemNo: 1,
          description: 'Implementation phase 1',
          quantity: 1,
          unitPrice: 120000,
          lineTotal: 120000,
          vatRate: 7,
          invoicedQty: 0,
          remainingQty: 1,
        },
      ],
      linkedInvoices: [],
    },
  ]

  const purchaseOrders = [
    {
      id: 'po-001',
      poNo: 'PO-2026-0001',
      vendorId: 'ven-001',
      vendorSummary: { name: 'หจก. ไอที ซัพพลาย', code: 'VEND-0001' },
      issueDate: '2026-04-03',
      expectedDeliveryDate: '2026-04-20',
      status: 'submitted' as const,
      totalAmount: 75000,
      updatedAt: nowIso,
    },
  ]

  const budgets: MockBudget[] = [
    {
      id: '9ad1f34e-2f99-4a5f-a201-b8dd0a9c9011',
      budgetCode: 'BUD-2026-001',
      projectName: 'ERP Rollout 2026',
      totalAmount: '500000',
      budgetType: 'CAPEX',
      moduleTags: ['finance', 'hr'],
      ownerName: 'ณัฐพล โครงการ',
      status: 'Active',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      spentAmount: '120000',
    },
  ]

  const expenses: MockExpense[] = [
    {
      id: 'exp-001',
      title: 'ค่าเดินทางทีมติดตั้ง',
      budgetId: budgets[0].id,
      amount: '25000',
      expenseDate: '2026-04-10',
      category: 'Travel',
      paymentMethod: 'Transfer',
      status: 'Pending Approval',
      requestedByName: 'มนัส ทีม PM',
    },
  ]

  const tasks: MockTask[] = [
    {
      id: 'task-001',
      title: 'เตรียม UAT Script',
      module: 'PM',
      phase: 'Testing',
      status: 'In Progress',
      priority: 'High',
      progressPct: 65,
      startDate: '2026-04-01',
      targetDate: '2026-04-30',
      assigneeName: 'วารุณี Tester',
    },
  ]

  const permissions = [
    { id: 'perm-user-view', code: 'system:user:view', description: 'View users' },
    { id: 'perm-user-edit', code: 'system:user:edit', description: 'Edit users' },
    { id: 'perm-role-view', code: 'system:role:view', description: 'View roles' },
    { id: 'perm-role-edit', code: 'system:role:edit', description: 'Edit roles' },
    { id: 'perm-finance-report', code: 'finance:report:view', description: 'View finance reports' },
  ]

  const roles: MockRole[] = [
    {
      id: 'role-super-admin',
      name: 'super_admin',
      description: 'Full access',
      isSystem: true,
      permissions: [...permissions],
    },
    {
      id: 'role-hr-admin',
      name: 'hr_admin',
      description: 'HR management',
      isSystem: true,
      permissions: [permissions[0], permissions[1]],
    },
    {
      id: 'role-pm-manager',
      name: 'pm_manager',
      description: 'PM management',
      isSystem: true,
      permissions: [],
    },
  ]

  const users: MockUser[] = [
    {
      id: 'user-admin',
      email: 'admin@erp.com',
      name: 'Admin ERP',
      isActive: true,
      roles: [{ id: 'role-super-admin', name: 'super_admin' }],
    },
    {
      id: 'user-hr',
      email: 'hr@erp.com',
      name: 'HR ERP',
      isActive: true,
      roles: [{ id: 'role-hr-admin', name: 'hr_admin' }],
    },
  ]

  const companySettings = {
    id: 'company-001',
    companyName: 'บริษัท เอ็นเตอร์ไพรซ์ ไทย จำกัด',
    companyNameEn: 'Enterprise Thai Co., Ltd.',
    taxId: '0105551000123',
    logoUrl: 'https://example.com/logo.png',
    currency: 'THB',
    defaultVatRate: 7,
    invoicePrefix: 'INV',
    address: 'Bangkok, Thailand',
    phone: '02-000-0000',
  }

  const fiscalPeriods = [
    { id: 'fiscal-2026-01', year: 2026, month: 1, startDate: '2026-01-01', endDate: '2026-01-31', status: 'open' as const },
    { id: 'fiscal-2026-02', year: 2026, month: 2, startDate: '2026-02-01', endDate: '2026-02-28', status: 'closed' as const },
  ]

  const notificationConfigs = { emailDigest: true, pushEnabled: true }

  const auditLogs = [
    {
      id: 'audit-001',
      occurredAt: nowIso,
      actorUserId: 'user-admin',
      entityType: 'settings_role',
      entityId: 'role-hr-admin',
      action: 'UPDATE_PERMISSIONS',
    },
  ]

  const notifications: MockNotification[] = [
    {
      id: 'noti-001',
      title: 'มีคำขอลาใหม่รออนุมัติ',
      body: 'พนักงาน EMP-0001 ส่งคำขอลา',
      actionUrl: '/hr/leaves',
      createdAt: nowIso,
    },
    {
      id: 'noti-002',
      title: 'Invoice ใกล้ครบกำหนด',
      body: 'INV-2026-0001 จะครบกำหนดภายใน 3 วัน',
      readAt: nowIso,
      actionUrl: '/finance/invoices',
      createdAt: nowIso,
    },
  ]

  const state: MockErpState = {
    nowIso,
    leaveTypes,
    leaves,
    payrollRuns,
    payrollRecords,
    customers,
    invoices,
    invoicePayments: [],
    vendors,
    apBills,
    chartAccounts,
    journalEntries,
    bankAccounts,
    bankTransactions,
    taxRates,
    quotations,
    salesOrders,
    purchaseOrders,
    budgets,
    expenses,
    tasks,
    roles,
    users,
    permissions,
    companySettings,
    fiscalPeriods,
    notificationConfigs,
    auditLogs,
    notifications,
  }

  return clone(state)
}

export function appendRow<T extends WithId>(rows: T[], row: T) {
  rows.push(row)
  return row
}

export function makeLocalId(prefix: string, rows: WithId[]) {
  return nextId(prefix, rows)
}

