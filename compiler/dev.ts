/**
 * TSN Dev Server — watch mode with fast recompilation
 *
 * Usage: npx tsx compiler/dev.ts <file.ts>
 *
 * Watches the source file, recompiles on change (~50ms),
 * and relaunches the binary.
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import { execSync, spawn, type ChildProcess } from 'node:child_process'
import { validate } from './validator.js'
import { generateC } from './codegen.js'
import { resolveModules } from './resolver.js'
import { getLibcurlShellFlags } from '../packages/tsn-compiler-core/src/libcurl.js'
import { ensureLibuvStaticLibrary } from '../packages/tsn-compiler-core/src/libuv.js'

const inputPath = process.argv[2]
if (!inputPath) {
  console.error('Usage: npx tsx compiler/dev.ts <file.ts>')
  process.exit(1)
}

const absolutePath = path.resolve(inputPath)
const ext = path.extname(inputPath)
const baseName = path.basename(inputPath, ext)
const cPath = path.join('build', `${baseName}.c`)
const binaryPath = path.join('build', baseName)

fs.mkdirSync('build', { recursive: true })

let appProcess: ChildProcess | null = null

/** Track resolved file paths for watching */
let watchedFiles: string[] = [absolutePath]

function compile(): boolean {
  const start = performance.now()

  try {
    const sourceFiles = resolveModules(absolutePath)

    // Update watched files list
    watchedFiles = sourceFiles.map(sf => sf.fileName)

    let totalErrors = 0
    for (const sf of sourceFiles) {
      const errors = validate(sf)
      if (errors.length > 0) {
        const relPath = path.relative(process.cwd(), sf.fileName)
        for (const err of errors) {
          const { line, character } = sf.getLineAndCharacterOfPosition(err.pos)
          console.error(`    ${relPath}:${line + 1}:${character + 1} — ${err.message}`)
        }
        totalErrors += errors.length
      }
    }
    if (totalErrors > 0) return false

    const cCode = generateC(sourceFiles, baseName)
    fs.writeFileSync(cPath, cCode)

    const libuvLib = ensureLibuvStaticLibrary()
    const libuvInclude = path.join('vendor', 'libuv', 'include')
    const libcurlFlags = getLibcurlShellFlags()

    execSync(
      `clang -O0 -g -DTSN_DEBUG -o ${binaryPath} ${cPath} ${libuvLib} ${libcurlFlags} -lm -I compiler/runtime -I ${libuvInclude}`,
      { stdio: 'pipe' }
    )

    const elapsed = (performance.now() - start).toFixed(0)
    const size = fs.statSync(binaryPath).size
    const sizeStr = size > 1024 * 1024
      ? `${(size / 1024 / 1024).toFixed(1)} MB`
      : `${(size / 1024).toFixed(0)} KB`

    console.log(`  [${timestamp()}] Compiled in ${elapsed}ms (${sizeStr})`)
    return true
  } catch (e: any) {
    console.error(`  [${timestamp()}] Compile error:`, e.message?.split('\n')[0] || e)
    return false
  }
}

function timestamp(): string {
  const d = new Date()
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`
}

function launchApp(): void {
  if (appProcess) {
    appProcess.kill('SIGTERM')
    appProcess = null
  }

  appProcess = spawn(binaryPath, [], {
    stdio: ['ignore', 'inherit', 'inherit'],
    detached: false,
  })

  appProcess.on('exit', (code) => {
    if (code !== null && code !== 0 && code !== 143 /* SIGTERM */) {
      if (code > 128) {
        const sig = code - 128
        const sigNames: Record<number, string> = { 6: 'SIGABRT', 11: 'SIGSEGV', 10: 'SIGBUS' }
        console.log(`  [${timestamp()}] \x1b[31mCrash: ${sigNames[sig] || `signal ${sig}`}\x1b[0m`)
      } else {
        console.log(`  [${timestamp()}] App exited with code ${code}`)
      }
    }
    appProcess = null
  })
}

// ─── Main ──────────────────────────────────────────────────────────

console.log(``)
console.log(`  ┌─ TSN Dev Server ──────────────────┐`)
console.log(`  │  Source: ${baseName}${ext}`)
console.log(`  │  Binary: ${binaryPath}`)
console.log(`  │  Watching for changes...               │`)
console.log(`  └────────────────────────────────────────┘`)
console.log(``)

// Initial compile + launch
if (compile()) {
  launchApp()
}

// Watch for changes — watch all resolved files
let debounce: ReturnType<typeof setTimeout> | null = null
const watchers: fs.FSWatcher[] = []

function setupWatchers(): void {
  // Close old watchers
  for (const w of watchers) w.close()
  watchers.length = 0

  // Watch all resolved files + their directories
  const watchedDirs = new Set<string>()
  for (const filePath of watchedFiles) {
    // Watch the file itself
    try {
      const w = fs.watch(filePath, (eventType) => {
        if (eventType !== 'change') return
        if (debounce) clearTimeout(debounce)
        debounce = setTimeout(() => {
          const rel = path.relative(process.cwd(), filePath)
          console.log(`  [${timestamp()}] Change: ${rel}`)
          if (compile()) {
            setupWatchers() // re-setup in case imports changed
            launchApp()
          }
        }, 100)
      })
      watchers.push(w)
    } catch { /* file may not exist yet */ }

    // Watch directory for new files
    const dir = path.dirname(filePath)
    if (!watchedDirs.has(dir)) {
      watchedDirs.add(dir)
      try {
        const w = fs.watch(dir, (eventType, filename) => {
          if (!filename || !filename.endsWith('.ts')) return
          if (debounce) clearTimeout(debounce)
          debounce = setTimeout(() => {
            console.log(`  [${timestamp()}] Change detected...`)
            if (compile()) {
              setupWatchers()
              launchApp()
            }
          }, 100)
        })
        watchers.push(w)
      } catch { /* dir may not exist */ }
    }
  }
}

setupWatchers()

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log(`\n  [${timestamp()}] Shutting down...`)
  if (appProcess) appProcess.kill('SIGTERM')
  process.exit(0)
})

console.log(`  Press Ctrl+C to stop.\n`)
