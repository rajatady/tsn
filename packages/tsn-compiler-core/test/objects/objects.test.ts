import test from 'node:test'

import { assertIncludesAll, generateCFromText } from '../helpers.js'

test('codegen lowers object literals for interface-shaped data', () => {
  const cCode = generateCFromText(`
interface Person {
  name: string
  age: number
}

function main(): void {
  const p: Person = { name: "Ada", age: 37 }
  console.log(p.name, String(p.age))
}
`)

  assertIncludesAll(cCode, [
    'typedef struct { Str name; double age; } Person;',
    'Person p = (Person){.name = str_lit("Ada"), .age = 37};',
  ])
})
