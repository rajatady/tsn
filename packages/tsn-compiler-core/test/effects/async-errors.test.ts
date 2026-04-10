import assert from 'node:assert/strict'
import test from 'node:test'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import { assertIncludesAll, compileAndRunFromText, compileAndRunResultFromText } from '../helpers.js'

test('readFileAsync rejects missing files and can be caught', () => {
  const missingPath = join(tmpdir(), 'tsn-missing-read-file-does-not-exist.txt')
  const output = compileAndRunFromText(`
declare function readFileAsync(path: string): Promise<string>

async function main(): Promise<void> {
  try {
    const text: string = await readFileAsync(${JSON.stringify(missingPath)})
    console.log(text)
  } catch (err) {
    console.log("caught", err)
  }
}
`)

  assertIncludesAll(output, ['caught', 'readFileAsync failed'])
})

test('writeFileAsync rejects invalid destinations and can be caught', () => {
  const impossiblePath = '/definitely-not-a-real-dir/tsn/forbidden.txt'
  const output = compileAndRunFromText(`
declare function writeFileAsync(path: string, content: string): Promise<void>

async function main(): Promise<void> {
  try {
    await writeFileAsync(${JSON.stringify(impossiblePath)}, "hello")
    console.log("unreachable")
  } catch (err) {
    console.log("caught", err)
  }
}
`)

  assertIncludesAll(output, ['caught', 'writeFileAsync failed'])
})

test('fileSizeAsync rejects missing paths and can be caught', () => {
  const missingPath = join(tmpdir(), 'tsn-missing-size-file-does-not-exist.txt')
  const output = compileAndRunFromText(`
declare function fileSizeAsync(path: string): Promise<number>

async function main(): Promise<void> {
  try {
    const size: number = await fileSizeAsync(${JSON.stringify(missingPath)})
    console.log(String(size))
  } catch (err) {
    console.log("caught", err)
  }
}
`)

  assertIncludesAll(output, ['caught', 'fileSizeAsync failed'])
})

test('listDirAsync rejects missing directories and can be caught', () => {
  const missingDir = join(tmpdir(), 'tsn-missing-dir-does-not-exist')
  const output = compileAndRunFromText(`
declare function listDirAsync(path: string): Promise<string[]>

async function main(): Promise<void> {
  try {
    const entries: string[] = await listDirAsync(${JSON.stringify(missingDir)})
    console.log(String(entries.length))
  } catch (err) {
    console.log("caught", err)
  }
}
`)

  assertIncludesAll(output, ['caught', 'listDirAsync failed'])
})

test('execAsync preserves child stderr without turning it into a runtime failure', () => {
  const result = compileAndRunResultFromText(`
declare function execAsync(cmd: string): Promise<number>

async function main(): Promise<void> {
  const code: number = await execAsync("sh -c 'echo async-stderr 1>&2; exit 0'")
  console.log("done", String(code))
}
`)

  assert.equal(result.status, 0)
  assert.match(result.stderr, /async-stderr/)
  assert.match(result.stdout, /done/)
})

test('Promise.value on a pending async result fails with a clear runtime message instead of undefined behavior', () => {
  const result = compileAndRunResultFromText(`
declare function readFileAsync(path: string): Promise<string>

function main(): void {
  const pending: Promise<string> = readFileAsync("pending-demo.txt")
  console.log(pending.value)
}
`)

  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /Promise_Str\.value accessed a pending promise/)
})

test('Promise.value on a rejected async result fails with a clear runtime message instead of undefined behavior', () => {
  const result = compileAndRunResultFromText(`
async function fail(): Promise<string> {
  throw "boom"
}

function main(): void {
  const rejected: Promise<string> = fail()
  console.log(rejected.value)
}
`)

  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /Promise_Str\.value accessed a rejected promise/)
})
