import assert from 'node:assert/strict'
import test from 'node:test'

import { assertIncludesAll, generateCFromText, validateMessages } from '../helpers.js'

test('validator allows object destructuring in parameters', () => {
  const messages = validateMessages(`
interface Person { name: string; age: number }

function greet({ name }: Person): void {
  console.log(name)
}
`)
  assert.equal(messages.length, 0)
})

test('codegen lowers destructured parameters by field extraction', () => {
  const cCode = generateCFromText(`
interface Person {
  name: string
  age: number
}

function greet({ name }: Person): void {
  console.log(name)
}

function main(): void {
  const p: Person = { name: "Ada", age: 37 }
  greet(p)
}
`)

  assertIncludesAll(cCode, [
    'Str name = _arg0.name;',
    'Person p = (Person){.name = str_lit("Ada"), .age = 37};',
  ])
})
