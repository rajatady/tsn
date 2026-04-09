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
  assert.ok(hostPlan.styleCalls.includes('ui_text_set_line_height(_j0, 1.2500);'))
  assert.ok(hostPlan.styleCalls.includes('ui_text_set_tracking(_j0, -0.3500);'))
  assert.ok(hostPlan.styleCalls.includes('ui_text_set_color_rgb(_j0, 1, 1, 1, 0.8);'))
  assert.ok(hostPlan.styleCalls.includes('ui_text_set_transform(_j0, 1);'))
  assert.ok(hostPlan.styleCalls.includes('ui_text_set_align(_j0, 1);'))
  assert.ok(hostPlan.styleCalls.includes('ui_text_set_truncate(_j0);'))
  assert.ok(hostPlan.styleCalls.includes('ui_text_set_selectable(_j0, true);'))
})

test('adaptNodeToAppKitPlan converts arbitrary line-height values into multipliers', () => {
  const tailwind = parseTailwind('text-[15] leading-[28]', '_jline')
  const plan = buildPrimitivePlan('Text', '_jline', 'text-[15] leading-[28]', { value: 'Hello world' }, tailwind)

  const hostPlan = adaptNodeToAppKitPlan(plan.node)

  assert.ok(hostPlan.styleCalls.includes('ui_text_set_line_height(_jline, 1.8667);'))
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

test('adaptNodeToAppKitPlan maps textarea nodes to multiline host creation', () => {
  const textareaPlan = buildPrimitivePlan('TextArea', '_textarea', 'w-[320] h-[120]', { placeholder: 'Write notes' }, parseTailwind('w-[320] h-[120]', '_textarea'))
  const hostPlan = adaptNodeToAppKitPlan(textareaPlan.node)

  assert.equal(hostPlan.kind, 'textarea')
  assert.equal(hostPlan.createCall, 'ui_text_area("Write notes")')
  assert.ok(hostPlan.styleCalls.includes('ui_set_size(_textarea, 320, 120);'))
})

test('adaptNodeToAppKitPlan maps checkbox and switch nodes to bool control creation', () => {
  const checkboxPlan = buildPrimitivePlan('Checkbox', '_check', '', { label: 'Enable sync', checked: true }, null)
  const switchPlan = buildPrimitivePlan('Switch', '_switch', '', { checked: false }, null)
  const selectPlan = buildPrimitivePlan('Select', '_select', '', { value: 'Medium' }, null)

  const checkboxHost = adaptNodeToAppKitPlan(checkboxPlan.node)
  const switchHost = adaptNodeToAppKitPlan(switchPlan.node)
  const selectHost = adaptNodeToAppKitPlan(selectPlan.node)

  assert.equal(checkboxHost.kind, 'checkbox')
  assert.equal(checkboxHost.createCall, 'ui_checkbox("Enable sync", true)')
  assert.equal(switchHost.kind, 'switch')
  assert.equal(switchHost.createCall, 'ui_switch(false)')
  assert.equal(selectHost.kind, 'select')
  assert.equal(selectHost.createCall, 'ui_select()')
})

test('adaptNodeToAppKitPlan maps view position and border styles to host calls', () => {
  const tailwind = parseTailwind('relative border border-white/20 rounded-xl bg-zinc-900', '_view')
  const plan = buildPrimitivePlan('View', '_view', 'relative border border-white/20 rounded-xl bg-zinc-900', {}, tailwind)
  plan.node.layoutStyle.position = 'absolute'
  plan.node.layoutStyle.insetTop = { unit: 'point', value: 8 }
  plan.node.layoutStyle.insetLeft = { unit: 'percent', value: 10 }

  const hostPlan = adaptNodeToAppKitPlan(plan.node)

  assert.equal(hostPlan.kind, 'box')
  assert.equal(hostPlan.createCall, 'ui_view()')
  assert.ok(hostPlan.styleCalls.includes('ui_set_position_type(_view, 1);'))
  assert.ok(hostPlan.styleCalls.includes('ui_set_inset(_view, 8, -1, -1, -1);'))
  assert.ok(hostPlan.styleCalls.includes('ui_set_inset_pct(_view, -1, -1, -1, 10);'))
  assert.ok(hostPlan.styleCalls.includes('ui_set_border_width(_view, 1);'))
  assert.ok(hostPlan.styleCalls.includes('ui_set_border_color(_view, 1, 1, 1, 0.2);'))
})
