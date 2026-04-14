import test from 'node:test'

import { assertIncludesAll, generateCFromText } from '../helpers.js'

test('codegen lowers reduce for numeric aggregation', () => {
  const cCode = generateCFromText(`
function main(): void {
  const nums: number[] = [3, 1, 2]
  const total = nums.reduce((a: number, b: number): number => a + b, 0)
  console.log(String(total))
}
`)

  assertIncludesAll(cCode, [
    'double total',
  ])
})
