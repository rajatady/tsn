/**
 * Full-Page Geometry Oracle Harness
 *
 * Compares full app screens between native (StrictTS/AppKit) and
 * browser (Playwright/Tailwind CSS). The browser HTML is the oracle.
 *
 * Unlike the component harness (harness.ts), this tests composed layouts:
 * sidebar + content + hero + cards + grids — the full visual.
 *
 * Usage: npx tsx conformance/app-harness.ts
 */

import { execFileSync, spawn, type ChildProcess } from 'node:child_process'
import fs from 'node:fs'
import net from 'node:net'
import path from 'node:path'
import { performance } from 'node:perf_hooks'

import { appScreens, type AppScreen } from './app-registry.js'

const root = process.cwd()

// ─── Inspector Client ──────────────────────────────────────────────

function inspectSocket(appName: string): string {
  return `/tmp/strictts-inspect-${appName}.sock`
}

async function inspect(socket: string, command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = net.createConnection(socket)
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

async function waitForInspector(socket: string, windowTitle: string): Promise<void> {
  let attempt = 0
  while (attempt < 60) {
    try {
      const tree = await inspect(socket, 'tree')
      if (tree.includes(`Window "${windowTitle}"`)) return
    } catch {}
    attempt += 1
    await sleep(250)
  }
  throw new Error(`Inspector did not become ready for ${windowTitle}`)
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

async function getNativeGeometry(socket: string, testIds: string[]): Promise<Map<string, Frame>> {
  const frames = new Map<string, Frame>()
  for (const id of testIds) {
    const raw = await inspect(socket, `get ${id} wframe`)
    if (raw.includes('Element not found')) continue
    try {
      frames.set(id, parseInspectorFrame(raw))
    } catch {}
  }
  return frames
}

// ─── Browser Geometry (Playwright) ─────────────────────────────────

async function getBrowserGeometry(htmlPath: string, viewport: { width: number, height: number }, testIds: string[]): Promise<Map<string, Frame>> {
  const scriptPath = path.join(root, 'conformance', '_playwright-measure.mjs')

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

  // Group screens by app to avoid rebuilding/relaunching
  const byApp = new Map<string, AppScreen[]>()
  for (const screen of appScreens) {
    const list = byApp.get(screen.app) ?? []
    list.push(screen)
    byApp.set(screen.app, list)
  }

  let totalElements = 0
  let passedElements = 0
  let totalScreens = 0
  let passedScreens = 0

  for (const [appName, screens] of byApp) {
    const buildTarget = screens[0].buildTarget
    const socket = inspectSocket(appName)

    // Build
    console.log(`Building ${appName}...`)
    execFileSync('./strictts', ['build', buildTarget], {
      cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']
    })

    // Launch
    console.log(`Launching ${appName}...`)
    const binaryName = path.basename(buildTarget, '.tsx')
    const child: ChildProcess = spawn(`./build/${binaryName}`, [], { cwd: root, stdio: 'ignore' })

    try {
      await waitForInspector(socket, 'App Store')
      console.log('Inspector ready.\n')

      for (const screen of screens) {
        totalScreens++

        // Navigate if needed
        if (screen.navigateTo) {
          await inspect(socket, `clickid ${screen.navigateTo}`)
          await sleep(200)
        }

        // Read native geometry
        const nativeFrames = await getNativeGeometry(socket, screen.testIds)

        // Read browser geometry
        let browserFrames: Map<string, Frame>
        try {
          browserFrames = await getBrowserGeometry(screen.htmlOracle, screen.viewport, screen.testIds)
        } catch (err) {
          console.log(`  \x1b[31mSKIP\x1b[0m  ${screen.id} — browser error: ${(err as Error).message}`)
          continue
        }

        // Compare (no normalization — both use absolute window coordinates)
        const comparisons = compareGeometry(nativeFrames, browserFrames, screen.testIds, screen.tolerance)

        let screenPass = true
        console.log(`  ── ${screen.label} ──`)

        for (const c of comparisons) {
          totalElements++
          const n = c.native
            ? `${c.native.width.toFixed(0)}×${c.native.height.toFixed(0)} at ${c.native.x.toFixed(0)},${c.native.y.toFixed(0)}`
            : 'MISSING'
          const b = c.browser
            ? `${c.browser.width.toFixed(0)}×${c.browser.height.toFixed(0)} at ${c.browser.x.toFixed(0)},${c.browser.y.toFixed(0)}`
            : 'MISSING'

          if (c.pass) {
            passedElements++
            console.log(`    \x1b[32m✓\x1b[0m ${c.id}`)
          } else {
            screenPass = false
            const delta = `Δx=${c.deltaX.toFixed(0)} Δy=${c.deltaY.toFixed(0)} Δw=${c.deltaW.toFixed(0)} Δh=${c.deltaH.toFixed(0)}`
            console.log(`    \x1b[31m✗\x1b[0m ${c.id}`)
            console.log(`      native:  ${n}`)
            console.log(`      browser: ${b}`)
            console.log(`      ${delta}`)
          }
        }

        if (screenPass) {
          passedScreens++
          console.log(`  \x1b[32mPASS\x1b[0m\n`)
        } else {
          console.log(`  \x1b[31mFAIL\x1b[0m\n`)
        }
      }
    } finally {
      child.kill()
      await sleep(500)
    }
  }

  const elapsed = ((performance.now() - startedAt) / 1000).toFixed(1)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`Elements: ${passedElements}/${totalElements} pass`)
  console.log(`Screens:  ${passedScreens}/${totalScreens} pass`)
  console.log(`Time:     ${elapsed}s`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
