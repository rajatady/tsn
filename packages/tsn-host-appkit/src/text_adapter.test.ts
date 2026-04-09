import assert from 'node:assert/strict'
import test from 'node:test'

import { buildPrimitivePlan } from '../../tsn-compiler-ui/src/planner.js'
import { parseTailwind } from '../../tsn-tailwind/src/index.js'
import { buildTextMeasureRequest, defaultCssLineHeightForSize, measureTextRequest } from './text_adapter.js'

test('buildTextMeasureRequest derives canonical static text measurement inputs', () => {
  const tailwind = parseTailwind('text-sm font-semibold leading-tight tracking-tight truncate', '_j0')
  const plan = buildPrimitivePlan('Text', '_j0', 'text-sm font-semibold leading-tight tracking-tight truncate', { value: 'Hello world' }, tailwind)

  const request = buildTextMeasureRequest(plan.node, 180)

  assert.ok(request)
  assert.equal(request?.text, 'Hello world')
  assert.equal(request?.size, 14)
  assert.equal(request?.weight, 6)
  assert.equal(request?.lineHeight, 1.25)
  assert.equal(request?.tracking, -0.025)
  assert.equal(request?.wrap, 'truncate')
  assert.equal(request?.multiline, false)
  assert.equal(request?.maxWidth, 180)
})

test('buildTextMeasureRequest derives canonical search measurement inputs', () => {
  const plan = buildPrimitivePlan('Search', '_j1', '', { placeholder: 'Search apps' }, null)

  const request = buildTextMeasureRequest(plan.node, 240)

  assert.ok(request)
  assert.equal(request?.text, 'Search apps')
  assert.equal(request?.wrap, 'truncate')
  assert.equal(request?.multiline, false)
  assert.equal(request?.role, 'body')
})

test('measureTextRequest clamps single-line truncate width and preserves line height', () => {
  const result = measureTextRequest({
    text: 'A somewhat long title',
    size: 14,
    weight: 6,
    wrap: 'truncate',
    multiline: false,
    maxWidth: 80,
  })

  assert.equal(result.width, 80)
  assert.equal(result.height, defaultCssLineHeightForSize(14))
  assert.ok((result.baseline ?? 0) > 0)
})

test('measureTextRequest wraps multiline text by available width', () => {
  const result = measureTextRequest({
    text: 'This is a longer paragraph that should wrap across multiple lines',
    size: 14,
    weight: 4,
    wrap: 'wrap',
    multiline: true,
    maxWidth: 120,
  })

  assert.equal(result.width, 120)
  assert.ok(result.height > defaultCssLineHeightForSize(14))
})
