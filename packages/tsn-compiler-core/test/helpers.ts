import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'

import * as ts from 'typescript'

import { generateCSingle } from '../src/codegen.js'
import { ensureLibuvStaticLibrary } from '../src/libuv.js'
import { validate } from '../src/validator.js'

export function sourceFromText(
  text: string,
  fileName = '/virtual/test.ts',
  scriptKind = ts.ScriptKind.TS,
): ts.SourceFile {
  return ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true, scriptKind)
}

export function validateMessages(text: string, fileName = '/virtual/test.ts'): string[] {
  return validate(sourceFromText(text, fileName)).map(err => err.message)
}

export function generateCFromText(text: string, fileName = '/virtual/test.ts'): string {
  return generateCSingle(sourceFromText(text, fileName), 'test')
}

export function assertIncludesAll(haystack: string, needles: string[]): void {
  for (const needle of needles) assert.ok(haystack.includes(needle), `expected output to include: ${needle}`)
}

export function assertExcludesAll(haystack: string, needles: string[]): void {
  for (const needle of needles) assert.ok(!haystack.includes(needle), `expected output to exclude: ${needle}`)
}

export function compileAndRunFromText(text: string, fileName = '/virtual/test.ts'): string {
  const cCode = generateCFromText(text, fileName)
  const tempDir = mkdtempSync(join(tmpdir(), 'tsn-compiler-core-'))
  const cPath = join(tempDir, 'program.c')
  const binPath = join(tempDir, 'program')
  const libuvLib = ensureLibuvStaticLibrary(resolve('.'))
  writeFileSync(cPath, cCode)
  try {
    execFileSync(
      'clang',
      ['-O0', '-o', binPath, cPath, libuvLib, '-lm', '-I', resolve('compiler/runtime'), '-I', resolve('vendor/libuv/include')],
      {
        cwd: resolve('.'),
        stdio: 'pipe',
      },
    )
    return execFileSync(binPath, { cwd: resolve('.'), stdio: 'pipe', encoding: 'utf8' })
  } finally {
    rmSync(tempDir, { recursive: true, force: true })
  }
}
