import test from 'node:test'

import { assertIncludesAll, generateCFromText } from '../helpers.js'

test('codegen lowers numeric min and max reductions inline', () => {
  const cCode = generateCFromText(`
function main(): void {
  const nums: number[] = [3, 1, 2]
  const lo = nums.min()
  const hi = nums.max()
  console.log(String(lo), String(hi))
}
`)

  assertIncludesAll(cCode, [
    'double _min',
    'if (nums.data[_i',
    '< _min',
    'double _max',
    '> _max',
  ])
})
