import test from 'node:test'

import { assertIncludesAll, compileAndRunFromText } from '../helpers.js'

test('Set<string> add/has/delete works end to end', () => {
  const output = compileAndRunFromText(`
function main(): void {
  const seen = new Set<string>()
  seen.add("alice")
  seen.add("bob")
  console.log(seen.has("alice"))
  console.log(seen.has("charlie"))
  console.log(String(seen.size))
  seen.delete("alice")
  console.log(seen.has("alice"))
  console.log(String(seen.size))
}
`)

  assertIncludesAll(output, ['true', 'false', '2', 'false', '1'])
})

test('Set<number> works end to end', () => {
  const output = compileAndRunFromText(`
function main(): void {
  const ids = new Set<number>()
  ids.add(1)
  ids.add(2)
  ids.add(3)
  ids.add(2)
  console.log(String(ids.size))
  console.log(ids.has(2))
  console.log(ids.has(99))
}
`)

  assertIncludesAll(output, ['3', 'true', 'false'])
})

test('Set duplicate add does not increase size', () => {
  const output = compileAndRunFromText(`
function main(): void {
  const s = new Set<string>()
  s.add("x")
  s.add("x")
  s.add("x")
  console.log(String(s.size))
}
`)

  assertIncludesAll(output, ['1'])
})
