/**
 * StrictTS Compiler — Entry Point
 *
 * Usage: npx tsx compiler/index.ts <file.ts|.tsx>
 *
 * Pipeline: read .ts/.tsx → parse (TS API) → validate → codegen (emit .c) → clang → binary
 *
 * For .tsx files with JSX, links against the native UI framework (AppKit).
 */

import * as ts from 'typescript'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { execSync } from 'node:child_process'
import { validate } from './validator.js'
import { generateC } from './codegen.js'

const inputPath = process.argv[2]
if (!inputPath) {
  console.error('Usage: npx tsx compiler/index.ts <file.ts|.tsx>')
  process.exit(1)
}

const absolutePath = path.resolve(inputPath)
const source = fs.readFileSync(absolutePath, 'utf-8')
const ext = path.extname(inputPath)
const baseName = path.basename(inputPath, ext)
const isTsx = ext === '.tsx'

console.log(`[1/4] Parsing ${baseName}${ext}...`)
const sourceFile = ts.createSourceFile(
  absolutePath,
  source,
  ts.ScriptTarget.Latest,
  true,
  isTsx ? ts.ScriptKind.TSX : ts.ScriptKind.TS
)

console.log(`[2/4] Validating (rejecting banned features)...`)
const errors = validate(sourceFile)
if (errors.length > 0) {
  console.error(`\nValidation failed with ${errors.length} error(s):`)
  for (const err of errors) {
    const { line, character } = sourceFile.getLineAndCharacterOfPosition(err.pos)
    console.error(`  ${baseName}${ext}:${line + 1}:${character + 1} — ${err.message}`)
  }
  process.exit(1)
}
console.log(`  ✓ No banned features found`)

console.log(`[3/4] Generating C code...`)
const cCode = generateC(sourceFile, baseName)
const cPath = path.join('build', `${baseName}.c`)
fs.mkdirSync('build', { recursive: true })
fs.writeFileSync(cPath, cCode)
console.log(`  → ${cPath} (${cCode.length} bytes)`)

const isDebug = process.argv.includes('--debug') || process.argv.includes('-g')
const optFlag = isDebug ? '-O0 -g' : '-O2'

console.log(`[4/4] Compiling with clang${isDebug ? ' (debug)' : ''}...`)
const binaryPath = path.join('build', baseName)

// Detect if generated code uses JSX/UI framework
const hasUi = cCode.includes('#include "ui.h"')

try {
  if (hasUi) {
    // UI app — link with AppKit framework and ui.m
    const uiFrameworkDir = path.join(path.dirname(absolutePath), 'framework')
    const uiM = path.join(uiFrameworkDir, 'ui.m')

    // Find ui.m relative to the source file or in examples/native-gui/framework
    let uiMPath = uiM
    if (!fs.existsSync(uiMPath)) {
      uiMPath = path.join('examples', 'native-gui', 'framework', 'ui.m')
    }

    const uiHDir = path.dirname(uiMPath)

    const runtimeDir = path.join('compiler', 'runtime')

    execSync(
      `clang ${optFlag} -fobjc-arc -framework Cocoa -framework QuartzCore ` +
      `${cPath} ${uiMPath} ` +
      `-I ${uiHDir} -I ${runtimeDir} ` +
      `-o ${binaryPath}`,
      { stdio: 'inherit' }
    )
  } else {
    // Regular CLI app
    execSync(`clang ${optFlag} -o ${binaryPath} ${cPath} -lm -I compiler/runtime`, {
      stdio: 'inherit'
    })
  }

  const size = fs.statSync(binaryPath).size
  const sizeStr = size > 1024 * 1024
    ? `${(size / 1024 / 1024).toFixed(1)} MB`
    : `${(size / 1024).toFixed(0)} KB`

  console.log(`  → ${binaryPath} (${sizeStr})`)
  console.log(`\nDone! Run: ./${binaryPath}`)
} catch {
  console.error('Compilation failed. Check the generated C code in build/')
  process.exit(1)
}
