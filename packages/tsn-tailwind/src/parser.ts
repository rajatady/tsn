import type { LengthValue } from './types.js'

export function parseArbitraryValue(cls: string): LengthValue | null {
  const match = cls.match(/\[(-?\d+(?:\.\d+)?)(%)?\]/)
  if (!match) return null
  const value = parseFloat(match[1])
  if (Number.isNaN(value)) return null
  return match[2] === '%'
    ? { unit: 'percent', value }
    : { unit: 'point', value }
}

export function parseArbitrary(cls: string): number {
  const parsed = parseArbitraryValue(cls)
  if (!parsed || parsed.unit !== 'point') return -1
  return parsed.value
}

export function tokenizeClassName(className: string): string[] {
  return className.split(/\s+/).filter(cls => cls.length > 0)
}

/**
 * Parse a hex color string (#RGB or #RRGGBB) into normalized [r, g, b] values (0-1).
 * Returns null if the string is not a valid hex color.
 */
export function parseHexColor(hex: string): [number, number, number] | null {
  if (hex.length === 4) {
    // #RGB
    const r = parseInt(hex[1] + hex[1], 16) / 255
    const g = parseInt(hex[2] + hex[2], 16) / 255
    const b = parseInt(hex[3] + hex[3], 16) / 255
    if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null
    return [r, g, b]
  }
  if (hex.length === 7) {
    // #RRGGBB
    const r = parseInt(hex.slice(1, 3), 16) / 255
    const g = parseInt(hex.slice(3, 5), 16) / 255
    const b = parseInt(hex.slice(5, 7), 16) / 255
    if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null
    return [r, g, b]
  }
  return null
}

/**
 * Parse an arbitrary color from a Tailwind class like bg-[#2F2823] or text-[#ff0000].
 * Returns [r, g, b] normalized or null.
 */
export function parseArbitraryColor(cls: string): [number, number, number] | null {
  const match = cls.match(/\[(#[0-9a-fA-F]{3,6})\]/)
  if (!match) return null
  return parseHexColor(match[1])
}

/**
 * Parse a color/opacity modifier like "white/5" or "zinc-800/50".
 * Returns { name, alpha } where alpha is 0-1.
 */
export function parseColorAlpha(raw: string): { name: string, alpha: number } {
  const slashIdx = raw.lastIndexOf('/')
  if (slashIdx === -1) return { name: raw, alpha: 1 }
  const name = raw.slice(0, slashIdx)
  const alphaPercent = parseInt(raw.slice(slashIdx + 1))
  if (Number.isNaN(alphaPercent)) return { name: raw, alpha: 1 }
  return { name, alpha: alphaPercent / 100 }
}
