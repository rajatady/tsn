import type { ConformanceSuite } from '../../../packages/tsn-testing/src/spec.js'

export const contentSuite: ConformanceSuite = {
  id: 'content',
  label: 'Content Suite',
  navLabel: 'Content Suite',
  navTestId: 'suite.content',
  navTag: 2,
  covers: ['Text', 'Symbol', 'Card', 'Stat', 'Badge', 'Button'],
  description: 'Text, symbol, card, badge, stat, divider, and button primitives.',
  artifactPrefix: 'content',
  cases: [
    {
      id: 'text-card-divider',
      label: 'text hierarchy inside card',
      actions: [],
      expects: [
        { kind: 'property', id: 'content.card', prop: 'type', includes: 'VStack' },
        { kind: 'property', id: 'content.heading', prop: 'text', includes: 'Display headline' },
        { kind: 'property', id: 'content.body', prop: 'text', includes: 'Supporting body copy' },
        { kind: 'property', id: 'content.divider', prop: 'type', includes: 'NSBox' },
      ],
    },
    {
      id: 'symbol-badge-stat',
      label: 'symbol, badge, and stat primitives',
      actions: [],
      expects: [
        { kind: 'property', id: 'content.symbol', prop: 'type', includes: 'NSImageView' },
        { kind: 'property', id: 'content.badge', prop: 'text', includes: 'Stable' },
        { kind: 'property', id: 'content.stat', prop: 'type', includes: 'UIStatView' },
      ],
    },
    {
      id: 'button-variants',
      label: 'button variants and icon button',
      actions: [],
      expects: [
        { kind: 'property', id: 'content.button.primary', prop: 'text', includes: 'Primary' },
        { kind: 'property', id: 'content.button.ghost', prop: 'text', includes: 'Ghost' },
        { kind: 'property', id: 'content.button.get', prop: 'text', includes: 'Get' },
        { kind: 'property', id: 'content.button.link', prop: 'text', includes: 'Link' },
        { kind: 'property', id: 'content.button.icon', prop: 'text', includes: 'Refresh' },
      ],
    },
    {
      id: 'button-click',
      label: 'button click path updates state',
      actions: [{ kind: 'click-id', id: 'content.button.primary' }],
      expects: [
        { kind: 'property', id: 'shell.last-action', prop: 'text', includes: 'Last action: button-primary' },
      ],
    },
  ],
}
