/**
 * TSN Docs Generator
 *
 * Reads the extracted JSON from extract-docs.ts and generates a clean
 * markdown docs hierarchy. Filters out compiler internals, keeps only
 * user-facing language and stdlib reference.
 *
 * Usage:
 *   npx tsx tools/extract-docs.ts --stdlib --codegen | npx tsx tools/generate-docs.ts
 *   npx tsx tools/generate-docs.ts < docs.json
 *   npx tsx tools/generate-docs.ts --out docs/generated
 */

import * as fs from 'node:fs'
import * as path from 'node:path'

// ---------------------------------------------------------------------------
// Types (mirrors extract-docs output)
// ---------------------------------------------------------------------------

interface DocEntry {
  kind: string
  name: string
  page: string
  section: string
  description: string
  params: Array<{ name: string; type: string; description: string; optional: boolean; defaultValue?: string }>
  returns: { type: string; description: string } | null
  signature: string
  syntax: string
  compilesTo: string
  limitations: string[]
  examples: string[]
  since: string
  complexity: string
  zeroAlloc: boolean
  deprecated: boolean
  sourceFile: string
  line: number
}

interface DocPage {
  path: string
  sections: Record<string, DocEntry[]>
}

interface DocOutput {
  version: string
  extractedAt: string
  pages: Record<string, DocPage>
}

// ---------------------------------------------------------------------------
// Filtering — skip compiler internals
// ---------------------------------------------------------------------------

const INTERNAL_KINDS = new Set(['interface', 'property'])
const INTERNAL_NAME_PATTERNS = [
  /Context$/,           // StatementEmitterContext, ExprEmitterContext, etc.
  /^_/,                 // private helpers
]

function isUserFacing(entry: DocEntry): boolean {
  // Must have a description to be worth documenting
  if (!entry.description && !entry.syntax && !entry.compilesTo) return false

  // Codegen entries (page starts with "language/") must have explicit @page + @section
  // to prove they're intentionally user-facing. Without both, they're compiler internals.
  if (entry.sourceFile.includes('/codegen/') && (!entry.page || !entry.section)) return false

  // Skip context interfaces and their members
  for (const pat of INTERNAL_NAME_PATTERNS) {
    if (pat.test(entry.name)) return false
    if (entry.name.includes('.') && pat.test(entry.name.split('.')[0])) return false
  }

  return true
}

// ---------------------------------------------------------------------------
// Page title mapping
// ---------------------------------------------------------------------------

const PAGE_TITLES: Record<string, string> = {
  'language/control-flow': 'Control Flow',
  'language/variables': 'Variables & Declarations',
  'language/types': 'Type System',
  'language/operators': 'Operators & Expressions',
  'language/functions': 'Functions',
  'language/classes': 'Classes',
  'language/exceptions': 'Error Handling',
  'language/async': 'Async / Await',
  'language/modules': 'Modules & Imports',
  'stdlib/strings': 'String Methods',
  'stdlib/arrays': 'Array Methods',
  'stdlib/fs': 'File System (@tsn/fs)',
  'stdlib/http': 'HTTP (@tsn/http)',
  'stdlib/console': 'Console',
  'stdlib/math': 'Math',
  'stdlib/json': 'JSON',
  'stdlib/timers': 'Timers',
  'runtime/memory': 'Memory Model',
  'runtime/targets': 'Build Targets',
}

function pageTitle(pagePath: string): string {
  return PAGE_TITLES[pagePath] ?? pagePath.split('/').pop()?.replace(/-/g, ' ') ?? pagePath
}

// ---------------------------------------------------------------------------
// Markdown generation
// ---------------------------------------------------------------------------

/** Is this a language reference entry (vs stdlib API)? */
function isLanguagePage(entry: DocEntry): boolean {
  return entry.page.startsWith('language/')
}

/** Is this a user-facing param (not a compiler context)? */
function isUserParam(p: { name: string; type: string }): boolean {
  return !p.type.includes('Context') && !p.type.includes('ts.') && !p.type.includes('string[]')
}

