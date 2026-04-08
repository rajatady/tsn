/**
 * StrictTS Tailwind Parser — Compile-time className -> structured style ops.
 *
 * Tailwind is one frontend syntax for a host style model. We still return
 * `calls` for the current compiler pipeline, but those calls are rendered from
 * `ops` so the style path can evolve without keeping layout logic embedded in
 * string concatenation.
 */

import { parseArbitraryColor, parseArbitraryValue, parseColorAlpha, tokenizeClassName } from './parser.js'
import { BG_COLORS, px, TEXT_SIZES, TEXT_SYSTEM_COLORS } from './scales.js'
import type { LengthValue, TailwindOp, TailwindResult } from './types.js'

function point(value: number): LengthValue {
  return { unit: 'point', value }
}

function renderLengthOp(
  kind: 'size' | 'min-size' | 'max-size',
  handle: string,
  width: LengthValue | null,
  height: LengthValue | null,
): string[] {
  if (!width && !height) return []
  const widthUnit = width?.unit ?? 'point'
  const heightUnit = height?.unit ?? 'point'
  if (width && height && widthUnit !== heightUnit) {
    const calls: string[] = []
    if (width) {
      calls.push(
        width.unit === 'percent'
          ? `${kind === 'size' ? 'ui_set_size_pct' : kind === 'min-size' ? 'ui_set_min_size_pct' : 'ui_set_max_size_pct'}(${handle}, ${width.value}, -1);`
          : `${kind === 'size' ? 'ui_set_size' : kind === 'min-size' ? 'ui_set_min_size' : 'ui_set_max_size'}(${handle}, ${width.value}, -1);`,
      )
    }
    if (height) {
      calls.push(
        height.unit === 'percent'
          ? `${kind === 'size' ? 'ui_set_size_pct' : kind === 'min-size' ? 'ui_set_min_size_pct' : 'ui_set_max_size_pct'}(${handle}, -1, ${height.value});`
          : `${kind === 'size' ? 'ui_set_size' : kind === 'min-size' ? 'ui_set_min_size' : 'ui_set_max_size'}(${handle}, -1, ${height.value});`,
      )
    }
    return calls
  }

  const fn =
    kind === 'size'
      ? width?.unit === 'percent' || height?.unit === 'percent' ? 'ui_set_size_pct' : 'ui_set_size'
      : kind === 'min-size'
        ? width?.unit === 'percent' || height?.unit === 'percent' ? 'ui_set_min_size_pct' : 'ui_set_min_size'
        : width?.unit === 'percent' || height?.unit === 'percent' ? 'ui_set_max_size_pct' : 'ui_set_max_size'

  return [`${fn}(${handle}, ${width ? width.value : -1}, ${height ? height.value : -1});`]
}

function renderTailwindOp(op: TailwindOp, handle: string): string[] {
  switch (op.kind) {
    case 'flex':
      return [`ui_set_flex(${handle}, ${op.value});`]
    case 'spacing':
      return [`ui_set_spacing(${handle}, ${op.value});`]
    case 'padding':
      return [`ui_set_padding(${handle}, ${op.top}, ${op.right}, ${op.bottom}, ${op.left});`]
    case 'size':
      return renderLengthOp('size', handle, op.width, op.height)
    case 'min-size':
      return renderLengthOp('min-size', handle, op.width, op.height)
    case 'max-size':
      return renderLengthOp('max-size', handle, op.width, op.height)
    case 'aspect':
      return [`ui_set_aspect(${handle}, ${op.width}, ${op.height});`]
    case 'text-color-rgb':
      return [`ui_text_set_color_rgb(${handle}, ${op.r}, ${op.g}, ${op.b}, ${op.a});`]
    case 'text-color-system':
      return [`ui_text_set_color_system(${handle}, ${op.color});`]
    case 'background-rgb':
      return [`ui_set_background_rgb(${handle}, ${op.r}, ${op.g}, ${op.b}, ${op.a});`]
    case 'corner-radius':
      return [`ui_set_corner_radius(${handle}, ${op.radius});`]
    case 'align-items':
      return [`ui_set_align_items(${handle}, ${op.value});`]
    case 'justify-content':
      return [`ui_set_justify_content(${handle}, ${op.value});`]
    case 'align-self':
      return [`ui_set_alignment(${handle}, ${op.value});`]
    case 'margin-auto':
      return [`ui_set_margin_auto(${handle});`]
    case 'shadow':
      return [`ui_set_shadow(${handle}, ${op.offsetX}, ${op.offsetY}, ${op.radius}, ${op.opacity});`]
    case 'image-scaling':
      return [`ui_image_set_scaling(${handle}, ${op.value});`]
    case 'text-truncate':
      return [`ui_text_set_truncate(${handle});`]
    case 'clip':
      return [`ui_set_clip(${handle}, ${op.value});`]
    case 'scroll-axis':
      return [`ui_scroll_set_axis(${handle}, ${op.value});`]
  }
}

