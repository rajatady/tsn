import type { TSNBehavior, TSNLayoutStyle, TSNLengthResolvable, TSNNode, TSNTextStyle, TSNVisualStyle } from '@tsn/core'

export interface AppKitNodePlan {
  id: string
  kind: string
  createCall: string
  styleCalls: string[]
  children: AppKitNodePlan[]
}

export function adaptNodeToAppKitPlan(node: TSNNode): AppKitNodePlan {
  return {
    id: node.ref.id,
    kind: resolveHostKind(node),
    createCall: resolveCreateCall(node),
    styleCalls: resolveStyleCalls(node),
    children: node.children.map(adaptNodeToAppKitPlan),
  }
}

function resolveHostKind(node: TSNNode): string {
  if (node.sourceTag === 'Search') return 'search'
  if (node.sourceTag === 'Input') return 'input'
  if (node.sourceTag === 'TextArea') return 'textarea'
  if (node.sourceTag === 'Select') return 'select'
  if (node.sourceTag === 'Checkbox') return 'checkbox'
  if (node.sourceTag === 'Radio') return 'radio'
  if (node.sourceTag === 'Switch') return 'switch'
  return node.ref.kind
}

function resolveCreateCall(node: TSNNode): string {
  switch (node.sourceTag ?? node.ref.kind) {
    case 'Window': {
      const title = cString(node.props.title)
      const width = numericProp(node.props.width, 1200)
      const height = numericProp(node.props.height, 780)
      const dark = boolProp(node.props.dark) ? 'true' : 'false'
      return `ui_window(${title}, ${width}, ${height}, ${dark})`
    }
    case 'VStack':
      return 'ui_vstack()'
    case 'HStack':
      return 'ui_hstack()'
    case 'ZStack':
      return 'ui_zstack()'
    case 'View':
      return 'ui_view()'
    case 'Text': {
      const value = cString(node.props.value)
      const text = resolveTextPresentation(node.textStyle)
      return `ui_text(${value}, ${text.size}, ${text.bold ? 'true' : 'false'})`
    }
    case 'Symbol':
      return `ui_symbol(${cString(node.props.name)}, ${numericProp(node.props.size, 14)})`
    case 'Search':
      return `ui_search_field(${cString(node.props.placeholder)})`
    case 'Input':
      return `ui_text_field(${cString(node.props.placeholder)})`
    case 'TextArea':
      return `ui_text_area(${cString(node.props.placeholder)})`
    case 'Select':
      return 'ui_select()'
    case 'Checkbox':
      return `ui_checkbox(${cString(node.props.label)}, ${boolProp(node.props.checked) ? 'true' : 'false'})`
    case 'Radio':
      return `ui_radio(${cString(node.props.label)}, ${boolProp(node.props.checked) ? 'true' : 'false'})`
    case 'Switch':
      return `ui_switch(${boolProp(node.props.checked) ? 'true' : 'false'})`
    case 'Image':
      return `ui_image(${cString(node.props.src)})`
    case 'Sidebar':
      return `ui_sidebar(${resolvePointLength(node.layoutStyle.width) ?? 200})`
    case 'Scroll':
      return 'ui_scroll()'
    case 'Card':
      return 'ui_card()'
    case 'Button': {
      const label = cString(node.props.text ?? node.props.label ?? node.props.value)
      const icon = node.props.icon
      if (typeof icon === 'string' && icon.length > 0) {
        return `ui_button_icon(${JSON.stringify(icon)}, ${label}, NULL, 0)`
      }
      return `ui_button(${label}, NULL, 0)`
    }
    case 'BarChart':
      return `ui_bar_chart(${resolvePointLength(node.layoutStyle.height) ?? 180})`
    case 'Table':
      return 'ui_data_table()'
    case 'Progress':
      return `ui_progress(${numericProp(node.props.value, -1)})`
    case 'Divider':
      return 'ui_divider()'
    case 'Spacer':
      return 'ui_spacer()'
    default:
      return node.ref.kind === 'overlay' ? 'ui_zstack()' : node.ref.kind === 'stack' ? 'ui_vstack()' : 'ui_view()'
  }
}

