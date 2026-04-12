import test from 'node:test'

import { assertIncludesAll, compileAndRunFromText, generateCFromText } from '../helpers.js'

test('codegen lowers switch statements with cases and default', () => {
  const cCode = generateCFromText(`
function main(): void {
  const n: number = 2
  switch (n) {
    case 1:
      console.log("one")
      break
    case 2:
      console.log("two")
      break
    default:
      console.log("other")
  }
}
`)

  assertIncludesAll(cCode, [
    'switch ((int)(n)) {',
    'case 1: ;',
    'case 2: ;',
    'default: ;',
  ])
})

test('switch statements run end to end in compiled binaries', () => {
  const output = compileAndRunFromText(`
function main(): void {
  const n: number = 2
  switch (n) {
    case 1:
      console.log("one")
      break
    case 2:
      console.log("two")
      break
    default:
      console.log("other")
  }
}
`)

  assertIncludesAll(output, ['two'])
})
