import type { ConformanceSuite } from '../../../packages/tsn-testing/src/spec.js'

export const layoutSuite: ConformanceSuite = {
  id: 'layout',
  label: 'Layout Suite',
  navLabel: 'Layout Suite',
  navTestId: 'suite.layout',
  navTag: 1,
  covers: ['Window', 'VStack', 'HStack', 'Spacer', 'Sidebar', 'Scroll', 'SidebarSection', 'SidebarItem', 'Divider'],
  description: 'Window shell, stacks, sidebar geometry, spacers, scroll containers, and constrained rails.',
  artifactPrefix: 'layout',
  cases: [
    {
      id: 'window-and-shell',
      label: 'window shell and section headers',
      actions: [],
      expects: [
        { kind: 'tree', includes: 'Window "UI Gallery"' },
        { kind: 'tree', includes: 'SUITES' },
        { kind: 'tree', includes: 'PRIMITIVES' },
        { kind: 'property', id: 'shell.main-scroll', prop: 'type', includes: 'NSScrollView' },
      ],
    },
    {
      id: 'sidebar-spacer-footer',
      label: 'sidebar spacer pins footer to bottom',
      actions: [],
      expects: [
        { kind: 'property', id: 'shell.sidebar', prop: 'type', includes: 'NSVisualEffectView' },
        { kind: 'frame', id: 'shell.sidebar', minWidth: 220, maxWidth: 240, minHeight: 820 },
        { kind: 'frame', id: 'shell.sidebar.spacer', minHeight: 260 },
        { kind: 'tree', includes: 'Every primitive should land here first.' },
      ],
    },
    {
      id: 'sidebar-item-click',
      label: 'sidebar item primitive dispatches click',
      actions: [{ kind: 'click-id', id: 'shell.sidebar.item.1' }],
      expects: [
        { kind: 'property', id: 'shell.last-action', prop: 'text', includes: 'Last action: sidebar-1' },
      ],
    },
    {
      id: 'stack-primitives',
      label: 'vstack, hstack, spacer, and divider primitives',
      actions: [],
      expects: [
        { kind: 'property', id: 'layout.vstack', prop: 'type', includes: 'VStack' },
        { kind: 'property', id: 'layout.vstack', prop: 'children', includes: '3 children' },
        { kind: 'property', id: 'layout.hstack', prop: 'type', includes: 'HStack' },
        { kind: 'property', id: 'layout.hstack', prop: 'children', includes: '3 children' },
        { kind: 'property', id: 'layout.divider', prop: 'type', includes: 'NSBox' },
      ],
    },
    {
      id: 'content-rail',
      label: 'centered constrained content rail',
      actions: [],
      expects: [
        { kind: 'frame', id: 'shell.content-rail', minWidth: 1050, maxWidth: 1180, minX: 20 },
        { kind: 'frame', id: 'layout.hero-image', minWidth: 520, minHeight: 240 },
      ],
    },
    {
      id: 'horizontal-rail',
      label: 'horizontal scroll rail preserves card widths',
      actions: [],
      expects: [
        { kind: 'property', id: 'layout.rail', prop: 'type', includes: 'NSScrollView' },
        { kind: 'frame', id: 'layout.rail.card.1', minWidth: 340, minHeight: 220 },
        { kind: 'frame', id: 'layout.rail.card.2', minWidth: 340, minHeight: 220 },
        { kind: 'frame', id: 'layout.rail.card.3', minWidth: 340, minHeight: 220 },
      ],
    },
  ],
}
