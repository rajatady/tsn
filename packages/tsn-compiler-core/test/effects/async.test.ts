import test from 'node:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import { assertIncludesAll, compileAndRunFromText, generateCFromText, validateMessages } from '../helpers.js'

// This suite is intentionally testing the async foundation in layers:
// 1. Promise<T> type/runtime emission
// 2. Hosted async builtin lowering to promise-returning wrappers
// 3. Narrow async/await lowering over hosted-loop-backed pending promises
//
// As async lowering lands, add cases for:
// - repeated awaits on the same promise
// - error/rejection propagation into try/catch
// - future fetch/timer APIs once those surfaces exist
test('codegen emits promise runtime types for promise-typed function signatures', () => {
  const cCode = generateCFromText(`
function later(): Promise<number> {
  return 1
}
`)

  assertIncludesAll(cCode, [
    'DEFINE_PROMISE(Promise_double, double)',
    'Promise_double later(void)',
  ])
})

test('codegen emits promise runtime types for promised array values', () => {
  const cCode = generateCFromText(`
function listLater(): Promise<string[]> {
  return []
}
`)

  assertIncludesAll(cCode, [
    'DEFINE_PROMISE(Promise_StrArr, StrArr)',
    'Promise_StrArr listLater(void)',
  ])
})

test('codegen lowers hosted async file builtins to promise-returning wrappers', () => {
  const cCode = generateCFromText(`
declare function readFileAsync(path: string): Promise<string>
declare function writeFileAsync(path: string, content: string): Promise<void>
declare function appendFileAsync(path: string, content: string): Promise<void>
declare function listDirAsync(path: string): Promise<string[]>

function copy(path: string): Promise<void> {
  writeFileAsync(path, "hello")
  appendFileAsync(path, " world")
  readFileAsync(path)
  listDirAsync("/tmp")
  return writeFileAsync(path, "done")
}
`)

  assertIncludesAll(cCode, [
    'DEFINE_PROMISE(Promise_Str, Str)',
    'DEFINE_PROMISE(Promise_StrArr, StrArr)',
    'DEFINE_PROMISE_VOID(Promise_void)',
    'static inline Promise_Str ts_readFileAsync(Str path) { Promise_Str _p = Promise_Str_pending(); ts_schedule_read_file(_p.state, path); return _p; }',
    'static inline Promise_void ts_writeFileAsync(Str path, Str content) { Promise_void _p = Promise_void_pending(); ts_schedule_write_file(_p.state, path, content, false); return _p; }',
    'static inline Promise_void ts_appendFileAsync(Str path, Str content) { Promise_void _p = Promise_void_pending(); ts_schedule_write_file(_p.state, path, content, true); return _p; }',
    'static inline Promise_StrArr ts_listDirAsync(Str path) { Promise_StrArr _p = Promise_StrArr_pending(); ts_schedule_list_dir(_p.state, path); return _p; }',
    'ts_readFileAsync(path)',
    'ts_writeFileAsync(path, str_lit("hello"))',
    'ts_appendFileAsync(path, str_lit(" world"))',
    'ts_listDirAsync(str_lit("/tmp"))',
    'Promise_void copy(Str path)',
  ])
})

test('codegen lowers hosted async process and stat builtins to promise-returning wrappers', () => {
  const cCode = generateCFromText(`
declare function fileExistsAsync(path: string): Promise<boolean>
declare function fileSizeAsync(path: string): Promise<number>
declare function execAsync(cmd: string): Promise<number>

function inspect(path: string): Promise<number> {
  fileExistsAsync(path)
  fileSizeAsync(path)
  return execAsync("true")
}
`)

  assertIncludesAll(cCode, [
    'DEFINE_PROMISE(Promise_bool, bool)',
    'DEFINE_PROMISE(Promise_double, double)',
    'static inline Promise_bool ts_fileExistsAsync(Str path) { Promise_bool _p = Promise_bool_pending(); ts_schedule_file_exists(_p.state, path); return _p; }',
    'static inline Promise_double ts_fileSizeAsync(Str path) { Promise_double _p = Promise_double_pending(); ts_schedule_file_size(_p.state, path); return _p; }',
    'static inline Promise_double ts_execAsync(Str cmd) { Promise_double _p = Promise_double_pending(); ts_schedule_exec(_p.state, cmd); return _p; }',
    'ts_fileExistsAsync(path)',
    'ts_fileSizeAsync(path)',
    'ts_execAsync(str_lit("true"))',
  ])
})

