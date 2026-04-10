import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import { assertIncludesAll, compileAndRunFromText, generateCFromText, validateMessages } from '../helpers.js'

test('validator rejects non-identifier timer callbacks', () => {
  const messages = validateMessages(`
function main(): void {
  setTimeout(function (): void {}, 0)
}
`)

  assertIncludesAll(messages.join('\n'), [
    'setTimeout callbacks must be function identifiers or zero-argument arrow functions',
  ])
})

test('validator rejects timer arrows with parameters', () => {
  const messages = validateMessages(`
function main(): void {
  setInterval((n: number) => console.log(String(n)), 0)
}
`)

  assertIncludesAll(messages.join('\n'), [
    'setInterval arrow callbacks must not declare parameters',
  ])
})

test('codegen lowers setTimeout and clearTimeout with identifier callbacks', () => {
  const cCode = generateCFromText(`
function ping(): void {
  console.log("tick")
}

function main(): void {
  const id: number = setTimeout(ping, 5)
  clearTimeout(id)
}
`)

  assertIncludesAll(cCode, [
    'double id = ts_setTimeout(ping, 5);',
    'ts_clearTimeout(id);',
  ])
})

test('codegen lifts zero-arg timer arrows into static callbacks', () => {
  const cCode = generateCFromText(`
function main(): void {
  setTimeout(() => console.log("later"), 0)
}
`)

  assertIncludesAll(cCode, [
    'static void _timer_cb_',
    'print_str(str_lit("later"))',
    'ts_setTimeout(_timer_cb_',
  ])
})

test('codegen rejects timer arrows that capture outer variables', () => {
  assert.throws(
    () => generateCFromText(`
function main(): void {
  const label: string = "later"
  setTimeout(() => console.log(label), 0)
}
`),
    /Timer arrow callbacks cannot capture variables yet: label/,
  )
})

test('setTimeout fires while async await pumps the hosted loop', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'tsn-timer-timeout-'))
  const filePath = join(tempDir, 'timer.txt')
  try {
    const output = compileAndRunFromText(`
declare function writeFileAsync(path: string, content: string): Promise<void>

let fired: number = 0

function mark(): void {
  fired = 1
  console.log("timer-fired")
}

async function main(): Promise<void> {
  const id: number = setTimeout(mark, 0)
  await writeFileAsync(${JSON.stringify(filePath)}, "timeout")
  clearTimeout(id)
  console.log(String(fired))
}
`)

    assertIncludesAll(output, [
      'timer-fired',
      '1',
    ])
  } finally {
    rmSync(tempDir, { recursive: true, force: true })
  }
})

test('setInterval can be cleared after firing during hosted async work', () => {
  try {
    const output = compileAndRunFromText(`
declare function execAsync(cmd: string): Promise<number>

let ticks: number = 0

function tick(): void {
  ticks += 1
}

async function main(): Promise<void> {
  const id: number = setInterval(tick, 0)
  await execAsync("sleep 0.05")
  clearInterval(id)
  console.log(ticks > 0)
}
`)

    assertIncludesAll(output, [
      'true',
    ])
  } finally {
    // no temp artifacts to clean up in this interval case
  }
})
