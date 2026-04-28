import type { Page } from '@playwright/test'
import type { MockErpState } from '../realistic-data'
import { installFinanceMockRouter } from './finance-router'
import { installHrMockRouter } from './hr-router'
import { installPmMockRouter } from './pm-router'
import { installSettingsMockRouter } from './settings-router'

export async function installAllModuleMockRouters(page: Page, state: MockErpState) {
  // Register module routers together for deterministic, full-app testcase runs.
  await installHrMockRouter(page, state)
  await installFinanceMockRouter(page, state)
  await installPmMockRouter(page, state)
  await installSettingsMockRouter(page, state)
}

