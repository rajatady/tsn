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
      expects: [
        { kind: 'property', id: 'inputs.search', prop: 'type', includes: 'NSSearchField' },
        { kind: 'property', id: 'inputs.input', prop: 'type', includes: 'NSTextField' },
        { kind: 'property', id: 'inputs.search', prop: 'value', equals: '' },
        { kind: 'property', id: 'inputs.input', prop: 'value', equals: 'preset text' },
        { kind: 'property', id: 'inputs.query-mirror', prop: 'text', includes: 'Query: empty' },
        { kind: 'property', id: 'inputs.input-mirror', prop: 'text', includes: 'Input: preset text' },
      ],
    },
    {
      id: 'search-live',
      label: 'typing into search updates shared state',
      actions: [{ kind: 'type-id', id: 'inputs.search', text: 'latency' }],
      expects: [
        { kind: 'property', id: 'inputs.query-mirror', prop: 'text', includes: 'Query: latency' },
        { kind: 'property', id: 'shell.query', prop: 'text', includes: 'Query: latency' },
      ],
    },
    {
      id: 'input-live',
      label: 'typing into input updates mirrored state',
      actions: [{ kind: 'type-id', id: 'inputs.input', text: 'ticket-42' }],
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
      expects: [
        { kind: 'property', id: 'inputs.query-mirror', prop: 'text', includes: 'Query: empty' },
        { kind: 'property', id: 'inputs.input-mirror', prop: 'text', includes: 'Input: preset text' },
        { kind: 'property', id: 'shell.last-action', prop: 'text', includes: 'Last action: reset' },
      ],
    },
  ],
}
