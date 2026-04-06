/**
 * Geometry Oracle Conformance Registry
 *
 * Each case is a pair: a TSX file (compiles to native) and an HTML file
 * (renders in browser with real Tailwind CSS). The harness compares
 * element geometry (position + size) from both renderers.
 */

export interface GeometryCase {
  id: string
  label: string
  category: string
  viewport: { width: number, height: number }
  testIds: string[]
  features: string[]
  tolerance?: { position: number, size: number }
}

const DEFAULT_TOLERANCE = { position: 4, size: 8 }

export const geometryCases: GeometryCase[] = [
  // ─── Layout Primitives ──────────────────────────────────────────
  {
    id: 'hstack-basic',
    label: 'Horizontal stack with gap',
    category: 'layout',
    viewport: { width: 500, height: 80 },
    testIds: ['root', 'a', 'b', 'c'],
    features: ['HStack', 'gap', 'w-[]', 'h-[]'],
    tolerance: { position: 2, size: 2 },
  },
  {
    id: 'align-center',
    label: 'Cross-axis centering with mixed heights',
    category: 'layout',
    viewport: { width: 500, height: 80 },
    testIds: ['root', 'icon', 'text', 'action'],
    features: ['HStack', 'items-center', 'gap', 'flex-1'],
    tolerance: { position: 2, size: 2 },
  },
  {
    id: 'justify-between',
    label: 'Space-between distribution',
    category: 'layout',
    viewport: { width: 500, height: 48 },
    testIds: ['root', 'right'],
    features: ['HStack', 'justify-between', 'items-center'],
    tolerance: { position: 6, size: 6 },
  },
  {
    id: 'padding-gap',
    label: 'Padding and gap interaction',
    category: 'layout',
    viewport: { width: 400, height: 200 },
    testIds: ['root', 'a', 'b', 'c'],
    features: ['VStack', 'p-', 'gap'],
    tolerance: { position: 2, size: 2 },
  },
  {
    id: 'flex-grow',
    label: 'Flex-1 distributes space',
    category: 'layout',
    viewport: { width: 600, height: 60 },
    testIds: ['root', 'fixed', 'flex'],
    features: ['HStack', 'flex-1', 'w-[]'],
    tolerance: { position: 2, size: 4 },
  },
  {
    id: 'spacer',
    label: 'Spacer pushes footer to bottom',
    category: 'layout',
    viewport: { width: 300, height: 500 },
    testIds: ['root', 'header', 'footer'],
    features: ['VStack', 'Spacer', 'h-[]'],
  },
  {
    id: 'fixed-sizes',
    label: 'Explicit widths and heights',
    category: 'layout',
    viewport: { width: 600, height: 100 },
    testIds: ['root', 'a', 'b', 'c'],
    features: ['HStack', 'w-[]', 'h-[]', 'gap'],
    tolerance: { position: 2, size: 2 },
  },
  {
    id: 'nested-stacks',
    label: 'VStack inside HStack inside VStack',
    category: 'layout',
    viewport: { width: 500, height: 300 },
    testIds: ['outer', 'row', 'left', 'right', 'bottom'],
    features: ['VStack', 'HStack', 'gap', 'flex-1'],
  },
  {
    id: 'max-width',
    label: 'Content constrained by max-width',
    category: 'layout',
    viewport: { width: 800, height: 100 },
    testIds: ['root', 'rail'],
    features: ['max-w-[]', 'mx-auto'],
  },

  // ─── Composite Patterns ─────────────────────────────────────────
  {
    id: 'app-row',
    label: 'App row: icon + text column + action',
    category: 'composite',
    viewport: { width: 500, height: 72 },
    testIds: ['root', 'icon', 'action'],
    features: ['HStack', 'VStack', 'items-center', 'gap', 'flex-1'],
  },
  {
    id: 'stat-row',
    label: 'Row of stat cards',
    category: 'composite',
    viewport: { width: 700, height: 120 },
    testIds: ['root', 'stat1', 'stat2', 'stat3'],
    features: ['HStack', 'flex-1', 'gap', 'p-', 'rounded-xl'],
  },
  {
    id: 'sidebar-shell',
    label: 'Sidebar + content area',
    category: 'composite',
    viewport: { width: 900, height: 500 },
    testIds: ['root', 'sidebar', 'content'],
    features: ['HStack', 'w-[]', 'flex-1', 'gap', 'h-[]'],
  },
]

export function caseById(id: string): GeometryCase {
  const found = geometryCases.find(c => c.id === id)
  if (!found) throw new Error(`Unknown conformance case: ${id}`)
  return found
}

export function casesByCategory(category: string): GeometryCase[] {
  return geometryCases.filter(c => c.category === category)
}

export function allCategories(): string[] {
  const cats = new Set<string>()
  for (const c of geometryCases) cats.add(c.category)
  return Array.from(cats)
}
