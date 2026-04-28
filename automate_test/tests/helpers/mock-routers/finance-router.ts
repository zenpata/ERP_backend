import type { Page } from '@playwright/test'
import { apiUrlGlob, fulfillJson } from '../auth-api-mock'
import { makeLocalId, type MockErpState } from '../realistic-data'
import {
  containsText,
  getApiPath,
  listJson,
  listPagingFromUrl,
  okJson,
  parseBody,
} from './common'

function parseDate(value: string) {
  return new Date(value).getTime()
}

export async function installFinanceMockRouter(page: Page, state: MockErpState) {
  await page.route(apiUrlGlob('finance/**'), async (route) => {
    const req = route.request()
    const method = req.method()
    const url = req.url()
    const path = getApiPath(url)
    const sp = new URL(url).searchParams

    // Customers
    if (method === 'GET' && path === '/finance/customers/options') {
      const activeOnly = sp.get('activeOnly') === 'true'
      const search = (sp.get('search') ?? '').trim()
      const data = state.customers
        .filter((c) => (activeOnly ? c.isActive : true))
        .filter((c) => (search ? containsText(`${c.code} ${c.name}`, search) : true))
        .map((c) => ({
          id: c.id,
          code: c.code,
          name: c.name,
          isActive: c.isActive,
          hasOverdueInvoice: c.hasOverdueInvoice,
          creditWarning: c.hasOverdueInvoice ? 'มีค้างชำระ' : undefined,
        }))
      await okJson(route, data)
      return
    }
    if (method === 'GET' && path === '/finance/customers') {
      const search = (sp.get('search') ?? '').trim()
      const active = sp.get('isActive')
      const rows = state.customers.filter((c) => {
        if (active === 'true' && !c.isActive) return false
        if (active === 'false' && c.isActive) return false
        if (search && !containsText(`${c.code} ${c.name}`, search)) return false
        return true
      })
      const { page: pageNo, perPage } = listPagingFromUrl(url)
      await listJson(route, rows, pageNo, perPage)
      return
    }
    if (method === 'POST' && path === '/finance/customers') {
      const body = parseBody<{ name?: string; code?: string }>(route)
      if (!body.name?.trim()) {
        await fulfillJson(route, 422, { success: false, message: 'name required', statusCode: 422 })
        return
      }
      const code = body.code?.trim() || `CUS-${String(state.customers.length + 1).padStart(4, '0')}`
      if (state.customers.some((x) => x.code === code)) {
        await fulfillJson(route, 409, { success: false, message: 'duplicate code', statusCode: 409 })
        return
      }
      const created = {
        id: makeLocalId('cus', state.customers),
        code,
        name: body.name.trim(),
        creditLimit: '500000',
        creditTermDays: 30,
        isActive: true,
        hasOverdueInvoice: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      state.customers.unshift(created)
      await okJson(route, created, 201)
      return
    }
    if (method === 'PATCH' && path.match(/^\/finance\/customers\/[^/]+\/activate$/)) {
      const id = path.split('/')[3]
      const body = parseBody<{ isActive?: boolean }>(route)
      const row = state.customers.find((x) => x.id === id)
      if (!row) {
        await fulfillJson(route, 404, { success: false, message: 'Not found', statusCode: 404 })
        return
      }
      row.isActive = Boolean(body.isActive)
      row.updatedAt = new Date().toISOString()
      await okJson(route, { id: row.id, isActive: row.isActive, updatedAt: row.updatedAt })
      return
    }

    // Invoices
    if (method === 'GET' && path === '/finance/invoices') {
      const status = sp.get('status') ?? ''
      const customerId = sp.get('customerId') ?? ''
      const dateFrom = sp.get('dateFrom') ?? ''
      const dateTo = sp.get('dateTo') ?? ''
      const rows = state.invoices.filter((inv) => {
        if (status && inv.status !== status) return false
        if (customerId && inv.customerId !== customerId) return false
        if (dateFrom && inv.issueDate < dateFrom) return false
        if (dateTo && inv.issueDate > dateTo) return false
        return true
      })
      const { page: pageNo, perPage } = listPagingFromUrl(url)
      await listJson(route, rows, pageNo, perPage)
      return
    }
    if (method === 'POST' && path === '/finance/invoices') {
      const body = parseBody<{
        customerId?: string
        dueDate?: string
        items?: Array<{ description: string; quantity: number; unitPrice: number; vatRate?: number }>
        notes?: string
      }>(route)
      if (!body.customerId || !body.dueDate || !body.items?.length) {
        await fulfillJson(route, 422, { success: false, message: 'missing fields', statusCode: 422 })
        return
      }
      const customer = state.customers.find((x) => x.id === body.customerId)
      if (!customer) {
        await fulfillJson(route, 404, { success: false, message: 'customer not found', statusCode: 404 })
        return
      }
      const items = body.items.map((line, idx) => {
        const vatRate = line.vatRate ?? 7
        const amount = Number(line.quantity) * Number(line.unitPrice)
        return {
          id: `inv-item-${idx + 1}`,
          description: line.description,
          quantity: Number(line.quantity),
          unitPrice: Number(line.unitPrice),
          amount,
          vatRate,
          vatAmount: amount * (vatRate / 100),
        }
      })
      const subtotal = items.reduce((sum, line) => sum + line.amount, 0)
      const vatAmount = items.reduce((sum, line) => sum + line.vatAmount, 0)
      const total = Math.round((subtotal + vatAmount) * 100) / 100
      const created = {
        id: makeLocalId('inv', state.invoices),
        invoiceNumber: `INV-2026-${String(state.invoices.length + 1).padStart(4, '0')}`,
        customerId: customer.id,
        customerName: customer.name,
        issueDate: new Date().toISOString().slice(0, 10),
        dueDate: body.dueDate,
        items,
        subtotal,
        vatAmount,
        whtAmount: 0,
        withholdingAmount: 0,
        totalAmount: total,
        grandTotal: total,
        paidAmount: 0,
        balanceDue: total,
        status: 'draft' as const,
        notes: body.notes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      state.invoices.unshift(created)
      await okJson(route, created, 201)
      return
    }
    if (method === 'GET' && path.match(/^\/finance\/invoices\/[^/]+$/)) {
      const id = path.split('/')[3]
      const row = state.invoices.find((x) => x.id === id)
      if (!row) {
        await fulfillJson(route, 404, { success: false, message: 'Not found', statusCode: 404 })
        return
      }
      await okJson(route, row)
      return
    }
    if (method === 'PATCH' && path.match(/^\/finance\/invoices\/[^/]+\/status$/)) {
      const id = path.split('/')[3]
      const body = parseBody<{ status?: 'sent' | 'cancelled' }>(route)
      const row = state.invoices.find((x) => x.id === id)
      if (!row || !body.status) {
        await fulfillJson(route, 422, { success: false, message: 'invalid status', statusCode: 422 })
        return
      }
      row.status = body.status
      row.updatedAt = new Date().toISOString()
      await okJson(route, row)
      return
    }
    if (method === 'GET' && path.match(/^\/finance\/invoices\/[^/]+\/payments$/)) {
      const id = path.split('/')[3]
      const rows = state.invoicePayments.filter((x) => x.invoiceId === id)
      await okJson(route, rows)
      return
    }
    if (method === 'POST' && path.match(/^\/finance\/invoices\/[^/]+\/payments$/)) {
      const id = path.split('/')[3]
      const body = parseBody<{ paymentDate?: string; amount?: number; paymentMethod?: string; referenceNo?: string }>(route)
      const invoice = state.invoices.find((x) => x.id === id)
      if (!invoice || !body.amount || body.amount <= 0 || !body.paymentDate) {
        await fulfillJson(route, 422, { success: false, message: 'invalid payment', statusCode: 422 })
        return
      }
      if (body.amount > invoice.balanceDue) {
        await fulfillJson(route, 422, { success: false, message: 'amount exceeds balance', statusCode: 422 })
        return
      }
      const payment = {
        id: makeLocalId('invpay', state.invoicePayments),
        invoiceId: id,
        paymentDate: body.paymentDate,
        amount: Number(body.amount),
        paymentMethod: body.paymentMethod ?? 'bank_transfer',
        referenceNo: body.referenceNo,
        createdAt: new Date().toISOString(),
      }
      state.invoicePayments.unshift(payment)
      invoice.paidAmount = Math.round((invoice.paidAmount + payment.amount) * 100) / 100
      invoice.balanceDue = Math.round((invoice.totalAmount - invoice.paidAmount) * 100) / 100
      if (invoice.balanceDue <= 0) {
        invoice.status = 'paid'
        invoice.balanceDue = 0
      }
      await okJson(route, {
        invoiceId: id,
        paidAmount: invoice.paidAmount,
        balanceDue: invoice.balanceDue,
        invoiceStatus: invoice.status,
      })
      return
    }
    if (method === 'GET' && path.match(/^\/finance\/invoices\/[^/]+\/pdf$/)) {
      await route.fulfill({
        status: 200,
        headers: { 'content-type': 'application/pdf' },
        body: '%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>%%EOF',
      })
      return
    }

    // Vendors
    if (method === 'GET' && path === '/finance/vendors/options') {
      const search = (sp.get('search') ?? '').trim()
      const rows = state.vendors
        .filter((x) => x.isActive)
        .filter((x) => (search ? containsText(`${x.code} ${x.name}`, search) : true))
        .map((x) => ({ id: x.id, code: x.code, name: x.name }))
      await okJson(route, rows)
      return
    }
    if (method === 'GET' && path === '/finance/vendors') {
      const search = (sp.get('search') ?? '').trim()
      const active = sp.get('isActive')
      const rows = state.vendors.filter((x) => {
        if (active === 'true' && !x.isActive) return false
        if (active === 'false' && x.isActive) return false
        if (search && !containsText(`${x.code} ${x.name}`, search)) return false
        return true
      })
      const { page: pageNo, perPage } = listPagingFromUrl(url)
      await listJson(route, rows, pageNo, perPage)
      return
    }
    if (method === 'POST' && path === '/finance/vendors') {
      const body = parseBody<{ code?: string; name?: string; taxId?: string; paymentTermDays?: number }>(route)
      if (!body.name?.trim()) {
        await fulfillJson(route, 422, { success: false, message: 'name required', statusCode: 422 })
        return
      }
      const code = body.code?.trim() || `VEND-${String(state.vendors.length + 1).padStart(4, '0')}`
      if (state.vendors.some((x) => x.code === code)) {
        await fulfillJson(route, 409, { success: false, message: 'duplicate code', statusCode: 409 })
        return
      }
      if (body.taxId && state.vendors.some((x) => x.taxId === body.taxId)) {
        await fulfillJson(route, 409, { success: false, message: 'duplicate taxId', statusCode: 409 })
        return
      }
      const created = {
        id: makeLocalId('ven', state.vendors),
        code,
        name: body.name.trim(),
        taxId: body.taxId,
        paymentTermDays: body.paymentTermDays ?? 30,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      state.vendors.unshift(created)
      await okJson(route, created, 201)
      return
    }
    if (method === 'PATCH' && path.match(/^\/finance\/vendors\/[^/]+$/)) {
      const id = path.split('/')[3]
      const body = parseBody<Record<string, unknown>>(route)
      const row = state.vendors.find((x) => x.id === id)
      if (!row) {
        await fulfillJson(route, 404, { success: false, message: 'not found', statusCode: 404 })
        return
      }
      Object.assign(row, body, { updatedAt: new Date().toISOString() })
      await okJson(route, row)
      return
    }
    if (method === 'PATCH' && path.match(/^\/finance\/vendors\/[^/]+\/activate$/)) {
      const id = path.split('/')[3]
      const body = parseBody<{ isActive?: boolean }>(route)
      const row = state.vendors.find((x) => x.id === id)
      if (!row) {
        await fulfillJson(route, 404, { success: false, message: 'not found', statusCode: 404 })
        return
      }
      row.isActive = Boolean(body.isActive)
      row.updatedAt = new Date().toISOString()
      await okJson(route, { id: row.id, isActive: row.isActive })
      return
    }
    if (method === 'DELETE' && path.match(/^\/finance\/vendors\/[^/]+$/)) {
      const id = path.split('/')[3]
      const hasOpenAp = state.apBills.some((bill) => bill.vendorId === id && bill.status !== 'paid')
      if (hasOpenAp) {
        await fulfillJson(route, 422, { success: false, message: 'open AP bills exist', statusCode: 422 })
        return
      }
      const idx = state.vendors.findIndex((x) => x.id === id)
      if (idx >= 0) state.vendors.splice(idx, 1)
      await okJson(route, null)
      return
    }

    // AP
    const isApListPath = path === '/finance/ap' || path === '/finance/ap/vendor-invoices'
    const apDetailMatch = path.match(/^\/finance\/ap\/(?:vendor-invoices\/)?[^/]+$/)
    const apStatusMatch = path.match(/^\/finance\/ap\/(?:vendor-invoices\/)?[^/]+\/status$/)
    const apPaymentsMatch = path.match(/^\/finance\/ap\/(?:vendor-invoices\/)?[^/]+\/payments$/)
    const apIdFromPath = () => {
      const seg = path.split('/').filter(Boolean)
      // /finance/ap/{id}, /finance/ap/vendor-invoices/{id}, .../{id}/status, .../{id}/payments
      if (seg[seg.length - 1] === 'status' || seg[seg.length - 1] === 'payments') {
        return seg[seg.length - 2]
      }
      return seg[seg.length - 1]
    }

    if (method === 'GET' && isApListPath) {
      const status = sp.get('status') ?? ''
      const search = (sp.get('search') ?? '').trim()
      const rows = state.apBills.filter((bill) => {
        if (status && bill.status !== status) return false
        if (search && !containsText(`${bill.referenceNumber} ${bill.vendorName} ${bill.vendorInvoiceNumber ?? ''}`, search)) return false
        return true
      })
      const { page: pageNo, perPage } = listPagingFromUrl(url)
      await listJson(route, rows, pageNo, perPage)
      return
    }
    if (method === 'GET' && apDetailMatch && !isApListPath) {
      const id = apIdFromPath()
      const row = state.apBills.find((x) => x.id === id)
      if (!row) {
        await fulfillJson(route, 404, { success: false, message: 'not found', statusCode: 404 })
        return
      }
      await okJson(route, row)
      return
    }
    if (method === 'POST' && isApListPath) {
      const body = parseBody<{
        vendorId?: string
        issueDate?: string
        dueDate?: string
        receivedDate?: string
        subtotal?: number
        vatAmount?: number
        whtAmount?: number
        totalAmount?: number
      }>(route)
      if (!body.vendorId || !body.issueDate || !body.dueDate || !body.receivedDate) {
        await fulfillJson(route, 422, { success: false, message: 'missing fields', statusCode: 422 })
        return
      }
      const vendor = state.vendors.find((x) => x.id === body.vendorId)
      if (!vendor) {
        await fulfillJson(route, 404, { success: false, message: 'vendor not found', statusCode: 404 })
        return
      }
      const created = {
        id: makeLocalId('ap', state.apBills),
        referenceNumber: `AP-2026-${String(state.apBills.length + 1).padStart(4, '0')}`,
        vendorInvoiceNumber: undefined,
        vendorId: vendor.id,
        vendorName: vendor.name,
        vendorCode: vendor.code,
        issueDate: body.issueDate,
        dueDate: body.dueDate,
        receivedDate: body.receivedDate,
        subtotal: Number(body.subtotal ?? 0),
        vatAmount: Number(body.vatAmount ?? 0),
        whtAmount: Number(body.whtAmount ?? 0),
        totalAmount: Number(body.totalAmount ?? 0),
        paidAmount: 0,
        remainingAmount: Number(body.totalAmount ?? 0),
        status: 'pending' as const,
        expenseCategory: 'Other',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      state.apBills.unshift(created)
      await okJson(route, created, 201)
      return
    }
    if (method === 'PATCH' && apStatusMatch) {
      const id = apIdFromPath()
      const body = parseBody<{ action?: 'approve' | 'reject'; reason?: string }>(route)
      const row = state.apBills.find((x) => x.id === id)
      if (!row || !body.action) {
        await fulfillJson(route, 422, { success: false, message: 'invalid action', statusCode: 422 })
        return
      }
      if (body.action === 'approve') row.status = 'approved'
      if (body.action === 'reject') {
        if (!body.reason?.trim()) {
          await fulfillJson(route, 422, { success: false, message: 'reason required', statusCode: 422 })
          return
        }
        row.status = 'rejected'
      }
      row.updatedAt = new Date().toISOString()
      await okJson(route, row)
      return
    }
    if (method === 'POST' && apPaymentsMatch) {
      const id = apIdFromPath()
      const body = parseBody<{ amount?: number; paymentDate?: string; paymentMethod?: string }>(route)
      const row = state.apBills.find((x) => x.id === id)
      if (!row || !body.amount || !body.paymentDate || body.amount <= 0) {
        await fulfillJson(route, 422, { success: false, message: 'invalid payment', statusCode: 422 })
        return
      }
      if (body.amount > row.remainingAmount) {
        await fulfillJson(route, 422, { success: false, message: 'amount exceeds remaining', statusCode: 422 })
        return
      }
      row.paidAmount = Math.round((row.paidAmount + body.amount) * 100) / 100
      row.remainingAmount = Math.round((row.totalAmount - row.paidAmount) * 100) / 100
      if (row.remainingAmount <= 0) {
        row.status = 'paid'
        row.remainingAmount = 0
      }
      row.updatedAt = new Date().toISOString()
      await okJson(route, row)
      return
    }

    // GL and reports
    if (method === 'GET' && path === '/finance/accounts') {
      await okJson(route, state.chartAccounts)
      return
    }
    if (method === 'GET' && path === '/finance/journal-entries') {
      const { page: pageNo, perPage } = listPagingFromUrl(url)
      await listJson(route, state.journalEntries, pageNo, perPage)
      return
    }
    if (method === 'GET' && path === '/finance/reports/summary') {
      const totalRevenue = state.invoices.reduce((s, x) => s + x.totalAmount, 0)
      const totalExpenses = state.apBills.reduce((s, x) => s + x.totalAmount, 0)
      await okJson(route, {
        totalRevenue,
        totalExpenses,
        netProfit: totalRevenue - totalExpenses,
        totalAr: state.invoices.reduce((s, x) => s + x.balanceDue, 0),
        totalAp: state.apBills.reduce((s, x) => s + x.remainingAmount, 0),
      })
      return
    }
    if (method === 'GET' && path === '/finance/reports/ar-aging') {
      const customer = state.customers[0]
      const total = state.invoices.reduce((s, x) => s + x.balanceDue, 0)
      await okJson(route, {
        asOf: sp.get('asOf') ?? new Date().toISOString().slice(0, 10),
        customers: [
          {
            customerId: customer.id,
            customerCode: customer.code,
            customerName: customer.name,
            current: String(total),
            days1To30: '0',
            days31To60: '0',
            days61To90: '0',
            daysOver90: '0',
            total: String(total),
          },
        ],
        totals: {
          current: String(total),
          days1To30: '0',
          days31To60: '0',
          days61To90: '0',
          daysOver90: '0',
          total: String(total),
        },
      })
      return
    }
    if (method === 'GET' && path === '/finance/reports/profit-loss') {
      const totalRevenue = state.invoices.reduce((s, x) => s + x.totalAmount, 0)
      const totalExpense = state.apBills.reduce((s, x) => s + x.totalAmount, 0)
      await okJson(route, {
        period: {
          dateFrom: sp.get('dateFrom') ?? '2026-01-01',
          dateTo: sp.get('dateTo') ?? '2026-12-31',
        },
        revenueLines: [{ accountCode: '4000', accountName: 'Service Revenue', amount: totalRevenue }],
        expenseLines: [{ accountCode: '5000', accountName: 'Operating Expense', amount: totalExpense }],
        totals: { totalRevenue, totalExpense, netIncome: totalRevenue - totalExpense },
      })
      return
    }
    if (method === 'GET' && path === '/finance/reports/balance-sheet') {
      const assets = state.bankAccounts.reduce((s, x) => s + x.currentBalance, 0)
      const liabilities = state.apBills.reduce((s, x) => s + x.remainingAmount, 0)
      const equity = Math.max(0, assets - liabilities)
      await okJson(route, {
        asOf: sp.get('asOf') ?? new Date().toISOString().slice(0, 10),
        assets: [{ accountCode: '1000', accountName: 'Cash', balance: assets }],
        liabilities: [{ accountCode: '2000', accountName: 'Accounts Payable', balance: liabilities }],
        equity: [{ accountCode: '3000', accountName: 'Retained Earnings', balance: equity }],
        totals: { totalAssets: assets, totalLiabilities: liabilities, totalEquity: equity },
      })
      return
    }

    // Bank accounts
    if (method === 'GET' && path === '/finance/bank-accounts') {
      const { page: pageNo, perPage } = listPagingFromUrl(url)
      await listJson(route, state.bankAccounts, pageNo, perPage)
      return
    }
    if (method === 'GET' && path === '/finance/bank-accounts/options') {
      const options = state.bankAccounts
        .filter((x) => x.isActive)
        .map((x) => ({ id: x.id, code: x.code, accountName: x.accountName, bankName: x.bankName }))
      await okJson(route, options)
      return
    }
    if (method === 'GET' && path.match(/^\/finance\/bank-accounts\/[^/]+$/)) {
      const id = path.split('/')[3]
      const row = state.bankAccounts.find((x) => x.id === id)
      if (!row) {
        await fulfillJson(route, 404, { success: false, message: 'not found', statusCode: 404 })
        return
      }
      await okJson(route, {
        ...row,
        accountType: 'current',
        openingBalance: row.currentBalance,
        createdAt: state.nowIso,
        updatedAt: state.nowIso,
      })
      return
    }
    if (method === 'POST' && path === '/finance/bank-accounts') {
      const body = parseBody<{ code?: string; accountName?: string; accountNo?: string; bankName?: string }>(route)
      if (!body.accountName || !body.accountNo || !body.bankName) {
        await fulfillJson(route, 422, { success: false, message: 'missing required fields', statusCode: 422 })
        return
      }
      const code = body.code?.trim() || `BANK-${String(state.bankAccounts.length + 1).padStart(3, '0')}`
      if (state.bankAccounts.some((x) => x.code === code)) {
        await fulfillJson(route, 409, { success: false, message: 'duplicate code', statusCode: 409 })
        return
      }
      const created = {
        id: makeLocalId('bank', state.bankAccounts),
        code,
        accountName: body.accountName,
        accountNo: body.accountNo,
        bankName: body.bankName,
        currentBalance: 0,
        isActive: true,
        currency: 'THB',
      }
      state.bankAccounts.unshift(created)
      state.bankTransactions[created.id] = []
      await okJson(route, { ...created, accountType: 'current', openingBalance: 0, createdAt: state.nowIso, updatedAt: state.nowIso }, 201)
      return
    }
    if (method === 'GET' && path.match(/^\/finance\/bank-accounts\/[^/]+\/transactions$/)) {
      const id = path.split('/')[3]
      const { page: pageNo, perPage } = listPagingFromUrl(url)
      const allRows = state.bankTransactions[id] ?? []
      const pageRows = allRows.slice((pageNo - 1) * perPage, pageNo * perPage)
      const openingBalance = pageRows.length > 0 ? pageRows[pageRows.length - 1].runningBalance - pageRows[pageRows.length - 1].amount : 0
      const closingBalance = pageRows.length > 0 ? pageRows[0].runningBalance : 0
      const totalDeposits = pageRows
        .filter((x) => x.type === 'deposit')
        .reduce((sum, x) => sum + Number(x.amount), 0)
      const totalWithdrawals = pageRows
        .filter((x) => x.type === 'withdrawal')
        .reduce((sum, x) => sum + Number(x.amount), 0)
      await okJson(route, {
        transactions: pageRows,
        meta: {
          page: pageNo,
          perPage,
          total: allRows.length,
          totalPages: Math.max(1, Math.ceil(allRows.length / perPage)),
        },
        summary: {
          openingBalance,
          closingBalance,
          totalDeposits,
          totalWithdrawals,
        },
      })
      return
    }
    if (method === 'POST' && path.match(/^\/finance\/bank-accounts\/[^/]+\/transactions$/)) {
      const id = path.split('/')[3]
      const bank = state.bankAccounts.find((x) => x.id === id)
      const body = parseBody<{ transactionDate?: string; description?: string; type?: string; amount?: number }>(route)
      if (!bank || !body.transactionDate || !body.type || !body.amount || body.amount <= 0) {
        await fulfillJson(route, 422, { success: false, message: 'invalid transaction', statusCode: 422 })
        return
      }
      if (!bank.isActive) {
        await fulfillJson(route, 422, { success: false, message: 'inactive account', statusCode: 422 })
        return
      }
      const signed = body.type === 'withdrawal' ? -Math.abs(body.amount) : Math.abs(body.amount)
      bank.currentBalance = Math.round((bank.currentBalance + signed) * 100) / 100
      const tx = {
        id: makeLocalId('btx', state.bankTransactions[id] ?? []),
        transactionDate: body.transactionDate,
        description: body.description ?? '',
        type: body.type,
        amount: Math.abs(body.amount),
        runningBalance: bank.currentBalance,
        sourceModule: 'manual',
        reconciled: false,
        createdAt: new Date().toISOString(),
      }
      if (!state.bankTransactions[id]) state.bankTransactions[id] = []
      state.bankTransactions[id].unshift(tx)
      await okJson(route, tx, 201)
      return
    }

    // Tax
    if (method === 'GET' && path === '/finance/tax/rates') {
      const { page: pageNo, perPage } = listPagingFromUrl(url)
      await listJson(route, state.taxRates, pageNo, perPage)
      return
    }
    if (method === 'POST' && path === '/finance/tax/rates') {
      const body = parseBody<{ type?: string; code?: string; rate?: number; description?: string }>(route)
      if (!body.type || !body.code || body.rate == null) {
        await fulfillJson(route, 422, { success: false, message: 'missing fields', statusCode: 422 })
        return
      }
      if (state.taxRates.some((x) => x.code === body.code)) {
        await fulfillJson(route, 409, { success: false, message: 'duplicate code', statusCode: 409 })
        return
      }
      const created = {
        id: makeLocalId('tax', state.taxRates),
        type: body.type,
        code: body.code,
        rate: Number(body.rate),
        description: body.description ?? '',
        pndForm: null,
        incomeType: null,
        isActive: true,
        createdAt: new Date().toISOString(),
      }
      state.taxRates.unshift(created)
      await okJson(route, { id: created.id }, 201)
      return
    }
    if (method === 'PATCH' && path.match(/^\/finance\/tax\/rates\/[^/]+$/)) {
      const id = path.split('/')[4]
      const body = parseBody<Record<string, unknown>>(route)
      const row = state.taxRates.find((x) => x.id === id)
      if (!row) {
        await fulfillJson(route, 404, { success: false, message: 'not found', statusCode: 404 })
        return
      }
      Object.assign(row, body)
      await okJson(route, { id: row.id })
      return
    }
    if (method === 'PATCH' && path.match(/^\/finance\/tax\/rates\/[^/]+\/activate$/)) {
      const id = path.split('/')[4]
      const body = parseBody<{ isActive?: boolean }>(route)
      const row = state.taxRates.find((x) => x.id === id)
      if (!row) {
        await fulfillJson(route, 404, { success: false, message: 'not found', statusCode: 404 })
        return
      }
      row.isActive = Boolean(body.isActive)
      await okJson(route, { id: row.id, isActive: row.isActive })
      return
    }
    if (method === 'GET' && path === '/finance/tax/vat-summary') {
      await okJson(route, {
        period: `${sp.get('year') ?? '2026'}-${String(sp.get('month') ?? '04').padStart(2, '0')}`,
        outputVat: 10500,
        inputVat: 3500,
        netVatPayable: 7000,
        invoiceCount: state.invoices.length,
        apBillCount: state.apBills.length,
      })
      return
    }
    if (method === 'GET' && path === '/finance/tax/wht-certificates') {
      const { page: pageNo, perPage } = listPagingFromUrl(url)
      await listJson(route, [], pageNo, perPage)
      return
    }
    if (method === 'GET' && path === '/finance/tax/pnd-report') {
      await okJson(route, {
        form: sp.get('form') ?? '53',
        period: `${sp.get('year') ?? '2026'}-${String(sp.get('month') ?? '04').padStart(2, '0')}`,
        summary: { totalBase: 0, totalWht: 0, lineCount: 0 },
        lines: [],
      })
      return
    }

    // Quotations
    if (method === 'GET' && path === '/finance/quotations') {
      const status = sp.get('status') ?? ''
      const rows = state.quotations.filter((q) => (status ? q.status === status : true))
      const { page: pageNo, perPage } = listPagingFromUrl(url)
      await listJson(route, rows, pageNo, perPage)
      return
    }
    if (method === 'POST' && path === '/finance/quotations') {
      const body = parseBody<{ customerId?: string; validUntil?: string; issueDate?: string; items?: Array<{ description: string; quantity: number; unitPrice: number; vatRate?: number }> }>(route)
      if (!body.customerId || !body.validUntil || !body.issueDate || !body.items?.length) {
        await fulfillJson(route, 422, { success: false, message: 'missing fields', statusCode: 422 })
        return
      }
      const customer = state.customers.find((x) => x.id === body.customerId)
      if (!customer) {
        await fulfillJson(route, 404, { success: false, message: 'customer not found', statusCode: 404 })
        return
      }
      const subtotal = body.items.reduce((s, x) => s + x.quantity * x.unitPrice, 0)
      const vatAmount = subtotal * 0.07
      const created = {
        id: makeLocalId('qt', state.quotations),
        quotNo: `QT-2026-${String(state.quotations.length + 1).padStart(4, '0')}`,
        customerId: customer.id,
        customerCode: customer.code,
        customerName: customer.name,
        issueDate: body.issueDate,
        validUntil: body.validUntil,
        subtotalBeforeVat: subtotal,
        vatAmount,
        totalAmount: subtotal + vatAmount,
        status: 'draft' as const,
        updatedAt: new Date().toISOString(),
        items: body.items.map((item, idx) => ({
          id: `qti-${idx + 1}`,
          itemNo: idx + 1,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.quantity * item.unitPrice,
          vatRate: item.vatRate ?? 7,
        })),
      }
      state.quotations.unshift(created)
      await okJson(route, { id: created.id, quotNo: created.quotNo, status: created.status }, 201)
      return
    }
    if (method === 'GET' && path.match(/^\/finance\/quotations\/[^/]+$/)) {
      const id = path.split('/')[3]
      const row = state.quotations.find((x) => x.id === id)
      if (!row) {
        await fulfillJson(route, 404, { success: false, message: 'not found', statusCode: 404 })
        return
      }
      await okJson(route, { ...row, notes: '', termsAndConditions: '', createdBy: 'admin', createdAt: row.updatedAt, customerSnapshot: { code: row.customerCode ?? '', name: row.customerName } })
      return
    }
    if (method === 'PATCH' && path.match(/^\/finance\/quotations\/[^/]+\/status$/)) {
      const id = path.split('/')[3]
      const body = parseBody<{ status?: 'sent' | 'accepted' | 'rejected' }>(route)
      const row = state.quotations.find((x) => x.id === id)
      if (!row || !body.status) {
        await fulfillJson(route, 422, { success: false, message: 'invalid status', statusCode: 422 })
        return
      }
      row.status = body.status
      row.updatedAt = new Date().toISOString()
      await okJson(route, row)
      return
    }
    if (method === 'POST' && path.match(/^\/finance\/quotations\/[^/]+\/convert-to-so$/)) {
      const id = path.split('/')[3]
      const quote = state.quotations.find((x) => x.id === id)
      if (!quote) {
        await fulfillJson(route, 404, { success: false, message: 'not found', statusCode: 404 })
        return
      }
      if (quote.status !== 'accepted' && quote.status !== 'sent') {
        await fulfillJson(route, 422, { success: false, message: 'invalid status transition', statusCode: 422 })
        return
      }
      quote.status = 'accepted'
      const so = {
        id: makeLocalId('so', state.salesOrders),
        soNo: `SO-2026-${String(state.salesOrders.length + 1).padStart(4, '0')}`,
        customerId: quote.customerId,
        customerCode: quote.customerCode,
        customerName: quote.customerName,
        orderDate: new Date().toISOString().slice(0, 10),
        deliveryDate: quote.validUntil,
        subtotalBeforeVat: quote.subtotalBeforeVat,
        vatAmount: quote.vatAmount,
        totalAmount: quote.totalAmount,
        status: 'draft' as const,
        updatedAt: new Date().toISOString(),
        quotationId: quote.id,
        items: quote.items.map((item) => ({
          id: `soi-${item.itemNo}`,
          itemNo: item.itemNo,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal,
          vatRate: item.vatRate,
          invoicedQty: 0,
          remainingQty: item.quantity,
        })),
        linkedInvoices: [],
      }
      quote.salesOrderId = so.id
      state.salesOrders.unshift(so)
      await okJson(route, { salesOrderId: so.id, salesOrderNo: so.soNo })
      return
    }

    // Sales orders
    if (method === 'GET' && path === '/finance/sales-orders') {
      const status = sp.get('status') ?? ''
      const rows = state.salesOrders.filter((x) => (status ? x.status === status : true))
      const { page: pageNo, perPage } = listPagingFromUrl(url)
      await listJson(route, rows, pageNo, perPage)
      return
    }
    if (method === 'POST' && path === '/finance/sales-orders') {
      const body = parseBody<{ customerId?: string; orderDate?: string; items?: Array<{ description: string; quantity: number; unitPrice: number; vatRate?: number }> }>(route)
      if (!body.customerId || !body.orderDate || !body.items?.length) {
        await fulfillJson(route, 422, { success: false, message: 'missing fields', statusCode: 422 })
        return
      }
      const customer = state.customers.find((x) => x.id === body.customerId)
      if (!customer) {
        await fulfillJson(route, 404, { success: false, message: 'customer not found', statusCode: 404 })
        return
      }
      const subtotal = body.items.reduce((s, x) => s + x.quantity * x.unitPrice, 0)
      const vat = subtotal * 0.07
      const created = {
        id: makeLocalId('so', state.salesOrders),
        soNo: `SO-2026-${String(state.salesOrders.length + 1).padStart(4, '0')}`,
        customerId: customer.id,
        customerCode: customer.code,
        customerName: customer.name,
        orderDate: body.orderDate,
        deliveryDate: undefined,
        subtotalBeforeVat: subtotal,
        vatAmount: vat,
        totalAmount: subtotal + vat,
        status: 'draft' as const,
        updatedAt: new Date().toISOString(),
        items: body.items.map((item, idx) => ({
          id: `soi-${idx + 1}`,
          itemNo: idx + 1,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.quantity * item.unitPrice,
          vatRate: item.vatRate ?? 7,
          invoicedQty: 0,
          remainingQty: item.quantity,
        })),
        linkedInvoices: [],
      }
      state.salesOrders.unshift(created)
      await okJson(route, { id: created.id, soNo: created.soNo }, 201)
      return
    }
    if (method === 'GET' && path.match(/^\/finance\/sales-orders\/[^/]+$/)) {
      const id = path.split('/')[3]
      const row = state.salesOrders.find((x) => x.id === id)
      if (!row) {
        await fulfillJson(route, 404, { success: false, message: 'not found', statusCode: 404 })
        return
      }
      await okJson(route, row)
      return
    }
    if (method === 'PATCH' && path.match(/^\/finance\/sales-orders\/[^/]+\/status$/)) {
      const id = path.split('/')[3]
      const body = parseBody<{ status?: 'confirmed' | 'cancelled' }>(route)
      const row = state.salesOrders.find((x) => x.id === id)
      if (!row || !body.status) {
        await fulfillJson(route, 422, { success: false, message: 'invalid status', statusCode: 422 })
        return
      }
      row.status = body.status
      row.updatedAt = new Date().toISOString()
      await okJson(route, row)
      return
    }
    if (method === 'POST' && path.match(/^\/finance\/sales-orders\/[^/]+\/convert-to-invoice$/)) {
      const id = path.split('/')[3]
      const so = state.salesOrders.find((x) => x.id === id)
      if (!so || (so.status !== 'confirmed' && so.status !== 'partially_invoiced')) {
        await fulfillJson(route, 422, { success: false, message: 'invalid status transition', statusCode: 422 })
        return
      }
      const createdInvoice = {
        id: makeLocalId('inv', state.invoices),
        invoiceNumber: `INV-2026-${String(state.invoices.length + 1).padStart(4, '0')}`,
        customerId: so.customerId,
        customerName: so.customerName,
        issueDate: new Date().toISOString().slice(0, 10),
        dueDate: new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10),
        items: so.items.map((item) => ({
          id: `inv-item-${item.itemNo}`,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: item.lineTotal,
          vatRate: item.vatRate,
          vatAmount: item.lineTotal * (item.vatRate / 100),
        })),
        subtotal: so.subtotalBeforeVat,
        vatAmount: so.vatAmount,
        whtAmount: 0,
        withholdingAmount: 0,
        totalAmount: so.totalAmount,
        grandTotal: so.totalAmount,
        paidAmount: 0,
        balanceDue: so.totalAmount,
        status: 'sent' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      state.invoices.unshift(createdInvoice)
      so.status = 'invoiced'
      so.linkedInvoices.push({
        id: createdInvoice.id,
        invoiceNo: createdInvoice.invoiceNumber,
        status: createdInvoice.status,
        totalAmount: createdInvoice.totalAmount,
      })
      await okJson(route, {
        invoiceId: createdInvoice.id,
        invoiceNo: createdInvoice.invoiceNumber,
        salesOrderId: so.id,
        salesOrderStatus: so.status,
      })
      return
    }

    // Purchase orders (read-only for feasible smoke)
    if (method === 'GET' && path === '/finance/purchase-orders') {
      const status = sp.get('status') ?? ''
      const rows = state.purchaseOrders.filter((x) => (status ? x.status === status : true))
      const { page: pageNo, perPage } = listPagingFromUrl(url)
      await listJson(route, rows, pageNo, perPage)
      return
    }

    await route.continue()
  })
}
