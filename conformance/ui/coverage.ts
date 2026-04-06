import assert from 'node:assert/strict'

import type { ConformanceSuite } from '../../packages/tsn-testing/src/spec'

const requiredPrimitives: string[] = [
  'Window',
  'VStack',
  'HStack',
  'Text',
  'Symbol',
  'Spacer',
  'Search',
  'Input',
  'Image',
  'Sidebar',
  'Scroll',
  'Card',
  'SidebarSection',
  'SidebarItem',
  'Stat',
  'Badge',
  'Button',
  'BarChart',
  'Table',
  'Progress',
  'Divider',
]

export function assertUiConformanceCoverage(suites: ConformanceSuite[]): void {
  const covered = new Set<string>()
  let i = 0
  while (i < suites.length) {
    let j = 0
    while (j < suites[i].covers.length) {
      covered.add(suites[i].covers[j])
      j = j + 1
    }
    i = i + 1
  }

  let k = 0
  while (k < requiredPrimitives.length) {
    const primitive = requiredPrimitives[k]
    assert.ok(covered.has(primitive), `UI conformance corpus is missing primitive coverage for ${primitive}`)
    k = k + 1
  }
}
