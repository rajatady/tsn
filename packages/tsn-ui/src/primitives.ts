import type { TSNAxis, TSNMediaValue, TSNNode, TSNNodeKind, TSNPropValue } from '@tsn/core'

export interface TSNPrimitiveSpec {
  tag: string
  kind: TSNNodeKind
  category: 'container' | 'leaf' | 'composite'
  allowsChildren: boolean
  measurable: boolean
  defaultAxis?: TSNAxis
}

export const primitiveRegistry: Record<string, TSNPrimitiveSpec> = {
  Window: { tag: 'Window', kind: 'window', category: 'container', allowsChildren: true, measurable: false },
  VStack: { tag: 'VStack', kind: 'stack', category: 'container', allowsChildren: true, measurable: false, defaultAxis: 'vertical' },
  HStack: { tag: 'HStack', kind: 'stack', category: 'container', allowsChildren: true, measurable: false, defaultAxis: 'horizontal' },
  ZStack: { tag: 'ZStack', kind: 'overlay', category: 'container', allowsChildren: true, measurable: false },
  Text: { tag: 'Text', kind: 'text', category: 'leaf', allowsChildren: true, measurable: true },
  Symbol: { tag: 'Symbol', kind: 'text', category: 'leaf', allowsChildren: false, measurable: true },
  Spacer: { tag: 'Spacer', kind: 'box', category: 'leaf', allowsChildren: false, measurable: false },
  Search: { tag: 'Search', kind: 'input', category: 'leaf', allowsChildren: false, measurable: true },
  Input: { tag: 'Input', kind: 'input', category: 'leaf', allowsChildren: false, measurable: true },
  Image: { tag: 'Image', kind: 'image', category: 'leaf', allowsChildren: false, measurable: true },
  Sidebar: { tag: 'Sidebar', kind: 'sidebar', category: 'container', allowsChildren: true, measurable: false },
  Scroll: { tag: 'Scroll', kind: 'scroll', category: 'composite', allowsChildren: true, measurable: false },
  Card: { tag: 'Card', kind: 'card', category: 'container', allowsChildren: true, measurable: false },
  SidebarSection: { tag: 'SidebarSection', kind: 'sidebar', category: 'composite', allowsChildren: true, measurable: false },
  SidebarItem: { tag: 'SidebarItem', kind: 'button', category: 'leaf', allowsChildren: true, measurable: true },
  Stat: { tag: 'Stat', kind: 'box', category: 'composite', allowsChildren: false, measurable: true },
  Badge: { tag: 'Badge', kind: 'text', category: 'leaf', allowsChildren: true, measurable: true },
  Button: { tag: 'Button', kind: 'button', category: 'leaf', allowsChildren: true, measurable: true },
  BarChart: { tag: 'BarChart', kind: 'box', category: 'composite', allowsChildren: false, measurable: true },
  Table: { tag: 'Table', kind: 'box', category: 'composite', allowsChildren: false, measurable: true },
  Progress: { tag: 'Progress', kind: 'box', category: 'leaf', allowsChildren: false, measurable: true },
  Divider: { tag: 'Divider', kind: 'box', category: 'leaf', allowsChildren: false, measurable: true },
  Gradient: { tag: 'Gradient', kind: 'overlay', category: 'leaf', allowsChildren: false, measurable: false },
}

export function getPrimitiveSpec(tag: string): TSNPrimitiveSpec | null {
  return primitiveRegistry[tag] ?? null
}

function leaf(kind: TSNNode['ref']['kind'], id: string, props: Record<string, TSNPropValue>): TSNNode {
  return {
    ref: { id, kind },
    sourceTag: kind,
    props,
    styleSource: {},
    layoutStyle: {},
    visualStyle: {},
    textStyle: {},
    behavior: {},
    events: [],
    children: [],
  }
}

export function textNode(id: string, value: string): TSNNode {
  return leaf('text', id, { value })
}

export function imageNode(id: string, media: TSNMediaValue): TSNNode {
  return leaf('image', id, { media })
}

export function buttonNode(id: string, label: string, variant: string): TSNNode {
  return leaf('button', id, { label, variant })
}
