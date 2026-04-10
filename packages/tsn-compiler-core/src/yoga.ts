import * as fs from 'node:fs'
import * as path from 'node:path'
import { execSync } from 'node:child_process'

function collectYogaSources(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  const sources: string[] = []

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      sources.push(...collectYogaSources(fullPath))
      continue
    }
    if (entry.isFile() && entry.name.endsWith('.cpp')) {
      sources.push(fullPath)
    }
  }

  return sources
}

function needsRebuild(archivePath: string, sources: string[]): boolean {
  if (!fs.existsSync(archivePath)) return true
  const archiveMtime = fs.statSync(archivePath).mtimeMs
  return sources.some(source => fs.statSync(source).mtimeMs > archiveMtime)
}

export function ensureYogaStaticLibrary(projectRoot = process.cwd()): string {
  const buildDir = path.join(projectRoot, 'build')
  const archivePath = path.join(buildDir, 'libyoga.a')
  const yogaRoot = path.join(projectRoot, 'vendor', 'yoga')
  const sources = collectYogaSources(yogaRoot)

  if (sources.length === 0) {
    throw new Error(`Yoga sources not found under ${yogaRoot}`)
  }

  if (!needsRebuild(archivePath, sources)) {
    return archivePath
  }

  const objectRoot = path.join(buildDir, 'yoga-obj')
  fs.mkdirSync(objectRoot, { recursive: true })

  for (const source of sources) {
    const relative = path.relative(yogaRoot, source).replace(/\.cpp$/, '.o')
    const objectPath = path.join(objectRoot, relative)
    fs.mkdirSync(path.dirname(objectPath), { recursive: true })
    execSync(
      `clang++ -std=c++20 -O2 -c ${JSON.stringify(source)} -I ${JSON.stringify(path.join(projectRoot, 'vendor'))} -o ${JSON.stringify(objectPath)}`,
      { stdio: 'inherit' },
    )
  }

  const objectFiles = fs.readdirSync(objectRoot, { recursive: true })
    .filter(entry => typeof entry === 'string' && entry.endsWith('.o'))
    .map(entry => path.join(objectRoot, entry))

  if (objectFiles.length === 0) {
    throw new Error(`Yoga object build produced no .o files under ${objectRoot}`)
  }

  execSync(
    `libtool -static -o ${JSON.stringify(archivePath)} ${objectFiles.map(file => JSON.stringify(file)).join(' ')}`,
    { stdio: 'inherit' },
  )

  return archivePath
}
