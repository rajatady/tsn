import test from 'node:test'

import { assertIncludesAll, generateCFromText } from '../helpers.js'

test('codegen lowers if else and ternary expressions', () => {
  const cCode = generateCFromText(`
function main(): void {
  const n: number = 2
  const label = n > 1 ? "big" : "small"
  if (n > 1) {
    console.log(label)
  } else {
    console.log("nope")
  }
}
`)

  assertIncludesAll(cCode, [
    '((n > 1) ? str_lit("big") : str_lit("small"))',
    'if ((n > 1)) {',
    'else {',
  ])
})

test('codegen lowers while and for loops', () => {
  const cCode = generateCFromText(`
function main(): void {
  let i: number = 0
  while (i < 2) {
    i = i + 1
  }
  for (let j: number = 0; j < 2; j = j + 1) {
    console.log(String(j))
  }
}
`)

  assertIncludesAll(cCode, [
    'while ((i < 2)) {',
    'for (double j = 0; (j < 2); j = (j + 1)) {',
  ])
})

test('codegen lowers break and continue statements inside loops', () => {
  const cCode = generateCFromText(`
function main(): void {
  for (let i: number = 0; i < 4; i = i + 1) {
    if (i === 1) continue
    if (i === 3) break
    console.log(String(i))
  }
}
`)

  assertIncludesAll(cCode, [
    'continue;',
    'break;',
  ])
})
