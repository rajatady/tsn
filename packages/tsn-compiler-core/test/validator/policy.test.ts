import assert from 'node:assert/strict'
import test from 'node:test'

import { validateMessages } from '../helpers.js'

test('validator bans any', () => {
  const messages = validateMessages('const value: any = 1\n')
  assert.ok(messages.some(msg => msg.includes('Type "any" is banned')))
})

test('validator bans unknown', () => {
  const messages = validateMessages('const value: unknown = 1\n')
  assert.ok(messages.some(msg => msg.includes('Type "unknown" is banned')))
})

test('validator bans type assertions', () => {
  const messages = validateMessages(`
function main(): void {
  const value = 1 as number
  console.log(String(value))
}
`)
  assert.ok(messages.some(msg => msg.includes('Type assertions ("as") are banned')))
})

test('validator bans non-null assertions', () => {
  const messages = validateMessages(`
function main(): void {
  const value = maybe!
  console.log(value)
}
`)
  assert.ok(messages.some(msg => msg.includes('Non-null assertions')))
})

test('validator bans var declarations', () => {
  const messages = validateMessages(`
function main(): void {
  var count = 1
  console.log(String(count))
}
`)
  assert.ok(messages.some(msg => msg.includes('"var" is banned')))
})

test('validator bans eval', () => {
  const messages = validateMessages('eval("1 + 1")\n')
  assert.ok(messages.some(msg => msg.includes('"eval" is banned')))
})

test('validator bans new Function', () => {
  const messages = validateMessages(`
function main(): void {
  const makeAdder = new Function("a", "b", "return a + b")
  console.log(String(makeAdder))
}
`)
  assert.ok(messages.some(msg => msg.includes('"new Function()" is banned')))
})

test('validator bans delete', () => {
  const messages = validateMessages(`
interface Person { name: string }
function main(p: Person): void {
  delete p.name
}
`)
  assert.ok(messages.some(msg => msg.includes('"delete" is banned')))
})

test('validator bans typeof expressions', () => {
  const messages = validateMessages(`
function main(x: number): void {
  console.log(typeof x)
}
`)
  assert.ok(messages.some(msg => msg.includes('"typeof" is banned')))
})

test('validator bans Proxy and Reflect', () => {
  const proxyMessages = validateMessages('const p = Proxy\n')
  const reflectMessages = validateMessages('const r = Reflect\n')
  assert.ok(proxyMessages.some(msg => msg.includes('"Proxy" is banned')))
  assert.ok(reflectMessages.some(msg => msg.includes('"Reflect" is banned')))
})

test('validator bans with statements', () => {
  const messages = validateMessages(`
function main(obj: { name: string }): void {
  with (obj) {
    console.log(name)
  }
}
`)
  assert.ok(messages.some(msg => msg.includes('"with" is banned')))
})

test('validator allows await inside async functions', () => {
  const messages = validateMessages(`
async function main(): Promise<void> {
  await work()
}
`)
  assert.equal(messages.length, 0)
})

test('validator rejects await outside async functions', () => {
  const messages = validateMessages(`
function main(): void {
  await work()
}
`)
  assert.ok(messages.some(msg => msg.includes('"await" is only supported inside async functions')))
})

test('validator requires async functions to return Promise<T> when annotated', () => {
  const messages = validateMessages(`
async function main(): number {
  return 1
}
`)
  assert.ok(messages.some(msg => msg.includes('async functions must return Promise<T>')))
})

test('validator rejects async arrow functions for now', () => {
  const messages = validateMessages(`
const run = async (): Promise<number> => {
  return 1
}
`)
  assert.ok(messages.some(msg => msg.includes('async arrow functions are not supported yet')))
})

test('validator rejects async methods for now', () => {
  const messages = validateMessages(`
class Worker {
  async run(): Promise<number> {
    return 1
  }
}
`)
  assert.ok(messages.some(msg => msg.includes('async class/object methods are not supported yet')))
})

test('validator rejects new Promise for now', () => {
  const messages = validateMessages(`
function main(): void {
  const p = new Promise((resolve) => resolve(1))
  console.log(String(p))
}
`)
  assert.ok(messages.some(msg => msg.includes('"new Promise(...)" is not supported yet')))
})

test('validator allows try/catch now', () => {
  const messages = validateMessages(`
function main(): void {
  try {
    console.log("x")
  } catch (err) {
    console.log("y")
  }
}
`)
  assert.equal(messages.length, 0)
})

test('validator allows straight-line finally and rejects unsupported finally control-flow corners', () => {
  const okMessages = validateMessages(`
function main(): void {
  try {
    console.log("x")
  } catch (err) {
    console.log("y")
  } finally {
    console.log("z")
  }
}
`)
  assert.equal(okMessages.length, 0)

  const messages = validateMessages(`
function main(): void {
  try {
    continue
  } catch (err) {
    console.log("y")
  } finally {
    console.log("z")
  }
}
`)
  assert.ok(messages.some(msg => msg.includes('finally currently does not support continue')))
})

test('validator bans generators for now', () => {
  const messages = validateMessages(`
function* gen(): Generator<number, void, void> {
  yield 1
}
`)
  assert.ok(messages.some(msg => msg.includes('Generators are banned')))
})

test('validator rejects general array destructuring', () => {
  const messages = validateMessages(`
function main(): void {
  const [a, b] = [1, 2]
  console.log(String(a + b))
}
`)
  assert.ok(messages.some(msg => msg.includes('Array destructuring is only supported')))
})

test('validator allows hook-shaped array destructuring', () => {
  const messages = validateMessages(`
declare function useState<T>(initial: T): [T, (next: T) => void]

function main(): void {
  const [count, setCount] = useState<number>(0)
  setCount(count + 1)
}
`)
  assert.equal(messages.length, 0)
})

test('validator allows switch statements now', () => {
  const messages = validateMessages(`
function main(): void {
  switch (1) {
    case 1:
      console.log("one")
      break
    default:
      console.log("other")
  }
}
`)
  assert.equal(messages.length, 0)
})
