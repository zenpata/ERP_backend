import { ApVendorInvoiceService } from './submodules/ap/ap-vendor-invoice.service'

const DEFAULT_MS = 86_400_000

function formatSchedulerError(err: unknown): string {
  if (!(err instanceof Error)) return String(err)
  const any = err as Error & { cause?: unknown }
  if (any.cause instanceof Error) {
    // DrizzleQueryError wraps DB/network errors in `cause`
    return any.cause.message
  }
  const m = err.message
  if (m.length > 200) return `${m.slice(0, 200)}…`
  return m
}

/**
 * Runs AP overdue transition (approved + past due in Asia/Bangkok) on an interval.
 * Override interval with AP_OVERDUE_INTERVAL_MS (e.g. 60000 for dev).
 * Set AP_OVERDUE_SCHEDULER=false to skip (e.g. when Postgres is not up yet).
 */
export function startApOverdueScheduler(): void {
  const disabled = (process.env['AP_OVERDUE_SCHEDULER'] ?? 'true').toLowerCase() === 'false'
  if (disabled) {
    console.log('[ap-overdue] scheduler disabled (AP_OVERDUE_SCHEDULER=false)')
    return
  }

  const ms = Number(process.env['AP_OVERDUE_INTERVAL_MS'] ?? DEFAULT_MS)
  const run = () => {
    ApVendorInvoiceService.markOverdueForBangkokToday()
      .then((n) => {
        if (n > 0) console.log(`[ap-overdue] marked ${n} invoice(s) overdue`)
      })
      .catch((e) => {
        const msg = formatSchedulerError(e)
        console.error(
          `[ap-overdue] skipped tick: ${msg} — check DATABASE_URL, Postgres is running, and migrations are applied`
        )
      })
  }
  // Defer first tick so listen() logs first; avoids noisy stack during compose/db cold start.
  setTimeout(run, 1500)
  setInterval(run, ms)
}
