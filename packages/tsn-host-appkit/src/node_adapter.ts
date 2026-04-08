import type { TSNLengthResolvable, TSNNode, TSNTextStyle } from '@tsn/core'

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
      return node.ref.kind === 'overlay' ? 'ui_zstack()' : node.ref.kind === 'stack' ? 'ui_vstack()' : 'ui_card()'
  }
}

function resolveStyleCalls(node: TSNNode): string[] {
  const calls: string[] = []
  pushLengthCall(calls, 'ui_set_size', 'ui_set_size_pct', node.ref.id, node.layoutStyle.width, node.layoutStyle.height)
  pushLengthCall(calls, 'ui_set_min_size', 'ui_set_min_size_pct', node.ref.id, node.layoutStyle.minWidth, node.layoutStyle.minHeight)
  pushLengthCall(calls, 'ui_set_max_size', 'ui_set_max_size_pct', node.ref.id, node.layoutStyle.maxWidth, node.layoutStyle.maxHeight)

  if (node.layoutStyle.grow != null) calls.push(`ui_set_flex(${node.ref.id}, ${node.layoutStyle.grow});`)
  if (node.layoutStyle.gap != null) calls.push(`ui_set_spacing(${node.ref.id}, ${node.layoutStyle.gap});`)
  if (node.layoutStyle.marginAuto) calls.push(`ui_set_margin_auto(${node.ref.id});`)
  if (node.layoutStyle.alignItems != null) calls.push(`ui_set_align_items(${node.ref.id}, ${layoutAlignValue(node.layoutStyle.alignItems)});`)
  if (node.layoutStyle.justifyContent != null) {
    calls.push(`ui_set_justify_content(${node.ref.id}, ${layoutJustifyValue(node.layoutStyle.justifyContent)});`)
  }
  if (node.layoutStyle.alignSelf != null) calls.push(`ui_set_alignment(${node.ref.id}, ${layoutAlignValue(node.layoutStyle.alignSelf)});`)
  if (
    node.layoutStyle.paddingTop != null ||
    node.layoutStyle.paddingRight != null ||
    node.layoutStyle.paddingBottom != null ||
    node.layoutStyle.paddingLeft != null
  ) {
    calls.push(
      `ui_set_padding(${node.ref.id}, ${node.layoutStyle.paddingTop ?? 0}, ${node.layoutStyle.paddingRight ?? 0}, ${node.layoutStyle.paddingBottom ?? 0}, ${node.layoutStyle.paddingLeft ?? 0});`,
    )
  }
  emitBackgroundColorCall(calls, node.ref.id, node.visualStyle.backgroundColor)
  if (node.visualStyle.cornerRadius != null) {
    calls.push(`ui_set_corner_radius(${node.ref.id}, ${node.visualStyle.cornerRadius});`)
  }
  if (node.visualStyle.clip) {
    calls.push(`ui_set_clip(${node.ref.id}, 1);`)
  }
  if (node.visualStyle.shadow) {
    calls.push(
      `ui_set_shadow(${node.ref.id}, ${node.visualStyle.shadow.offsetX}, ${node.visualStyle.shadow.offsetY}, ${node.visualStyle.shadow.radius}, ${node.visualStyle.shadow.opacity});`,
    )
  }
  if (node.behavior.scrollAxis != null) {
    calls.push(`ui_scroll_set_axis(${node.ref.id}, ${node.behavior.scrollAxis === 'horizontal' ? 1 : 0});`)
  }
  if (node.textStyle.truncate) {
    calls.push(`ui_text_set_truncate(${node.ref.id});`)
  }
  if (node.behavior.text?.selectable) {
    calls.push(`ui_text_set_selectable(${node.ref.id}, true);`)
  }
  emitTextStyleCalls(calls, node.ref.id, node.textStyle)
  return calls
}

function emitTextStyleCalls(calls: string[], handle: string, textStyle: Partial<TSNTextStyle>): void {
  emitTextColorCall(calls, handle, textStyle.color)
  if (textStyle.weight != null) calls.push(`ui_text_set_weight(${handle}, ${textStyle.weight});`)
  if (textStyle.lineHeight != null) calls.push(`ui_text_set_line_height(${handle}, ${textStyle.lineHeight});`)
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
  const fn = widthIsPercent || heightIsPercent ? percentFn : pointFn
  calls.push(`${
    fn
  }(${handle}, ${resolveLengthValue(width) ?? -1}, ${resolveLengthValue(height) ?? -1});`)
}

function resolvePointLength(value: TSNLengthResolvable | undefined): number | null {
  if (value == null) return null
  if (typeof value === 'number') return value
  return value.unit === 'point' ? value.value : null
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
