import test from 'node:test'

import { assertIncludesAll, generateCFromText } from '../helpers.js'

test('codegen lowers arrow callbacks used by array helpers', () => {
  const cCode = generateCFromText(`
function main(): void {
  const nums: number[] = [1, 2, 3]
  const doubled = nums.map((n: number) => n * 2)
  const kept = doubled.filter((n: number) => n > 2)
  console.log(String(kept.length))
}
`)

  assertIncludesAll(cCode, [
    'DoubleArr _r',
    'if ((n > 2))',
  ])
})

test('codegen preserves read-only closure captures in array helper callbacks', () => {
  const cCode = generateCFromText(`
function main(): void {
  const limit: number = 2
  const nums: number[] = [1, 2, 3]
  const kept = nums.filter((n: number) => n > limit)
  console.log(String(kept.length))
}
`)

  assertIncludesAll(cCode, [
    'double limit = 2;',
    'if ((n > limit))',
  ])
})
