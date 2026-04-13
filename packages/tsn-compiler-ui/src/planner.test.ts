import assert from 'node:assert/strict'
import test from 'node:test'

import { parseTailwind } from '../../tsn-tailwind/src/index.js'
import { buildPrimitivePlan } from './planner.js'

test('buildPrimitivePlan creates a canonical node with primitive kind and style source', () => {
  const tailwind = parseTailwind('w-[30%] text-sm font-semibold', '_j0')
  const plan = buildPrimitivePlan(
    'Text',
    '_j0',
    'w-[30%] text-sm font-semibold',
    { variant: 'hero', title: 'Hello' },
    tailwind,
  )

  assert.equal(plan.node.ref.id, '_j0')
  assert.equal(plan.node.ref.kind, 'text')
  assert.equal(plan.node.styleSource.className, 'w-[30%] text-sm font-semibold')
  assert.equal(plan.node.styleSource.variant, 'hero')
  assert.equal(plan.node.props.title, 'Hello')
  assert.deepEqual(plan.node.layoutStyle.width, { unit: 'percent', value: 30 })
  assert.equal(plan.node.textStyle.size, 14)
  assert.equal(plan.node.textStyle.weight, 6)
  assert.equal(plan.node.behavior.text?.kind, 'static')
  assert.equal(plan.node.behavior.text?.wrap, 'wrap')
})

test('buildPrimitivePlan tags search as a text-bearing editable primitive', () => {
  const plan = buildPrimitivePlan('Search', '_j1', '', { placeholder: 'Search' }, null)

  assert.equal(plan.node.ref.kind, 'input')
  assert.equal(plan.primitive?.layer, 'primitive')
  assert.equal(plan.node.behavior.text?.kind, 'search')
  assert.equal(plan.node.behavior.text?.editable, true)
  assert.equal(plan.node.behavior.text?.multiline, false)
})

test('buildPrimitivePlan tags textarea as multiline editable primitive', () => {
  const plan = buildPrimitivePlan('TextArea', '_j2', '', { placeholder: 'Write here' }, null)

  assert.equal(plan.node.ref.kind, 'input')
  assert.equal(plan.primitive?.layer, 'primitive')
  assert.equal(plan.node.behavior.text?.kind, 'textarea')
  assert.equal(plan.node.behavior.text?.editable, true)
  assert.equal(plan.node.behavior.text?.multiline, true)
  assert.equal(plan.node.behavior.text?.wrap, 'wrap')
})

test('buildPrimitivePlan registers checkbox as a primitive control', () => {
  const plan = buildPrimitivePlan('Checkbox', '_j3', '', { checked: true, label: 'Enable' }, null)

  assert.equal(plan.node.ref.kind, 'input')
  assert.equal(plan.primitive?.layer, 'primitive')
  assert.equal(plan.primitive?.tag, 'Checkbox')
})

test('buildPrimitivePlan registers select as a primitive control', () => {
  const plan = buildPrimitivePlan('Select', '_j6', '', { value: 'Medium' }, null)

  assert.equal(plan.node.ref.kind, 'input')
  assert.equal(plan.primitive?.layer, 'primitive')
  assert.equal(plan.primitive?.tag, 'Select')
})

test('buildPrimitivePlan distinguishes host primitives from higher-level components', () => {
  const cardPlan = buildPrimitivePlan('Card', '_j4', 'rounded-xl p-4', {}, parseTailwind('rounded-xl p-4', '_j4'))
  const stackPlan = buildPrimitivePlan('VStack', '_j5', 'gap-4', {}, parseTailwind('gap-4', '_j5'))

  assert.equal(cardPlan.primitive?.layer, 'component')
  assert.equal(cardPlan.primitive?.kind, 'card')
  assert.equal(stackPlan.primitive?.layer, 'primitive')
  assert.equal(stackPlan.primitive?.kind, 'stack')
})

test('buildPrimitivePlan carries responsive style variants from static className tokens', () => {
  const plan = buildPrimitivePlan('VStack', '_responsive', 'px-4 md:px-8 md:gap-6', {}, parseTailwind('px-4 md:px-8 md:gap-6', '_responsive'))

  assert.equal(plan.node.layoutStyle.paddingLeft, 16)
  assert.equal(plan.node.responsiveVariants?.length, 1)
  assert.equal(plan.node.responsiveVariants?.[0]?.selector.minWidth, 768)
  assert.equal(plan.node.responsiveVariants?.[0]?.layoutStyle.paddingLeft, 32)
  assert.equal(plan.node.responsiveVariants?.[0]?.layoutStyle.gap, 24)
})
