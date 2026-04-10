import test from 'node:test'

import { assertIncludesAll, generateCFromText } from '../helpers.js'

test('codegen lowers console.log to print helpers and newline', () => {
  const cCode = generateCFromText(`
function main(): void {
  console.log("hi", String(1), 2)
}
`)

  assertIncludesAll(cCode, [
    'print_str(str_lit("hi"))',
    'print_num(1)',
    'print_num(2)',
    'print_nl()',
  ])
})
