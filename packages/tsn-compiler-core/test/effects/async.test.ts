import test from 'node:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import { assertIncludesAll, compileAndRunFromText, generateCFromText, validateMessages } from '../helpers.js'

// This suite is intentionally testing the async foundation in layers:
// 1. Promise<T> type/runtime emission
// 2. Hosted async builtin lowering to promise-returning wrappers
// 3. The current "await is still banned" boundary
//
// As async lowering lands, add cases for:
// - Promise<void> returns through async functions
// - await on already-resolved promises
// - sequential vs repeated awaits on the same promise
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
    'static inline Promise_Str ts_readFileAsync(Str path) { return Promise_Str_resolved(ts_readFile(path)); }',
    'static inline Promise_void ts_writeFileAsync(Str path, Str content) { ts_writeFile(path, content); return Promise_void_resolved(); }',
    'static inline Promise_void ts_appendFileAsync(Str path, Str content) { ts_appendFile(path, content); return Promise_void_resolved(); }',
    'static inline Promise_StrArr ts_listDirAsync(Str path) { return Promise_StrArr_resolved(ts_listDir(path)); }',
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
    'static inline Promise_bool ts_fileExistsAsync(Str path) { return Promise_bool_resolved(ts_fileExists(path)); }',
    'static inline Promise_double ts_fileSizeAsync(Str path) { return Promise_double_resolved(ts_fileSize(path)); }',
    'static inline Promise_double ts_execAsync(Str cmd) { return Promise_double_resolved(ts_exec(cmd)); }',
    'ts_fileExistsAsync(path)',
    'ts_fileSizeAsync(path)',
    'ts_execAsync(str_lit("true"))',
  ])
})

test('hosted async builtin wrappers behave synchronously today in compiled binaries', () => {
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
  console.log(String(write.state), read.value, String(size.value))
}
`)

    assertIncludesAll(output, [
      '1',
      'hello',
      '5',
    ])
  } finally {
    rmSync(tempDir, { recursive: true, force: true })
  }
})

test('validator still bans await until async lowering exists', () => {
  const messages = validateMessages(`
async function main(): Promise<void> {
  await work()
}
`)

  if (!messages.some(msg => msg.includes('async/await is banned'))) {
    throw new Error(`expected async ban message, got: ${messages.join('; ')}`)
  }
})
