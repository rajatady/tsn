import assert from 'node:assert/strict'
import { execFileSync, spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

import { gallerySuites } from '../examples/native-gui/ui-gallery/registry.js'

const root = '/Users/kumardivyarajat/WebstormProjects/bun-vite/vite'
const artifactRoot = '/tmp/tsn-ui-conformance'
const inspectApp = 'ui-gallery'

function runCommand(file: string, args: string[]): string {
  return execFileSync(file, args, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
}

function inspect(args: string[]): string {
  return runCommand('npx', ['tsx', 'compiler/inspect.ts', '--app', inspectApp, ...args]).trim()
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForInspector(): Promise<void> {
  let attempt = 0
  while (attempt < 30) {
    try {
      const tree = inspect(['tree'])
      if (tree.includes('Window "UI Gallery"')) return
    } catch (_err) {
    }
    attempt += 1
    await sleep(250)
  }
  throw new Error('UI Gallery inspector did not become ready in time')
}

function copyLatestScreenshot(targetPath: string): void {
  const source = '/tmp/strictts-screenshot.png'
  if (!fs.existsSync(source)) {
    throw new Error(`Missing screenshot artifact: ${source}`)
  }
  fs.copyFileSync(source, targetPath)
}

async function captureSuite(label: string, prefix: string): Promise<void> {
  const clickResult = inspect(['click', label])
  assert.ok(clickResult.includes('Clicked:'), `Expected click result for ${label}, got: ${clickResult}`)
  await sleep(200)

  const tree = inspect(['tree'])
  fs.writeFileSync(path.join(artifactRoot, `${prefix}.tree.txt`), tree)

  const shot = inspect(['screenshot'])
  assert.ok(shot.includes('Screenshot saved:'), `Expected screenshot output for ${label}, got: ${shot}`)
  copyLatestScreenshot(path.join(artifactRoot, `${prefix}.png`))
}

async function main(): Promise<void> {
  fs.rmSync(artifactRoot, { recursive: true, force: true })
  fs.mkdirSync(artifactRoot, { recursive: true })

  console.log('Building UI Gallery...')
  runCommand('./strictts', ['build', 'examples/native-gui/ui-gallery.tsx'])

  console.log('Launching UI Gallery...')
  const child = spawn('./build/ui-gallery', [], {
    cwd: root,
    stdio: 'ignore',
  })

  try {
    await waitForInspector()

    const initialTree = inspect(['tree'])
    assert.ok(initialTree.includes('Window "UI Gallery"'))
    fs.writeFileSync(path.join(artifactRoot, 'home.tree.txt'), initialTree)
    inspect(['screenshot'])
    copyLatestScreenshot(path.join(artifactRoot, 'home.png'))

    const suites = gallerySuites()
    let i = 0
    while (i < suites.length) {
      const suite = suites[i]
      await captureSuite(suite.label, suite.artifactPrefix)
      i = i + 1
    }

    const typed = inspect(['type', 'latency'])
    assert.ok(typed.includes('Typed: latency'))
    const queryResult = inspect(['find', 'latency'])
    assert.ok(queryResult.toLowerCase().includes('latency'))

    const firstIncrement = inspect(['click', 'Increment Counter'])
    assert.ok(firstIncrement.includes('Increment Counter'))
    const secondIncrement = inspect(['click', 'Increment Counter'])
    assert.ok(secondIncrement.includes('Increment Counter'))
    const counterTwo = inspect(['find', 'Counter 2'])
    assert.ok(counterTwo.includes('Counter 2'))

    const reset = inspect(['click', 'Reset Demo'])
    assert.ok(reset.includes('Reset Demo'))
    const counterZero = inspect(['find', 'Counter 0'])
    assert.ok(counterZero.includes('Counter 0'))

    fs.writeFileSync(path.join(artifactRoot, 'interaction.find.txt'), inspect(['find', 'Counter']))
    console.log(`UI conformance artifacts saved to ${artifactRoot}`)
  } finally {
    child.kill('SIGTERM')
    await sleep(250)
    if (!child.killed) child.kill('SIGKILL')
  }
}

main().catch((err: Error) => {
  console.error(err.message)
  process.exit(1)
})
