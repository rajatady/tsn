import test from 'node:test'

import { assertIncludesAll, compileAndRunFromText, generateCFromText } from '../helpers.js'

test('codegen emits default parameter value at call site', () => {
  const cCode = generateCFromText(`
function greet(name: string = "world"): void {
  console.log("Hello " + name)
}

function main(): void {
  greet()
  greet("Alice")
}
`)

  assertIncludesAll(cCode, [
    'greet(str_lit("world"))',
    'greet(str_lit("Alice"))',
  ])
})

test('codegen emits default number parameter', () => {
  const cCode = generateCFromText(`
function add(a: number, b: number = 0): number {
  return a + b
}

function main(): void {
  console.log(String(add(5)))
  console.log(String(add(5, 3)))
}
`)

  assertIncludesAll(cCode, [
    'add(5, 0)',
    'add(5, 3)',
  ])
})

test('default string parameter works end to end', () => {
  const output = compileAndRunFromText(`
function greet(name: string = "world"): string {
  return "Hello " + name
}

function main(): void {
  console.log(greet())
  console.log(greet("Alice"))
}
`)

  assertIncludesAll(output, ['Hello world', 'Hello Alice'])
})

test('default number parameter works end to end', () => {
  const output = compileAndRunFromText(`
function repeat(text: string, times: number = 1): string {
  let result: string = ""
  let i: number = 0
  while (i < times) {
    result = result + text
    i = i + 1
  }
  return result
}

function main(): void {
  console.log(repeat("ha"))
  console.log(repeat("ha", 3))
}
`)

  assertIncludesAll(output, ['ha', 'hahaha'])
})

test('multiple default parameters work end to end', () => {
  const output = compileAndRunFromText(`
function format(value: number, prefix: string = "$", suffix: string = ""): string {
  return prefix + String(value) + suffix
}

function main(): void {
  console.log(format(42))
  console.log(format(42, "EUR "))
  console.log(format(42, "$", " USD"))
}
`)

  assertIncludesAll(output, ['$42', 'EUR 42', '$42 USD'])
})
