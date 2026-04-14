import test from 'node:test'

import { assertIncludesAll, compileAndRunFromText, generateCFromText } from '../helpers.js'

test('string.replace works end to end', () => {
  const output = compileAndRunFromText(`
function main(): void {
  const s: string = "hello world"
  console.log(s.replace("world", "TSN"))
}
`)
  assertIncludesAll(output, ['hello TSN'])
})

test('string.replaceAll works end to end', () => {
  const output = compileAndRunFromText(`
function main(): void {
  const s: string = "a-b-c-d"
  console.log(s.replaceAll("-", "_"))
}
`)
  assertIncludesAll(output, ['a_b_c_d'])
})

test('string.repeat works end to end', () => {
  const output = compileAndRunFromText(`
function main(): void {
  const s: string = "ha"
  console.log(s.repeat(3))
  console.log("x".repeat(5))
}
`)
  assertIncludesAll(output, ['hahaha', 'xxxxx'])
})

test('codegen lowers replace to str_replace', () => {
  const cCode = generateCFromText(`
function main(): void {
  const s: string = "hello"
  const r = s.replace("l", "r")
  console.log(r)
}
`)
  assertIncludesAll(cCode, ['str_replace('])
})
