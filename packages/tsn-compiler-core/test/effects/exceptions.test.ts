import assert from 'node:assert/strict'
import test from 'node:test'

import { assertIncludesAll, compileAndRunFromText, generateCFromText, validateMessages } from '../helpers.js'

test('validator allows narrow try/catch', () => {
  const messages = validateMessages(`
function main(): void {
  try {
    throw "boom"
  } catch (err) {
    console.log(err)
  }
}
`)

  assert.equal(messages.length, 0)
})

test('validator rejects finally for now', () => {
  const messages = validateMessages(`
function main(): void {
  try {
    console.log("x")
  } catch (err) {
    console.log(err)
  } finally {
    console.log("y")
  }
}
`)

  assert.ok(messages.some(msg => msg.includes('finally is not supported yet')))
})

test('codegen lowers throw/catch with runtime exception frames', () => {
  const cCode = generateCFromText(`
function main(): void {
  try {
    throw "boom"
  } catch (err) {
    console.log(err)
  }
}
`)

  assertIncludesAll(cCode, [
    'TSExceptionFrame _ts_try_',
    'ts_exception_push(&_ts_try_',
    'if (setjmp(_ts_try_',
    'Str err = _ts_try_',
  ])
})

test('sync throw is caught in compiled binaries', () => {
  const output = compileAndRunFromText(`
function fail(): void {
  throw "boom"
}

function main(): void {
  try {
    fail()
    console.log("unreachable")
  } catch (err) {
    console.log(err)
  }
}
`)

  assert.equal(output.trim(), 'boom')
})

test('await inside try/catch lowers rejected async flow through the exception runtime', () => {
  const cCode = generateCFromText(`
async function fail(): Promise<string> {
  throw "boom"
}

async function main(): Promise<void> {
  try {
    const text: string = await fail()
    console.log(text)
  } catch (err) {
    console.log(err)
  }
}
`)

  assertIncludesAll(cCode, [
    'return Promise_Str_rejected(str_lit("boom"));',
    'Promise_Str _ts_promise = fail(); ts_promise_wait(_ts_promise.state); if (Promise_Str_state(_ts_promise) == TS_PROMISE_REJECTED) { ts_exception_throw(Promise_Str_error(_ts_promise)); }',
  ])
})

test('async rejection is caught through await in compiled binaries', () => {
  const output = compileAndRunFromText(`
async function fail(): Promise<string> {
  throw "boom async"
}

async function main(): Promise<void> {
  try {
    const text: string = await fail()
    console.log(text)
  } catch (err) {
    console.log(err)
  }
}
`)

  assert.equal(output.trim(), 'boom async')
})
