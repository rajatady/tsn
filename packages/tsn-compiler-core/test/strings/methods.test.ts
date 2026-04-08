import test from 'node:test'

import { assertIncludesAll, generateCFromText } from '../helpers.js'

test('codegen lowers string byte helpers to runtime primitives', () => {
  const cCode = generateCFromText(`
function main(): void {
  const s: string = "abc"
  const ch: number = s.charCodeAt(1)
  const rebuilt: string = String.fromCharCode(ch)
  console.log(rebuilt)
}
`)

  assertIncludesAll(cCode, [
    'str_at(s, (int)(1))',
    'str_from_charcode((int)(ch))',
  ])
})

test('codegen lowers string methods to runtime helpers', () => {
  const cCode = generateCFromText(`
function main(): void {
  const s: string = "  hello  "
  const a = s.trim()
  const b = s.trimStart()
  const c = s.trimEnd()
  const d = s.toLowerCase()
  const e = s.toUpperCase()
  const f = s.includes("ell")
  const g = s.startsWith(" ")
  const h = s.endsWith(" ")
  const i = s.indexOf("l", 2)
  console.log(a, b, c, d, e, String(i), String(f), String(g), String(h))
}
`)

  assertIncludesAll(cCode, [
    'str_trim(s)',
    'str_trim_start(s)',
    'str_trim_end(s)',
    'str_lower_ascii(s)',
    'str_upper_ascii(s)',
    'str_includes(s, str_lit("ell"))',
    'str_startsWith(s, str_lit(" "))',
    'str_endsWith(s, str_lit(" "))',
    'str_indexOf_from(s, str_lit("l"), (int)(2))',
  ])
})
