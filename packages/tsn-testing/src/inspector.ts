import assert from 'node:assert/strict'

import type { ConformanceExpectation, FrameExpectation } from './spec.js'

export interface InspectorFrame {
  width: number
  height: number
  x: number
  y: number
}

export function parseFrame(raw: string): InspectorFrame {
  const match = raw.trim().match(/^([0-9.]+)[×x]([0-9.]+) at ([0-9.\-]+),([0-9.\-]+)$/)
  if (!match) {
    throw new Error(`Unparseable frame: ${raw}`)
  }
  return {
    width: Number(match[1]),
    height: Number(match[2]),
    x: Number(match[3]),
    y: Number(match[4]),
  }
}

export function assertExpectation(
  expectation: ConformanceExpectation,
  getProp: (id: string, prop: string) => string,
  tree: string,
): void {
  if (!('id' in expectation)) {
    assert.ok(
      tree.includes(expectation.includes),
      `Expected tree to include "${expectation.includes}"`,
    )
    return
  }

  if (!('prop' in expectation)) {
    const frame = parseFrame(getProp(expectation.id, 'frame'))
    assertFrame(expectation, frame)
    return
  }

  const value = getProp(expectation.id, expectation.prop).trim()
  if (expectation.equals != null) {
    assert.equal(value, expectation.equals, `Expected ${expectation.id}.${expectation.prop} === ${expectation.equals}, got ${value}`)
  }
  if (expectation.includes != null) {
    assert.ok(
      value.includes(expectation.includes),
      `Expected ${expectation.id}.${expectation.prop} to include "${expectation.includes}", got ${value}`,
    )
  }
}

function assertFrame(expectation: FrameExpectation, frame: InspectorFrame): void {
  if (expectation.minWidth != null) assert.ok(frame.width >= expectation.minWidth, `Expected ${expectation.id} width >= ${expectation.minWidth}, got ${frame.width}`)
  if (expectation.minHeight != null) assert.ok(frame.height >= expectation.minHeight, `Expected ${expectation.id} height >= ${expectation.minHeight}, got ${frame.height}`)
  if (expectation.maxWidth != null) assert.ok(frame.width <= expectation.maxWidth, `Expected ${expectation.id} width <= ${expectation.maxWidth}, got ${frame.width}`)
  if (expectation.maxHeight != null) assert.ok(frame.height <= expectation.maxHeight, `Expected ${expectation.id} height <= ${expectation.maxHeight}, got ${frame.height}`)
  if (expectation.minX != null) assert.ok(frame.x >= expectation.minX, `Expected ${expectation.id} x >= ${expectation.minX}, got ${frame.x}`)
  if (expectation.minY != null) assert.ok(frame.y >= expectation.minY, `Expected ${expectation.id} y >= ${expectation.minY}, got ${frame.y}`)
}
