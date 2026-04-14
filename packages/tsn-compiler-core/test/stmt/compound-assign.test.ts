import test from 'node:test'

import { assertIncludesAll, compileAndRunFromText, generateCFromText } from '../helpers.js'

test('codegen lowers *= and /= to C compound assignment', () => {
  const cCode = generateCFromText(`
function main(): void {
  let x: number = 10
  x *= 3
  x /= 2
  console.log(String(x))
}
`)

  assertIncludesAll(cCode, [
    '(x *= 3)',
    '(x /= 2)',
  ])
})

test('codegen lowers %= to fmod', () => {
  const cCode = generateCFromText(`
function main(): void {
  let x: number = 10
  x %= 3
  console.log(String(x))
}
`)

  assertIncludesAll(cCode, [
    'x = fmod(x, 3)',
  ])
})

test('compound assignment operators run end to end', () => {
  const output = compileAndRunFromText(`
function main(): void {
  let a: number = 6
  a *= 7
  console.log(String(a))

  let b: number = 100
  b /= 4
  console.log(String(b))

  let c: number = 17
  c %= 5
  console.log(String(c))
}
`)

  assertIncludesAll(output, ['42', '25', '2'])
})

test('compound assignment with existing += and -= still works', () => {
  const output = compileAndRunFromText(`
function main(): void {
  let x: number = 10
  x += 5
  x -= 3
  console.log(String(x))
}
`)

  assertIncludesAll(output, ['12'])
})