function renderEntry(entry: DocEntry): string {
  const lines: string[] = []
  const isLang = isLanguagePage(entry)

  // Section heading
  const heading = entry.section || entry.name
  lines.push(`### ${heading}`)
  lines.push('')

  // Description
  if (entry.description) {
    lines.push(entry.description)
    lines.push('')
  }

  // Syntax (language pages show this prominently)
  if (entry.syntax) {
    lines.push('**Syntax:**')
    // Split pipe-separated syntax variants into separate lines
    const variants = entry.syntax.split(' | ').map(s => s.trim())
    if (variants.length > 1) {
      lines.push('```typescript')
      for (const v of variants) lines.push(v)
      lines.push('```')
    } else {
      lines.push('```typescript')
      lines.push(entry.syntax)
      lines.push('```')
    }
    lines.push('')
  }

  // Signature — only for stdlib API functions, not language constructs
  if (!isLang && entry.signature && (entry.kind === 'function' || entry.kind === 'method')) {
    lines.push('**Signature:**')
    lines.push('```typescript')
    lines.push(entry.signature)
    lines.push('```')
    lines.push('')
  }

  // Parameters — only user-facing params (skip compiler contexts)
  const userParams = entry.params.filter(isUserParam)
  if (userParams.length > 0) {
    lines.push('**Parameters:**')
    lines.push('')
    lines.push('| Name | Type | Description |')
    lines.push('|------|------|-------------|')
    for (const p of userParams) {
      const opt = p.optional ? ' (optional)' : ''
      const def = p.defaultValue ? ` Default: \`${p.defaultValue}\`` : ''
      lines.push(`| \`${p.name}\` | \`${p.type}\`${opt} | ${p.description}${def} |`)
    }
    lines.push('')
  }

  // Returns — only for stdlib
  if (!isLang && entry.returns && entry.returns.type !== 'void') {
    const desc = entry.returns.description ? ` — ${entry.returns.description}` : ''
    lines.push(`**Returns:** \`${entry.returns.type}\`${desc}`)
    lines.push('')
  }

  // Compiles to (language pages — shows the C mapping)
  if (entry.compilesTo) {
    lines.push('**Compiles to:**')
    lines.push(entry.compilesTo)
    lines.push('')
  }

  // Limitations
  if (entry.limitations.length > 0) {
    lines.push('**Limitations:**')
    for (const lim of entry.limitations) {
      lines.push(`- ${lim}`)
    }
    lines.push('')
  }

  // Examples
  if (entry.examples.length > 0) {
    lines.push(entry.examples.length === 1 ? '**Example:**' : '**Examples:**')
    for (const ex of entry.examples) {
      lines.push('```typescript')
      lines.push(ex)
      lines.push('```')
    }
    lines.push('')
  }

  // Metadata line
  const meta: string[] = []
  if (entry.complexity) meta.push(`Complexity: ${entry.complexity}`)
  if (entry.zeroAlloc) meta.push('Zero allocation')
  if (entry.since) meta.push(`Since ${entry.since}`)
  if (entry.deprecated) meta.push('**DEPRECATED**')
  if (meta.length > 0) {
    lines.push(`> ${meta.join(' | ')}`)
    lines.push('')
  }

  lines.push('---')
  lines.push('')

  return lines.join('\n')
}

function renderPage(pagePath: string, page: DocPage): string {
  const lines: string[] = []

  lines.push(`# ${pageTitle(pagePath)}`)
  lines.push('')

  // Collect user-facing entries grouped by section
  const sections = new Map<string, DocEntry[]>()
  for (const [sectionKey, entries] of Object.entries(page.sections)) {
    const filtered = entries.filter(isUserFacing)
    if (filtered.length > 0) {
      // Use the section from the first entry, or the key
      const sectionName = filtered[0].section || sectionKey
      if (!sections.has(sectionName)) sections.set(sectionName, [])
      sections.get(sectionName)!.push(...filtered)
    }
  }

  if (sections.size === 0) return ''

  // TOC
  if (sections.size > 3) {
    lines.push('## Contents')
    lines.push('')
    for (const [sectionName] of sections) {
      const anchor = sectionName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      lines.push(`- [${sectionName}](#${anchor})`)
    }
    lines.push('')
  }

  // Sections
  for (const [, entries] of sections) {
    for (const entry of entries) {
      lines.push(renderEntry(entry))
    }
  }

  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// Sidebar / index generation
// ---------------------------------------------------------------------------

function renderIndex(pages: Record<string, DocPage>): string {
  const lines: string[] = []

  lines.push('# TSN Documentation')
  lines.push('')
  lines.push('Generated from inline source comments. This is the single source of truth.')
  lines.push('')

  // Group pages by category
  const categories: Record<string, string[]> = {}
  for (const pagePath of Object.keys(pages)) {
    const [category] = pagePath.split('/')
    if (!categories[category]) categories[category] = []
    categories[category].push(pagePath)
  }

  const categoryTitles: Record<string, string> = {
    language: 'Language Reference',
    stdlib: 'Standard Library',
    runtime: 'Runtime',
    guides: 'Guides',
  }

  for (const [category, pagePaths] of Object.entries(categories)) {
    lines.push(`## ${categoryTitles[category] ?? category}`)
    lines.push('')
    lines.push('| Page | Description |')
    lines.push('|------|-------------|')
    for (const pagePath of pagePaths.sort()) {
      const file = pagePath.replace(/\//g, '-') + '.md'
      const page = pages[pagePath]
      const userEntries = Object.values(page.sections).flat().filter(isUserFacing)
      const desc = userEntries.length > 0 ? `${userEntries.length} entries` : 'No entries'
      lines.push(`| [${pageTitle(pagePath)}](./${file}) | ${desc} |`)
    }
    lines.push('')
  }

  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function main(): void {
  const args = process.argv.slice(2)
  let outDir = 'docs/generated'

  const outIdx = args.indexOf('--out')
  if (outIdx !== -1 && args[outIdx + 1]) {
    outDir = args[outIdx + 1]
  }

  // Read JSON from stdin
  const input = fs.readFileSync('/dev/stdin', 'utf8')
  const data: DocOutput = JSON.parse(input)

  fs.mkdirSync(outDir, { recursive: true })

  let totalEntries = 0
  let totalPages = 0

  for (const [pagePath, page] of Object.entries(data.pages)) {
    const md = renderPage(pagePath, page)
    if (!md) continue

    const fileName = pagePath.replace(/\//g, '-') + '.md'
    fs.writeFileSync(path.join(outDir, fileName), md)
    totalPages++

    const count = Object.values(page.sections).flat().filter(isUserFacing).length
    totalEntries += count
    process.stderr.write(`  ${pagePath} → ${fileName} (${count} entries)\n`)
  }

  // Write index
  const index = renderIndex(data.pages)
  fs.writeFileSync(path.join(outDir, 'index.md'), index)

  process.stderr.write(`\nGenerated ${totalPages} pages with ${totalEntries} entries → ${outDir}/\n`)
}

main()
