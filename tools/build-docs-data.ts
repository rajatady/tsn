/**
 * TSN Docs Data Builder
 *
 * Single build step that produces docs/site/src/data/docs.json.
 * Combines hand-authored markdown and auto-generated stdlib/codegen docs
 * into one static JSON file that Next.js imports at build time.
 *
 * Usage:
 *   npx tsx tools/build-docs-data.ts
 *
 * Run this before `next build` or `next dev`. The site has zero
 * filesystem calls — everything comes from the imported JSON.
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import { execSync } from 'node:child_process'

// ---------------------------------------------------------------------------
// Types — these mirror what the Next.js app expects
// ---------------------------------------------------------------------------

interface SiteDocPage {
  slug: string
  title: string         // derived from first # heading in markdown
  category: string      // e.g. "language", "stdlib", "runtime"
  content: string       // full markdown content
}

interface SiteDocsData {
  buildTime: string
  pages: SiteDocPage[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ROOT = path.resolve(import.meta.dirname, '..')
const DOCS_DIR = path.join(ROOT, 'docs')
const GENERATED_DIR = path.join(ROOT, 'docs/generated')
const OUTPUT = path.join(ROOT, 'docs/site/src/data/docs.json')

function readMd(filepath: string): string {
  try { return fs.readFileSync(filepath, 'utf-8') } catch { return '' }
}

/** Extract title from first `# Heading` line in markdown */
function titleFromMarkdown(content: string): string {
  const match = content.match(/^#\s+(.+)$/m)
  return match ? match[1].trim() : 'Untitled'
}

/** Derive category from slug prefix or directory context */
function categoryFromSlug(slug: string, source: 'hand' | 'generated'): string {
  if (source === 'generated') {
    const prefix = slug.split('-')[0]
    if (['stdlib', 'language', 'runtime'].includes(prefix)) return prefix
  }
  // Hand-authored: infer from content or use a simple mapping
  // These will shrink as generated docs replace them
  if (['language', 'stdlib'].includes(slug)) return slug
  if (['runtime', 'pipeline'].includes(slug)) return 'runtime'
  if (['tooling'].includes(slug)) return 'tooling'
  if (['examples'].includes(slug)) return 'guides'
  return 'other'
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

function build(): void {
  const pages: SiteDocPage[] = []

  // 1. Run the extraction + generation pipeline
  process.stderr.write('Extracting inline docs from source...\n')
  try {
    execSync(
      `npx tsx tools/extract-docs.ts --stdlib --codegen | npx tsx tools/generate-docs.ts`,
      { cwd: ROOT, stdio: ['pipe', 'pipe', 'inherit'] }
    )
  } catch (e) {
    process.stderr.write('Warning: doc generation failed, continuing with existing generated files\n')
  }

  // 2. Collect hand-authored docs
  const handAuthored = ['language.md', 'stdlib.md', 'runtime.md', 'pipeline.md', 'tooling.md', 'examples.md']
  for (const filename of handAuthored) {
    const content = readMd(path.join(DOCS_DIR, filename))
    if (!content) continue
    const slug = filename.replace(/\.md$/, '')
    pages.push({
      slug,
      title: titleFromMarkdown(content),
      category: categoryFromSlug(slug, 'hand'),
      content,
    })
  }

  // 3. Collect generated docs (auto-discovered, no hardcoded list)
  let generatedFiles: string[] = []
  try {
    generatedFiles = fs.readdirSync(GENERATED_DIR)
      .filter(f => f.endsWith('.md') && f !== 'index.md')
      .sort()
  } catch {
    // no generated dir yet
  }

  for (const filename of generatedFiles) {
    const content = readMd(path.join(GENERATED_DIR, filename))
    if (!content) continue
    const slug = filename.replace(/\.md$/, '')
    pages.push({
      slug,
      title: titleFromMarkdown(content),
      category: categoryFromSlug(slug, 'generated'),
      content,
    })
  }

  // 4. Write the JSON
  const data: SiteDocsData = {
    buildTime: new Date().toISOString(),
    pages,
  }

  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true })
  fs.writeFileSync(OUTPUT, JSON.stringify(data, null, 2))
  process.stderr.write(`Built ${pages.length} pages → ${path.relative(ROOT, OUTPUT)}\n`)
}

build()
