import assert from 'node:assert/strict'
import test from 'node:test'

import { parseTailwind } from '../../tsn-tailwind/src/index.js'
import { buildHostPlanEmission } from './host_plan.js'
import { buildPrimitivePlan } from './planner.js'

test('buildHostPlanEmission converts a canonical stack node into host create and style calls', () => {
  const tailwind = parseTailwind('w-[240] gap-3 p-4', '_j0')
  const plan = buildPrimitivePlan('VStack', '_j0', 'w-[240] gap-3 p-4', {}, tailwind)

  const emission = buildHostPlanEmission(plan.node)

  assert.equal(emission.hostPlan.createCall, 'ui_vstack()')
  assert.ok(emission.hostPlan.styleCalls.includes('ui_set_size(_j0, 240, -1);'))
  assert.ok(emission.hostPlan.styleCalls.includes('ui_set_spacing(_j0, 12);'))
  assert.ok(emission.hostPlan.styleCalls.includes('ui_set_padding(_j0, 16, 16, 16, 16);'))
})

test('buildHostPlanEmission converts a canonical search node into a host search-field create call', () => {
  const plan = buildPrimitivePlan('Search', '_j1', '', { placeholder: 'Search apps' }, null)

  const emission = buildHostPlanEmission(plan.node)

  assert.equal(emission.hostPlan.kind, 'search')
  assert.equal(emission.hostPlan.createCall, 'ui_search_field("Search apps")')
})
