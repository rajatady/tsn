import test from 'node:test'

import { assertIncludesAll, generateCFromText } from '../helpers.js'

test('codegen lowers template literals through StrBuf', () => {
  const cCode = generateCFromText(`
function main(): void {
  const name: string = "Ada"
  const count: number = 3
  const msg = \`Hello \${name} \${count}\`
  console.log(msg)
}
`)

  assertIncludesAll(cCode, [
    'STRBUF(_t',
    'strbuf_add_cstr',
    'strbuf_add_str',
    'strbuf_add_double',
  ])
})

test('codegen lowers string slice split and basic indexOf helpers', () => {
  const cCode = generateCFromText(`
function main(): void {
  const s: string = "a,b"
  const head = s.slice(0, 1)
  const parts = s.split(",")
  const idx = s.indexOf(",")
  console.log(head, String(parts.length), String(idx))
}
`)

  assertIncludesAll(cCode, [
    'str_slice(s, (int)(0), (int)(1))',
    'str_split(s, str_lit(","))',
    'str_indexOf(s, str_lit(","))',
  ])
})

test('codegen optimizes single-character string slice comparisons', () => {
  const cCode = generateCFromText(`
function main(): void {
  const s: string = "abc"
  const i: number = 1
  if (s.slice(i, i + 1) === "b") {
    console.log("ok")
  }
}
`)

  assertIncludesAll(cCode, [
    "str_at(s, (int)(i)) == 'b'",
  ])
})

test('codegen lowers repeated string concatenation with release-on-reassign semantics', () => {
  const cCode = generateCFromText(`
function main(): void {
  let result: string = ""
  const nums: number[] = [1, 2]
  for (const n of nums) {
    result = result + String(n)
  }
  console.log(result)
}
`)

  assertIncludesAll(cCode, [
    'Str _old',
    'STRBUF(_cat',
    'strbuf_add_str(&_cat',
    'strbuf_add_double(&_cat',
    'str_release(&_old',
  ])
})
