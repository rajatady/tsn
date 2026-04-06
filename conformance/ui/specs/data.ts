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
      expects: [
        { kind: 'property', id: 'data.progress.determinate', prop: 'type', includes: 'NSProgressIndicator' },
        { kind: 'property', id: 'data.progress.indeterminate', prop: 'type', includes: 'NSProgressIndicator' },
        { kind: 'property', id: 'data.chart', prop: 'type', includes: 'UIBarChartView' },
      ],
    },
    {
      id: 'table',
      label: 'table primitive',
      actions: [],
      expects: [
        { kind: 'property', id: 'data.table', prop: 'type', includes: 'NSScrollView' },
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
      expects: [
        { kind: 'property', id: 'shell.counter', prop: 'text', includes: 'Counter 2' },
      ],
    },
  ],
}
