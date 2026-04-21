import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { test as base } from '@playwright/test'
import type { CDPSession, Page } from '@playwright/test'

/**
 * Chromium CDP `Page.startScreencast` — viewport frames as JPEG sequence.
 * Enable with: `ENABLE_CDP_SCREENCAST=1 npm test`
 *
 * Playwright also writes WebM per test via `use.video` → `recordings/test-output/<run-folder>/`.
 * `./reporters/rename-video.ts` เปลี่ยนชื่อไฟล์เป็น `<ชื่อเทส>.webm` หลังจบรัน (อย่าใส่ `--reporter=...` แทนที่ทั้ง config ถ้าต้องการ rename นี้).
 */
export type CdpScreencastFixture = {
  startCdpScreencast: (page: Page) => Promise<void>
  stopCdpScreencast: () => Promise<void>
}

export const test = base.extend<{ cdpScreencast: CdpScreencastFixture }>({
  cdpScreencast: async ({}, use, testInfo) => {
    type State = {
      client: CDPSession
      outDir: string
      onFrame: (params: { data: string; sessionId: number }) => Promise<void>
    }

    let state: State | null = null

    const fixture: CdpScreencastFixture = {
      startCdpScreencast: async (page: Page) => {
        if (process.env.ENABLE_CDP_SCREENCAST !== '1') return

        const slug = testInfo.title.replace(/[^a-zA-Z0-9-_]+/g, '_').slice(0, 100)
        const rootDir = testInfo.config.configFile
          ? path.dirname(testInfo.config.configFile)
          : process.cwd()
        const outDir = path.join(rootDir, 'recordings', 'cdp-screencast', slug)
        await fs.mkdir(outDir, { recursive: true })

        const client = await page.context().newCDPSession(page)
        const frameCounter = { n: 0 }

        const onFrame = async (params: { data: string; sessionId: number }) => {
          const buf = Buffer.from(params.data, 'base64')
          const file = path.join(outDir, `frame-${String(frameCounter.n).padStart(5, '0')}.jpg`)
          frameCounter.n += 1
          await fs.writeFile(file, buf)
          await client.send('Page.screencastFrameAck', { sessionId: params.sessionId })
        }

        client.on('Page.screencastFrame', onFrame)
        await client.send('Page.startScreencast', {
          format: 'jpeg',
          quality: 72,
          maxWidth: 1280,
          maxHeight: 720,
          everyNthFrame: 2,
        })

        state = { client, outDir, onFrame }
      },

      stopCdpScreencast: async () => {
        if (process.env.ENABLE_CDP_SCREENCAST !== '1' || !state) return
        const { client, outDir, onFrame } = state
        state = null
        try {
          await client.send('Page.stopScreencast')
        } catch {
          /* ignore */
        }
        client.off('Page.screencastFrame', onFrame)
        const stitchReadme = path.join(outDir, 'STITCH.txt')
        await fs.writeFile(
          stitchReadme,
          [
            'CDP screencast JPEG sequence (Chromium DevTools Protocol).',
            'To build an MP4 (requires ffmpeg in PATH):',
            '',
            `cd "${outDir}" && ffmpeg -y -framerate 12 -pattern_type glob -i 'frame-*.jpg' -c:v libx264 -pix_fmt yuv420p screencast.mp4`,
            '',
          ].join('\n'),
          'utf8',
        )
      },
    }

    await use(fixture)
    await fixture.stopCdpScreencast()
  },
})

export const expect = test.expect
