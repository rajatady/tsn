import assert from 'node:assert/strict'
import test from 'node:test'

import { assertIncludesAll, compileAndRunFromText, generateCFromText, validateMessages } from '../helpers.js'

test('validator allows Map<string, number> declarations', () => {
  const messages = validateMessages(`
function main(): void {
  const m = new Map<string, number>()
  m.set("a", 1)
}
`)
  assert.equal(messages.length, 0)
})

test('codegen emits correct map type name for Map<string, number>', () => {
  const cCode = generateCFromText(`
function main(): void {
  const m = new Map<string, number>()
  m.set("key", 42)
}
`)

  assertIncludesAll(cCode, [
    'StrDoubleMap',
    'StrDoubleMap_new()',
    'StrDoubleMap_set(',
  ])
})

test('Map<string, number> set/get/has works end to end', () => {
  const output = compileAndRunFromText(`
function main(): void {
  const counts = new Map<string, number>()
  counts.set("errors", 5)
  counts.set("warnings", 12)
  console.log(counts.has("errors"))
  console.log(counts.has("missing"))
  console.log(String(counts.get("errors") ?? -1))
  console.log(String(counts.get("missing") ?? -1))
  console.log(String(counts.size))
}
`)

  assertIncludesAll(output, ['true', 'false', '5', '-1', '2'])
})

test('Map<string, string> works end to end', () => {
  const output = compileAndRunFromText(`
function main(): void {
  const headers = new Map<string, string>()
  headers.set("Content-Type", "application/json")
  headers.set("Accept", "text/html")
  console.log(headers.get("Content-Type") ?? "none")
  console.log(headers.get("Missing") ?? "none")
  console.log(String(headers.size))
}
`)

  assertIncludesAll(output, ['application/json', 'none', '2'])
})

test('Map<number, string> works end to end', () => {
  const output = compileAndRunFromText(`
function main(): void {
  const names = new Map<number, string>()
  names.set(200, "OK")
  names.set(404, "Not Found")
  console.log(names.get(200) ?? "unknown")
  console.log(names.get(500) ?? "unknown")
  console.log(names.has(404))
}
`)

  assertIncludesAll(output, ['OK', 'unknown', 'true'])
})

test('Map.delete removes entries', () => {
  const output = compileAndRunFromText(`
function main(): void {
  const m = new Map<string, number>()
  m.set("a", 1)
  m.set("b", 2)
  console.log(String(m.size))
  m.delete("a")
  console.log(String(m.size))
  console.log(m.has("a"))
  console.log(m.has("b"))
}
`)

  assertIncludesAll(output, ['2', '1', 'false', 'true'])
})

test('Map overwrites existing key', () => {
  const output = compileAndRunFromText(`
function main(): void {
  const m = new Map<string, number>()
  m.set("count", 1)
  m.set("count", 99)
  console.log(String(m.get("count") ?? -1))
  console.log(String(m.size))
}
`)

  assertIncludesAll(output, ['99', '1'])
})
