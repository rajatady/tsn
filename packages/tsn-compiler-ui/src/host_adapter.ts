import type { TSNTextStyle } from '@tsn/core'

export type HostLineEmitter = (line: string) => void

export function emitHandleCreate(
  push: HostLineEmitter,
  handle: string,
  createCall: string,
  testId: string | null,
): void {
  push(`UIHandle ${handle} = ${createCall};`)
  push(`ui_set_id(${handle}, "${handle}");`)
  if (testId) {
    push(`ui_set_id(${handle}, ${testId});`)
  }
}

export function emitRuntimeCalls(push: HostLineEmitter, calls: string[]): void {
  for (const call of calls) {
    push(call)
  }
}

export function emitTextStyleCalls(
  push: HostLineEmitter,
  handle: string,
  textStyle: Partial<TSNTextStyle>,
): void {
  if (textStyle.weight != null) push(`ui_text_set_weight(${handle}, ${textStyle.weight});`)
  if (textStyle.lineHeight != null) push(`ui_text_set_line_height(${handle}, ${textStyle.lineHeight});`)
  if (textStyle.tracking != null) {
    const size = textStyle.size ?? 14
    push(`ui_text_set_tracking(${handle}, ${(textStyle.tracking * size).toFixed(4)});`)
  }
  if (textStyle.transform === 'uppercase') push(`ui_text_set_transform(${handle}, 1);`)
  if (textStyle.transform === 'lowercase') push(`ui_text_set_transform(${handle}, 2);`)
  if (textStyle.align === 'center') push(`ui_text_set_align(${handle}, 1);`)
  if (textStyle.align === 'end') push(`ui_text_set_align(${handle}, 2);`)
  if (textStyle.align === 'start') push(`ui_text_set_align(${handle}, 0);`)
}

export function emitTextInputBindings(
  push: HostLineEmitter,
  handle: string,
  value: string | null,
  onChangeWrapper: string | null,
): void {
  if (value) {
    push(`ui_text_input_set_value(${handle}, ${value});`)
  }
  if (onChangeWrapper) {
    push(`ui_on_text_changed(${handle}, ${onChangeWrapper});`)
  }
}

export function emitBoolControlBindings(
  push: HostLineEmitter,
  handle: string,
  checkedExpr: string | null,
  onChangeWrapper: string | null,
): void {
  if (checkedExpr) {
    push(`ui_bool_control_set_value(${handle}, ${checkedExpr});`)
  }
  if (onChangeWrapper) {
    push(`ui_on_bool_changed(${handle}, ${onChangeWrapper});`)
  }
}

export function emitSelectBindings(
  push: HostLineEmitter,
  handle: string,
  options: string[],
  value: string | null,
  onChangeWrapper: string | null,
): void {
  for (const option of options) {
    push(`ui_select_add_option(${handle}, ${JSON.stringify(option)});`)
  }
  if (value) {
    push(`ui_select_set_value(${handle}, ${value});`)
  }
  if (onChangeWrapper) {
    push(`ui_on_select_changed(${handle}, ${onChangeWrapper});`)
  }
}

export function emitButtonStyleCall(
  push: HostLineEmitter,
  handle: string,
  variant: number,
): void {
  push(`ui_button_set_style(${handle}, ${variant});`)
}

export function emitSidebarSectionCall(
  push: HostLineEmitter,
  parent: string,
  title: string,
): void {
  push(`ui_sidebar_section(${parent}, ${title});`)
}

export function emitBarChartTitleCall(
  push: HostLineEmitter,
  handle: string,
  title: string | null,
): void {
  if (title) {
    push(`ui_bar_chart_set_title(${handle}, ${title});`)
  }
}

export function emitTableConfigCalls(
  push: HostLineEmitter,
  handle: string,
  rowHeight: number,
  alternating: boolean,
): void {
  push(`ui_data_table_set_row_height(${handle}, ${rowHeight});`)
  if (alternating) {
    push(`ui_data_table_set_alternating(${handle}, true);`)
  }
}

export function emitTableDataBindingCalls(
  push: HostLineEmitter,
  handle: string,
  rows: number,
  wrapName: string,
): void {
  push(`ui_data_table_set_data(${handle}, ${rows}, ${wrapName}, NULL);`)
  push(`_g_table = ${handle};`)
}
