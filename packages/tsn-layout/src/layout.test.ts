import assert from 'node:assert/strict'
import test from 'node:test'

import type { LayoutNode } from './types.js'
import { resolveLayout } from './solver.js'

test('spacer absorbs remaining space in a vertical sidebar', () => {
  const sidebar: LayoutNode = {
    id: 'sidebar',
    kind: 'sidebar',
    axis: 'vertical',
    constraints: {
      width: 180,
      height: 640,
      paddingTop: 16,
      paddingRight: 12,
      paddingBottom: 20,
      paddingLeft: 12,
      gap: 12,
    },
    children: [
      { id: 'search', kind: 'input', constraints: { height: 40 }, intrinsicWidth: 156, children: [] },
      { id: 'nav', kind: 'stack', constraints: { height: 240 }, children: [] },
      { id: 'spacer', kind: 'box', role: 'spacer', constraints: {}, children: [] },
      { id: 'account', kind: 'card', constraints: { height: 56 }, children: [] },
    ],
  }

  const resolved = resolveLayout(sidebar, { width: 180, height: 640 })
  const account = resolved.children[3]
  assert.equal(account.y + account.height, 620)
  assert.equal(account.x, 12)
})

test('content rail clamps to max width and centers itself', () => {
  const page: LayoutNode = {
    id: 'page',
    kind: 'window',
    axis: 'vertical',
    alignItems: 'center',
    constraints: { width: 1400, height: 600 },
    children: [
      {
        id: 'content',
        kind: 'box',
        role: 'content-rail',
        constraints: { maxWidth: 980, height: 320, width: undefined },
        children: [],
      },
    ],
  }

  const resolved = resolveLayout(page, { width: 1400, height: 600 })
  const content = resolved.children[0]
  assert.equal(content.width, 980)
  assert.equal(content.x, 210)
})

test('horizontal rails preserve overflowing content width', () => {
  const rail: LayoutNode = {
    id: 'rail',
    kind: 'rail',
    constraints: {
      width: 960,
      height: 220,
      gap: 24,
    },
    children: [
      { id: 'card-1', kind: 'card', constraints: { width: 320, height: 180 }, children: [] },
      { id: 'card-2', kind: 'card', constraints: { width: 320, height: 180 }, children: [] },
      { id: 'card-3', kind: 'card', constraints: { width: 320, height: 180 }, children: [] },
    ],
  }

  const resolved = resolveLayout(rail, { width: 960, height: 220 })
  assert.equal(resolved.width, 960)
  assert.equal(resolved.contentWidth, 1008)
  assert.equal(resolved.children[2].x, 688)
})

test('vertical stacks stretch children across the cross axis', () => {
  const stack: LayoutNode = {
    id: 'stack',
    kind: 'stack',
    axis: 'vertical',
    constraints: {
      width: 400,
      height: 220,
      paddingTop: 10,
      paddingRight: 20,
      paddingBottom: 10,
      paddingLeft: 20,
      gap: 10,
    },
    children: [
      { id: 'top', kind: 'card', constraints: { height: 50 }, children: [] },
      { id: 'bottom', kind: 'card', constraints: { height: 60 }, children: [] },
    ],
  }

  const resolved = resolveLayout(stack, { width: 400, height: 220 })
  assert.equal(resolved.children[0].width, 360)
  assert.equal(resolved.children[1].width, 360)
  assert.equal(resolved.children[1].y, 70)
})
