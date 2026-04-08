import test from 'node:test'

import { assertIncludesAll, generateCFromText } from '../helpers.js'

test('codegen monomorphizes generic classes on instantiation', () => {
  const cCode = generateCFromText(`
class Ring<T> {
  items: T[]

  constructor() {
    this.items = []
  }

  push(value: T): void {
    this.items.push(value)
  }
}

function main(): void {
  const nums = new Ring<number>()
  nums.push(42)
}
`)

  assertIncludesAll(cCode, [
    'typedef struct Ring_double_s Ring_double;',
    'Ring_double *Ring_double_new(void)',
    'void Ring_double_push(Ring_double *self, double value)',
    'Ring_double * nums = Ring_double_new();',
    'Ring_double_push(nums, 42);',
  ])
})
