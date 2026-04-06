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

import { parseArbitrary, parseArbitraryColor, parseColorAlpha, tokenizeClassName } from './parser.js'
import { BG_COLORS, px, TEXT_SIZES, TEXT_SYSTEM_COLORS } from './scales.js'
import type { TailwindResult } from './types.js'

export function parseTailwind(className: string, handle: string): TailwindResult {
  const result: TailwindResult = {
    calls: [],
    textSize: 0,
    textBold: false,
    textWeight: -1,
    textLineHeight: -1,
    textTracking: NaN,
    textTransform: 0,
    textAlign: -1,
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

    // Text color (system or arbitrary)
    const textColorMatch = cls.match(/^text-(.+)$/)
    if (textColorMatch && !textMatch) {
      const raw = textColorMatch[1]
      // Arbitrary hex: text-[#RRGGBB]
      const hexColor = parseArbitraryColor(cls)
      if (hexColor) {
        const [r, g, b] = hexColor
        result.calls.push(`ui_text_set_color_rgb(${handle}, ${r.toFixed(3)}, ${g.toFixed(3)}, ${b.toFixed(3)}, 1.0);`)
        continue
      }
      // Named with optional alpha: text-white/80, text-zinc-400/50
      const { name, alpha } = parseColorAlpha(raw)
      if (name in TEXT_SYSTEM_COLORS && alpha === 1) {
        result.calls.push(`ui_text_set_color_system(${handle}, ${TEXT_SYSTEM_COLORS[name]});`)
        continue
      }
      // Alpha on a named text color — need RGB path
      if (name in TEXT_SYSTEM_COLORS && alpha < 1) {
        // Map system colors to approximate RGB for alpha blending
        const TEXT_RGB: Record<string, [number, number, number]> = {
          'zinc-300': [0.83, 0.83, 0.83],
          'zinc-400': [0.63, 0.63, 0.65],
          'zinc-500': [0.44, 0.44, 0.46],
          blue: [0.0, 0.48, 1.0],
          green: [0.2, 0.78, 0.35],
          red: [1.0, 0.23, 0.19],
          orange: [1.0, 0.58, 0.0],
          yellow: [1.0, 0.80, 0.0],
          purple: [0.69, 0.32, 0.87],
          pink: [1.0, 0.18, 0.33],
          teal: [0.19, 0.69, 0.78],
          indigo: [0.35, 0.34, 0.84],
          cyan: [0.20, 0.68, 0.90],
        }
        if (name in TEXT_RGB) {
          const [r, g, b] = TEXT_RGB[name]
          result.calls.push(`ui_text_set_color_rgb(${handle}, ${r}, ${g}, ${b}, ${alpha});`)
          continue
        }
      }
      // Named white/black with alpha
      if (name === 'white') {
        result.calls.push(`ui_text_set_color_rgb(${handle}, 1, 1, 1, ${alpha});`)
        continue
      }
      if (name === 'black') {
        result.calls.push(`ui_text_set_color_rgb(${handle}, 0, 0, 0, ${alpha});`)
        continue
      }
      // Fallback: check system colors without alpha
      if (raw in TEXT_SYSTEM_COLORS) {
        result.calls.push(`ui_text_set_color_system(${handle}, ${TEXT_SYSTEM_COLORS[raw]});`)
        continue
      }
    }

    // Font weight
    if (cls === 'font-thin')       { result.textWeight = 0; continue }
    if (cls === 'font-extralight') { result.textWeight = 1; continue }
    if (cls === 'font-light')      { result.textWeight = 2; continue }
    if (cls === 'font-normal')     { result.textWeight = 3; result.textBold = false; continue }
    if (cls === 'font-medium')     { result.textWeight = 4; continue }
    if (cls === 'font-semibold')   { result.textWeight = 6; continue }
    if (cls === 'font-bold')       { result.textWeight = 7; result.textBold = true; continue }
    if (cls === 'font-extrabold')  { result.textWeight = 8; continue }
    if (cls === 'font-black')      { result.textWeight = 9; continue }

    // Line height
    const LEADING: Record<string, number> = {
      'leading-none': 1.0, 'leading-tight': 1.25, 'leading-snug': 1.375,
      'leading-normal': 1.5, 'leading-relaxed': 1.625, 'leading-loose': 2.0,
    }
    if (cls in LEADING) { result.textLineHeight = LEADING[cls]; continue }
    if (cls.startsWith('leading-[')) {
      const val = cls.match(/\[([\d.]+)\]/)
      if (val) { result.textLineHeight = parseFloat(val[1]); continue }
    }

    // Letter spacing
    const TRACKING: Record<string, number> = {
      'tracking-tighter': -0.8, 'tracking-tight': -0.4, 'tracking-normal': 0,
      'tracking-wide': 0.4, 'tracking-wider': 0.8, 'tracking-widest': 1.6,
    }
    if (cls in TRACKING) { result.textTracking = TRACKING[cls]; continue }
    if (cls.startsWith('tracking-[')) {
      const val = cls.match(/\[(-?[\d.]+)(?:em|px)?\]/)
      if (val) { result.textTracking = parseFloat(val[1]); continue }
    }

    // Text transform
    if (cls === 'uppercase')  { result.textTransform = 1; continue }
    if (cls === 'lowercase')  { result.textTransform = 2; continue }
    if (cls === 'capitalize') { continue }  // not supported in native

    // Text alignment
    if (cls === 'text-left')   { result.textAlign = 0; continue }
    if (cls === 'text-center') { result.textAlign = 1; continue }
    if (cls === 'text-right')  { result.textAlign = 2; continue }

    // Background color
    const bgMatch = cls.match(/^bg-(.+)$/)
    if (bgMatch) {
      const raw = bgMatch[1]
      // Arbitrary hex: bg-[#RRGGBB]
      const hexColor = parseArbitraryColor(cls)
      if (hexColor) {
        const [r, g, b] = hexColor
        result.calls.push(`ui_set_background_rgb(${handle}, ${r.toFixed(3)}, ${g.toFixed(3)}, ${b.toFixed(3)}, 1.0);`)
        continue
      }
      // Named color with optional alpha: bg-white/5, bg-zinc-800/50
      const { name, alpha } = parseColorAlpha(raw)
      if (name in BG_COLORS) {
        const [r, g, b] = BG_COLORS[name]
        result.calls.push(`ui_set_background_rgb(${handle}, ${r}, ${g}, ${b}, ${alpha});`)
        continue
      }
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

    // Container cross-axis alignment (align-items)
    if (cls === 'items-center')  { result.calls.push(`ui_set_align_items(${handle}, 1);`); continue }
    if (cls === 'items-start')   { result.calls.push(`ui_set_align_items(${handle}, 0);`); continue }
    if (cls === 'items-end')     { result.calls.push(`ui_set_align_items(${handle}, 2);`); continue }
    if (cls === 'items-stretch') { result.calls.push(`ui_set_align_items(${handle}, 3);`); continue }

    // Container main-axis alignment (justify-content)
    if (cls === 'justify-start')   { result.calls.push(`ui_set_justify_content(${handle}, 0);`); continue }
    if (cls === 'justify-center')  { result.calls.push(`ui_set_justify_content(${handle}, 1);`); continue }
    if (cls === 'justify-end')     { result.calls.push(`ui_set_justify_content(${handle}, 2);`); continue }
    if (cls === 'justify-between') { result.calls.push(`ui_set_justify_content(${handle}, 3);`); continue }

    // Auto-centering / self alignment
    if (cls === 'mx-auto' || cls === 'self-center') {
      result.calls.push(`ui_set_alignment(${handle}, 1);`)
      continue
    }
    if (cls === 'self-end') {
      result.calls.push(`ui_set_alignment(${handle}, 2);`)
      continue
    }

    // Shadow
    if (cls === 'shadow-sm')   { result.calls.push(`ui_set_shadow(${handle}, 0, 1, 2, 0.05);`); continue }
    if (cls === 'shadow')      { result.calls.push(`ui_set_shadow(${handle}, 0, 1, 3, 0.1);`); continue }
    if (cls === 'shadow-md')   { result.calls.push(`ui_set_shadow(${handle}, 0, 4, 6, 0.1);`); continue }
    if (cls === 'shadow-lg')   { result.calls.push(`ui_set_shadow(${handle}, 0, 10, 15, 0.1);`); continue }
    if (cls === 'shadow-xl')   { result.calls.push(`ui_set_shadow(${handle}, 0, 20, 25, 0.15);`); continue }
    if (cls === 'shadow-2xl')  { result.calls.push(`ui_set_shadow(${handle}, 0, 25, 50, 0.25);`); continue }
    if (cls === 'shadow-none') { result.calls.push(`ui_set_shadow(${handle}, 0, 0, 0, 0);`); continue }

    // Image object-fit
    if (cls === 'object-cover')   { result.calls.push(`ui_image_set_scaling(${handle}, 1);`); continue }
    if (cls === 'object-contain') { result.calls.push(`ui_image_set_scaling(${handle}, 0);`); continue }
    if (cls === 'object-fill')    { result.calls.push(`ui_image_set_scaling(${handle}, 2);`); continue }

    // Overflow
    if (cls === 'overflow-hidden') { result.calls.push(`ui_set_clip(${handle}, 1);`); continue }

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
