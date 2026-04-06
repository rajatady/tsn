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

  // ─── Text Primitive (deep) ──────────────────────────────────────
  {
    id: 'text-sizes',
    label: 'All text size classes (xs through 4xl)',
    category: 'text',
    viewport: { width: 400, height: 500 },
    testIds: ['root', 'row-xs', 'row-sm', 'row-base', 'row-lg', 'row-xl', 'row-2xl', 'row-3xl', 'row-4xl',
              'label-xs', 'label-sm', 'label-base', 'label-lg', 'label-xl', 'label-2xl', 'label-3xl', 'label-4xl'],
    features: ['text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl', 'text-3xl', 'text-4xl',
               'font-bold', 'items-center'],
  },
  {
    id: 'text-weights',
    label: 'All font weight classes (thin through black)',
    category: 'text',
    viewport: { width: 500, height: 320 },
    testIds: ['root', 'row-thin', 'row-light', 'row-normal', 'row-medium', 'row-semibold', 'row-bold', 'row-black',
              'swatch-thin', 'swatch-light', 'swatch-normal', 'swatch-medium', 'swatch-semibold', 'swatch-bold', 'swatch-black'],
    features: ['font-thin', 'font-light', 'font-normal', 'font-medium', 'font-semibold', 'font-bold', 'font-black',
               'items-center'],
  },
  {
    id: 'text-lineheight',
    label: 'Line-height variants inside padded cards',
    category: 'text',
    viewport: { width: 500, height: 500 },
    testIds: ['root', 'card-none', 'card-tight', 'card-snug', 'card-normal', 'card-relaxed'],
    features: ['leading-none', 'leading-tight', 'leading-snug', 'leading-normal', 'leading-relaxed',
               'font-semibold', 'text-2xl', 'p-4', 'rounded-xl'],
  },
  {
    id: 'text-align-transform',
    label: 'Text alignment and text-transform',
    category: 'text',
    viewport: { width: 400, height: 400 },
    testIds: ['root', 'align-left', 'align-center', 'align-right', 'upper-card', 'lower-card'],
    features: ['text-left', 'text-center', 'text-right', 'uppercase', 'lowercase', 'tracking-wide'],
  },
  {
    id: 'text-in-card',
    label: 'Text inside padded cards (eyebrow + heading + body)',
    category: 'text',
    viewport: { width: 500, height: 500 },
    testIds: ['root', 'card-simple', 'card-hero', 'card-compact', 'avatar'],
    tolerance: { position: 12, size: 12 },
    features: ['text-xs', 'text-2xl', 'text-4xl', 'text-sm', 'text-base',
               'font-bold', 'font-semibold', 'uppercase', 'tracking-wide', 'tracking-tight',
               'leading-tight', 'leading-relaxed', 'p-5', 'p-6', 'px-4', 'py-3',
               'gap-2', 'gap-3', 'gap-0', 'items-center', 'rounded-full'],
  },

  // ─── Button Primitive (deep) ────────────────────────────────────
  {
    id: 'button-variants',
    label: 'All 8 button style variants in rows',
    category: 'button',
    viewport: { width: 500, height: 500 },
    testIds: ['root', 'row-default', 'row-primary', 'row-destructive', 'row-ghost',
              'row-get', 'row-chip', 'row-sidebar', 'row-sidebar-active',
              'label-default', 'label-primary', 'label-destructive', 'label-ghost',
              'label-get', 'label-chip', 'label-sidebar', 'label-sidebar-active'],
    tolerance: { position: 4, size: 8 },
    features: ['Button', 'variant:default', 'variant:primary', 'variant:destructive',
               'variant:ghost', 'variant:get', 'variant:chip', 'variant:sidebar', 'variant:sidebar-active',
               'items-center'],
  },

  // ─── Card Primitive (deep) ──────────────────────────────────────
  {
    id: 'card-deep',
    label: 'Card padding, radius, shadow, colors, nesting',
    category: 'card',
    viewport: { width: 500, height: 700 },
    testIds: ['root', 'card-p3', 'inner-p3', 'card-p5', 'inner-p5',
              'card-px4-py2', 'inner-px4',
              'card-r-sm', 'card-r-2xl',
              'card-shadow', 'inner-shadow',
              'card-hex', 'inner-hex',
              'card-nested', 'nested-inner', 'nested-a', 'deep-a', 'nested-b', 'deep-b'],
    tolerance: { position: 4, size: 4 },
    features: ['Card', 'p-3', 'p-5', 'px-4', 'py-2', 'rounded-sm', 'rounded-xl', 'rounded-2xl',
               'shadow-lg', 'bg-[#hex]', 'bg-zinc-*', 'nested-cards'],
  },

  // ─── Image Primitive (deep) ─────────────────────────────────────
  {
    id: 'image-deep',
    label: 'Image sizes, scaling modes, rounded, in-row',
    category: 'image',
    viewport: { width: 600, height: 600 },
    testIds: ['root', 'row-sizes', 'img-sm', 'img-md', 'img-lg',
              'img-wide', 'row-icon-text', 'icon-in-row',
              'row-scaling', 'img-cover', 'img-contain'],
    tolerance: { position: 4, size: 8 },
    features: ['Image', 'w-[]', 'h-[]', 'rounded-lg', 'rounded-xl', 'rounded-2xl',
               'object-cover', 'object-contain', 'items-center', 'flex-1'],
  },

  // ─── Badge Primitive (deep) ──────────────────────────────────────
  {
    id: 'badge-deep',
    label: 'Badge all color variants and multi-badge row',
    category: 'badge',
    viewport: { width: 500, height: 400 },
    testIds: ['root', 'row-blue', 'row-green', 'row-red', 'row-orange',
              'row-purple', 'row-pink', 'row-teal',
              'label-blue', 'label-green', 'label-red', 'label-orange',
              'label-purple', 'label-pink', 'label-teal',
              'row-multi', 'multi-a', 'multi-b', 'multi-c'],
    tolerance: { position: 10, size: 8 },
    features: ['Badge', 'color:blue', 'color:green', 'color:red', 'color:orange',
               'color:purple', 'color:pink', 'color:teal', 'items-center'],
  },

  // ─── Input Primitives (deep) ────────────────────────────────────
  {
    id: 'input-deep',
    label: 'Search and Input at various widths in rows',
    category: 'input',
    viewport: { width: 500, height: 340 },
    testIds: ['root', 'row-search', 'search-w200', 'row-search-wide', 'search-w350',
              'row-input', 'input-w200', 'row-input-wide', 'input-w350',
              'row-combined', 'search-combo', 'action-card'],
    tolerance: { position: 6, size: 8 },
    features: ['Search', 'Input', 'w-[]', 'placeholder', 'items-center'],
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
