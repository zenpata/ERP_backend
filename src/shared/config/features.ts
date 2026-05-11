import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const CONFIG_PATH = join(process.cwd(), '..', 'features.config.json')

export type ModuleName = 'hr' | 'finance' | 'pm' | 'dashboard' | 'notifications' | 'settings'

export type ModuleConfig = { enabled: boolean; label: string }

export type FeaturesConfig = { modules: Record<ModuleName, ModuleConfig> }

const raw = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8')) as FeaturesConfig

export const features: FeaturesConfig = raw

export function isEnabled(name: ModuleName): boolean {
  return features.modules[name]?.enabled ?? false
}

export function moduleFromPermission(code: string): ModuleName | null {
  if (code.startsWith('finance:') || code.startsWith('inventory:')) return 'finance'
  if (code.startsWith('hr:')) return 'hr'
  if (code.startsWith('pm:')) return 'pm'
  if (code.startsWith('system:')) return 'settings'
  return null
}