test('hosted async builtin wrappers return pending promises before await', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'tsn-async-io-'))
  const filePath = join(tempDir, 'demo.txt')
  try {
    const output = compileAndRunFromText(`
declare function writeFileAsync(path: string, content: string): Promise<void>
declare function readFileAsync(path: string): Promise<string>
declare function fileSizeAsync(path: string): Promise<number>

function main(): void {
  const write: Promise<void> = writeFileAsync(${JSON.stringify(filePath)}, "hello")
  const read: Promise<string> = readFileAsync(${JSON.stringify(filePath)})
  const size: Promise<number> = fileSizeAsync(${JSON.stringify(filePath)})
  console.log(String(write.state), String(read.state), String(size.state))
}
`)

    assertIncludesAll(output, [
      '0',
      '0',
      '0',
    ])
  } finally {
    rmSync(tempDir, { recursive: true, force: true })
  }
})

test('codegen lowers async functions and await into hosted-loop waits', () => {
  const cCode = generateCFromText(`
declare function readFileAsync(path: string): Promise<string>

async function load(path: string): Promise<string> {
  const text: string = await readFileAsync(path)
  return text
}
`)

  assertIncludesAll(cCode, [
    'Promise_Str load(Str path)',
    'Str text = TS_AWAIT(Promise_Str, ts_readFileAsync(path));',
    'return Promise_Str_resolved(text);',
  ])
})

test('codegen adds an implicit resolved return for async Promise<void> functions', () => {
  const cCode = generateCFromText(`
declare function writeFileAsync(path: string, content: string): Promise<void>

async function save(path: string): Promise<void> {
  await writeFileAsync(path, "done")
}
`)

  assertIncludesAll(cCode, [
    'Promise_void save(Str path)',
    'TS_AWAIT_VOID(Promise_void, ts_writeFileAsync(path, str_lit("done")));',
    'return Promise_void_resolved();',
  ])
})

test('async functions await hosted async I/O end to end in compiled binaries', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'tsn-async-await-'))
  const filePath = join(tempDir, 'await-demo.txt')
  try {
    const output = compileAndRunFromText(`
declare function writeFileAsync(path: string, content: string): Promise<void>
declare function readFileAsync(path: string): Promise<string>

async function load(path: string): Promise<string> {
  await writeFileAsync(path, "hello async")
  const text: string = await readFileAsync(path)
  return text
}

function main(): void {
  const result: Promise<string> = load(${JSON.stringify(filePath)})
  console.log(String(result.state), result.value)
}
`)

    assertIncludesAll(output, [
      '1',
      'hello async',
    ])
  } finally {
    rmSync(tempDir, { recursive: true, force: true })
  }
})

test('async main is awaited by the generated entrypoint', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'tsn-async-main-'))
  const filePath = join(tempDir, 'main-demo.txt')
  try {
    const output = compileAndRunFromText(`
declare function writeFileAsync(path: string, content: string): Promise<void>
declare function readFileAsync(path: string): Promise<string>

async function main(): Promise<void> {
  await writeFileAsync(${JSON.stringify(filePath)}, "entrypoint async")
  const text: string = await readFileAsync(${JSON.stringify(filePath)})
  console.log(text)
}
`)

    assertIncludesAll(output, [
      'entrypoint async',
    ])
  } finally {
    rmSync(tempDir, { recursive: true, force: true })
  }
})

test('validator allows await inside async functions now', () => {
  const messages = validateMessages(`
declare function work(): Promise<void>

async function main(): Promise<void> {
  await work()
}
`)

  if (messages.length !== 0) {
    throw new Error(`expected no async validation errors, got: ${messages.join('; ')}`)
  }
})
