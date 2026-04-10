import * as fs from 'node:fs'
import * as path from 'node:path'
import { execSync } from 'node:child_process'

function collectLibuvInputs(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  const inputs: string[] = []

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'build') continue
      inputs.push(...collectLibuvInputs(fullPath))
      continue
    }
    if (
      entry.isFile() &&
      (entry.name.endsWith('.c') ||
        entry.name.endsWith('.h') ||
        entry.name === 'CMakeLists.txt')
    ) {
      inputs.push(fullPath)
    }
  }

  return inputs
}

function needsRebuild(archivePath: string, inputs: string[]): boolean {
  if (!fs.existsSync(archivePath)) return true
  const archiveMtime = fs.statSync(archivePath).mtimeMs
  return inputs.some(input => fs.statSync(input).mtimeMs > archiveMtime)
}

export function ensureLibuvStaticLibrary(projectRoot = process.cwd()): string {
  const libuvRoot = path.join(projectRoot, 'vendor', 'libuv')
  const buildDir = path.join(projectRoot, 'build', 'libuv-build')
  const archivePath = path.join(buildDir, 'libuv.a')
  const inputs = collectLibuvInputs(libuvRoot)

  if (inputs.length === 0) {
    throw new Error(`libuv sources not found under ${libuvRoot}`)
  }

  if (!needsRebuild(archivePath, inputs)) {
    return archivePath
  }

  fs.mkdirSync(buildDir, { recursive: true })

  execSync(
    `cmake -S ${JSON.stringify(libuvRoot)} -B ${JSON.stringify(buildDir)} ` +
      '-DBUILD_TESTING=OFF -DLIBUV_BUILD_TESTS=OFF -DLIBUV_BUILD_BENCH=OFF -DLIBUV_BUILD_SHARED=OFF',
    { stdio: 'inherit' },
  )

  execSync(
    `cmake --build ${JSON.stringify(buildDir)} --target uv_a`,
    { stdio: 'inherit' },
  )

  if (!fs.existsSync(archivePath)) {
    throw new Error(`libuv build completed but ${archivePath} was not produced`)
  }

  return archivePath
}
