import type { ConformanceSuite } from '../../../packages/tsn-testing/src/spec.js'

export const inputSuite: ConformanceSuite = {
  id: 'inputs',
  label: 'Inputs Suite',
  navLabel: 'Inputs Suite',
  navTestId: 'suite.inputs',
  navTag: 3,
  covers: ['Search', 'Input'],
  description: 'Search, input fields, live state binding, and reset behavior.',
  artifactPrefix: 'inputs',
  cases: [
    {
      id: 'input-static',
      label: 'search and input primitives',
      actions: [],
      coverage: [
        { primitive: 'Search', properties: ['type', 'value', 'placeholder'], states: ['empty-default'] },
        { primitive: 'Input', properties: ['type', 'value', 'placeholder'], states: ['preset-default'] },
        { primitive: 'Text', properties: ['text'], states: ['state-mirror'] },
      ],
      expects: [
        { kind: 'property', id: 'inputs.search', prop: 'type', includes: 'NSSearchField' },
        { kind: 'property', id: 'inputs.input', prop: 'type', includes: 'NSTextField' },
        { kind: 'property', id: 'inputs.search', prop: 'value', equals: '' },
        { kind: 'property', id: 'inputs.input', prop: 'value', equals: 'preset text' },
        { kind: 'property', id: 'inputs.search', prop: 'placeholder', includes: 'Search shared state' },
        { kind: 'property', id: 'inputs.input', prop: 'placeholder', includes: 'Input primitive' },
        { kind: 'property', id: 'inputs.query-mirror', prop: 'text', includes: 'Query: empty' },
        { kind: 'property', id: 'inputs.input-mirror', prop: 'text', includes: 'Input: preset text' },
      ],
    },
    {
      id: 'search-live',
      label: 'typing into search updates shared state',
      actions: [{ kind: 'type-id', id: 'inputs.search', text: 'latency' }],
      coverage: [
        { primitive: 'Search', properties: ['value'], states: ['live-binding', 'shared-store'] },
      ],
      expects: [
        { kind: 'property', id: 'inputs.query-mirror', prop: 'text', includes: 'Query: latency' },
        { kind: 'property', id: 'shell.query', prop: 'text', includes: 'Query: latency' },
        { kind: 'property', id: 'shell.search', prop: 'value', equals: 'latency' },
      ],
    },
    {
      id: 'sidebar-search-live',
      label: 'typing into sidebar search updates input suite mirrors',
      actions: [{ kind: 'type-id', id: 'shell.search', text: 'throughput' }],
      coverage: [
        { primitive: 'Search', properties: ['value'], states: ['sidebar-origin', 'shared-store'] },
      ],
      expects: [
        { kind: 'property', id: 'shell.search', prop: 'value', equals: 'throughput' },
        { kind: 'property', id: 'inputs.search', prop: 'value', equals: 'throughput' },
        { kind: 'property', id: 'inputs.query-mirror', prop: 'text', includes: 'Query: throughput' },
      ],
    },
    {
      id: 'input-live',
      label: 'typing into input updates mirrored state',
      actions: [{ kind: 'type-id', id: 'inputs.input', text: 'ticket-42' }],
      coverage: [
        { primitive: 'Input', properties: ['value'], states: ['live-binding'] },
      ],
      expects: [
        { kind: 'property', id: 'inputs.input', prop: 'value', equals: 'ticket-42' },
        { kind: 'property', id: 'inputs.input-mirror', prop: 'text', includes: 'Input: ticket-42' },
      ],
    },
    {
      id: 'reset',
      label: 'reset button restores default state',
      actions: [
        { kind: 'type-id', id: 'inputs.search', text: 'latency' },
        { kind: 'type-id', id: 'inputs.input', text: 'ticket-42' },
        { kind: 'click-id', id: 'inputs.reset' },
      ],
      coverage: [
        { primitive: 'Search', properties: ['value'], states: ['reset'] },
        { primitive: 'Input', properties: ['value'], states: ['reset'] },
        { primitive: 'Button', properties: ['text'], states: ['reset-click'] },
      ],
      expects: [
        { kind: 'property', id: 'inputs.search', prop: 'value', equals: '' },
        { kind: 'property', id: 'inputs.input', prop: 'value', equals: 'preset text' },
        { kind: 'property', id: 'inputs.query-mirror', prop: 'text', includes: 'Query: empty' },
        { kind: 'property', id: 'inputs.input-mirror', prop: 'text', includes: 'Input: preset text' },
        { kind: 'property', id: 'shell.last-action', prop: 'text', includes: 'Last action: reset' },
      ],
    },
  ],
}
