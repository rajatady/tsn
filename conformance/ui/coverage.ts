import assert from 'node:assert/strict'

import type { ConformanceSuite, PrimitiveCoverage } from '../../packages/tsn-testing/src/spec'

const requiredPrimitives: string[] = [
  'Window',
  'VStack',
  'HStack',
  'Text',
  'Symbol',
  'Spacer',
  'Search',
  'Input',
  'TextArea',
  'Select',
  'Checkbox',
  'Radio',
  'Switch',
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

export interface PrimitiveCoverageSummary {
  primitive: string
  properties: string[]
  states: string[]
  cases: string[]
}

export interface UiConformanceCoverageSummary {
  primitiveCount: number
  caseCount: number
  primitives: PrimitiveCoverageSummary[]
}

function addCoverage(
  coverageMap: Map<string, { properties: Set<string>, states: Set<string>, cases: Set<string> }>,
  testCaseId: string,
  coverage: PrimitiveCoverage,
): void {
  let entry = coverageMap.get(coverage.primitive)
  if (entry == null) {
    entry = {
      properties: new Set<string>(),
      states: new Set<string>(),
      cases: new Set<string>(),
    }
    coverageMap.set(coverage.primitive, entry)
  }

  let i = 0
  while (i < coverage.properties.length) {
    entry.properties.add(coverage.properties[i])
    i = i + 1
  }

  if (coverage.states != null) {
    let j = 0
    while (j < coverage.states.length) {
      entry.states.add(coverage.states[j])
      j = j + 1
    }
  }

  entry.cases.add(testCaseId)
}

export function assertUiConformanceCoverage(suites: ConformanceSuite[]): void {
  const covered = new Set<string>()
  const detailedCoverage = new Map<string, { properties: Set<string>, states: Set<string>, cases: Set<string> }>()
  let i = 0
  while (i < suites.length) {
    let j = 0
    while (j < suites[i].covers.length) {
      covered.add(suites[i].covers[j])
      j = j + 1
    }
    let k = 0
    while (k < suites[i].cases.length) {
      const testCase = suites[i].cases[k]
      if (testCase.coverage != null) {
        let m = 0
        while (m < testCase.coverage.length) {
          addCoverage(detailedCoverage, suites[i].id + '.' + testCase.id, testCase.coverage[m])
          m = m + 1
        }
      }
      k = k + 1
    }
    i = i + 1
  }

  let n = 0
  while (n < requiredPrimitives.length) {
    const primitive = requiredPrimitives[n]
    assert.ok(covered.has(primitive), `UI conformance corpus is missing primitive coverage for ${primitive}`)
    assert.ok(detailedCoverage.has(primitive), `UI conformance corpus is missing prop/state case coverage for ${primitive}`)
    n = n + 1
  }
}

export function summarizeUiConformanceCoverage(suites: ConformanceSuite[]): UiConformanceCoverageSummary {
  const detailedCoverage = new Map<string, { properties: Set<string>, states: Set<string>, cases: Set<string> }>()
  let caseCount = 0

  let i = 0
  while (i < suites.length) {
    let j = 0
    while (j < suites[i].cases.length) {
      const testCase = suites[i].cases[j]
      caseCount = caseCount + 1
      if (testCase.coverage != null) {
        let k = 0
        while (k < testCase.coverage.length) {
          addCoverage(detailedCoverage, suites[i].id + '.' + testCase.id, testCase.coverage[k])
          k = k + 1
        }
      }
      j = j + 1
    }
    i = i + 1
  }

  const primitives: PrimitiveCoverageSummary[] = []
  let m = 0
  while (m < requiredPrimitives.length) {
    const primitive = requiredPrimitives[m]
    const entry = detailedCoverage.get(primitive)
    if (entry != null) {
      primitives.push({
        primitive,
        properties: Array.from(entry.properties.values()).sort(),
        states: Array.from(entry.states.values()).sort(),
        cases: Array.from(entry.cases.values()).sort(),
      })
    } else {
      primitives.push({
        primitive,
        properties: [],
        states: [],
        cases: [],
      })
    }
    m = m + 1
  }

  return {
    primitiveCount: requiredPrimitives.length,
    caseCount,
    primitives,
  }
}
