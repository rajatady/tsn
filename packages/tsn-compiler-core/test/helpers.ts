import assert from 'node:assert/strict'

import * as ts from 'typescript'

import { generateCSingle } from '../src/codegen.js'
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
