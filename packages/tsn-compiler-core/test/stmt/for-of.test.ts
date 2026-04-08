import test from 'node:test'

import { assertIncludesAll, generateCFromText } from '../helpers.js'

test('codegen lowers for-of loops over arrays', () => {
  const cCode = generateCFromText(`
function main(): void {
  const nums: number[] = [1, 2, 3]
  for (const n of nums) {
    console.log(String(n))
  }
}
`)

  assertIncludesAll(cCode, [
    'for (int _i',
    'double n = nums.data[_i',
  ])
})
