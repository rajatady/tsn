import * as fs from 'node:fs'
import * as path from 'node:path'
import { execSync } from 'node:child_process'
import { parseCompilerArgs } from './argv.js'
import { validate } from './validator.js'
import { generateC } from './codegen.js'
import { resolveModules } from './resolver.js'
import { getLibcurlShellFlags } from './libcurl.js'
import { ensureLibuvStaticLibrary } from './libuv.js'
import { ensureYogaStaticLibrary } from './yoga.js'
import { resolveUIHostTarget } from './ui_targets.js'
import type { BuildArtifact } from './artifact.js'
import { buildIOSSimulatorBundle } from './ios_bundle.js'

export function buildTSN(inputPath: string, argv: string[] = []): BuildArtifact {
  const options = parseCompilerArgs(argv)
  const uiHostTarget = resolveUIHostTarget(options.platform)
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
  const cCode = generateC(sourceFiles, baseName, uiHostTarget)
  const cPath = path.join('build', `${baseName}.c`)
  fs.mkdirSync('build', { recursive: true })
  fs.writeFileSync(cPath, cCode)
  console.log(`  → ${cPath} (${cCode.length} bytes)`)

  const isDebug = options.debug
  const optFlag = isDebug ? '-O0 -g -DTSN_DEBUG' : '-O2'
  console.log(`[4/4] Compiling with clang${isDebug ? ' (debug)' : ''}...`)
  const binaryPath = path.join('build', baseName)
  const hasUi = cCode.includes(`#include "${uiHostTarget.headerInclude}"`)

  try {
    if (hasUi) {
      if (uiHostTarget.buildKind === 'xcode-app' && uiHostTarget.platform === 'ios') {
        const artifact = buildIOSSimulatorBundle(baseName, cPath, cCode, uiHostTarget, isDebug)
        const size = fs.statSync(path.join(artifact.path, artifact.executableName)).size
        const sizeStr = size > 1024 * 1024 ? `${(size / 1024 / 1024).toFixed(1)} MB` : `${(size / 1024).toFixed(0)} KB`
        console.log(`  → ${artifact.path} (${sizeStr}, bundle ${artifact.bundleId})`)
        console.log(`\nDone! Run: ./tsn run ${inputPath} --platform ios`)
        return artifact
      }

      if (uiHostTarget.buildKind !== 'native-binary') {
        console.error(`${uiHostTarget.displayName} packaging is not implemented yet. Generated C is available at ${cPath}.`)
        process.exit(1)
      }

      const runtimeDir = path.join('compiler', 'runtime')
      const yogaLib = ensureYogaStaticLibrary()
      const yogaInclude = 'vendor'
      const libuvLib = ensureLibuvStaticLibrary()
      const libuvInclude = path.join('vendor', 'libuv', 'include')
      const libcurlFlags = getLibcurlShellFlags()
      const frameworks = uiHostTarget.frameworkFlags.join(' ')
      execSync(
        `clang ${optFlag} -fobjc-arc ${frameworks} ` +
        `${cPath} ${uiHostTarget.runtimeSource} ${yogaLib} ${libuvLib} ${libcurlFlags} -I ${uiHostTarget.runtimeRoot} -I ${runtimeDir} -I ${yogaInclude} -I ${libuvInclude} ` +
        `-lc++ -o ${binaryPath}`,
        { stdio: 'inherit' }
      )
    } else {
      const libuvLib = ensureLibuvStaticLibrary()
      const libuvInclude = path.join('vendor', 'libuv', 'include')
      const libcurlFlags = getLibcurlShellFlags()
      execSync(
        `clang ${optFlag} -o ${binaryPath} ${cPath} ${libuvLib} ${libcurlFlags} -lm -I compiler/runtime -I ${libuvInclude}`,
        { stdio: 'inherit' },
      )
    }

    const size = fs.statSync(binaryPath).size
    const sizeStr = size > 1024 * 1024 ? `${(size / 1024 / 1024).toFixed(1)} MB` : `${(size / 1024).toFixed(0)} KB`
    console.log(`  → ${binaryPath} (${sizeStr})`)
    console.log(`\nDone! Run: ./${binaryPath}`)
    return {
      kind: 'native-binary',
      platform: options.platform,
      path: binaryPath,
    }
  } catch {
    console.error('Compilation failed. Check the generated C code in build/')
    process.exit(1)
  }
}
