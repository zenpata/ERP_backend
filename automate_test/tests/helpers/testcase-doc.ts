import fs from 'node:fs'
import path from 'node:path'

export type TestcaseDoc = {
  code: string
  absolutePath: string
  titles: string[]
}

function parseMarkdownTableTitles(content: string): string[] {
  const lines = content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('|'))

  // Table layout: | folder | jira | title | ...
  return lines
    .slice(2)
    .map((line) => line.split('|').map((part) => part.trim()))
    .map((cols) => cols[3] ?? '')
    .filter(Boolean)
}

export function loadTestcaseDocs(projectRoot: string): TestcaseDoc[] {
  const testcaseDir = path.join(projectRoot, 'Documents', 'Testcase')
  const files = fs
    .readdirSync(testcaseDir)
    .filter((name) => /^(R1|R2)-\d{2}_testcases\.md$/.test(name))
    .sort()

  return files.map((file) => {
    const code = file.split('_')[0]
    const absolutePath = path.join(testcaseDir, file)
    const raw = fs.readFileSync(absolutePath, 'utf8')
    return {
      code,
      absolutePath,
      titles: parseMarkdownTableTitles(raw),
    }
  })
}

