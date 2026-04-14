import test from 'node:test'

import { assertIncludesAll, compileAndRunFromText } from '../helpers.js'

test('string.match returns first match', () => {
  const output = compileAndRunFromText(`
function main(): void {
  const s: string = "error: code 404 found"
  const m: string = s.match("[0-9]+") ?? "none"
  console.log(m)
}
`)
  assertIncludesAll(output, ['404'])
})

test('string.match returns empty on no match', () => {
  const output = compileAndRunFromText(`
function main(): void {
  const s: string = "hello world"
  const m: string = s.match("[0-9]+") ?? "none"
  console.log(m)
}
`)
  assertIncludesAll(output, ['none'])
})

test('string.search returns index of first match', () => {
  const output = compileAndRunFromText(`
function main(): void {
  const s: string = "hello 42 world"
  console.log(String(s.search("[0-9]+")))
}
`)
  assertIncludesAll(output, ['6'])
})

test('string.search returns -1 on no match', () => {
  const output = compileAndRunFromText(`
function main(): void {
  const s: string = "hello world"
  console.log(String(s.search("[0-9]+")))
}
`)
  assertIncludesAll(output, ['-1'])
})