function rgbaString(r: number, g: number, b: number, a: number): string {
  return `rgba(${r}, ${g}, ${b}, ${a})`
}

function textAlignName(value: number): 'start' | 'center' | 'end' {
  if (value === 1) return 'center'
  if (value === 2) return 'end'
  return 'start'
}

function textTransformName(value: number): 'uppercase' | 'lowercase' | undefined {
  if (value === 1) return 'uppercase'
  if (value === 2) return 'lowercase'
  return undefined
}

function layoutAlignName(value: number): 'start' | 'center' | 'end' | 'stretch' {
  if (value === 1) return 'center'
  if (value === 2) return 'end'
  if (value === 3) return 'stretch'
  return 'start'
}

function layoutJustifyName(value: number): 'start' | 'center' | 'end' | 'space-between' {
  if (value === 1) return 'center'
  if (value === 2) return 'end'
  if (value === 3) return 'space-between'
  return 'start'
}

function applyStylePatch(result: TailwindResult, op: TailwindOp): void {
  switch (op.kind) {
    case 'flex':
      result.stylePatch.layoutStyle.grow = op.value
      return
    case 'spacing':
      result.stylePatch.layoutStyle.gap = op.value
      return
    case 'padding':
      result.stylePatch.layoutStyle.paddingTop = op.top
      result.stylePatch.layoutStyle.paddingRight = op.right
      result.stylePatch.layoutStyle.paddingBottom = op.bottom
      result.stylePatch.layoutStyle.paddingLeft = op.left
      return
    case 'size':
      if (op.width) result.stylePatch.layoutStyle.width = op.width
      if (op.height) result.stylePatch.layoutStyle.height = op.height
      return
    case 'min-size':
      if (op.width) result.stylePatch.layoutStyle.minWidth = op.width
      if (op.height) result.stylePatch.layoutStyle.minHeight = op.height
      return
    case 'max-size':
      if (op.width) result.stylePatch.layoutStyle.maxWidth = op.width
      if (op.height) result.stylePatch.layoutStyle.maxHeight = op.height
      return
    case 'aspect':
      result.stylePatch.layoutStyle.aspectRatio = op.width / op.height
      return
    case 'text-color-rgb':
      result.stylePatch.textStyle.color = rgbaString(op.r, op.g, op.b, op.a)
      return
    case 'text-color-system':
      result.stylePatch.textStyle.color = `system:${op.color}`
      return
    case 'background-rgb':
      result.stylePatch.visualStyle.backgroundColor = rgbaString(op.r, op.g, op.b, op.a)
      return
    case 'corner-radius':
      result.stylePatch.visualStyle.cornerRadius = op.radius
      return
    case 'align-items':
      result.stylePatch.layoutStyle.alignItems = layoutAlignName(op.value)
      return
    case 'justify-content':
      result.stylePatch.layoutStyle.justifyContent = layoutJustifyName(op.value)
      return
    case 'align-self':
      result.stylePatch.layoutStyle.alignSelf = layoutAlignName(op.value)
      return
    case 'margin-auto':
      result.stylePatch.layoutStyle.marginAuto = true
      return
    case 'shadow':
      result.stylePatch.visualStyle.shadow = {
        offsetX: op.offsetX,
        offsetY: op.offsetY,
        radius: op.radius,
        opacity: op.opacity,
      }
      return
    case 'image-scaling':
      return
    case 'text-truncate':
      result.stylePatch.textStyle.truncate = true
      return
    case 'clip':
      result.stylePatch.visualStyle.clip = op.value !== 0
      return
    case 'scroll-axis':
      result.stylePatch.behavior.scrollAxis = op.value === 1 ? 'horizontal' : 'vertical'
      return
  }
}

