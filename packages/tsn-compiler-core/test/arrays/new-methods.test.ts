import test from 'node:test'

import { assertIncludesAll, compileAndRunFromText } from '../helpers.js'

test('array.reverse works end to end for numbers', () => {
  const output = compileAndRunFromText(`
function main(): void {
  const nums: number[] = []
  nums.push(1)
  nums.push(2)
  nums.push(3)
  const rev = nums.reverse()
  console.log(String(rev[0]))
  console.log(String(rev[1]))
  console.log(String(rev[2]))
}
`)
  assertIncludesAll(output, ['3', '2', '1'])
})

test('array.reverse works end to end for strings', () => {
  const output = compileAndRunFromText(`
function main(): void {
  const words: string[] = []
  words.push("a")
  words.push("b")
  words.push("c")
  const rev = words.reverse()
  console.log(rev.join(","))
}
`)
  assertIncludesAll(output, ['c,b,a'])
})

test('array.pop works end to end', () => {
  const output = compileAndRunFromText(`
function main(): void {
  const items: string[] = []
  items.push("first")
  items.push("second")
  items.push("third")
  const last = items.pop()
  console.log(last)
  console.log(String(items.length))
}
`)
  assertIncludesAll(output, ['third', '2'])
})

test('array.pop on number array', () => {
  const output = compileAndRunFromText(`
function main(): void {
  const nums: number[] = []
  nums.push(10)
  nums.push(20)
  const val = nums.pop()
  console.log(String(val))
  console.log(String(nums.length))
}
`)
  assertIncludesAll(output, ['20', '1'])
})
