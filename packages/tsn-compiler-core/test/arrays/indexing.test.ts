import test from 'node:test'

import { assertIncludesAll, generateCFromText } from '../helpers.js'

test('codegen lowers array indexing get and set helpers', () => {
  const cCode = generateCFromText(`
function main(): void {
  const nums: number[] = [1, 2, 3]
  const at = nums[1]
  nums[1] = at + 10
  console.log(String(nums[1]))
}
`)

  assertIncludesAll(cCode, [
    'ARRAY_GET(nums, 1',
    'ARRAY_SET(nums, 1',
  ])
})

test('codegen lowers compound assignment on array indexing through checked helpers', () => {
  const cCode = generateCFromText(`
function main(): void {
  const nums: number[] = [1, 2, 3]
  nums[1] += 5
  console.log(String(nums[1]))
}
`)

  assertIncludesAll(cCode, [
    'ARRAY_SET(nums, 1, ARRAY_GET(nums, 1',
    ') + 5, "nums",',
  ])
})
