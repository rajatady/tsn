import assert from 'node:assert/strict'
import test from 'node:test'

import { validateMessages } from '../helpers.js'

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