function pushOps(result: TailwindResult, ...ops: TailwindOp[]): void {
  result.ops.push(...ops)
  for (const op of ops) {
    applyStylePatch(result, op)
  }
}

function rgbOp(kind: 'background-rgb' | 'text-color-rgb', r: number, g: number, b: number, a: number): TailwindOp {
  return { kind, r, g, b, a }
}

export function parseTailwind(className: string, handle: string): TailwindResult {
  const result: TailwindResult = {
    ops: [],
    calls: [],
    stylePatch: {
      layoutStyle: {},
      visualStyle: {},
      textStyle: {},
      behavior: {},
    },
    textSize: 0,
    textBold: false,
    textWeight: -1,
    textLineHeight: -1,
    textTracking: NaN,
    textTransform: 0,
    textAlign: -1,
    width: -1,
    height: -1,
    widthValue: null,
    heightValue: null,
  }

  const classes = tokenizeClassName(className)

  let pt = -1
  let pr = -1
  let pb = -1
  let pl = -1
  let widthValue: LengthValue | null = null
  let heightValue: LengthValue | null = null

  for (const cls of classes) {
    if (cls === 'flex-1') { pushOps(result, { kind: 'flex', value: 1 }); continue }
    if (cls === 'flex-2') { pushOps(result, { kind: 'flex', value: 2 }); continue }

    const gapMatch = cls.match(/^gap-(\d+(?:\.\d+)?)$/)
    if (gapMatch) {
      pushOps(result, { kind: 'spacing', value: px(parseFloat(gapMatch[1])) })
      continue
    }
    if (cls.startsWith('gap-[') || cls.startsWith('space-y-[') || cls.startsWith('space-x-[')) {
      const parsed = parseArbitraryValue(cls)
      if (parsed && parsed.unit === 'point') {
        pushOps(result, { kind: 'spacing', value: parsed.value })
        continue
      }
    }
    const spaceMatch = cls.match(/^space-(?:x|y)-(\d+(?:\.\d+)?)$/)
    if (spaceMatch) {
      pushOps(result, { kind: 'spacing', value: px(parseFloat(spaceMatch[1])) })
      continue
    }

    const pMatch = cls.match(/^(p|px|py|pt|pr|pb|pl)-(\d+(?:\.\d+)?)$/)
    if (pMatch) {
      const value = px(parseFloat(pMatch[2]))
      switch (pMatch[1]) {
        case 'p': pt = pr = pb = pl = value; break
        case 'px': pl = pr = value; break
        case 'py': pt = pb = value; break
        case 'pt': pt = value; break
        case 'pr': pr = value; break
        case 'pb': pb = value; break
        case 'pl': pl = value; break
      }
      continue
    }
    const pArbitrary = cls.match(/^(p|px|py|pt|pr|pb|pl)-\[/)
    if (pArbitrary) {
      const parsed = parseArbitraryValue(cls)
      if (parsed && parsed.unit === 'point') {
        const value = parsed.value
        switch (pArbitrary[1]) {
          case 'p': pt = pr = pb = pl = value; break
          case 'px': pl = pr = value; break
          case 'py': pt = pb = value; break
          case 'pt': pt = value; break
          case 'pr': pr = value; break
          case 'pb': pb = value; break
          case 'pl': pl = value; break
        }
        continue
      }
    }

    const mMatch = cls.match(/^(m|mx|my|mt|mr|mb|ml)-(\d+(?:\.\d+)?)$/)
    if (mMatch) {
      const value = px(parseFloat(mMatch[2]))
      switch (mMatch[1]) {
        case 'm': pt = pr = pb = pl = value; break
        case 'mx': pl = pr = value; break
        case 'my': pt = pb = value; break
        case 'mt': pt = value; break
        case 'mr': pr = value; break
        case 'mb': pb = value; break
        case 'ml': pl = value; break
      }
      continue
    }
    const mArbitrary = cls.match(/^(m|mx|my|mt|mr|mb|ml)-\[/)
    if (mArbitrary) {
      const parsed = parseArbitraryValue(cls)
      if (parsed && parsed.unit === 'point') {
        const value = parsed.value
        switch (mArbitrary[1]) {
          case 'm': pt = pr = pb = pl = value; break
          case 'mx': pl = pr = value; break
          case 'my': pt = pb = value; break
          case 'mt': pt = value; break
          case 'mr': pr = value; break
          case 'mb': pb = value; break
          case 'ml': pl = value; break
        }
        continue
      }
    }

    if (cls === 'h-full') { heightValue = { unit: 'percent', value: 100 }; continue }

    const hMatch = cls.match(/^h-(\d+)$/)
    if (hMatch) { heightValue = point(px(parseInt(hMatch[1]))); continue }
    if (cls.startsWith('h-[')) { heightValue = parseArbitraryValue(cls); continue }

    if (cls === 'w-full') { widthValue = { unit: 'percent', value: 100 }; continue }

    const wMatch = cls.match(/^w-(\d+)$/)
    if (wMatch) { widthValue = point(px(parseInt(wMatch[1]))); continue }
    if (cls.startsWith('w-[')) { widthValue = parseArbitraryValue(cls); continue }

    const minWMatch = cls.match(/^min-w-(\d+)$/)
    if (minWMatch) {
      pushOps(result, { kind: 'min-size', width: point(px(parseInt(minWMatch[1]))), height: null })
      continue
    }
    if (cls.startsWith('min-w-[')) {
      pushOps(result, { kind: 'min-size', width: parseArbitraryValue(cls), height: null })
      continue
    }

    const maxWMatch = cls.match(/^max-w-(\d+)$/)
    if (maxWMatch) {
      pushOps(result, { kind: 'max-size', width: point(px(parseInt(maxWMatch[1]))), height: null })
      continue
    }
    if (cls.startsWith('max-w-[')) {
      pushOps(result, { kind: 'max-size', width: parseArbitraryValue(cls), height: null })
      continue
    }

    const minHMatch = cls.match(/^min-h-(\d+)$/)
    if (minHMatch) {
      pushOps(result, { kind: 'min-size', width: null, height: point(px(parseInt(minHMatch[1]))) })
      continue
    }
    if (cls.startsWith('min-h-[')) {
      pushOps(result, { kind: 'min-size', width: null, height: parseArbitraryValue(cls) })
      continue
    }

    const maxHMatch = cls.match(/^max-h-(\d+)$/)
    if (maxHMatch) {
      pushOps(result, { kind: 'max-size', width: null, height: point(px(parseInt(maxHMatch[1]))) })
      continue
    }
    if (cls.startsWith('max-h-[')) {
      pushOps(result, { kind: 'max-size', width: null, height: parseArbitraryValue(cls) })
      continue
    }

    const aspectMatch = cls.match(/^aspect-\[(\d+)\/(\d+)\]$/)
    if (aspectMatch) {
      pushOps(result, { kind: 'aspect', width: parseInt(aspectMatch[1]), height: parseInt(aspectMatch[2]) })
      continue
    }

    const textMatch = cls.match(/^text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl)$/)
    if (textMatch && textMatch[1] in TEXT_SIZES) {
      result.textSize = TEXT_SIZES[textMatch[1]]
      continue
    }

    const textArbitrary = cls.match(/^text-\[(\d+)(?:px)?\]$/)
    if (textArbitrary) {
      result.textSize = parseInt(textArbitrary[1])
      continue
    }

    const textColorMatch = cls.match(/^text-(.+)$/)
    if (textColorMatch && !textMatch) {
      const raw = textColorMatch[1]
      const hexColor = parseArbitraryColor(cls)
      if (hexColor) {
        const [r, g, b] = hexColor
        pushOps(result, rgbOp('text-color-rgb', Number(r.toFixed(3)), Number(g.toFixed(3)), Number(b.toFixed(3)), 1.0))
        continue
      }

      const { name, alpha } = parseColorAlpha(raw)
      if (name in TEXT_SYSTEM_COLORS && alpha === 1) {
        pushOps(result, { kind: 'text-color-system', color: TEXT_SYSTEM_COLORS[name] })
        continue
      }

      if (name in TEXT_SYSTEM_COLORS && alpha < 1) {
        const textRgb: Record<string, [number, number, number]> = {
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
        if (name in textRgb) {
          const [r, g, b] = textRgb[name]
          pushOps(result, rgbOp('text-color-rgb', r, g, b, alpha))
          continue
        }
      }

      if (name === 'white') {
        pushOps(result, rgbOp('text-color-rgb', 1, 1, 1, alpha))
        continue
      }
      if (name === 'black') {
        pushOps(result, rgbOp('text-color-rgb', 0, 0, 0, alpha))
        continue
      }
      if (raw in TEXT_SYSTEM_COLORS) {
        pushOps(result, { kind: 'text-color-system', color: TEXT_SYSTEM_COLORS[raw] })
        continue
      }
    }

    if (cls === 'font-thin') { result.textWeight = 0; continue }
    if (cls === 'font-extralight') { result.textWeight = 1; continue }
    if (cls === 'font-light') { result.textWeight = 2; continue }
    if (cls === 'font-normal') { result.textWeight = 3; result.textBold = false; continue }
    if (cls === 'font-medium') { result.textWeight = 4; continue }
    if (cls === 'font-semibold') { result.textWeight = 6; continue }
    if (cls === 'font-bold') { result.textWeight = 7; result.textBold = true; continue }
    if (cls === 'font-extrabold') { result.textWeight = 8; continue }
    if (cls === 'font-black') { result.textWeight = 9; continue }

    const leading: Record<string, number> = {
      'leading-none': 1.0,
      'leading-tight': 1.25,
      'leading-snug': 1.375,
      'leading-normal': 1.5,
      'leading-relaxed': 1.625,
      'leading-loose': 2.0,
    }
    if (cls in leading) { result.textLineHeight = leading[cls]; continue }
    if (cls.startsWith('leading-[')) {
      const value = cls.match(/\[([\d.]+)\]/)
      if (value) { result.textLineHeight = parseFloat(value[1]); continue }
    }

    const tracking: Record<string, number> = {
      'tracking-tighter': -0.05,
      'tracking-tight': -0.025,
      'tracking-normal': 0,
      'tracking-wide': 0.025,
      'tracking-wider': 0.05,
      'tracking-widest': 0.1,
    }
    if (cls in tracking) { result.textTracking = tracking[cls]; continue }
    if (cls.startsWith('tracking-[')) {
      const value = cls.match(/\[(-?[\d.]+)(?:em|px)?\]/)
      if (value) { result.textTracking = parseFloat(value[1]); continue }
    }

    if (cls === 'uppercase') { result.textTransform = 1; continue }
    if (cls === 'lowercase') { result.textTransform = 2; continue }
    if (cls === 'capitalize') continue

    if (cls === 'text-left') { result.textAlign = 0; continue }
    if (cls === 'text-center') { result.textAlign = 1; continue }
    if (cls === 'text-right') { result.textAlign = 2; continue }

    const bgMatch = cls.match(/^bg-(.+)$/)
    if (bgMatch) {
      const raw = bgMatch[1]
      const hexColor = parseArbitraryColor(cls)
      if (hexColor) {
        const [r, g, b] = hexColor
        pushOps(result, rgbOp('background-rgb', Number(r.toFixed(3)), Number(g.toFixed(3)), Number(b.toFixed(3)), 1.0))
        continue
      }
      const { name, alpha } = parseColorAlpha(raw)
      if (name in BG_COLORS) {
        const [r, g, b] = BG_COLORS[name]
        pushOps(result, rgbOp('background-rgb', r, g, b, alpha))
        continue
      }
    }

    const roundMatch = cls.match(/^rounded(-(\w+))?$/)
    if (roundMatch) {
      const radii: Record<string, number> = {
        sm: 4,
        undefined: 8,
        md: 8,
        lg: 12,
        xl: 16,
        '2xl': 20,
        full: 9999,
      }
      pushOps(result, { kind: 'corner-radius', radius: radii[roundMatch[2] || 'undefined'] || 8 })
      continue
    }

    if (cls === 'items-center') { pushOps(result, { kind: 'align-items', value: 1 }); continue }
    if (cls === 'items-start') { pushOps(result, { kind: 'align-items', value: 0 }); continue }
    if (cls === 'items-end') { pushOps(result, { kind: 'align-items', value: 2 }); continue }
    if (cls === 'items-stretch') { pushOps(result, { kind: 'align-items', value: 3 }); continue }

    if (cls === 'justify-start') { pushOps(result, { kind: 'justify-content', value: 0 }); continue }
    if (cls === 'justify-center') { pushOps(result, { kind: 'justify-content', value: 1 }); continue }
    if (cls === 'justify-end') { pushOps(result, { kind: 'justify-content', value: 2 }); continue }
    if (cls === 'justify-between') { pushOps(result, { kind: 'justify-content', value: 3 }); continue }

    if (cls === 'mx-auto') { pushOps(result, { kind: 'margin-auto' }); continue }
    if (cls === 'self-center') { pushOps(result, { kind: 'align-self', value: 1 }); continue }
    if (cls === 'self-end') { pushOps(result, { kind: 'align-self', value: 2 }); continue }

    if (cls === 'shadow-sm') { pushOps(result, { kind: 'shadow', offsetX: 0, offsetY: 1, radius: 2, opacity: 0.05 }); continue }
    if (cls === 'shadow') { pushOps(result, { kind: 'shadow', offsetX: 0, offsetY: 1, radius: 3, opacity: 0.1 }); continue }
    if (cls === 'shadow-md') { pushOps(result, { kind: 'shadow', offsetX: 0, offsetY: 4, radius: 6, opacity: 0.1 }); continue }
    if (cls === 'shadow-lg') { pushOps(result, { kind: 'shadow', offsetX: 0, offsetY: 10, radius: 15, opacity: 0.1 }); continue }
    if (cls === 'shadow-xl') { pushOps(result, { kind: 'shadow', offsetX: 0, offsetY: 20, radius: 25, opacity: 0.15 }); continue }
    if (cls === 'shadow-2xl') { pushOps(result, { kind: 'shadow', offsetX: 0, offsetY: 25, radius: 50, opacity: 0.25 }); continue }
    if (cls === 'shadow-none') { pushOps(result, { kind: 'shadow', offsetX: 0, offsetY: 0, radius: 0, opacity: 0 }); continue }

    if (cls === 'object-cover') { pushOps(result, { kind: 'image-scaling', value: 1 }); continue }
    if (cls === 'object-contain') { pushOps(result, { kind: 'image-scaling', value: 0 }); continue }
    if (cls === 'object-fill') { pushOps(result, { kind: 'image-scaling', value: 2 }); continue }

    if (cls === 'truncate') { pushOps(result, { kind: 'text-truncate' }); continue }
    if (cls === 'overflow-hidden') { pushOps(result, { kind: 'clip', value: 1 }); continue }
    if (cls === 'overflow-x-auto') { pushOps(result, { kind: 'scroll-axis', value: 1 }); continue }
    if (cls === 'overflow-y-auto') { pushOps(result, { kind: 'scroll-axis', value: 0 }); continue }
  }

  if (pt >= 0 || pr >= 0 || pb >= 0 || pl >= 0) {
    pushOps(result, {
      kind: 'padding',
      top: pt < 0 ? 0 : pt,
      right: pr < 0 ? 0 : pr,
      bottom: pb < 0 ? 0 : pb,
      left: pl < 0 ? 0 : pl,
    })
  }

  result.widthValue = widthValue
  result.heightValue = heightValue
  result.width = widthValue?.unit === 'point' ? widthValue.value : -1
  result.height = heightValue?.unit === 'point' ? heightValue.value : -1

  if (widthValue || heightValue) {
    pushOps(result, { kind: 'size', width: widthValue, height: heightValue })
  }

  if (result.textSize > 0) {
    result.stylePatch.textStyle.size = result.textSize
  }
  if (result.textWeight >= 0) {
    result.stylePatch.textStyle.weight = result.textWeight
  }
  if (result.textLineHeight >= 0) {
    result.stylePatch.textStyle.lineHeight = result.textLineHeight
  }
  if (!Number.isNaN(result.textTracking)) {
    result.stylePatch.textStyle.tracking = result.textTracking
  }
  if (result.textAlign >= 0) {
    result.stylePatch.textStyle.align = textAlignName(result.textAlign)
  }
  const transform = textTransformName(result.textTransform)
  if (transform) {
    result.stylePatch.textStyle.transform = transform
  }

  result.calls = result.ops.flatMap(op => renderTailwindOp(op, handle))
  return result
}
