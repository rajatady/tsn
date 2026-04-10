import test from 'node:test'

import { assertIncludesAll, generateCFromText } from '../helpers.js'

test('codegen lowers exec builtin to runtime helper', () => {
  const cCode = generateCFromText(`
declare function exec(cmd: string): number

function main(): void {
  const rc = exec("true")
  console.log(String(rc))
}
`)

  assertIncludesAll(cCode, [
    'ts_exec(str_lit("true"))',
  ])
})
