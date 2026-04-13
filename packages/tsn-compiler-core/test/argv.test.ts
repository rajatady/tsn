import assert from 'node:assert/strict'
import test from 'node:test'

import { parseCompilerArgs } from '../src/argv.js'

test('parseCompilerArgs defaults to macos and preserves passthrough flags', () => {
  const parsed = parseCompilerArgs(['--debug'])

  assert.equal(parsed.platform, 'macos')
  assert.equal(parsed.debug, true)
  assert.equal(parsed.simulator, null)
  assert.deepEqual(parsed.passthroughArgv, ['--debug'])
})

test('parseCompilerArgs extracts explicit ios platform selection', () => {
  const parsed = parseCompilerArgs(['--platform', 'ios', '--debug'])

  assert.equal(parsed.platform, 'ios')
  assert.equal(parsed.debug, true)
  assert.equal(parsed.simulator, null)
  assert.deepEqual(parsed.passthroughArgv, ['--debug'])
})

test('parseCompilerArgs extracts explicit simulator selection', () => {
  const parsed = parseCompilerArgs(['--platform', 'ios', '--simulator', 'iPhone 17 Pro'])

  assert.equal(parsed.platform, 'ios')
  assert.equal(parsed.simulator, 'iPhone 17 Pro')
  assert.deepEqual(parsed.passthroughArgv, [])
})

test('parseCompilerArgs rejects unknown platform values', () => {
  assert.throws(
    () => parseCompilerArgs(['--platform', 'android']),
    /Unsupported platform "android"/,
  )
})

test('parseCompilerArgs requires a simulator value when flag is present', () => {
  assert.throws(
    () => parseCompilerArgs(['--simulator']),
    /Missing simulator name/,
  )
})
