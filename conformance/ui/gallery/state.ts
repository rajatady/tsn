import { useStore } from '../../../packages/tsn-ui/src/react'
import { suiteIdByTag } from '../registry'

declare function refreshTable(rows: number): void
const defaultInputValue: string = 'preset text'
const defaultTextAreaValue: string = 'line one\nline two'
const defaultSelectValue: string = 'Medium'
const defaultCheckboxValue: boolean = true
const defaultRadioValue: boolean = false
const defaultSwitchValue: boolean = true

function setLastAction(value: string): void {
  const [_lastAction, setLastActionValue] = useStore<string>('ui-conformance:last-action', 'idle')
  setLastActionValue(value)
}

export function initConformanceGallery(): void {
  const [_suite, setSuite] = useStore<string>('ui-conformance:suite', 'layout')
  const [_query, setQuery] = useStore<string>('ui-conformance:query', '')
  const [_input, setInput] = useStore<string>('ui-conformance:input', defaultInputValue)
  const [_textarea, setTextArea] = useStore<string>('ui-conformance:textarea', defaultTextAreaValue)
  const [_select, setSelect] = useStore<string>('ui-conformance:select', defaultSelectValue)
  const [_checkbox, setCheckbox] = useStore<boolean>('ui-conformance:checkbox', defaultCheckboxValue)
  const [_radio, setRadio] = useStore<boolean>('ui-conformance:radio', defaultRadioValue)
  const [_switch, setSwitch] = useStore<boolean>('ui-conformance:switch', defaultSwitchValue)
  const [_counter, setCounter] = useStore<number>('ui-conformance:counter', 0)
  setSuite('layout')
  setQuery('')
  setInput(defaultInputValue)
  setTextArea(defaultTextAreaValue)
  setSelect(defaultSelectValue)
  setCheckbox(defaultCheckboxValue)
  setRadio(defaultRadioValue)
  setSwitch(defaultSwitchValue)
  setCounter(0)
  setLastAction('idle')
}

export function onSuiteNavClick(tag: number): void {
  const [_suite, setSuite] = useStore<string>('ui-conformance:suite', 'layout')
  setSuite(suiteIdByTag(tag))
  setLastAction('suite-' + tag)
}

export function onConformanceSearch(text: string): void {
  const [_query, setQuery] = useStore<string>('ui-conformance:query', '')
  setQuery(text.trim())
}

export function onConformanceInput(text: string): void {
  const [_input, setInput] = useStore<string>('ui-conformance:input', defaultInputValue)
  setInput(text)
}

export function onConformanceTextArea(text: string): void {
  const [_textarea, setTextArea] = useStore<string>('ui-conformance:textarea', defaultTextAreaValue)
  setTextArea(text)
}

export function onConformanceSelect(text: string): void {
  const [_select, setSelect] = useStore<string>('ui-conformance:select', defaultSelectValue)
  setSelect(text)
}

export function onConformanceCheckbox(next: boolean): void {
  const [_checkbox, setCheckbox] = useStore<boolean>('ui-conformance:checkbox', defaultCheckboxValue)
  setCheckbox(next)
}

export function onConformanceRadio(next: boolean): void {
  const [_radio, setRadio] = useStore<boolean>('ui-conformance:radio', defaultRadioValue)
  setRadio(next)
}

export function onConformanceSwitch(next: boolean): void {
  const [_switch, setSwitch] = useStore<boolean>('ui-conformance:switch', defaultSwitchValue)
  setSwitch(next)
}

export function incrementConformanceCounter(): void {
  const [counter, setCounter] = useStore<number>('ui-conformance:counter', 0)
  setCounter(counter + 1)
}

export function onConformanceAction(tag: number): void {
  if (tag === 1) {
    setLastAction('sidebar-1')
    return
  }
  if (tag === 2) {
    setLastAction('sidebar-2')
    return
  }
  if (tag === 101) {
    setLastAction('button-primary')
    return
  }
  if (tag === 102) {
    setLastAction('button-ghost')
    return
  }
  if (tag === 103) {
    setLastAction('button-get')
    return
  }
  if (tag === 104) {
    setLastAction('button-link')
    return
  }
  if (tag === 105) {
    setLastAction('button-icon')
    return
  }
  if (tag === 106) {
    setLastAction('button-chip')
    return
  }
  if (tag === 107) {
    setLastAction('button-sidebar')
    return
  }
  if (tag === 108) {
    setLastAction('button-sidebar-active')
  }
}

export function resetConformanceDemo(): void {
  const [_query, setQuery] = useStore<string>('ui-conformance:query', '')
  const [_input, setInput] = useStore<string>('ui-conformance:input', defaultInputValue)
  const [_textarea, setTextArea] = useStore<string>('ui-conformance:textarea', defaultTextAreaValue)
  const [_select, setSelect] = useStore<string>('ui-conformance:select', defaultSelectValue)
  const [_checkbox, setCheckbox] = useStore<boolean>('ui-conformance:checkbox', defaultCheckboxValue)
  const [_radio, setRadio] = useStore<boolean>('ui-conformance:radio', defaultRadioValue)
  const [_switch, setSwitch] = useStore<boolean>('ui-conformance:switch', defaultSwitchValue)
  const [_counter, setCounter] = useStore<number>('ui-conformance:counter', 0)
  setQuery('')
  setInput(defaultInputValue)
  setTextArea(defaultTextAreaValue)
  setSelect(defaultSelectValue)
  setCheckbox(defaultCheckboxValue)
  setRadio(defaultRadioValue)
  setSwitch(defaultSwitchValue)
  setCounter(0)
  setLastAction('reset')
}

export function conformanceTableCell(row: number, col: number): string {
  if (row >= 3) return ''
  if (col === 0) {
    if (row === 0) return 'Alpha'
    if (row === 1) return 'Beta'
    return 'Gamma'
  }
  if (col === 1) return 'Table Conformance'
  if (col === 2) return 'Stable'
  return ''
}
