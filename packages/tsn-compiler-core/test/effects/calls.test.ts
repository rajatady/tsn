import test from 'node:test'

import { assertIncludesAll, generateCFromText } from '../helpers.js'

test('codegen lowers mixed builtin call paths through the extracted expression helpers', () => {
  const cCode = generateCFromText(`
function main(): void {
  const n = parseInt("42")
  const f = parseFloat("3.14")
  const s = String(n)
  const m = Math.max(n, 7)
  const ok = fileExists("package.json")
  console.log(s, String(f), String(m), String(ok))
}
`)

  assertIncludesAll(cCode, [
    'ts_parse_int(str_lit("42"))',
    'ts_parse_float(str_lit("3.14"))',
    'num_to_str(n)',
    'ts_math_max(n, 7)',
    'ts_fileExists(str_lit("package.json"))',
  ])
})

test('codegen lowers class field access and method dispatch through the extracted expression helpers', () => {
  const cCode = generateCFromText(`
class Counter {
  value: number

  constructor(start: number) {
    this.value = start
  }

  inc(): number {
    this.value = this.value + 1
    return this.value
  }
}

function main(): void {
  const c = new Counter(1)
  const a = c.value
  const b = c.inc()
  console.log(String(a), String(b))
}
`)

  assertIncludesAll(cCode, [
    'double a = c->value;',
    'double b = Counter_inc(c);',
  ])
})
