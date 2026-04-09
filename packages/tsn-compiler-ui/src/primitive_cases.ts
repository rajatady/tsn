export function stackCreateCall(tag: 'VStack' | 'HStack'): string {
  return tag === 'VStack' ? 'ui_vstack()' : 'ui_hstack()'
}

export function textCreateCall(text: string, size: number, bold: boolean): string {
  return `ui_text(${text}, ${size}, ${bold})`
}

export function inputCreateCall(tag: 'Search' | 'Input', placeholder: string): string {
  return tag === 'Search' ? `ui_search_field(${placeholder})` : `ui_text_field(${placeholder})`
}

export function imageCreateCall(src: string): string {
  return `ui_image(${src})`
}

export function sidebarCreateCall(width: number): string {
  return `ui_sidebar(${width})`
}

export function scrollCreateCall(): string {
  return 'ui_scroll()'
}

export function cardCreateCall(): string {
  return 'ui_card()'
}

export function buttonCreateCall(
  icon: string | null,
  label: string,
  fnRef: string,
  tagExpr: string,
): string {
  return icon
    ? `ui_button_icon(${icon}, ${label}, ${fnRef}, ${tagExpr})`
    : `ui_button(${label}, ${fnRef}, ${tagExpr})`
}

export function barChartCreateCall(height: number): string {
  return `ui_bar_chart(${height})`
}

export function sidebarItemCreateCall(
  parent: string,
  text: string,
  icon: string,
  tagExpr: string,
  fnRef: string,
): string {
  return `ui_sidebar_item(${parent}, ${text}, ${icon}, ${tagExpr}, ${fnRef})`
}

export function statCreateCall(value: string, label: string, color: number): string {
  return `ui_stat(${value}, ${label}, ${color})`
}

export function badgeCreateCall(text: string, color: number): string {
  return `ui_badge(${text}, ${color})`
}

export function tableCreateCall(): string {
  return 'ui_data_table()'
}

export function progressCreateCall(value: number): string {
  return `ui_progress(${value})`
}

export function dividerCreateCall(): string {
  return 'ui_divider()'
}
