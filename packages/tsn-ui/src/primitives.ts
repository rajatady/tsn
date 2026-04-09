import type { TSNAxis, TSNMediaValue, TSNNode, TSNNodeKind, TSNPropValue } from '@tsn/core'

export type TSNElementLayer = 'primitive' | 'component'
export type TSNElementCategory = 'container' | 'leaf' | 'composite'

export interface TSNElementSpec {
  tag: string
  kind: TSNNodeKind
  layer: TSNElementLayer
  category: TSNElementCategory
  allowsChildren: boolean
  measurable: boolean
  defaultAxis?: TSNAxis
}

export const primitiveRegistry: Record<string, TSNElementSpec> = {
  Window: { tag: 'Window', kind: 'window', layer: 'primitive', category: 'container', allowsChildren: true, measurable: false },
  VStack: { tag: 'VStack', kind: 'stack', layer: 'primitive', category: 'container', allowsChildren: true, measurable: false, defaultAxis: 'vertical' },
  HStack: { tag: 'HStack', kind: 'stack', layer: 'primitive', category: 'container', allowsChildren: true, measurable: false, defaultAxis: 'horizontal' },
  ZStack: { tag: 'ZStack', kind: 'overlay', layer: 'primitive', category: 'container', allowsChildren: true, measurable: false },
  Text: { tag: 'Text', kind: 'text', layer: 'primitive', category: 'leaf', allowsChildren: true, measurable: true },
  Symbol: { tag: 'Symbol', kind: 'text', layer: 'primitive', category: 'leaf', allowsChildren: false, measurable: true },
  Spacer: { tag: 'Spacer', kind: 'box', layer: 'primitive', category: 'leaf', allowsChildren: false, measurable: false },
  Search: { tag: 'Search', kind: 'input', layer: 'primitive', category: 'leaf', allowsChildren: false, measurable: true },
  Input: { tag: 'Input', kind: 'input', layer: 'primitive', category: 'leaf', allowsChildren: false, measurable: true },
  Image: { tag: 'Image', kind: 'image', layer: 'primitive', category: 'leaf', allowsChildren: false, measurable: true },
  Scroll: { tag: 'Scroll', kind: 'scroll', layer: 'primitive', category: 'composite', allowsChildren: true, measurable: false },
  Button: { tag: 'Button', kind: 'button', layer: 'primitive', category: 'leaf', allowsChildren: true, measurable: true },
  Progress: { tag: 'Progress', kind: 'box', layer: 'primitive', category: 'leaf', allowsChildren: false, measurable: true },
  Divider: { tag: 'Divider', kind: 'box', layer: 'primitive', category: 'leaf', allowsChildren: false, measurable: true },
  Gradient: { tag: 'Gradient', kind: 'overlay', layer: 'primitive', category: 'leaf', allowsChildren: false, measurable: false },
}

export const componentRegistry: Record<string, TSNElementSpec> = {
  Sidebar: { tag: 'Sidebar', kind: 'sidebar', layer: 'component', category: 'container', allowsChildren: true, measurable: false },
  Card: { tag: 'Card', kind: 'card', layer: 'component', category: 'container', allowsChildren: true, measurable: false },
  SidebarSection: { tag: 'SidebarSection', kind: 'sidebar', layer: 'component', category: 'composite', allowsChildren: true, measurable: false },
  SidebarItem: { tag: 'SidebarItem', kind: 'button', layer: 'component', category: 'leaf', allowsChildren: true, measurable: true },
  Stat: { tag: 'Stat', kind: 'box', layer: 'component', category: 'composite', allowsChildren: false, measurable: true },
  Badge: { tag: 'Badge', kind: 'text', layer: 'component', category: 'leaf', allowsChildren: true, measurable: true },
  BarChart: { tag: 'BarChart', kind: 'box', layer: 'component', category: 'composite', allowsChildren: false, measurable: true },
  Table: { tag: 'Table', kind: 'box', layer: 'component', category: 'composite', allowsChildren: false, measurable: true },
}

export const elementRegistry: Record<string, TSNElementSpec> = {
  ...primitiveRegistry,
  ...componentRegistry,
}

export function getElementSpec(tag: string): TSNElementSpec | null {
  return elementRegistry[tag] ?? null
}

export function getPrimitiveSpec(tag: string): TSNElementSpec | null {
  return getElementSpec(tag)
}

export function isPrimitiveTag(tag: string): boolean {
  return primitiveRegistry[tag] != null
}

export function isComponentTag(tag: string): boolean {
  return componentRegistry[tag] != null
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