function resolveStyleCalls(node: TSNNode): string[] {
  const calls = resolveStyleCallsForPatch(node.ref.id, node.layoutStyle, node.visualStyle, node.textStyle, node.behavior)
  for (const variant of node.responsiveVariants ?? []) {
    if (variant.selector.minWidth == null) continue
    calls.push(`ui_variant_begin_min_width(${node.ref.id}, ${variant.selector.minWidth});`)
    calls.push(
      ...resolveStyleCallsForPatch(
        node.ref.id,
        variant.layoutStyle,
        variant.visualStyle,
        variant.textStyle,
        variant.behavior,
      ),
    )
    calls.push(`ui_variant_end(${node.ref.id});`)
  }
  return calls
}

function resolveStyleCallsForPatch(
  handle: string,
  layoutStyle: Partial<TSNLayoutStyle>,
  visualStyle: Partial<TSNVisualStyle>,
  textStyle: Partial<TSNTextStyle>,
  behavior: Partial<TSNBehavior>,
): string[] {
  const calls: string[] = []
  pushLengthCall(calls, 'ui_set_size', 'ui_set_size_pct', handle, layoutStyle.width, layoutStyle.height)
  pushLengthCall(calls, 'ui_set_min_size', 'ui_set_min_size_pct', handle, layoutStyle.minWidth, layoutStyle.minHeight)
  pushLengthCall(calls, 'ui_set_max_size', 'ui_set_max_size_pct', handle, layoutStyle.maxWidth, layoutStyle.maxHeight)

  if (layoutStyle.grow != null) calls.push(`ui_set_flex(${handle}, ${layoutStyle.grow});`)
  if (layoutStyle.gap != null) calls.push(`ui_set_spacing(${handle}, ${layoutStyle.gap});`)
  if (layoutStyle.aspectRatio != null && layoutStyle.aspectRatio > 0) {
    const aspectWidth = Math.max(1, Math.round(layoutStyle.aspectRatio * 1000))
    calls.push(`ui_set_aspect(${handle}, ${aspectWidth}, 1000);`)
  }
  if (layoutStyle.position != null) {
    calls.push(`ui_set_position_type(${handle}, ${layoutStyle.position === 'absolute' ? 1 : 0});`)
  }
  pushInsetCalls(calls, handle, layoutStyle.insetTop, layoutStyle.insetRight, layoutStyle.insetBottom, layoutStyle.insetLeft)
  if (layoutStyle.marginAuto) calls.push(`ui_set_margin_auto(${handle});`)
  if (layoutStyle.alignItems != null) calls.push(`ui_set_align_items(${handle}, ${layoutAlignValue(layoutStyle.alignItems)});`)
  if (layoutStyle.justifyContent != null) {
    calls.push(`ui_set_justify_content(${handle}, ${layoutJustifyValue(layoutStyle.justifyContent)});`)
  }
  if (layoutStyle.alignSelf != null) calls.push(`ui_set_alignment(${handle}, ${layoutAlignValue(layoutStyle.alignSelf)});`)
  if (
    layoutStyle.marginTop != null ||
    layoutStyle.marginRight != null ||
    layoutStyle.marginBottom != null ||
    layoutStyle.marginLeft != null
  ) {
    calls.push(
      `ui_set_margin(${handle}, ${layoutStyle.marginTop ?? 0}, ${layoutStyle.marginRight ?? 0}, ${layoutStyle.marginBottom ?? 0}, ${layoutStyle.marginLeft ?? 0});`,
    )
  }
  if (
    layoutStyle.paddingTop != null ||
    layoutStyle.paddingRight != null ||
    layoutStyle.paddingBottom != null ||
    layoutStyle.paddingLeft != null
  ) {
    calls.push(
      `ui_set_padding(${handle}, ${layoutStyle.paddingTop ?? 0}, ${layoutStyle.paddingRight ?? 0}, ${layoutStyle.paddingBottom ?? 0}, ${layoutStyle.paddingLeft ?? 0});`,
    )
  }
  emitBackgroundColorCall(calls, handle, visualStyle.backgroundColor)
  emitBorderCalls(calls, handle, visualStyle.borderColor, visualStyle.borderWidth)
  if (visualStyle.cornerRadius != null) {
    calls.push(`ui_set_corner_radius(${handle}, ${visualStyle.cornerRadius});`)
  }
  if (visualStyle.clip) {
    calls.push(`ui_set_clip(${handle}, 1);`)
  }
  if (visualStyle.shadow) {
    calls.push(
      `ui_set_shadow(${handle}, ${visualStyle.shadow.offsetX}, ${visualStyle.shadow.offsetY}, ${visualStyle.shadow.radius}, ${visualStyle.shadow.opacity});`,
    )
  }
  if (behavior.scrollAxis != null) {
    calls.push(`ui_scroll_set_axis(${handle}, ${behavior.scrollAxis === 'horizontal' ? 1 : 0});`)
  }
  if (textStyle.truncate) {
    calls.push(`ui_text_set_truncate(${handle});`)
  }
  if (behavior.text?.selectable) {
    calls.push(`ui_text_set_selectable(${handle}, true);`)
  }
  emitTextStyleCalls(calls, handle, textStyle)
  return calls
}

