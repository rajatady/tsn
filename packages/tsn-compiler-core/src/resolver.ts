/**
 * TSN Module Resolver — follow imports, return files in dependency order
 *
 * Resolves standard TypeScript relative imports:
 *   import { Employee } from './types'
 *   import { fuzzySearch } from './lib/search'
 *
 * Returns source files in topological order (leaves first, entry last).
 * All files are merged into a single C output — no runtime module system.
 */

import * as ts from 'typescript'
import * as fs from 'node:fs'
import * as path from 'node:path'

/**
 * Resolve a module specifier relative to the importing file.
 * Tries: .ts, .tsx, /index.ts, /index.tsx
 */
function resolveSpecifier(specifier: string, fromFile: string): string | null {
  const dir = path.dirname(fromFile)
  const base = path.resolve(dir, specifier)

  // Try exact extensions
  for (const ext of ['.ts', '.tsx']) {
    const p = base + ext
    if (fs.existsSync(p)) return p
  }

  // Try index file (barrel)
  for (const ext of ['.ts', '.tsx']) {
    const p = path.join(base, 'index' + ext)
    if (fs.existsSync(p)) return p
  }

  return null
}

/**
 * Resolve all imports from an entry file recursively.
 * Returns source files in dependency order (leaves first, entry last).
 */
export function resolveModules(entryPath: string): ts.SourceFile[] {
  const absoluteEntry = path.resolve(entryPath)
  const visited = new Set<string>()
  const result: ts.SourceFile[] = []
  const visiting = new Set<string>() // for cycle detection

  function visit(filePath: string, importedFrom?: string): void {
    const absolute = path.resolve(filePath)

    // Cycle detection
    if (visiting.has(absolute)) {
      const rel = path.relative(process.cwd(), absolute)
      const from = importedFrom ? path.relative(process.cwd(), importedFrom) : '?'
      console.error(`  Circular import detected: ${from} → ${rel}`)
      console.error(`  TSN does not support circular imports.`)
      process.exit(1)
    }

    // Already processed
    if (visited.has(absolute)) return

    visiting.add(absolute)

    // Read and parse the file
    if (!fs.existsSync(absolute)) {
      const rel = path.relative(process.cwd(), absolute)
      const from = importedFrom ? path.relative(process.cwd(), importedFrom) : '?'
      console.error(`  Module not found: ${rel}`)
      console.error(`  Imported from: ${from}`)
      process.exit(1)
    }

    const source = fs.readFileSync(absolute, 'utf-8')
    const ext = path.extname(absolute)
    const sf = ts.createSourceFile(
      absolute, source, ts.ScriptTarget.Latest, true,
      ext === '.tsx' ? ts.ScriptKind.TSX : ts.ScriptKind.TS
    )

    // Follow imports (depth-first so dependencies come first)
    for (const stmt of sf.statements) {
      if (!ts.isImportDeclaration(stmt)) continue

      const specifier = stmt.moduleSpecifier
      if (!ts.isStringLiteral(specifier)) continue
      const modulePath = specifier.text

      // Skip non-relative imports (they're rejected by validator)
      if (!modulePath.startsWith('.')) continue

      const resolved = resolveSpecifier(modulePath, absolute)
      if (!resolved) {
        const { line } = sf.getLineAndCharacterOfPosition(stmt.getStart())
        const rel = path.relative(process.cwd(), absolute)
        console.error(`  Cannot resolve module '${modulePath}'`)
        console.error(`  at ${rel}:${line + 1}`)
        process.exit(1)
      }

      visit(resolved, absolute)
    }

    // Also follow re-exports: export { X } from './path'
    for (const stmt of sf.statements) {
      if (!ts.isExportDeclaration(stmt) || !stmt.moduleSpecifier) continue
      if (!ts.isStringLiteral(stmt.moduleSpecifier)) continue
      const modulePath = stmt.moduleSpecifier.text
      if (!modulePath.startsWith('.')) continue

      const resolved = resolveSpecifier(modulePath, absolute)
      if (resolved) visit(resolved, absolute)
    }

    visiting.delete(absolute)
    visited.add(absolute)
    result.push(sf)
  }

  visit(absoluteEntry)
  return result
}
