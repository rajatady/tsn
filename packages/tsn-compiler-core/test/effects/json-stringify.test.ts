import test from 'node:test'

import { assertIncludesAll, compileAndRunFromText } from '../helpers.js'

test('JSON.stringify on number', () => {
  const output = compileAndRunFromText(`
function main(): void {
  console.log(JSON.stringify(42))
}
`)
  assertIncludesAll(output, ['42'])
})

test('JSON.stringify on string', () => {
  const output = compileAndRunFromText(`
function main(): void {
  console.log(JSON.stringify("hello"))
}
`)
  assertIncludesAll(output, ['"hello"'])
})

test('JSON.stringify on boolean', () => {
  const output = compileAndRunFromText(`
function main(): void {
  console.log(JSON.stringify(true))
  console.log(JSON.stringify(false))
}
`)
  assertIncludesAll(output, ['true', 'false'])
})

test('JSON.stringify on interface', () => {
  const output = compileAndRunFromText(`
interface Person {
  name: string
  age: number
  active: boolean
}

function main(): void {
  const p: Person = { name: "Alice", age: 30, active: true }
  console.log(JSON.stringify(p))
}
`)
  assertIncludesAll(output, ['"name":"Alice"', '"age":30', '"active":true'])
})
