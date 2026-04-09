import assert from 'node:assert/strict'
import test from 'node:test'

import { buildPrimitivePlan } from '../../tsn-compiler-ui/src/planner.js'
import { parseTailwind } from '../../tsn-tailwind/src/index.js'
import { adaptNodeToAppKitPlan } from './node_adapter.js'

test('adaptNodeToAppKitPlan maps canonical text node styles to AppKit calls', () => {
  const tailwind = parseTailwind('w-[30%] text-sm font-semibold leading-tight tracking-tight truncate uppercase text-center text-white/80', '_j0')
  const plan = buildPrimitivePlan('Text', '_j0', 'w-[30%] text-sm font-semibold leading-tight tracking-tight truncate', { value: 'Hello' }, tailwind)
  plan.node.behavior.text = {
    kind: 'static',
    role: 'body',
    wrap: 'truncate',
    multiline: false,
    editable: false,
    selectable: true,
  }

  const hostPlan = adaptNodeToAppKitPlan(plan.node)

  assert.equal(hostPlan.id, '_j0')
  assert.equal(hostPlan.kind, 'text')
  assert.equal(hostPlan.createCall, 'ui_text("Hello", 14, false)')
  assert.ok(hostPlan.styleCalls.includes('ui_set_size_pct(_j0, 30, -1);'))
  assert.ok(hostPlan.styleCalls.includes('ui_text_set_weight(_j0, 6);'))
  assert.ok(hostPlan.styleCalls.includes('ui_text_set_line_height(_j0, 1.25);'))
  assert.ok(hostPlan.styleCalls.includes('ui_text_set_tracking(_j0, -0.3500);'))
  assert.ok(hostPlan.styleCalls.includes('ui_text_set_color_rgb(_j0, 1, 1, 1, 0.8);'))
  assert.ok(hostPlan.styleCalls.includes('ui_text_set_transform(_j0, 1);'))
  assert.ok(hostPlan.styleCalls.includes('ui_text_set_align(_j0, 1);'))
  assert.ok(hostPlan.styleCalls.includes('ui_text_set_truncate(_j0);'))
  assert.ok(hostPlan.styleCalls.includes('ui_text_set_selectable(_j0, true);'))
})

test('adaptNodeToAppKitPlan maps canonical sidebar/search nodes and preserves children', () => {
  const sidebarTailwind = parseTailwind('w-[240]', '_sidebar')
  const sidebarPlan = buildPrimitivePlan('Sidebar', '_sidebar', 'w-[240]', {}, sidebarTailwind)
  const searchPlan = buildPrimitivePlan('Search', '_search', '', { placeholder: 'Search' }, null)
  sidebarPlan.node.children.push(searchPlan.node)

  const hostPlan = adaptNodeToAppKitPlan(sidebarPlan.node)

  assert.equal(hostPlan.kind, 'sidebar')
  assert.equal(hostPlan.createCall, 'ui_sidebar(240)')
  assert.equal(hostPlan.children.length, 1)
  assert.equal(hostPlan.children[0]?.kind, 'search')
  assert.equal(hostPlan.children[0]?.createCall, 'ui_search_field("Search")')
})
