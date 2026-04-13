import * as fs from 'node:fs'
import * as path from 'node:path'
import { execSync } from 'node:child_process'
import { validate } from './validator.js'
import { generateC } from './codegen.js'
import { resolveModules } from './resolver.js'
import { getLibcurlShellFlags } from './libcurl.js'
import { ensureLibuvStaticLibrary } from './libuv.js'

export function buildTSN(inputPath: string, argv: string[] = []): void {
  const absolutePath = path.resolve(inputPath)
  const ext = path.extname(inputPath)
  const baseName = path.basename(inputPath, ext)

  console.log(`[1/4] Parsing ${baseName}${ext}...`)
  let sourceFiles
  try {
    sourceFiles = resolveModules(absolutePath)
  } catch (error) {
    console.error(`  ${(error as Error).message}`)
    process.exit(1)
  }
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
  const optFlag = isDebug ? '-O0 -g -DTSN_DEBUG' : '-O2'
  console.log(`[4/4] Compiling with clang${isDebug ? ' (debug)' : ''}...`)
  const binaryPath = path.join('build', baseName)
  const libuvLib = ensureLibuvStaticLibrary()
  const libuvInclude = path.join('vendor', 'libuv', 'include')
  const libcurlFlags = getLibcurlShellFlags()

  try {
    execSync(
      `clang ${optFlag} -o ${binaryPath} ${cPath} ${libuvLib} ${libcurlFlags} -lm -I compiler/runtime -I ${libuvInclude}`,
      { stdio: 'inherit' },
    )

    const size = fs.statSync(binaryPath).size
    const sizeStr = size > 1024 * 1024 ? `${(size / 1024 / 1024).toFixed(1)} MB` : `${(size / 1024).toFixed(0)} KB`
    console.log(`  → ${binaryPath} (${sizeStr})`)
    console.log(`\nDone! Run: ./${binaryPath}`)
  } catch {
    console.error('Compilation failed. Check the generated C code in build/')
    process.exit(1)
  }
}
