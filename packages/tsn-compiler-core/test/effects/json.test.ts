import test from 'node:test'

import { assertIncludesAll, generateCFromText } from '../helpers.js'

test('codegen lowers JSON.parse to generated parser entrypoint', () => {
  const cCode = generateCFromText(`
interface Person {
  name: string
  age: number
}

function main(): void {
  const json: string = "[{\\"name\\":\\"Ada\\",\\"age\\":37}]"
  const people: Person[] = JSON.parse(json)
  console.log(String(people.length))
}
`)

  assertIncludesAll(cCode, [
    'PersonArr json_parse_Person_array(Str input)',
    'PersonArr people = json_parse_Person_array(json);',
  ])
})

test('codegen emits unknown-field skip logic in generated JSON parsers', () => {
  const cCode = generateCFromText(`
interface Person {
  name: string
  age: number
}

function main(): void {
  const json: string = "[{\\"name\\":\\"Ada\\",\\"age\\":37,\\"extra\\":1}]"
  const people: Person[] = JSON.parse(json)
  console.log(String(people.length))
}
`)

  assertIncludesAll(cCode, [
    'if (key.len == 4 && memcmp(key.data, "name", 4) == 0)',
    'if (key.len == 3 && memcmp(key.data, "age", 3) == 0)',
    "else{double d;pos=json_parse_number(s,pos,&d);}",
  ])
})
