import * as fs from 'node:fs'
import * as path from 'node:path'
import { execSync } from 'node:child_process'
import { validate } from './validator.js'
import { generateC } from './codegen.js'
import { resolveModules } from './resolver.js'
import { resolveHostPlatform } from './platform.js'

export function buildStrictTS(inputPath: string, argv: string[] = []): void {
  const platform = resolveHostPlatform()
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
  console.log(`[4/4] Compiling with clang${isDebug ? ' (debug)' : ''} [${platform.name}]...`)
  const binaryPath = path.join('build', baseName)
  const hasUi = cCode.includes('#include "ui.h"')

  try {
    const flagOpts = { debug: isDebug, cPath, binaryPath }
    const cmd = hasUi
      ? platform.uiClangFlags(flagOpts)
      : platform.cliClangFlags(flagOpts)
    execSync(cmd, { stdio: 'inherit' })

    const size = fs.statSync(binaryPath).size
    const sizeStr = size > 1024 * 1024 ? `${(size / 1024 / 1024).toFixed(1)} MB` : `${(size / 1024).toFixed(0)} KB`
    console.log(`  → ${binaryPath} (${sizeStr})`)
    console.log(`\nDone! Run: ./${binaryPath}`)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : ''
    if (msg.includes('GTK4') || msg.includes('not yet supported')) {
      console.error(`\n${msg}`)
    } else {
      console.error('Compilation failed. Check the generated C code in build/')
    }
    process.exit(1)
  }
}
