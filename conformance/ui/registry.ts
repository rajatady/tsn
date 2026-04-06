export function suiteIdByTag(tag: number): string {
  if (tag === 2) return 'content'
  if (tag === 3) return 'inputs'
  if (tag === 4) return 'media'
  if (tag === 5) return 'data'
  return 'layout'
}

export function suiteLabelById(id: string): string {
  if (id === 'content') return 'Content Suite'
  if (id === 'inputs') return 'Inputs Suite'
  if (id === 'media') return 'Media Suite'
  if (id === 'data') return 'Data Suite'
  return 'Layout Suite'
}

export function suiteDescriptionById(id: string): string {
  if (id === 'content') return 'Text, symbol, card, badge, stat, divider, and button primitives.'
  if (id === 'inputs') return 'Search, input fields, live state binding, and reset behavior.'
  if (id === 'media') return 'Image primitives, hero media, icons, and paired screenshots.'
  if (id === 'data') return 'Progress, chart, and table primitives plus state mutation through data controls.'
  return 'Window shell, stacks, sidebar geometry, spacers, scroll containers, and constrained rails.'
}
