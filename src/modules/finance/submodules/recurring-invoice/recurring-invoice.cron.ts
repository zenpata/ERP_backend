import { RecurringInvoiceService } from './recurring-invoice.service'

// ============================================================
// recurring-invoice.cron.ts — Daily recurring invoice job
// Scheduled: 02:00 UTC daily (integrates into scheduler)
// ============================================================

export async function runRecurringInvoiceJob(): Promise<void> {
  try {
    const count = await RecurringInvoiceService.runDailyJob()
    console.log(`[RECURRING-INVOICE] Created ${count} invoice(s) from templates`)
  } catch (err) {
    console.error('[RECURRING-INVOICE] Job failed:', err)
  }
}
