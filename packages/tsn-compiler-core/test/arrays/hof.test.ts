import test from 'node:test'

import { assertIncludesAll, generateCFromText } from '../helpers.js'

test('codegen lowers array some and sum to inline loops', () => {
  const cCode = generateCFromText(`
function main(): void {
  const nums: number[] = [1, 2, 3]
  const hasBig = nums.some((n: number) => n > 2)
  const total = nums.sum()
  console.log(String(total))
  console.log(String(hasBig))
}
`)

  assertIncludesAll(cCode, [
    'bool _some',
    'for (int _i',
    'double _sum',
    '_sum',
  ])
})

test('codegen lowers array predicate helpers', () => {
  const cCode = generateCFromText(`
function main(): void {
  const nums: number[] = [1, 2, 3]
  const ok = nums.every((n: number) => n > 0)
  const idx = nums.findIndex((n: number) => n === 2)
  const count = nums.count((n: number) => n >= 2)
  const hasTwo = nums.includes(2)
  console.log(String(idx), String(count), String(ok), String(hasTwo))
}
`)

  assertIncludesAll(cCode, [
    'bool _every',
    'int _find',
    'int _count',
    'bool _found',
  ])
})
