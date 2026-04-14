import test from 'node:test'

import { assertIncludesAll, compileAndRunFromText } from '../helpers.js'

test('Math.abs works end to end', () => {
  const output = compileAndRunFromText(`
function main(): void {
  console.log(String(Math.abs(-42)))
  console.log(String(Math.abs(7)))
}
`)
  assertIncludesAll(output, ['42', '7'])
})

test('Math.ceil works end to end', () => {
  const output = compileAndRunFromText(`
function main(): void {
  console.log(String(Math.ceil(4.1)))
  console.log(String(Math.ceil(-2.9)))
}
`)
  assertIncludesAll(output, ['5', '-2'])
})

test('Math.pow and Math.sqrt work end to end', () => {
  const output = compileAndRunFromText(`
function main(): void {
  console.log(String(Math.pow(2, 10)))
  console.log(String(Math.sqrt(144)))
}
`)
  assertIncludesAll(output, ['1024', '12'])
})

test('Math.min and Math.max work end to end', () => {
  const output = compileAndRunFromText(`
function main(): void {
  console.log(String(Math.min(3, 7)))
  console.log(String(Math.max(3, 7)))
}
`)
  assertIncludesAll(output, ['3', '7'])
})

test('Math trig and log functions work end to end', () => {
  const output = compileAndRunFromText(`
function main(): void {
  console.log(String(Math.floor(Math.sin(0) * 100)))
  console.log(String(Math.floor(Math.cos(0) * 100)))
  console.log(String(Math.floor(Math.log(1) * 100)))
  console.log(String(Math.floor(Math.exp(0) * 100)))
}
`)
  assertIncludesAll(output, ['0', '100', '0', '100'])
})

test('Math.random returns a number between 0 and 1', () => {
  const output = compileAndRunFromText(`
function main(): void {
  const r: number = Math.random()
  if (r >= 0 && r < 1) {
    console.log("ok")
  } else {
    console.log("bad")
  }
}
`)
  assertIncludesAll(output, ['ok'])
})

test('Math.PI is available', () => {
  const output = compileAndRunFromText(`
function main(): void {
  console.log(String(Math.floor(Math.PI * 100)))
}
`)
  assertIncludesAll(output, ['314'])
})
