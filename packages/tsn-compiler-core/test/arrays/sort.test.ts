import test from 'node:test'

import { assertIncludesAll, generateCFromText } from '../helpers.js'

test('codegen lifts sort comparators into top-level helper functions', () => {
  const cCode = generateCFromText(`
function main(): void {
  const nums: number[] = [3, 1, 2]
  nums.sort((a: number, b: number) => a - b)
}
`)

  assertIncludesAll(cCode, [
    'static int _cmp_',
    'qsort(nums.data, nums.len, sizeof(double), _cmp_',
  ])
})