function emitTextStyleCalls(calls: string[], handle: string, textStyle: Partial<TSNTextStyle>): void {
  emitTextColorCall(calls, handle, textStyle.color)
  if (textStyle.weight != null) calls.push(`ui_text_set_weight(${handle}, ${textStyle.weight});`)
  if (textStyle.lineHeight != null) {
    const size = textStyle.size ?? 14
    calls.push(`ui_text_set_line_height(${handle}, ${resolveLineHeightMultiplier(textStyle.lineHeight, size)});`)
  }
  if (textStyle.tracking != null) {
    const size = textStyle.size ?? 14
    calls.push(`ui_text_set_tracking(${handle}, ${(textStyle.tracking * size).toFixed(4)});`)
  }
  if (textStyle.transform === 'uppercase') calls.push(`ui_text_set_transform(${handle}, 1);`)
  if (textStyle.transform === 'lowercase') calls.push(`ui_text_set_transform(${handle}, 2);`)
  if (textStyle.align === 'start') calls.push(`ui_text_set_align(${handle}, 0);`)
  if (textStyle.align === 'center') calls.push(`ui_text_set_align(${handle}, 1);`)
  if (textStyle.align === 'end') calls.push(`ui_text_set_align(${handle}, 2);`)
}

function resolveLineHeightMultiplier(lineHeight: number, size: number): string {
  const multiplier = lineHeight > 4 ? lineHeight / size : lineHeight
  return multiplier.toFixed(4)
}

function resolveTextPresentation(textStyle: Partial<TSNTextStyle>): { size: number; bold: boolean } {
  return {
    size: textStyle.size ?? 14,
    bold: (textStyle.weight ?? -1) >= 7,
  }
}

function pushLengthCall(
  calls: string[],
  pointFn: string,
  percentFn: string,
  handle: string,
  width: TSNLengthResolvable | undefined,
  height: TSNLengthResolvable | undefined,
): void {
  if (width == null && height == null) return
  const widthIsPercent = typeof width === 'object' && width.unit === 'percent'
  const heightIsPercent = typeof height === 'object' && height.unit === 'percent'
  if (width && height && widthIsPercent !== heightIsPercent) {
    if (width) {
      calls.push(
        `${widthIsPercent ? percentFn : pointFn}(${handle}, ${resolveLengthValue(width) ?? -1}, -1);`,
      )
    }
    if (height) {
      calls.push(
        `${heightIsPercent ? percentFn : pointFn}(${handle}, -1, ${resolveLengthValue(height) ?? -1});`,
      )
    }
    return
  }

  const fn = widthIsPercent || heightIsPercent ? percentFn : pointFn
  calls.push(`${fn}(${handle}, ${resolveLengthValue(width) ?? -1}, ${resolveLengthValue(height) ?? -1});`)
}

