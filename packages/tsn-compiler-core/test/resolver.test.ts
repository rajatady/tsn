import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import { resolveModules, TSX_UNSUPPORTED_MESSAGE } from '../src/resolver.js'

test('resolver rejects .tsx entry files with a clear error', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'tsn-resolver-'))
  const entryPath = join(tempDir, 'app.tsx')
  writeFileSync(entryPath, 'export function App() { return <View /> }\n')

  try {
    assert.throws(() => resolveModules(entryPath), (error: unknown) => {
      assert.ok(error instanceof Error)
      assert.match(error.message, new RegExp(TSX_UNSUPPORTED_MESSAGE))
      return true
    })
  } finally {
    rmSync(tempDir, { recursive: true, force: true })
  }
})
