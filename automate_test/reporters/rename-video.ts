import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import type { FullConfig, FullResult, Reporter, Suite, TestCase, TestResult } from '@playwright/test/reporter'

/** ชื่อไฟล์ที่ใช้บน disk — ใช้ชื่อเทส (`test.title`) ตัดอักขระที่ OS ไม่รองรับ */
function fileSafeTestName(test: TestCase): string {
  const raw = test.title.trim()
  const cleaned = raw.replace(/[/\\:*?"<>|]/g, '-').replace(/\s+/g, ' ')
  const base = cleaned.length > 0 ? cleaned : test.id
  return `${base}.webm`
}

function findVideoAttachment(result: TestResult) {
  return result.attachments.find(
    (a) => a.path && (a.name === 'video' || a.contentType === 'video/webm'),
  )
}

/**
 * หลังจบรันเทสทั้งหมด Playwright ใส่ path ของ `video.webm` ใน `result.attachments` แล้ว
 * reporter นี้เปลี่ยนชื่อไฟล์เป็น `<ชื่อเทส>.webm` ในโฟลเดอร์ output เดิมของแต่ละเทส
 */
export default class RenameVideoReporter implements Reporter {
  private rootSuite: Suite | undefined

  onBegin(_config: FullConfig, suite: Suite) {
    this.rootSuite = suite
  }

  printsToStdio(): boolean {
    return false
  }

  async onEnd(_result: FullResult) {
    if (!this.rootSuite) return

    for (const test of this.rootSuite.allTests()) {
      for (const tr of test.results) {
        const attachment = findVideoAttachment(tr)
        if (!attachment?.path) continue

        const dest = path.join(path.dirname(attachment.path), fileSafeTestName(test))
        if (path.resolve(attachment.path) === path.resolve(dest)) continue

        try {
          await fs.rename(attachment.path, dest)
        } catch {
          /* ไม่มีไฟล์ หรือถูกย้ายไปแล้ว */
        }
      }
    }
  }
}
