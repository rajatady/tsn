import test from 'node:test'

import { assertIncludesAll, generateCFromText, validateMessages } from '../helpers.js'

test('validator allows classes', () => {
  const messages = validateMessages(`
class Counter {
  value: number

  constructor(start: number) {
    this.value = start
  }

  inc(): void {
    this.value = this.value + 1
  }
}
`)
  if (messages.length !== 0) throw new Error(`expected no validator errors, got: ${messages.join('; ')}`)
})

test('codegen lowers classes to pointer-based constructors and methods', () => {
  const cCode = generateCFromText(`
class Counter {
  value: number

  constructor(start: number) {
    this.value = start
  }

  inc(): void {
    this.value = this.value + 1
  }
}

function main(): void {
  const c = new Counter(1)
  c.inc()
}
`)

  assertIncludesAll(cCode, [
    'typedef struct Counter_s Counter;',
    'Counter *Counter_new(double start)',
    'void Counter_inc(Counter *self)',
    'Counter * c = Counter_new(1);',
    'Counter_inc(c);',
  ])
})

test('codegen lowers object-valued and array-valued class fields', () => {
  const cCode = generateCFromText(`
interface Person {
  name: string
}

class Box {
  owner: Person
  history: number[]

  constructor(owner: Person) {
    this.owner = owner
    this.history = []
  }
}

function main(): void {
  const b = new Box({ name: "Ada" })
  console.log(b.owner.name, String(b.history.length))
}
`)

  assertIncludesAll(cCode, [
    'typedef struct { Str name; } Person;',
    'struct Box_s { Person owner; DoubleArr history; };',
    'self->owner = owner;',
    'self->history = DoubleArr_new();',
  ])
})
