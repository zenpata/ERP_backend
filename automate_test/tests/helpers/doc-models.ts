import type { TestInfo } from '@playwright/test'

export type DocCaseKind = 'scenario' | 'testcase'

export type DocCaseRef = {
  kind: DocCaseKind
  id: string
  title: string
  documentPath: string
}

export type SpecGapNote = {
  ref: DocCaseRef
  reason: string
}

export type ScenarioActor = 'super_admin' | 'hr_admin' | 'pm_manager' | 'finance_manager' | 'employee'

export type ScenarioActorSession = {
  actor: ScenarioActor
  email: string
  password: string
  displayName: string
}

export function annotateDocCase(testInfo: TestInfo, ref: DocCaseRef) {
  testInfo.annotations.push({
    type: 'doc_ref',
    description: `${ref.kind}:${ref.id} | ${ref.title} | ${ref.documentPath}`,
  })
}

export function annotateSpecGap(testInfo: TestInfo, note: SpecGapNote) {
  testInfo.annotations.push({
    type: 'spec-gap',
    description: `${note.ref.id} | ${note.ref.title} | ${note.reason}`,
  })
}

