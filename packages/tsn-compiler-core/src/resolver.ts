/**
 * TSN Module Resolver — follow imports, return files in dependency order
 *
 * Resolves standard TypeScript relative imports:
 *   import { Employee } from './types'
 *   import { fuzzySearch } from './lib/search'
 *
 * Also resolves native packages from node_modules:
 *   import { now } from 'tsn-datetime'
 *
 * Native packages declare C source files in their package.json:
 *   { "tsn": { "entry": "src/index.ts", "native": ["src/datetime.c"] } }
 *
 * Returns source files in topological order (leaves first, entry last),
 * plus native C files and include directories for the linker.
 */

import * as ts from 'typescript'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { isTSNStdlibModule, resolveTSNStdlibModule } from './stdlib-modules.js'

export interface ResolveResult {
  sourceFiles: ts.SourceFile[]
  nativeFiles: string[]        // absolute paths to .c files to link
  nativeIncludes: string[]     // absolute paths for -I include directories
  externalModules: Set<string> // specifiers resolved as external packages
}

interface NativePackageInfo {
  entry: string       // absolute path to TS entry file
  cFiles: string[]    // absolute paths to .c files
  includeDir: string  // package root for -I
}

/**
 * Resolve a module specifier relative to the importing file.
 * Tries: .ts, .tsx, /index.ts, /index.tsx
 */
function resolveSpecifier(specifier: string, fromFile: string): string | null {
  if (isTSNStdlibModule(specifier)) {
    return resolveTSNStdlibModule(specifier)
  }

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
 * Find the nearest node_modules directory by walking up from a starting path.
 */
function findNodeModules(fromDir: string): string | null {
  let dir = fromDir
  while (true) {
    const candidate = path.join(dir, 'node_modules')
    if (fs.existsSync(candidate)) return candidate
    const parent = path.dirname(dir)
    if (parent === dir) return null
    dir = parent
  }
}

/**
 * Resolve a native package from node_modules.
 *
 * Looks for package.json with a "tsn" field:
 *   { "tsn": { "entry": "src/index.ts", "native": ["src/datetime.c"] } }
 *
 * Returns null if the package doesn't exist or has no tsn config.
 */
function resolveNativePackage(specifier: string, fromFile: string): NativePackageInfo | null {
  const nodeModules = findNodeModules(path.dirname(fromFile))
  if (!nodeModules) return null

  const pkgDir = path.join(nodeModules, specifier)
  const pkgJsonPath = path.join(pkgDir, 'package.json')
  if (!fs.existsSync(pkgJsonPath)) return null

  let pkgJson: any
  try {
    pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'))
  } catch {
    return null
  }

  // Check for tsn config in package.json
  const tsnConfig = pkgJson.tsn
  if (!tsnConfig) {
    // Also check for standalone tsn.config.json
    const tsnConfigPath = path.join(pkgDir, 'tsn.config.json')
    if (fs.existsSync(tsnConfigPath)) {
      try {
        const config = JSON.parse(fs.readFileSync(tsnConfigPath, 'utf-8'))
        return buildNativePackageInfo(pkgDir, pkgJson, config)
      } catch {
        return null
      }
    }
    return null
  }

  return buildNativePackageInfo(pkgDir, pkgJson, tsnConfig)
}

function buildNativePackageInfo(
  pkgDir: string,
  pkgJson: any,
  tsnConfig: { entry?: string; native?: string[] },
): NativePackageInfo | null {
  // Resolve TS entry point
  const entryRel = tsnConfig.entry || pkgJson.main || 'src/index.ts'
  const entry = path.resolve(pkgDir, entryRel)
  if (!fs.existsSync(entry)) return null

  // Resolve native C files
  const nativeRels = tsnConfig.native || []
  const cFiles: string[] = []
  for (const rel of nativeRels) {
    const abs = path.resolve(pkgDir, rel)
    if (!fs.existsSync(abs)) {
      console.error(`  Native file not found: ${rel} in package at ${pkgDir}`)
      process.exit(1)
    }
    cFiles.push(abs)
  }

  return { entry, cFiles, includeDir: pkgDir }
}

/**
 * Read local tsn.config.json for project-level native C files.
 */
function readLocalNativeConfig(projectRoot: string): { cFiles: string[]; includeDirs: string[] } {
  const configPath = path.join(projectRoot, 'tsn.config.json')
  if (!fs.existsSync(configPath)) return { cFiles: [], includeDirs: [] }

  let config: any
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
  } catch {
    return { cFiles: [], includeDirs: [] }
  }

  const cFiles: string[] = []
  const includeDirs: string[] = []
  for (const rel of config.native || []) {
    const abs = path.resolve(projectRoot, rel)
    if (!fs.existsSync(abs)) {
      console.error(`  Native file not found: ${rel} (from tsn.config.json)`)
      process.exit(1)
    }
    cFiles.push(abs)
    const dir = path.dirname(abs)
    if (!includeDirs.includes(dir)) includeDirs.push(dir)
  }

  return { cFiles, includeDirs }
}

/**
 * Resolve all imports from an entry file recursively.
 * Returns source files in dependency order (leaves first, entry last),
 * plus native C files and include directories for the linker.
 */
export function resolveModules(entryPath: string): ResolveResult {
  const absoluteEntry = path.resolve(entryPath)
  const projectRoot = process.cwd()
  const visited = new Set<string>()
  const result: ts.SourceFile[] = []
  const visiting = new Set<string>() // for cycle detection

  // Native package tracking
  const resolvedNativePackages = new Map<string, NativePackageInfo>()
  const externalModules = new Set<string>()

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

      // Relative or stdlib imports
      if (modulePath.startsWith('.') || isTSNStdlibModule(modulePath)) {
        const resolved = resolveSpecifier(modulePath, absolute)
        if (!resolved) {
          const { line } = sf.getLineAndCharacterOfPosition(stmt.getStart())
          const rel = path.relative(process.cwd(), absolute)
          console.error(`  Cannot resolve module '${modulePath}'`)
          console.error(`  at ${rel}:${line + 1}`)
          process.exit(1)
        }
        visit(resolved, absolute)
        continue
      }

      // External package — try native package resolution
      if (!resolvedNativePackages.has(modulePath)) {
        const pkgInfo = resolveNativePackage(modulePath, absolute)
        if (pkgInfo) {
          resolvedNativePackages.set(modulePath, pkgInfo)
          externalModules.add(modulePath)
          // Visit the package's TS entry to collect types and declare functions
          visit(pkgInfo.entry, absolute)
        }
        // If not resolvable, the validator will catch it
      } else {
        externalModules.add(modulePath)
      }
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

  // Collect all native C files and include directories
  const nativeFiles: string[] = []
  const nativeIncludes: string[] = []
  for (const [, pkg] of resolvedNativePackages) {
    for (const cf of pkg.cFiles) {
      if (!nativeFiles.includes(cf)) nativeFiles.push(cf)
    }
    if (!nativeIncludes.includes(pkg.includeDir)) nativeIncludes.push(pkg.includeDir)
  }

  // Also check for local tsn.config.json
  const localNative = readLocalNativeConfig(projectRoot)
  for (const cf of localNative.cFiles) {
    if (!nativeFiles.includes(cf)) nativeFiles.push(cf)
  }
  for (const dir of localNative.includeDirs) {
    if (!nativeIncludes.includes(dir)) nativeIncludes.push(dir)
  }

  return { sourceFiles: result, nativeFiles, nativeIncludes, externalModules }
}
