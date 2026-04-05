import * as fs from 'node:fs'
import * as path from 'node:path'
import { execSync } from 'node:child_process'
import { validate } from './validator.js'
import { generateC } from './codegen.js'
import { resolveModules } from './resolver.js'
import { appKitHostRoot, appKitSourcePath } from '../../tsn-host-appkit/src/index.js'

export function buildStrictTS(inputPath: string, argv: string[] = []): void {
  const absolutePath = path.resolve(inputPath)
  const ext = path.extname(inputPath)
  const baseName = path.basename(inputPath, ext)

  console.log(`[1/4] Parsing ${baseName}${ext}...`)
  const sourceFiles = resolveModules(absolutePath)
  if (sourceFiles.length > 1) console.log(`  → ${sourceFiles.length} files resolved`)

  console.log('[2/4] Validating (rejecting banned features)...')
  let totalErrors = 0
  for (const sf of sourceFiles) {
    const errors = validate(sf)
    if (errors.length > 0) {
      const relPath = path.relative(process.cwd(), sf.fileName)
      for (const err of errors) {
        const { line, character } = sf.getLineAndCharacterOfPosition(err.pos)
        console.error(`  ${relPath}:${line + 1}:${character + 1} — ${err.message}`)
      }
      totalErrors += errors.length
    }
  }
  if (totalErrors > 0) {
    console.error(`\nValidation failed with ${totalErrors} error(s)`)
    process.exit(1)
  }
  console.log('  ✓ No banned features found')

  console.log('[3/4] Generating C code...')
  const cCode = generateC(sourceFiles, baseName)
  const cPath = path.join('build', `${baseName}.c`)
  fs.mkdirSync('build', { recursive: true })
  fs.writeFileSync(cPath, cCode)
  console.log(`  → ${cPath} (${cCode.length} bytes)`)

  const isDebug = argv.includes('--debug') || argv.includes('-g')
  const optFlag = isDebug ? '-O0 -g -DSTRICTTS_DEBUG' : '-O2'
  console.log(`[4/4] Compiling with clang${isDebug ? ' (debug)' : ''}...`)
  const binaryPath = path.join('build', baseName)
  const hasUi = cCode.includes('#include "ui.h"')

  try {
    if (hasUi) {
      const runtimeDir = path.join('compiler', 'runtime')
      execSync(
        `clang ${optFlag} -fobjc-arc -framework Cocoa -framework QuartzCore ` +
        `${cPath} ${appKitSourcePath} -I ${appKitHostRoot} -I ${runtimeDir} -o ${binaryPath}`,
        { stdio: 'inherit' }
      )
    } else {
      execSync(`clang ${optFlag} -o ${binaryPath} ${cPath} -lm -I compiler/runtime`, { stdio: 'inherit' })
    }

    const size = fs.statSync(binaryPath).size
    const sizeStr = size > 1024 * 1024 ? `${(size / 1024 / 1024).toFixed(1)} MB` : `${(size / 1024).toFixed(0)} KB`
    console.log(`  → ${binaryPath} (${sizeStr})`)
    console.log(`\nDone! Run: ./${binaryPath}`)
  } catch {
    console.error('Compilation failed. Check the generated C code in build/')
    process.exit(1)
  }
}
