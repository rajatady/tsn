import test from 'node:test'

import { assertIncludesAll, generateCFromText } from '../helpers.js'

test('codegen lowers array some to inline loop', () => {
  const cCode = generateCFromText(`
function main(): void {
  const nums: number[] = [1, 2, 3]
  const hasBig = nums.some((n: number): boolean => n > 2)
  console.log(String(hasBig))
}
`)

  assertIncludesAll(cCode, [
    'bool _some',
    'for (int _i',
  ])
})

test('codegen lowers array predicate helpers', () => {
  const cCode = generateCFromText(`
function main(): void {
  const nums: number[] = [1, 2, 3]
  const ok = nums.every((n: number): boolean => n > 0)
  const idx = nums.findIndex((n: number): boolean => n === 2)
  const hasTwo = nums.includes(2)
  console.log(String(idx), String(ok), String(hasTwo))
}
`)

  assertIncludesAll(cCode, [
    'bool _every',
    'int _find',
    'bool _found',
  ])
})
