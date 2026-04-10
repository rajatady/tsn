/**
 * Geometry Oracle Conformance Harness
 *
 * Compares element geometry between native (TSN/AppKit) and
 * browser (Playwright/Tailwind CSS). The browser is the oracle —
 * if positions/sizes match within tolerance, the layout is correct.
 *
 * Usage: npx tsx conformance/harness.ts
 */

import assert from 'node:assert/strict'
import { execFileSync, spawn } from 'node:child_process'
import fs from 'node:fs'
import net from 'node:net'
import path from 'node:path'
import { performance } from 'node:perf_hooks'

import { geometryCases, type GeometryCase } from './registry.js'

const root = process.cwd()
const artifactDir = '/tmp/tsn-geometry-conformance'
const inspectSocket = '/tmp/tsn-inspect-gallery.sock'
const casesDir = path.join(root, 'conformance', 'cases')

const DEFAULT_TOLERANCE = { position: 4, size: 8 }

// ─── Inspector Client ──────────────────────────────────────────────

async function inspect(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = net.createConnection(inspectSocket)
    const chunks: Buffer[] = []
    client.on('connect', () => client.write(command))
    client.on('data', (chunk) => chunks.push(chunk))
    client.on('end', () => resolve(Buffer.concat(chunks).toString('utf8').trim()))
    client.on('error', reject)
  })
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForInspector(): Promise<void> {
  let attempt = 0
  while (attempt < 40) {
    try {
      const tree = await inspect('tree')
      if (tree.includes('Window "Geometry Conformance"')) return
    } catch {}
    attempt += 1
    await sleep(250)
  }
  throw new Error('Gallery inspector did not become ready')
}

// ─── Geometry Types ────────────────────────────────────────────────

interface Frame {
  x: number
  y: number
  width: number
  height: number
}

function parseInspectorFrame(raw: string): Frame {
  const m = raw.trim().match(/^([0-9.]+)[×x]([0-9.]+)\s+at\s+([0-9.\-]+),([0-9.\-]+)$/)
  if (!m) throw new Error(`Cannot parse inspector frame: "${raw}"`)
  return { width: Number(m[1]), height: Number(m[2]), x: Number(m[3]), y: Number(m[4]) }
}

// ─── Native Geometry ───────────────────────────────────────────────

async function getNativeGeometry(testIds: string[]): Promise<Map<string, Frame>> {
  const frames = new Map<string, Frame>()
  for (const id of testIds) {
    const raw = await inspect(`get ${id} wframe`)
    if (raw.includes('Element not found')) continue
    try {
      frames.set(id, parseInspectorFrame(raw))
    } catch {}
  }
  return frames
}

// ─── Browser Geometry (Playwright) ─────────────────────────────────

async function getBrowserGeometry(htmlPath: string, viewport: { width: number, height: number }, testIds: string[]): Promise<Map<string, Frame>> {
  // Use Playwright via a sub-script that returns JSON
  const scriptPath = path.join(root, 'conformance', '_playwright-measure.mjs')

  // Write measurement script if it doesn't exist
  if (!fs.existsSync(scriptPath)) {
    fs.writeFileSync(scriptPath, `
import { chromium } from 'playwright';
const [,, htmlFile, vpWidth, vpHeight, ...ids] = process.argv;
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: +vpWidth, height: +vpHeight } });
await page.goto('file://' + htmlFile);
await page.waitForLoadState('networkidle');
const results = {};
for (const id of ids) {
  const el = await page.$('[data-testid="' + id + '"]');
  if (el) {
    const box = await el.boundingBox();
    if (box) results[id] = { x: box.x, y: box.y, width: box.width, height: box.height };
  }
}
console.log(JSON.stringify(results));
await browser.close();
`)
  }

  const absHtml = path.resolve(htmlPath)
  const result = execFileSync('node', [
    scriptPath,
    absHtml,
    String(viewport.width),
    String(viewport.height),
    ...testIds,
  ], {
    encoding: 'utf8',
    timeout: 30000,
    cwd: root,
  })

  const parsed = JSON.parse(result.trim()) as Record<string, Frame>
  const frames = new Map<string, Frame>()
  for (const [id, frame] of Object.entries(parsed)) {
    frames.set(id, frame)
  }
  return frames
}

// ─── Comparison ────────────────────────────────────────────────────

interface ElementComparison {
  id: string
  native: Frame | null
  browser: Frame | null
  deltaX: number
  deltaY: number
  deltaW: number
  deltaH: number
  pass: boolean
}

function compareGeometry(
  nativeFrames: Map<string, Frame>,
  browserFrames: Map<string, Frame>,
  testIds: string[],
  tolerance: { position: number, size: number },
): ElementComparison[] {
  return testIds.map(id => {
    const native = nativeFrames.get(id) ?? null
    const browser = browserFrames.get(id) ?? null

    if (!native || !browser) {
      return { id, native, browser, deltaX: NaN, deltaY: NaN, deltaW: NaN, deltaH: NaN, pass: false }
    }

    const deltaX = Math.abs(native.x - browser.x)
    const deltaY = Math.abs(native.y - browser.y)
    const deltaW = Math.abs(native.width - browser.width)
    const deltaH = Math.abs(native.height - browser.height)

    const pass =
      deltaX <= tolerance.position &&
      deltaY <= tolerance.position &&
      deltaW <= tolerance.size &&
      deltaH <= tolerance.size

    return { id, native, browser, deltaX, deltaY, deltaW, deltaH, pass }
  })
}

