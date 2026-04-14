import assert from 'node:assert/strict'
import test from 'node:test'

import { assertIncludesAll, compileAndRunFromText, generateCFromText, validateMessages } from '../helpers.js'

test('validator allows narrow nullable unions for strings, arrays, classes, numbers, and booleans', () => {
  const okMessages = validateMessages(`
class User {
  name: string
  constructor(name: string) {
    this.name = name
  }
}

function main(): void {
  const maybeName: string | null = null
  const maybeUser: User | undefined = undefined
  const maybeCount: number | null = null
  const maybeFlag: boolean | null = null
  console.log((maybeName ?? "anon") + String(maybeUser == null))
  console.log(String(maybeCount ?? 0))
  console.log(String(maybeFlag == null))
}
`)

  assert.equal(okMessages.length, 0)
})

test('validator rejects optional call chaining for now', () => {
  const messages = validateMessages(`
class User {
  name: string
  constructor(name: string) {
    this.name = name
  }
  label(): string {
    return this.name
  }
}

function main(): void {
  const maybeUser: User | null = null
  console.log(maybeUser?.label() ?? "anon")
}
`)

  assert.ok(messages.some(msg => msg.includes('Optional call chaining is not supported yet')))
})

test('codegen lowers nullish coalescing and optional property chaining', () => {
  const cCode = generateCFromText(`
class User {
  name: string
  constructor(name: string) {
    this.name = name
  }
}

function label(user: User | null): string {
  return user?.name ?? "anon"
}
`)

  assertIncludesAll(cCode, [
    'User * user',
    '_opt',
    '->name',
    '_coalesce',
    '.data == NULL',
  ])
})

test('narrow nullability works end to end for class refs and strings', () => {
  const output = compileAndRunFromText(`
class User {
  name: string

  constructor(name: string) {
    this.name = name
  }
}

function label(user: User | null): string {
  return user?.name ?? "anon"
}

function main(): void {
  const nobody: User | null = null
  const somebody: User | null = new User("raj")
  const maybeText: string | null = null
  console.log(label(nobody))
  console.log(label(somebody))
  console.log(maybeText ?? "fallback")
  console.log(nobody == null)
  console.log(somebody != null)
}
`)

  assertIncludesAll(output, [
    'anon',
    'raj',
    'fallback',
    'true',
    'true',
  ])
})

test('codegen lowers nullable number with nullish coalescing', () => {
  const cCode = generateCFromText(`
function main(): void {
  const count: number | null = null
  const result: number = count ?? 42
  console.log(String(result))
}
`)

  assertIncludesAll(cCode, [
    'NullableDouble count = (NullableDouble){0, false}',
    '_coalesce',
    '.has_value',
    '.value',
  ])
})

test('codegen lowers nullable boolean with null check', () => {
  const cCode = generateCFromText(`
function main(): void {
  const flag: boolean | null = null
  if (flag === null) {
    console.log("null")
  }
}
`)

  assertIncludesAll(cCode, [
    'NullableBool flag = (NullableBool){false, false}',
    '!flag.has_value',
  ])
})

test('nullable number works end to end', () => {
  const output = compileAndRunFromText(`
function fallback(n: number | null): number {
  return n ?? -1
}

function main(): void {
  const a: number | null = 42
  const b: number | null = null
  console.log(String(fallback(a)))
  console.log(String(fallback(b)))
  console.log(a === null)
  console.log(b === null)
}
`)

  assertIncludesAll(output, ['42', '-1', 'false', 'true'])
})

test('nullable boolean works end to end', () => {
  const output = compileAndRunFromText(`
function check(flag: boolean | null): string {
  if (flag === null) return "unknown"
  const val: boolean = flag ?? false
  if (val) return "yes"
  return "no"
}

function main(): void {
  const a: boolean | null = true
  const b: boolean | null = false
  const c: boolean | null = null
  console.log(check(a))
  console.log(check(b))
  console.log(check(c))
}
`)

  assertIncludesAll(output, ['yes', 'no', 'unknown'])
})
