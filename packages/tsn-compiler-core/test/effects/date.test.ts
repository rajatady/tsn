import test from 'node:test'

import { assertIncludesAll, compileAndRunFromText } from '../helpers.js'

test('Date.now() returns a positive number', () => {
  const output = compileAndRunFromText(`
function main(): void {
  const t: number = Date.now()
  if (t > 0) {
    console.log("ok")
  } else {
    console.log("bad")
  }
}
`)
  assertIncludesAll(output, ['ok'])
})

test('Date.now() increases over time', () => {
  const output = compileAndRunFromText(`
function main(): void {
  const a: number = Date.now()
  let sum: number = 0
  for (let i: number = 0; i < 10000; i += 1) {
    sum += i
  }
  const b: number = Date.now()
  if (b >= a) {
    console.log("ok")
  } else {
    console.log("bad")
  }
  console.log(String(sum))
}
`)
  assertIncludesAll(output, ['ok', '49995000'])
})
