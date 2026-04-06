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

test('align-items center vertically centers children in horizontal stack', () => {
  const row: LayoutNode = {
    id: 'row',
    kind: 'stack',
    axis: 'horizontal',
    alignItems: 'center',
    constraints: {
      width: 400,
      height: 80,
      gap: 10,
    },
    children: [
      { id: 'icon', kind: 'box', constraints: { width: 52, height: 52 }, children: [] },
      { id: 'text', kind: 'box', constraints: { width: 200, height: 20 }, children: [] },
      { id: 'button', kind: 'box', constraints: { width: 60, height: 32 }, children: [] },
    ],
  }

  const resolved = resolveLayout(row, { width: 400, height: 80 })
  // Icon (52px tall) centered in 80px: y = (80-52)/2 = 14
  assert.equal(resolved.children[0].y, 14)
  // Text (20px tall) centered in 80px: y = (80-20)/2 = 30
  assert.equal(resolved.children[1].y, 30)
  // Button (32px tall) centered in 80px: y = (80-32)/2 = 24
  assert.equal(resolved.children[2].y, 24)
})

test('justify-content space-between distributes children along main axis', () => {
  const row: LayoutNode = {
    id: 'row',
    kind: 'stack',
    axis: 'horizontal',
    justifyContent: 'space-between',
    constraints: {
      width: 400,
      height: 40,
    },
    children: [
      { id: 'left', kind: 'box', constraints: { width: 80, height: 40 }, children: [] },
      { id: 'right', kind: 'box', constraints: { width: 80, height: 40 }, children: [] },
    ],
  }

  const resolved = resolveLayout(row, { width: 400, height: 40 })
  assert.equal(resolved.children[0].x, 0)
  assert.equal(resolved.children[1].x, 320)
})

test('justify-content center centers children on main axis', () => {
  const col: LayoutNode = {
    id: 'col',
    kind: 'stack',
    axis: 'vertical',
    justifyContent: 'center',
    constraints: {
      width: 200,
      height: 400,
    },
    children: [
      { id: 'child', kind: 'box', constraints: { width: 200, height: 100 }, children: [] },
    ],
  }

  const resolved = resolveLayout(col, { width: 200, height: 400 })
  assert.equal(resolved.children[0].y, 150)
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
