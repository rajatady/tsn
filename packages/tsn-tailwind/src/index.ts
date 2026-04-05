/**
 * StrictTS Tailwind Parser — Compile-time className → C calls
 *
 * Parses a Tailwind className string and returns an array of
 * C function calls to apply the styles to a UIHandle variable.
 *
 * This runs at compile time — no CSS runtime, no class parsing at runtime.
 * "flex-1 px-5 h-16 gap-3 bg-zinc-900" becomes 5 C function calls.
 *
 * Unit: 1 Tailwind unit = 4px (standard Tailwind spacing scale)
 */

import { parseArbitrary, tokenizeClassName } from './parser.js'
import { BG_COLORS, px, TEXT_SIZES, TEXT_SYSTEM_COLORS } from './scales.js'
import type { TailwindResult } from './types.js'

export function parseTailwind(className: string, handle: string): TailwindResult {
  const result: TailwindResult = {
    calls: [],
    textSize: 0,
    textBold: false,
    width: -1,
    height: -1,
  }

  const classes = tokenizeClassName(className)

  // Track padding values to emit as single call
  let pt = -1, pr = -1, pb = -1, pl = -1

  for (const cls of classes) {
    // Flex
    if (cls === 'flex-1') { result.calls.push(`ui_set_flex(${handle}, 1);`); continue }
    if (cls === 'flex-2') { result.calls.push(`ui_set_flex(${handle}, 2);`); continue }

    // Gap (spacing between children)
    const gapMatch = cls.match(/^gap-(\d+(?:\.\d+)?)$/)
    if (gapMatch) {
      result.calls.push(`ui_set_spacing(${handle}, ${px(parseFloat(gapMatch[1]))});`)
      continue
    }

    // Padding — collect and emit as single call at the end
    const pMatch = cls.match(/^(p|px|py|pt|pr|pb|pl)-(\d+(?:\.\d+)?)$/)
    if (pMatch) {
      const v = px(parseFloat(pMatch[2]))
      switch (pMatch[1]) {
        case 'p':  pt = pr = pb = pl = v; break
        case 'px': pl = pr = v; break
        case 'py': pt = pb = v; break
        case 'pt': pt = v; break
        case 'pr': pr = v; break
        case 'pb': pb = v; break
        case 'pl': pl = v; break
      }
      continue
    }

    // Margin (treated as padding — closest native equivalent)
    const mMatch = cls.match(/^(m|mx|my|mt|mr|mb|ml)-(\d+(?:\.\d+)?)$/)
    if (mMatch) {
      const v = px(parseFloat(mMatch[2]))
      switch (mMatch[1]) {
        case 'm':  pt = pr = pb = pl = v; break
        case 'mx': pl = pr = v; break
        case 'my': pt = pb = v; break
        case 'mt': pt = v; break
        case 'mr': pr = v; break
        case 'mb': pb = v; break
        case 'ml': pl = v; break
      }
      continue
    }

    // Height
    const hMatch = cls.match(/^h-(\d+)$/)
    if (hMatch) { result.height = px(parseInt(hMatch[1])); continue }
    if (cls.startsWith('h-[')) { result.height = parseArbitrary(cls); continue }

    // Width
    const wMatch = cls.match(/^w-(\d+)$/)
    if (wMatch) { result.width = px(parseInt(wMatch[1])); continue }
    if (cls.startsWith('w-[')) { result.width = parseArbitrary(cls); continue }

    // Min/max size constraints
    const minWMatch = cls.match(/^min-w-(\d+)$/)
    if (minWMatch) {
      result.calls.push(`ui_set_min_size(${handle}, ${px(parseInt(minWMatch[1]))}, -1);`)
      continue
    }
    if (cls.startsWith('min-w-[')) {
      result.calls.push(`ui_set_min_size(${handle}, ${parseArbitrary(cls)}, -1);`)
      continue
    }

    const maxWMatch = cls.match(/^max-w-(\d+)$/)
    if (maxWMatch) {
      result.calls.push(`ui_set_max_size(${handle}, ${px(parseInt(maxWMatch[1]))}, -1);`)
      continue
    }
    if (cls.startsWith('max-w-[')) {
      result.calls.push(`ui_set_max_size(${handle}, ${parseArbitrary(cls)}, -1);`)
      continue
    }

    const minHMatch = cls.match(/^min-h-(\d+)$/)
    if (minHMatch) {
      result.calls.push(`ui_set_min_size(${handle}, -1, ${px(parseInt(minHMatch[1]))});`)
      continue
    }
    if (cls.startsWith('min-h-[')) {
      result.calls.push(`ui_set_min_size(${handle}, -1, ${parseArbitrary(cls)});`)
      continue
    }

    const maxHMatch = cls.match(/^max-h-(\d+)$/)
    if (maxHMatch) {
      result.calls.push(`ui_set_max_size(${handle}, -1, ${px(parseInt(maxHMatch[1]))});`)
      continue
    }
    if (cls.startsWith('max-h-[')) {
      result.calls.push(`ui_set_max_size(${handle}, -1, ${parseArbitrary(cls)});`)
      continue
    }

    // Text size
    const textMatch = cls.match(/^text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl)$/)
    if (textMatch && textMatch[1] in TEXT_SIZES) {
      result.textSize = TEXT_SIZES[textMatch[1]]
      continue
    }

    // Text color (system)
    const textColorMatch = cls.match(/^text-(.+)$/)
    if (textColorMatch && !textMatch && textColorMatch[1] in TEXT_SYSTEM_COLORS) {
      result.calls.push(`ui_text_set_color_system(${handle}, ${TEXT_SYSTEM_COLORS[textColorMatch[1]]});`)
      continue
    }

    // Font weight
    if (cls === 'font-bold')   { result.textBold = true; continue }
    if (cls === 'font-medium') { continue }  // default weight
    if (cls === 'font-normal') { result.textBold = false; continue }

    // Background color
    const bgMatch = cls.match(/^bg-(.+)$/)
    if (bgMatch && bgMatch[1] in BG_COLORS) {
      const [r, g, b, a] = BG_COLORS[bgMatch[1]]
      result.calls.push(`ui_set_background_rgb(${handle}, ${r}, ${g}, ${b}, ${a});`)
      continue
    }

    // Rounded corners
    const roundMatch = cls.match(/^rounded(-(\w+))?$/)
    if (roundMatch) {
      const radii: Record<string, number> = {
        'sm': 4, 'undefined': 8, 'md': 8, 'lg': 12, 'xl': 16, '2xl': 20, 'full': 9999
      }
      const r = radii[roundMatch[2] || 'undefined'] || 8
      result.calls.push(`ui_set_corner_radius(${handle}, ${r});`)
      continue
    }

    // Auto-centering / self alignment
    if (cls === 'mx-auto' || cls === 'self-center') {
      result.calls.push(`ui_set_alignment(${handle}, 1);`)
      continue
    }
    if (cls === 'self-end') {
      result.calls.push(`ui_set_alignment(${handle}, 2);`)
      continue
    }

    // Scroll axis hints. These are meaningful on <Scroll>.
    if (cls === 'overflow-x-auto') {
      result.calls.push(`ui_scroll_set_axis(${handle}, 1);`)
      continue
    }
    if (cls === 'overflow-y-auto') {
      result.calls.push(`ui_scroll_set_axis(${handle}, 0);`)
      continue
    }

    // Ignore unknown classes silently (don't break compilation)
  }

  // Emit padding if any was set
  if (pt >= 0 || pr >= 0 || pb >= 0 || pl >= 0) {
    result.calls.push(`ui_set_padding(${handle}, ${pt < 0 ? 0 : pt}, ${pr < 0 ? 0 : pr}, ${pb < 0 ? 0 : pb}, ${pl < 0 ? 0 : pl});`)
  }

  // Emit size if set
  if (result.width !== -1 || result.height !== -1) {
    result.calls.push(`ui_set_size(${handle}, ${result.width}, ${result.height});`)
  }

  return result
}
