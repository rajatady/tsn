/**
 * StrictTS Dev Server — watch mode with fast recompilation
 *
 * Usage: npx tsx compiler/dev.ts <file.ts|.tsx>
 *
 * Watches the source file, recompiles on change (~50ms),
 * and relaunches the binary. For UI apps, kills and restarts.
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import { execSync, spawn, type ChildProcess } from 'node:child_process'
import * as ts from 'typescript'
import { validate } from './validator.js'
import { generateC } from './codegen.js'

const inputPath = process.argv[2]
if (!inputPath) {
  console.error('Usage: npx tsx compiler/dev.ts <file.ts|.tsx>')
  process.exit(1)
}

const absolutePath = path.resolve(inputPath)
const ext = path.extname(inputPath)
const baseName = path.basename(inputPath, ext)
const isTsx = ext === '.tsx'
const cPath = path.join('build', `${baseName}.c`)
const binaryPath = path.join('build', baseName)

fs.mkdirSync('build', { recursive: true })

let appProcess: ChildProcess | null = null

function compile(): boolean {
  const start = performance.now()

  try {
    const source = fs.readFileSync(absolutePath, 'utf-8')
    const sourceFile = ts.createSourceFile(
      absolutePath, source, ts.ScriptTarget.Latest, true,
      isTsx ? ts.ScriptKind.TSX : ts.ScriptKind.TS
    )

    const errors = validate(sourceFile)
    if (errors.length > 0) {
      console.error(`\n  Validation errors:`)
      for (const err of errors) {
        const { line, character } = sourceFile.getLineAndCharacterOfPosition(err.pos)
        console.error(`    ${baseName}${ext}:${line + 1}:${character + 1} — ${err.message}`)
      }
      return false
    }

    const cCode = generateC(sourceFile, baseName)
    fs.writeFileSync(cPath, cCode)

    const hasUi = cCode.includes('#include "ui.h"')

    if (hasUi) {
      const uiFrameworkDir = path.join(path.dirname(absolutePath), 'framework')
      let uiMPath = path.join(uiFrameworkDir, 'ui.m')
      if (!fs.existsSync(uiMPath)) {
        uiMPath = path.join('examples', 'native-gui', 'framework', 'ui.m')
      }
      const uiHDir = path.dirname(uiMPath)
      const runtimeDir = path.join('compiler', 'runtime')

      execSync(
        `clang -O0 -g -fobjc-arc -framework Cocoa -framework QuartzCore ` +
        `${cPath} ${uiMPath} -I ${uiHDir} -I ${runtimeDir} -o ${binaryPath}`,
        { stdio: 'pipe' }
      )
    } else {
      execSync(
        `clang -O0 -g -o ${binaryPath} ${cPath} -lm -I compiler/runtime`,
        { stdio: 'pipe' }
      )
    }

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
  // Kill previous instance
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
      console.log(`  [${timestamp()}] App exited with code ${code}`)
    }
    appProcess = null
  })
}

// ─── Main ──────────────────────────────────────────────────────────

console.log(``)
console.log(`  ┌─ StrictTS Dev Server ──────────────────┐`)
console.log(`  │  Source: ${baseName}${ext}`)
console.log(`  │  Binary: ${binaryPath}`)
console.log(`  │  Watching for changes...               │`)
console.log(`  └────────────────────────────────────────┘`)
console.log(``)

// Initial compile + launch
if (compile()) {
  launchApp()
}

// Watch for changes
let debounce: ReturnType<typeof setTimeout> | null = null

fs.watch(absolutePath, (eventType) => {
  if (eventType !== 'change') return
  if (debounce) clearTimeout(debounce)
  debounce = setTimeout(() => {
    console.log(`  [${timestamp()}] Change detected...`)
    if (compile()) {
      launchApp()
    }
  }, 100) // 100ms debounce
})

// Also watch the directory for new files
const dir = path.dirname(absolutePath)
fs.watch(dir, (eventType, filename) => {
  if (!filename || !filename.endsWith(ext)) return
  if (path.resolve(dir, filename) !== absolutePath) return
  if (debounce) clearTimeout(debounce)
  debounce = setTimeout(() => {
    console.log(`  [${timestamp()}] Change detected...`)
    if (compile()) {
      launchApp()
    }
  }, 100)
})

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log(`\n  [${timestamp()}] Shutting down...`)
  if (appProcess) appProcess.kill('SIGTERM')
  process.exit(0)
})

console.log(`  Press Ctrl+C to stop.\n`)
