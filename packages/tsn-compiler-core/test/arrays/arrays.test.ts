import test from 'node:test'

import { assertIncludesAll, generateCFromText } from '../helpers.js'

test('codegen lowers map reduce forEach and join', () => {
  const cCode = generateCFromText(`
function main(): void {
  const nums: number[] = [1, 2, 3]
  const doubled = nums.map((n: number) => n * 2)
  const total = doubled.reduce((acc: number, n: number) => acc + n, 0)
  doubled.forEach((n: number) => console.log(String(n)))
  const line = doubled.join(",")
  console.log(line)
  console.log(String(total))
}
`)

  assertIncludesAll(cCode, [
    'DoubleArr _r',
    'for (int _i',
    'double acc = 0;',
    'STRBUF(_join',
    'print_num(n)',
  ])
})

test('codegen lowers empty array literals push and slice helpers', () => {
  const cCode = generateCFromText(`
function main(): void {
  const nums: number[] = []
  nums.push(1)
  const tail = nums.slice(0, 1)
  console.log(String(tail.length))
}
`)

  assertIncludesAll(cCode, [
    'DoubleArr nums = DoubleArr_new();',
    'DoubleArr_push(&nums, 1);',
    'DoubleArr tail = DoubleArr_slice(&nums, (int)(0), (int)(1));',
  ])
})
