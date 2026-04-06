import type { ConformanceSuite } from '../../../packages/tsn-testing/src/spec.js'

export const dataSuite: ConformanceSuite = {
  id: 'data',
  label: 'Data Suite',
  navLabel: 'Data Suite',
  navTestId: 'suite.data',
  navTag: 5,
  covers: ['Progress', 'BarChart', 'Table'],
  description: 'Progress, chart, and table primitives plus state mutation through data controls.',
  artifactPrefix: 'data',
  cases: [
    {
      id: 'progress-and-chart',
      label: 'progress and bar chart primitives',
      actions: [],
      coverage: [
        { primitive: 'Progress', properties: ['type', 'value', 'indeterminate'], states: ['determinate', 'indeterminate'] },
        { primitive: 'BarChart', properties: ['type', 'frame'] },
      ],
      expects: [
        { kind: 'property', id: 'data.progress.determinate', prop: 'type', includes: 'NSProgressIndicator' },
        { kind: 'property', id: 'data.progress.indeterminate', prop: 'type', includes: 'NSProgressIndicator' },
        { kind: 'property', id: 'data.progress.determinate', prop: 'value', includes: '0.62' },
        { kind: 'property', id: 'data.progress.indeterminate', prop: 'indeterminate', equals: 'true' },
        { kind: 'property', id: 'data.chart', prop: 'type', includes: 'UIBarChartView' },
        { kind: 'frame', id: 'data.chart', minHeight: 200 },
      ],
    },
    {
      id: 'table',
      label: 'table primitive',
      actions: [],
      coverage: [
        { primitive: 'Table', properties: ['type', 'frame', 'rows', 'columns'], states: ['alternating-rows'] },
      ],
      expects: [
        { kind: 'property', id: 'data.table', prop: 'type', includes: 'NSScrollView' },
        { kind: 'property', id: 'data.table', prop: 'rows', equals: '3' },
        { kind: 'property', id: 'data.table', prop: 'columns', equals: '3' },
        { kind: 'frame', id: 'data.table', minWidth: 700, minHeight: 180 },
        { kind: 'tree', includes: 'Table Conformance' },
      ],
    },
    {
      id: 'counter-mutation',
      label: 'data button mutates shared state',
      actions: [
        { kind: 'click-id', id: 'shell.reset' },
        { kind: 'click-id', id: 'data.increment' },
        { kind: 'click-id', id: 'data.increment' },
      ],
      coverage: [
        { primitive: 'Button', properties: ['text'], states: ['shared-counter-click'] },
      ],
      expects: [
        { kind: 'property', id: 'shell.counter', prop: 'text', includes: 'Counter 2' },
      ],
    },
  ],
}
