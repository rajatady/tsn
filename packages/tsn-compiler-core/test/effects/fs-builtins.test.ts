import test from 'node:test'

import { assertIncludesAll, generateCFromText } from '../helpers.js'

test('codegen lowers hosted file builtins to runtime helpers', () => {
  const cCode = generateCFromText(`
declare function readFile(path: string): string
declare function writeFile(path: string, content: string): void
declare function appendFile(path: string, content: string): void
declare function fileExists(path: string): boolean
declare function fileSize(path: string): number
declare function listDir(path: string): string[]

function main(): void {
  const path: string = "/tmp/demo.txt"
  writeFile(path, "hello")
  appendFile(path, " world")
  const content = readFile(path)
  const ok = fileExists(path)
  const size = fileSize(path)
  const files = listDir("/tmp")
  console.log(content, String(size), String(files.length), String(ok))
}
`)

  assertIncludesAll(cCode, [
    'ts_writeFile(path, str_lit("hello"))',
    'ts_appendFile(path, str_lit(" world"))',
    'ts_readFile(path)',
    'ts_fileExists(path)',
    'ts_fileSize(path)',
    'ts_listDir(str_lit("/tmp"))',
  ])
})
