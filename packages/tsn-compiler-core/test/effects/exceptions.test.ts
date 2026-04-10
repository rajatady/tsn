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

test('validator allows straight-line finally and rejects unsupported control-flow corners', () => {
  const okMessages = validateMessages(`
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

  assert.equal(okMessages.length, 0)

  const messages = validateMessages(`
function main(): void {
  try {
    return
  } catch (err) {
    console.log(err)
  } finally {
    console.log("y")
  }
}
`)

  assert.ok(messages.some(msg => msg.includes('finally currently does not support return inside try blocks when finally is present')))
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

test('await inside try/catch lowers rejected async flow through resumable catch labels', () => {
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
    'Promise_Str_reject(frame->__promise, str_lit("boom"));',
    'frame->__await0 = fail();',
    'if (Promise_Str_state(frame->__await0) == TS_PROMISE_REJECTED) {',
    'frame->__error = Promise_Str_error(frame->__await0);',
    'goto _ts_async_catch_',
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

test('sync finally runs after straight-line success and after catch', () => {
  const output = compileAndRunFromText(`
function syncPass(): void {
  try {
    console.log("try")
  } catch (err) {
    console.log(err)
  } finally {
    console.log("finally-pass")
  }
}

function syncFail(): void {
  try {
    throw "boom"
  } catch (err) {
    console.log(err)
  } finally {
    console.log("finally-fail")
  }
}

function main(): void {
  syncPass()
  syncFail()
}
`)

  assertIncludesAll(output, [
    'try',
    'finally-pass',
    'boom',
    'finally-fail',
  ])
})

test('async finally runs after awaited success and after catch', () => {
  const output = compileAndRunFromText(`
async function pass(): Promise<void> {
  try {
    const value: string = await readFileAsync("compiler/runtime/runtime.h")
    console.log(value.length > 0)
  } catch (err) {
    console.log(err)
  } finally {
    console.log("finally-pass")
  }
}

async function fail(): Promise<void> {
  try {
    await readFileAsync("compiler/runtime/does-not-exist.h")
  } catch (err) {
    console.log("caught")
  } finally {
    console.log("finally-fail")
  }
}

async function main(): Promise<void> {
  await pass()
  await fail()
}
`)

  assertIncludesAll(output, [
    'true',
    'finally-pass',
    'caught',
    'finally-fail',
  ])
})