// ─── Main ──────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const startedAt = performance.now()
  fs.rmSync(artifactDir, { recursive: true, force: true })
  fs.mkdirSync(artifactDir, { recursive: true })

  // Filter cases if specific IDs are provided via CLI args
  const filterIds = process.argv.slice(2).filter(a => !a.startsWith('-'))
  const casesToRun = filterIds.length > 0
    ? geometryCases.filter(gc => filterIds.includes(gc.id))
    : geometryCases

  if (filterIds.length > 0) {
    console.log(`Running ${casesToRun.length} case(s): ${filterIds.join(', ')}`)
  }

  // Build gallery
  console.log('Building conformance gallery...')
  execFileSync('./tsn', ['build', 'conformance/gallery.tsx'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })

  // Launch gallery
  console.log('Launching conformance gallery...')
  const child = spawn('./build/gallery', [], { cwd: root, stdio: 'ignore' })

  try {
    await waitForInspector()
    console.log('Inspector ready.\n')

    let totalCases = 0
    let passedCases = 0
    const results: { caseId: string, label: string, pass: boolean, comparisons: ElementComparison[] }[] = []

    for (const gc of casesToRun) {
      totalCases++
      const tolerance = gc.tolerance ?? DEFAULT_TOLERANCE

      // Navigate to case in gallery
      await inspect(`clickid ${gc.id}`)
      await sleep(100)

      // Read native geometry
      const nativeFrames = await getNativeGeometry(gc.testIds)

      // Read browser geometry
      const htmlPath = path.join(casesDir, `${gc.id}.html`)
      let browserFrames: Map<string, Frame>
      try {
        browserFrames = await getBrowserGeometry(htmlPath, gc.viewport, gc.testIds)
      } catch (err) {
        console.log(`  SKIP  ${gc.id} — browser error: ${(err as Error).message}`)
        results.push({ caseId: gc.id, label: gc.label, pass: false, comparisons: [] })
        continue
      }

      // Normalize: make all native coordinates relative to root element
      const rootId = gc.testIds[0]
      const rootNative = nativeFrames.get(rootId)
      if (rootNative) {
        const ox = rootNative.x
        const oy = rootNative.y
        for (const [id, frame] of nativeFrames) {
          nativeFrames.set(id, {
            x: frame.x - ox,
            y: frame.y - oy,
            width: frame.width,
            height: frame.height,
          })
        }
      }

      // Compare
      const comparisons = compareGeometry(nativeFrames, browserFrames, gc.testIds, tolerance)
      const casePass = comparisons.every(c => c.pass)
      if (casePass) passedCases++

      const status = casePass ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m'
      console.log(`  ${status}  ${gc.id} — ${gc.label}`)

      if (!casePass) {
        for (const c of comparisons) {
          if (!c.pass) {
            const n = c.native ? `${c.native.width.toFixed(0)}x${c.native.height.toFixed(0)} at ${c.native.x.toFixed(0)},${c.native.y.toFixed(0)}` : 'MISSING'
            const b = c.browser ? `${c.browser.width.toFixed(0)}x${c.browser.height.toFixed(0)} at ${c.browser.x.toFixed(0)},${c.browser.y.toFixed(0)}` : 'MISSING'
            console.log(`         ${c.id}: native=${n}  browser=${b}  delta=x:${c.deltaX.toFixed(1)} y:${c.deltaY.toFixed(1)} w:${c.deltaW.toFixed(1)} h:${c.deltaH.toFixed(1)}`)
          }
        }
      }

      results.push({ caseId: gc.id, label: gc.label, pass: casePass, comparisons })

      // Save per-case artifact
      fs.writeFileSync(path.join(artifactDir, `${gc.id}.json`), JSON.stringify({
        case: gc.id,
        label: gc.label,
        pass: casePass,
        tolerance,
        comparisons: comparisons.map(c => ({
          id: c.id,
          native: c.native,
          browser: c.browser,
          delta: { x: c.deltaX, y: c.deltaY, w: c.deltaW, h: c.deltaH },
          pass: c.pass,
        })),
      }, null, 2))
    }

    const totalMs = Math.round(performance.now() - startedAt)
    console.log(`\n${passedCases}/${totalCases} cases passed (${totalMs}ms)`)

    // Summary
    fs.writeFileSync(path.join(artifactDir, 'summary.json'), JSON.stringify({
      totalMs,
      totalCases,
      passedCases,
      failedCases: totalCases - passedCases,
      cases: results.map(r => ({ id: r.caseId, label: r.label, pass: r.pass })),
    }, null, 2))

    if (passedCases < totalCases) {
      process.exitCode = 1
    }
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
