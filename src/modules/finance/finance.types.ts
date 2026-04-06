// ============================================================
// finance.types.ts — TypeScript types สำหรับ Finance module
// ============================================================

export type InvoiceStatus = 'draft' | 'issued' | 'partially_paid' | 'paid' | 'cancelled' | 'overdue'
export type PaymentMethod = 'cash' | 'bank_transfer' | 'cheque' | 'credit_card'
export type JournalEntryType = 'manual' | 'auto_payroll' | 'auto_invoice' | 'auto_payment'

export type Customer = {
  id: string
  code: string
  name: string
  taxId: string | null
  address: string | null
  phone: string | null
  email: string | null
  creditLimit: string
  createdAt: Date
  updatedAt: Date
}

export type InvoiceItem = {
  id: string
  invoiceId: string
  description: string
  quantity: string
  unitPrice: string
  whtType: string | null
  whtAmount: string
  amount: string
}

export type Invoice = {
  id: string
  invoiceNumber: string
  customerId: string
  issueDate: Date
  dueDate: Date
  subtotal: string
  vatAmount: string
  whtAmount: string
  total: string
  paidAmount: string
  status: InvoiceStatus
  note: string | null
  createdAt: Date
  updatedAt: Date
}

export type CreateInvoicePayload = {
  customerId: string
  issueDate: Date
  dueDate: Date
  items: Array<{
    description: string
    quantity: string
    unitPrice: string
    whtType?: string
  }>
  note?: string
}

export type ChartOfAccount = {
  id: string
  code: string
  name: string
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'
  parentId: string | null
  isActive: boolean
}
