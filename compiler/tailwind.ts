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

export interface TailwindResult {
  calls: string[]       // C statements like 'ui_set_flex(_j0, 1);'
  textSize: number      // extracted font size (0 = not set)
  textBold: boolean     // extracted bold flag
  width: number         // extracted width (-1 = not set)
  height: number        // extracted height (-1 = not set)
}

// Tailwind spacing scale: class number → pixels
const SPACING: Record<number, number> = {
  0: 0, 0.5: 2, 1: 4, 1.5: 6, 2: 8, 2.5: 10,
  3: 12, 3.5: 14, 4: 16, 5: 20, 6: 24, 7: 28,
  8: 32, 9: 36, 10: 40, 11: 44, 12: 48,
  14: 56, 16: 64, 20: 80, 24: 96, 28: 112,
  32: 128, 36: 144, 40: 160, 44: 176, 48: 192,
}

// Text size scale
const TEXT_SIZES: Record<string, number> = {
  'xs': 12, 'sm': 14, 'base': 16, 'lg': 18,
  'xl': 20, '2xl': 24, '3xl': 30, '4xl': 36,
  '5xl': 48, '6xl': 60,
}

// Dark theme colors (zinc palette + system colors)
const BG_COLORS: Record<string, [number, number, number, number]> = {
  'zinc-50':  [0.98, 0.98, 0.98, 1],
  'zinc-100': [0.96, 0.96, 0.96, 1],
  'zinc-200': [0.90, 0.90, 0.90, 1],
  'zinc-300': [0.83, 0.83, 0.83, 1],
  'zinc-400': [0.63, 0.63, 0.65, 1],
  'zinc-500': [0.44, 0.44, 0.46, 1],
  'zinc-600': [0.33, 0.33, 0.35, 1],
  'zinc-700': [0.24, 0.24, 0.26, 1],
  'zinc-800': [0.15, 0.15, 0.16, 1],
  'zinc-900': [0.09, 0.09, 0.10, 1],
  'zinc-950': [0.04, 0.04, 0.05, 1],
  'black':    [0, 0, 0, 1],
  'white':    [1, 1, 1, 1],
}

// System color indices for text colors (matches ui.h enum)
const TEXT_SYSTEM_COLORS: Record<string, number> = {
  'zinc-500': 2,   // tertiaryLabel
  'zinc-400': 1,   // secondaryLabel
  'zinc-300': 0,   // label
  'blue':     3,
  'green':    4,
  'red':      5,
  'orange':   6,
  'yellow':   7,
  'purple':   8,
  'pink':     9,
  'teal':     10,
  'indigo':   11,
  'cyan':     12,
}

function px(n: number): number {
  if (n in SPACING) return SPACING[n]
  return n * 4  // fallback: standard 4px scale
}

// Parse arbitrary value like "w-[200]" → 200
function parseArbitrary(cls: string): number {
  const m = cls.match(/\[(\d+)\]/)
  return m ? parseInt(m[1]) : -1
}

export function parseTailwind(className: string, handle: string): TailwindResult {
  const result: TailwindResult = {
    calls: [],
    textSize: 0,
    textBold: false,
    width: -1,
    height: -1,
  }

  const classes = className.split(/\s+/).filter(c => c.length > 0)

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
