import assert from 'node:assert/strict'
import { execFileSync, spawn } from 'node:child_process'
import fs from 'node:fs'
import net from 'node:net'
import path from 'node:path'
import { performance } from 'node:perf_hooks'

import { assertExpectation } from '../packages/tsn-testing/src/index.js'
import type { ConformanceAction, ConformanceCase, ConformanceSuite } from '../packages/tsn-testing/src/spec.js'
import { assertUiConformanceCoverage, summarizeUiConformanceCoverage } from '../conformance/ui/coverage.js'
import { uiConformanceSuites } from '../conformance/ui/specs/registry.js'

const root = '/Users/kumardivyarajat/WebstormProjects/bun-vite/vite'
const artifactRoot = '/tmp/tsn-ui-conformance'
const inspectApp = 'gallery'
const inspectSocket = `/tmp/strictts-inspect-${inspectApp}.sock`
const captureCaseScreenshots = process.env.UI_CONFORMANCE_CASE_SCREENSHOTS === '1'

function runCommand(file: string, args: string[]): string {
  return execFileSync(file, args, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
}

async function inspect(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = net.createConnection(inspectSocket)
    const chunks: Buffer[] = []

    client.on('connect', () => {
      client.write(args.join(' '))
    })

    client.on('data', (chunk) => {
      chunks.push(chunk)
    })

    client.on('end', () => {
      resolve(Buffer.concat(chunks).toString('utf8').trim())
    })

    client.on('error', (err) => {
      reject(err)
    })
  })
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForInspector(): Promise<void> {
  let attempt = 0
  while (attempt < 40) {
    try {
      const tree = await inspect(['tree'])
      if (tree.includes('Window "UI Gallery"')) return
    } catch (_err) {
    }
    attempt = attempt + 1
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

async function captureArtifact(prefix: string): Promise<void> {
  const tree = await inspect(['tree'])
  fs.writeFileSync(path.join(artifactRoot, `${prefix}.tree.txt`), tree)

  const shot = await inspect(['screenshot'])
  assert.ok(shot.includes('Screenshot saved:'), `Expected screenshot output for ${prefix}, got: ${shot}`)
  copyLatestScreenshot(path.join(artifactRoot, `${prefix}.png`))
}

async function clickById(id: string): Promise<void> {
  const result = await inspect(['clickid', id])
  assert.ok(result.includes('Clicked:'), `Expected click result for ${id}, got: ${result}`)
  await sleep(25)
}

async function clickByLabel(label: string): Promise<void> {
  const result = await inspect(['click', label])
  assert.ok(result.includes('Clicked:'), `Expected click result for ${label}, got: ${result}`)
  await sleep(25)
}

async function typeInto(id: string, text: string): Promise<void> {
  const result = await inspect(['typeid', id, text])
  assert.ok(result.includes('Typed into'), `Expected typed result for ${id}, got: ${result}`)
  await sleep(25)
}

async function runAction(action: ConformanceAction): Promise<void> {
  if (action.kind === 'click-id') {
    await clickById(action.id)
    return
  }
  if (action.kind === 'click-label') {
    await clickByLabel(action.label)
    return
  }
  await typeInto(action.id, action.text)
}

async function selectSuite(suite: ConformanceSuite): Promise<void> {
  await clickById(suite.navTestId)
}

async function resetCaseState(): Promise<void> {
  await clickById('shell.reset')
}

async function getPropAsync(id: string, prop: string): Promise<string> {
  const result = await inspect(['get', id, prop])
  assert.ok(!result.includes('Element not found:'), `Missing inspector element ${id}.${prop}: ${result}`)
  return result
}

async function runCase(suite: ConformanceSuite, testCase: ConformanceCase): Promise<void> {
  const startedAt = performance.now()
  await resetCaseState()

  let i = 0
  while (i < testCase.actions.length) {
    await runAction(testCase.actions[i])
    i = i + 1
  }

  const tree = await inspect(['tree'])
  let j = 0
  while (j < testCase.expects.length) {
    const expectation = testCase.expects[j]
    await assertExpectationAsync(expectation, tree)
    j = j + 1
  }

  const prefix = `${suite.artifactPrefix}.${testCase.id}`
  fs.writeFileSync(path.join(artifactRoot, `${prefix}.tree.txt`), tree)
  if (captureCaseScreenshots) {
    const shot = await inspect(['screenshot'])
    assert.ok(shot.includes('Screenshot saved:'), `Expected screenshot output for ${prefix}, got: ${shot}`)
    copyLatestScreenshot(path.join(artifactRoot, `${prefix}.png`))
  }

  const durationMs = Math.round(performance.now() - startedAt)
  fs.writeFileSync(path.join(artifactRoot, `${prefix}.meta.json`), JSON.stringify({
    suite: suite.id,
    case: testCase.id,
    label: testCase.label,
    durationMs,
    actions: testCase.actions.length,
    expectations: testCase.expects.length,
    coverage: testCase.coverage ?? [],
  }, null, 2))
}

async function assertExpectationAsync(expectation: ConformanceCase['expects'][number], tree: string): Promise<void> {
  const getProp = (id: string, prop: string) => {
    throw new Error(`Synchronous getProp called for ${id}.${prop}`)
  }
  if (expectation.kind === 'tree') {
    assertExpectation(expectation, getProp, tree)
    return
  }
  if (expectation.kind === 'frame') {
    const raw = await getPropAsync(expectation.id, 'frame')
    assertExpectation(expectation, () => raw, tree)
    return
  }
  const raw = await getPropAsync(expectation.id, expectation.prop)
  assertExpectation(expectation, () => raw, tree)
}

async function main(): Promise<void> {
  const runStartedAt = performance.now()
  fs.rmSync(artifactRoot, { recursive: true, force: true })
  fs.mkdirSync(artifactRoot, { recursive: true })

  console.log('Building UI conformance gallery...')
  runCommand('./strictts', ['build', 'conformance/gallery.tsx'])

  console.log('Launching UI conformance gallery...')
  const child = spawn('./build/gallery', [], {
    cwd: root,
    stdio: 'ignore',
  })

  try {
    await waitForInspector()
    await captureArtifact('home')

    const suites = uiConformanceSuites()
    assertUiConformanceCoverage(suites)
    const suiteSummaries: { id: string, label: string, caseCount: number, durationMs: number }[] = []
    let i = 0
    while (i < suites.length) {
      const suite = suites[i]
      const suiteStartedAt = performance.now()
      await selectSuite(suite)
      await captureArtifact(suite.artifactPrefix)

      let j = 0
      while (j < suite.cases.length) {
        await runCase(suite, suite.cases[j])
        j = j + 1
      }
      suiteSummaries.push({
        id: suite.id,
        label: suite.label,
        caseCount: suite.cases.length,
        durationMs: Math.round(performance.now() - suiteStartedAt),
      })
      i = i + 1
    }

    const coverageSummary = summarizeUiConformanceCoverage(suites)
    const totalDurationMs = Math.round(performance.now() - runStartedAt)
    fs.writeFileSync(path.join(artifactRoot, 'summary.json'), JSON.stringify({
      totalDurationMs,
      suiteCount: suites.length,
      caseCount: coverageSummary.caseCount,
      primitiveCount: coverageSummary.primitiveCount,
      suites: suiteSummaries,
      coverage: coverageSummary.primitives,
    }, null, 2))

    let summaryText = `UI conformance: ${coverageSummary.caseCount} cases, ${coverageSummary.primitiveCount} primitives, ${totalDurationMs}ms\n`
    let k = 0
    while (k < suiteSummaries.length) {
      summaryText += `${suiteSummaries[k].id}: ${suiteSummaries[k].caseCount} cases, ${suiteSummaries[k].durationMs}ms\n`
      k = k + 1
    }
    summaryText += '\nPrimitive coverage:\n'
    let m = 0
    while (m < coverageSummary.primitives.length) {
      const primitive = coverageSummary.primitives[m]
      summaryText += `${primitive.primitive}: props=${primitive.properties.join(',') || '-'} states=${primitive.states.join(',') || '-'} cases=${primitive.cases.length}\n`
      m = m + 1
    }
    fs.writeFileSync(path.join(artifactRoot, 'summary.txt'), summaryText)

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
