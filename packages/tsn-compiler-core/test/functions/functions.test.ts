import test from 'node:test'

import { assertIncludesAll, generateCFromText } from '../helpers.js'

test('codegen lowers plain function declarations', () => {
  const cCode = generateCFromText(`
function double(n: number) {
  return n * 2
}

function main(): void {
  console.log(String(double(3)))
}
`)

  assertIncludesAll(cCode, [
    'double double(double n);',
    'double double(double n) {',
    'return (n * 2);',
  ])
})

test('codegen emits global initialization for top-level values referenced in functions', () => {
  const cCode = generateCFromText(`
const greeting: string = "hello"

function main(): void {
  console.log(greeting)
}
`)

  assertIncludesAll(cCode, [
    'Str greeting;',
    'static void _ts_init_globals(void) {',
    'greeting = str_lit("hello");',
    '_ts_init_globals();',
  ])
})
