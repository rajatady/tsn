import assert from 'node:assert/strict'
import test from 'node:test'

import { assertIncludesAll, compileAndRunFromText, generateCFromText, validateMessages } from '../helpers.js'

test('validator allows narrow nullable unions and rejects unsupported nullable numbers', () => {
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
  console.log((maybeName ?? "anon") + String(maybeUser == null))
}
`)

  assert.equal(okMessages.length, 0)

  const badMessages = validateMessages(`
function main(): void {
  const count: number | null = null
  console.log(String(count))
}
`)

  assert.ok(badMessages.some(msg => msg.includes('Nullable unions currently only support string, arrays, and same-file class references')))
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
