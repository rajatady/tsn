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
import { isTSNStdlibModule, resolveTSNStdlibModule } from './stdlib-modules.js'

export const TSX_UNSUPPORTED_MESSAGE = 'TSX/JSX is not supported in this simplified TSN compiler'

function assertSupportedSourcePath(filePath: string): void {
  if (path.extname(filePath) === '.tsx') {
    throw new Error(`${TSX_UNSUPPORTED_MESSAGE}: ${path.relative(process.cwd(), filePath)}`)
  }
}

/**
 * Resolve a module specifier relative to the importing file.
 * Tries: .ts, /index.ts
 */
function resolveSpecifier(specifier: string, fromFile: string): string | null {
  if (isTSNStdlibModule(specifier)) {
    return resolveTSNStdlibModule(specifier)
  }

  const dir = path.dirname(fromFile)
  const base = path.resolve(dir, specifier)

  if (path.extname(specifier) === '.tsx') {
    assertSupportedSourcePath(base)
  }

  const exactTs = base + '.ts'
  if (fs.existsSync(exactTs)) return exactTs

  const exactTsx = base + '.tsx'
  if (fs.existsSync(exactTsx)) assertSupportedSourcePath(exactTsx)

  const indexTs = path.join(base, 'index.ts')
  if (fs.existsSync(indexTs)) return indexTs

  const indexTsx = path.join(base, 'index.tsx')
  if (fs.existsSync(indexTsx)) assertSupportedSourcePath(indexTsx)

  return null
}

/**
 * Resolve all imports from an entry file recursively.
 * Returns source files in dependency order (leaves first, entry last).
 */
export function resolveModules(entryPath: string): ts.SourceFile[] {
  const absoluteEntry = path.resolve(entryPath)
  assertSupportedSourcePath(absoluteEntry)
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
    const sf = ts.createSourceFile(absolute, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)

    // Follow imports (depth-first so dependencies come first)
    for (const stmt of sf.statements) {
      if (!ts.isImportDeclaration(stmt)) continue

      const specifier = stmt.moduleSpecifier
      if (!ts.isStringLiteral(specifier)) continue
      const modulePath = specifier.text

      if (!modulePath.startsWith('.') && !isTSNStdlibModule(modulePath)) continue

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
      if (!modulePath.startsWith('.') && !isTSNStdlibModule(modulePath)) continue

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
