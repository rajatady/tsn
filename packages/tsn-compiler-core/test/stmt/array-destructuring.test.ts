import assert from 'node:assert/strict'
import test from 'node:test'

import { assertIncludesAll, compileAndRunFromText, generateCFromText, validateMessages } from '../helpers.js'

test('validator allows array destructuring', () => {
  const messages = validateMessages(`
function main(): void {
  const names: string[] = []
  const [first, second] = names
  console.log(first)
}
`)
  assert.equal(messages.length, 0)
})

test('codegen lowers array destructuring to indexed access', () => {
  const cCode = generateCFromText(`
function main(): void {
  const nums: number[] = []
  const [a, b, c] = nums
  console.log(String(a))
}
`)

  assertIncludesAll(cCode, [
    'double a = nums.data[0]',
    'double b = nums.data[1]',
    'double c = nums.data[2]',
  ])
})

test('codegen lowers string array destructuring', () => {
  const cCode = generateCFromText(`
function main(): void {
  const parts: string[] = []
  const [head, tail] = parts
  console.log(head)
}
`)

  assertIncludesAll(cCode, [
    'Str head = parts.data[0]',
    'Str tail = parts.data[1]',
  ])
})

test('array destructuring from split works end to end', () => {
  const output = compileAndRunFromText(`
function main(): void {
  const line: string = "Alice|Engineering|120000"
  const parts = line.split("|")
  const [name, dept, salary] = parts
  console.log(name)
  console.log(dept)
  console.log(salary)
}
`)

  assertIncludesAll(output, ['Alice', 'Engineering', '120000'])
})

test('array destructuring with number array works end to end', () => {
  const output = compileAndRunFromText(`
function main(): void {
  const nums: number[] = []
  nums.push(10)
  nums.push(20)
  nums.push(30)
  const [a, b, c] = nums
  console.log(String(a + b + c))
}
`)

  assertIncludesAll(output, ['60'])
})

test('object destructuring in variable declarations works', () => {
  const cCode = generateCFromText(`
interface Person {
  name: string
  age: number
}

function main(): void {
  const p: Person = { name: "Ada", age: 37 }
  const { name, age } = p
  console.log(name)
  console.log(String(age))
}
`)

  assertIncludesAll(cCode, [
    'Str name = p.name',
    'double age = p.age',
  ])
})

test('object destructuring in declarations works end to end', () => {
  const output = compileAndRunFromText(`
interface Config {
  host: string
  port: number
  debug: boolean
}

function main(): void {
  const cfg: Config = { host: "localhost", port: 8080, debug: true }
  const { host, port, debug } = cfg
  console.log(host)
  console.log(String(port))
  console.log(debug)
}
`)

  assertIncludesAll(output, ['localhost', '8080', 'true'])
})
