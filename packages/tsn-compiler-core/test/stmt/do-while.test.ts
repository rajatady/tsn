import test from 'node:test'

import { assertIncludesAll, compileAndRunFromText, generateCFromText } from '../helpers.js'

test('codegen lowers do-while loops', () => {
  const cCode = generateCFromText(`
function main(): void {
  let i: number = 0
  do {
    i = i + 1
  } while (i < 3)
  console.log(String(i))
}
`)

  assertIncludesAll(cCode, [
    'do {',
    '} while ((i < 3));',
  ])
})

test('do-while executes body at least once even when condition is false', () => {
  const output = compileAndRunFromText(`
function main(): void {
  let count: number = 0
  do {
    count = count + 1
  } while (count > 100)
  console.log(String(count))
}
`)

  assertIncludesAll(output, ['1'])
})

test('do-while loops with break and continue', () => {
  const cCode = generateCFromText(`
function main(): void {
  let i: number = 0
  do {
    if (i === 2) {
      i = i + 1
      continue
    }
    if (i === 4) break
    console.log(String(i))
    i = i + 1
  } while (i < 10)
}
`)

  assertIncludesAll(cCode, [
    'do {',
    'continue;',
    'break;',
    '} while ((i < 10));',
  ])
})

test('do-while runs end to end with multi-iteration loop', () => {
  const output = compileAndRunFromText(`
function main(): void {
  let sum: number = 0
  let i: number = 1
  do {
    sum = sum + i
    i = i + 1
  } while (i <= 5)
  console.log(String(sum))
}
`)

  assertIncludesAll(output, ['15'])
})
