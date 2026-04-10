import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import { validateMessages } from '../helpers.js'
import { resolveModules } from '../../src/resolver.js'

test('validator rejects bare imports', () => {
  const messages = validateMessages(`
import { readFileSync } from "fs"

function main(): void {
  console.log(String(readFileSync))
}
`)

  assert.ok(messages.some(msg => msg.includes('Cannot import "fs"')))
})

test('validator allows relative imports', () => {
  const messages = validateMessages(`
import { helper } from "./helper"

function main(): void {
  console.log(String(helper))
}
`)

  assert.equal(messages.length, 0)
})

test('validator allows TSN stdlib imports', () => {
  const messages = validateMessages(`
import { readFileAsync } from "@tsn/fs"
import { fetch, Response } from "@tsn/http"

async function main(): Promise<void> {
  const text: string = await readFileAsync("build/file.txt")
  const res: Response = await fetch("https://example.com")
  console.log(text, String(res.status))
}
`)

  assert.equal(messages.length, 0)
})

test('resolver includes TSN stdlib modules in dependency order', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tsn-stdlib-modules-'))
  const entry = join(dir, 'entry.ts')
  writeFileSync(entry, `
import { readFileAsync } from "@tsn/fs"
import { fetch, Response } from "@tsn/http"

async function main(): Promise<void> {
  const text: string = await readFileAsync("x")
  const res: Response = await fetch("https://example.com")
  console.log(text, String(res.status))
}
`)

  try {
    const files = resolveModules(entry).map(sf => sf.fileName)
    assert.ok(files.some(file => file.endsWith('packages/tsn-fs/src/index.ts')))
    assert.ok(files.some(file => file.endsWith('packages/tsn-http/src/index.ts')))
    assert.equal(files[files.length - 1], entry)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