function pushInsetCalls(
  calls: string[],
  handle: string,
  top: TSNLengthResolvable | undefined,
  right: TSNLengthResolvable | undefined,
  bottom: TSNLengthResolvable | undefined,
  left: TSNLengthResolvable | undefined,
): void {
  if (top == null && right == null && bottom == null && left == null) return
  const values = [top, right, bottom, left]
  const percentValues = values.some(value => typeof value === 'object' && value.unit === 'percent')
  const pointValues = values.some(value => value != null && (typeof value === 'number' || value.unit === 'point'))

  if (pointValues) {
    calls.push(
      `ui_set_inset(${handle}, ${resolvePointLength(top) ?? -1}, ${resolvePointLength(right) ?? -1}, ${resolvePointLength(bottom) ?? -1}, ${resolvePointLength(left) ?? -1});`,
    )
  }
  if (percentValues) {
    calls.push(
      `ui_set_inset_pct(${handle}, ${resolvePercentLength(top) ?? -1}, ${resolvePercentLength(right) ?? -1}, ${resolvePercentLength(bottom) ?? -1}, ${resolvePercentLength(left) ?? -1});`,
    )
  }
}

function resolvePointLength(value: TSNLengthResolvable | undefined): number | null {
  if (value == null) return null
  if (typeof value === 'number') return value
  return value.unit === 'point' ? value.value : null
}

function resolvePercentLength(value: TSNLengthResolvable | undefined): number | null {
  if (value == null || typeof value === 'number') return null
  return value.unit === 'percent' ? value.value : null
}

function resolveLengthValue(value: TSNLengthResolvable | undefined): number | null {
  if (value == null) return null
  if (typeof value === 'number') return value
  return value.value
}

function numericProp(value: unknown, fallback: number): number {
  return typeof value === 'number' ? value : fallback
}

function boolProp(value: unknown): boolean {
  return value === true
}

function cString(value: unknown): string {
  return JSON.stringify(typeof value === 'string' ? value : '')
}

function emitBackgroundColorCall(calls: string[], handle: string, color: string | undefined): void {
  const colorCall = rgbColorCall('ui_set_background_rgb', handle, color)
  if (colorCall) calls.push(colorCall)
}

function emitBorderCalls(calls: string[], handle: string, color: string | undefined, width: number | undefined): void {
  const colorCall = rgbColorCall('ui_set_border_color', handle, color)
  if (colorCall) calls.push(colorCall)
  if (width != null) calls.push(`ui_set_border_width(${handle}, ${width});`)
}

function emitTextColorCall(calls: string[], handle: string, color: string | undefined): void {
  if (!color) return
  if (color.startsWith('system:')) {
    const system = Number.parseInt(color.slice('system:'.length), 10)
    if (!Number.isNaN(system)) calls.push(`ui_text_set_color_system(${handle}, ${system});`)
    return
  }
  const colorCall = rgbColorCall('ui_text_set_color_rgb', handle, color)
  if (colorCall) calls.push(colorCall)
}

function rgbColorCall(fn: string, handle: string, color: string | undefined): string | null {
  if (!color) return null
  const rgba = color.match(/^rgba\(([^,]+), ([^,]+), ([^,]+), ([^)]+)\)$/)
  if (!rgba) return null
  return `${fn}(${handle}, ${rgba[1]}, ${rgba[2]}, ${rgba[3]}, ${rgba[4]});`
}

function layoutAlignValue(value: 'start' | 'center' | 'end' | 'stretch'): number {
  if (value === 'center') return 1
  if (value === 'end') return 2
  if (value === 'stretch') return 3
  return 0
}

function layoutJustifyValue(value: 'start' | 'center' | 'end' | 'space-between'): number {
  if (value === 'center') return 1
  if (value === 'end') return 2
  if (value === 'space-between') return 3
  return 0
}
