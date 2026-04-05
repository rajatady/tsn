/**
 * StrictTS JSX Emitter — TSX → C ui_*() calls
 *
 * Handles JSX elements, props, children, Tailwind className parsing,
 * and component mapping. Extracted from codegen.ts.
 */

import * as ts from 'typescript'
import { parseTailwind } from './tailwind.js'

export interface FuncSig {
  name: string
  params: Array<{ name: string; tsType: string; cType: string }>
  returnType: string
  returnCType: string
}

/** Interface to access CodeGen internals without circular dependency */
export interface CodeGenContext {
  jsxStmts: string[]
  lambdas: string[]
  indent: number
  hasJsx: boolean
  funcSigs: Map<string, FuncSig>
  pad(): string
  pushJsxStmt(line: string): void
  emitExpr(node: ts.Node): string
  exprType(node: ts.Node): string
  arrayCElemType(tsType: string): string
  getStructFields(name: string): Array<{ name: string; tsType: string; cType: string }> | undefined
  varTypes: Map<string, string>
}

export class JsxEmitter {
  private ctx: CodeGenContext
  private jsxCounter = 0
  private jsxOnClickCounter = 0
  private parentStack: string[] = []

  constructor(ctx: CodeGenContext) {
    this.ctx = ctx
  }

  // ─── Prop Extraction ───────────────────────────────────────────

  private getProps(element: ts.JsxOpeningElement | ts.JsxSelfClosingElement): Map<string, ts.Node | null> {
    const props = new Map<string, ts.Node | null>()
    for (const attr of element.attributes.properties) {
      if (ts.isJsxAttribute(attr)) {
        props.set(attr.name.getText(), attr.initializer ?? null)
      }
    }
    return props
  }

  private propStr(props: Map<string, ts.Node | null>, key: string): string {
    const val = props.get(key)
    if (!val) return ''
    if (ts.isStringLiteral(val)) return val.text
    if (ts.isJsxExpression(val) && val.expression && ts.isStringLiteral(val.expression))
      return val.expression.text
    return ''
  }

  private propNum(props: Map<string, ts.Node | null>, key: string, fallback: number): number {
    const val = props.get(key)
    if (!val) return fallback
    if (ts.isJsxExpression(val) && val.expression && ts.isNumericLiteral(val.expression))
      return parseFloat(val.expression.text)
    return fallback
  }

  private propBool(props: Map<string, ts.Node | null>, key: string): boolean {
    if (!props.has(key)) return false
    const val = props.get(key)
    if (val === null) return true  // <Component dark /> → true
    if (val && ts.isJsxExpression(val) && val.expression) {
      if (val.expression.kind === ts.SyntaxKind.FalseKeyword) return false
    }
    return true
  }

  private propExpr(props: Map<string, ts.Node | null>, key: string): string {
    const val = props.get(key)
    if (!val) return '""'
    if (ts.isJsxExpression(val) && val.expression)
      return this.ctx.emitExpr(val.expression)
    if (ts.isStringLiteral(val)) return JSON.stringify(val.text)
    return '""'
  }

  private exprToCStr(expr: ts.Expression): string {
    const type = this.ctx.exprType(expr)
    const emitted = this.ctx.emitExpr(expr)
    if (type === 'string') return `ts_str_cstr(${emitted})`
    if (type === 'number') return `ts_str_cstr(num_to_str(${emitted}))`
    if (type === 'boolean') return `(${emitted} ? "true" : "false")`
    return '""'
  }

  private propCStr(props: Map<string, ts.Node | null>, key: string): string | null {
    const val = props.get(key)
    if (!val) return null
    if (ts.isStringLiteral(val)) return JSON.stringify(val.text)
    if (ts.isJsxExpression(val) && val.expression) return this.exprToCStr(val.expression)
    return null
  }

  private textContent(children: readonly ts.JsxChild[]): string {
    const parts: string[] = []
    for (const child of children) {
      if (ts.isJsxText(child)) {
        const t = child.text.trim()
        if (t) parts.push(t)
      }
    }
    return parts.join(' ')
  }

  private textArg(children: readonly ts.JsxChild[]): string {
    const text = this.textContent(children)
    if (text.length > 0) return JSON.stringify(text)

    const exprChildren = children.filter((child): child is ts.JsxExpression =>
      ts.isJsxExpression(child) && !!child.expression
    )
    if (exprChildren.length === 1) return this.exprToCStr(exprChildren[0].expression!)
    return '""'
  }

  private currentParent(): string | null {
    return this.parentStack.length > 0 ? this.parentStack[this.parentStack.length - 1] : null
  }

  private emitTextNodeHandle(text: string): string {
    const handle = `_j${this.jsxCounter++}`
    this.ctx.pushJsxStmt(this.ctx.pad() + `UIHandle ${handle} = ui_text(${JSON.stringify(text)}, 14, false);`)
    this.ctx.pushJsxStmt(this.ctx.pad() + `ui_set_id(${handle}, "${handle}");`)
    return handle
  }

  private emitChildHandle(child: ts.JsxChild): string | null {
    if (ts.isJsxText(child)) {
      const text = child.text.trim()
      if (text.length === 0) return null
      return this.emitTextNodeHandle(text)
    }
    if (ts.isJsxElement(child)) return this.emitElement(child.openingElement, child.children)
    if (ts.isJsxSelfClosingElement(child)) return this.emitElement(child, [])
    if (ts.isJsxFragment(child)) return this.emitFragment(child.children)
    if (ts.isJsxExpression(child) && child.expression) return this.ctx.emitExpr(child.expression)
    return null
  }

  private emitChildrenProp(children: readonly ts.JsxChild[]): string | null {
    const renderable = children.filter(child => !(ts.isJsxText(child) && child.text.trim().length === 0))
    if (renderable.length === 0) return null
    const child = renderable[0]
    if (renderable.length === 1 &&
        !(ts.isJsxExpression(child) &&
          child.expression &&
          ts.isCallExpression(child.expression) &&
          ts.isPropertyAccessExpression(child.expression.expression) &&
          child.expression.expression.name.text === 'map')) {
      return this.emitChildHandle(child)
    }
    return this.emitFragment(renderable)
  }

  private emitPropValue(tsType: string, value: ts.Node | null): string | null {
    if (value === null) return tsType === 'boolean' ? 'true' : null
    if (ts.isStringLiteral(value)) {
      if (tsType === 'string') return `str_lit(${JSON.stringify(value.text)})`
      return JSON.stringify(value.text)
    }
    if (ts.isJsxExpression(value) && value.expression) {
      const expr = value.expression
      const exprType = this.ctx.exprType(expr)
      const emitted = this.ctx.emitExpr(expr)
      if (tsType === 'string') {
        if (exprType === 'string') return emitted
        if (exprType === 'number') return `num_to_str(${emitted})`
        if (exprType === 'boolean') return `(${emitted} ? str_lit("true") : str_lit("false"))`
      }
      return emitted
    }
    return null
  }

  private emitComponentCall(tag: string, props: Map<string, ts.Node | null>, children: readonly ts.JsxChild[]): string | null {
    const sig = this.ctx.funcSigs.get(tag)
    if (!sig || (sig.returnType !== 'JSX.Element' && sig.returnCType !== 'UIHandle')) return null
    if (sig.params.length === 0) return `${tag}()`
    if (sig.params.length !== 1) return null

    const param = sig.params[0]
    const fields = this.ctx.getStructFields(param.tsType)
    if (!fields) return null

    const assignments: string[] = []
    for (const field of fields) {
      if (field.name === 'children') {
        const childExpr = this.emitChildrenProp(children)
        if (childExpr) assignments.push(`.${field.name} = ${childExpr}`)
        continue
      }

      if (!props.has(field.name)) continue
      const value = this.emitPropValue(field.tsType, props.get(field.name) ?? null)
      if (value) assignments.push(`.${field.name} = ${value}`)
    }

    return `${tag}((${param.cType}){ ${assignments.join(', ')} })`
  }

  private colorIndex(name: string): number {
    const map: Record<string, number> = {
      'label': 0, 'secondary': 1, 'tertiary': 2,
      'blue': 3, 'green': 4, 'red': 5, 'orange': 6,
      'yellow': 7, 'purple': 8, 'pink': 9, 'teal': 10,
      'indigo': 11, 'cyan': 12,
    }
    return map[name] ?? 3
  }

  private buttonStyle(name: string): number {
    const map: Record<string, number> = {
      'default': 0,
      'secondary': 0,
      'outline': 0,
      'ghost': 3,
      'link': 3,
      'destructive': 2,
      'primary': 1,
      'accent': 1,
      'sidebar': 4,
      'sidebar-active': 5,
      'get': 6,
      'chip': 7,
    }
    return map[name] ?? 0
  }

  // ─── Main Element Emitter ──────────────────────────────────────

  emitElement(
    element: ts.JsxOpeningElement | ts.JsxSelfClosingElement,
    children: readonly ts.JsxChild[]
  ): string {
    this.ctx.hasJsx = true
    const tag = element.tagName.getText()
    const props = this.getProps(element)
    const handle = `_j${this.jsxCounter++}`
    const className = this.propStr(props, 'className')
    const tw = className ? parseTailwind(className, handle) : null
    const pad = () => this.ctx.pad()
    const push = (line: string) => this.ctx.pushJsxStmt(pad() + line)
    /** Emit UIHandle creation + ui_set_id registration */
    const create = (call: string) => {
      push(`UIHandle ${handle} = ${call};`)
      push(`ui_set_id(${handle}, "${handle}");`)
    }

    switch (tag) {
      case 'Window': {
        const title = this.propCStr(props, 'title') ?? '""'
        const w = this.propNum(props, 'width', 1200)
        const h = this.propNum(props, 'height', 780)
        const dark = this.propBool(props, 'dark')
        create(`ui_window(${title}, ${w}, ${h}, ${dark})`)
        const sub = this.propCStr(props, 'subtitle')
        if (sub) push(`ui_window_subtitle(${handle}, ${sub});`)
        const titlebarTransparent = this.propBool(props, 'titlebarTransparent')
        const fullsizeContent = this.propBool(props, 'fullsizeContent')
        const immersive = this.propBool(props, 'immersive')
        if (titlebarTransparent || immersive) push(`ui_window_titlebar_transparent(${handle});`)
        if (fullsizeContent || immersive) push(`ui_window_fullsize_content(${handle});`)
        this.emitChildren(children, handle)
        return handle
      }

      case 'VStack':
      case 'HStack': {
        const fn = tag === 'VStack' ? 'ui_vstack' : 'ui_hstack'
        create(`${fn}()`)
        if (tw) for (const c of tw.calls) push(c)
        this.emitChildren(children, handle)
        return handle
      }

      case 'Text': {
        const text = this.textArg(children)
        const size = tw?.textSize || 14
        const bold = tw?.textBold || false
        create(`ui_text(${text}, ${size}, ${bold})`)
        if (tw) for (const c of tw.calls) push(c)
        return handle
      }

      case 'Symbol': {
        const name = this.propCStr(props, 'name') ?? '""'
        const size = this.propNum(props, 'size', 14)
        create(`ui_symbol(${name}, ${size})`)
        const color = this.propStr(props, 'color')
        if (color) push(`ui_symbol_set_color(${handle}, ${this.colorIndex(color)});`)
        if (tw) for (const c of tw.calls) push(c)
        return handle
      }

      case 'Spacer':
        create(`ui_spacer()`)
        return handle

      case 'Search': {
        const placeholder = this.propCStr(props, 'placeholder') ?? '""'
        create(`ui_search_field(${placeholder})`)
        const onChange = props.get('onChange')
        if (onChange && ts.isJsxExpression(onChange) && onChange.expression) {
          const wrapName = this.liftCallback(onChange.expression, 'UITextChangedFn')
          push(`ui_on_text_changed(${handle}, ${wrapName});`)
        }
        if (tw) for (const c of tw.calls) push(c)
        return handle
      }

      case 'Input': {
        const placeholder = this.propCStr(props, 'placeholder') ?? '""'
        create(`ui_text_field(${placeholder})`)
        const onChange = props.get('onChange')
        if (onChange && ts.isJsxExpression(onChange) && onChange.expression) {
          const wrapName = this.liftCallback(onChange.expression, 'UITextChangedFn')
          push(`ui_on_text_changed(${handle}, ${wrapName});`)
        }
        if (tw) for (const c of tw.calls) push(c)
        return handle
      }

      case 'Image': {
        const src = this.propCStr(props, 'src') ?? '""'
        create(`ui_image(${src})`)
        if (tw) for (const c of tw.calls) push(c)
        return handle
      }

      case 'Sidebar': {
        const width = tw && tw.width > 0 ? tw.width : 200
        create(`ui_sidebar(${width})`)
        this.emitChildren(children, handle)
        return handle
      }

      case 'Scroll': {
        create(`ui_scroll()`)
        if (tw) for (const c of tw.calls) push(c)
        this.emitChildren(children, handle)
        return handle
      }

      case 'Card': {
        create(`ui_card()`)
        if (tw) for (const c of tw.calls) push(c)
        this.emitChildren(children, handle)
        return handle
      }

      case 'SidebarSection': {
        const title = this.propCStr(props, 'title') ?? '""'
        const parent = this.currentParent()
        if (!parent) return ''
        push(`ui_sidebar_section(${parent}, ${title});`)
        for (const child of children) {
          if (ts.isJsxText(child) && child.text.trim().length === 0) continue
          if (ts.isJsxElement(child))
            this.emitElement(child.openingElement, child.children)
          if (ts.isJsxSelfClosingElement(child))
            this.emitElement(child, [])
          if (ts.isJsxExpression(child) && child.expression) {
            if (ts.isCallExpression(child.expression) &&
                ts.isPropertyAccessExpression(child.expression.expression) &&
                child.expression.expression.name.text === 'map') {
              this.emitJsxMap(child.expression, parent)
            } else {
              const expr = this.ctx.emitExpr(child.expression)
              push(`ui_add_child(${parent}, ${expr});`)
            }
          }
        }
        return ''  // section doesn't produce a view
      }

      case 'SidebarItem': {
        const parent = this.currentParent()
        if (!parent) return '((UIHandle)0)'
        const icon = this.propCStr(props, 'icon') ?? '""'
        const text = this.textArg(children)
        const onClick = props.get('onClick')
        let fnRef = 'NULL'
        let tagNum = 0
        if (onClick && ts.isJsxExpression(onClick) && onClick.expression) {
          fnRef = this.liftCallback(onClick.expression, 'UIClickFn')
          tagNum = this.jsxOnClickCounter++
        }
        create(`ui_sidebar_item(${parent}, ${text}, ${icon}, ${tagNum}, ${fnRef})`)
        return handle
      }

      case 'Stat': {
        const value = this.propCStr(props, 'value') ?? '""'
        const label = this.propCStr(props, 'label') ?? '""'
        const color = this.colorIndex(this.propStr(props, 'color'))
        create(`ui_stat(${value}, ${label}, ${color})`)
        return handle
      }

      case 'Badge': {
        const text = this.propCStr(props, 'text') ?? this.textArg(children)
        const color = this.colorIndex(this.propStr(props, 'color'))
        create(`ui_badge(${text}, ${color})`)
        return handle
      }

      case 'Button': {
        const label = this.propCStr(props, 'text') ?? this.textArg(children)
        const icon = this.propCStr(props, 'icon')
        const variant = this.buttonStyle(this.propStr(props, 'variant'))
        const onClick = props.get('onClick')
        let fnRef = 'NULL'
        let tagNum = 0
        if (onClick && ts.isJsxExpression(onClick) && onClick.expression) {
          fnRef = this.liftCallback(onClick.expression, 'UIClickFn')
          tagNum = this.jsxOnClickCounter++
        }
        if (icon) create(`ui_button_icon(${icon}, ${label}, ${fnRef}, ${tagNum})`)
        else create(`ui_button(${label}, ${fnRef}, ${tagNum})`)
        push(`ui_button_set_style(${handle}, ${variant});`)
        if (tw) for (const c of tw.calls) push(c)
        return handle
      }

      case 'BarChart': {
        const title = this.propCStr(props, 'title')
        const h = tw && tw.height > 0 ? tw.height : 180
        create(`ui_bar_chart(${h})`)
        if (title) push(`ui_bar_chart_set_title(${handle}, ${title});`)
        if (tw) for (const c of tw.calls) push(c)
        return handle
      }

      case 'Table': {
        create(`ui_data_table()`)
        const colsProp = props.get('columns')
        if (colsProp && ts.isJsxExpression(colsProp) && colsProp.expression)
          this.emitTableColumns(handle, colsProp.expression)
        const rowHeight = this.propNum(props, 'rowHeight', 26)
        push(`ui_data_table_set_row_height(${handle}, ${rowHeight});`)
        if (this.propBool(props, 'alternating'))
          push(`ui_data_table_set_alternating(${handle}, true);`)
        // cellFn prop — wrap TypeScript function for C callback
        const cellFnProp = props.get('cellFn')
        if (cellFnProp && ts.isJsxExpression(cellFnProp) && cellFnProp.expression) {
          const wrapName = this.liftCallback(cellFnProp.expression, 'UITableCellFn')
          const rows = this.propNum(props, 'rows', 500)
          push(`ui_data_table_set_data(${handle}, ${rows}, ${wrapName}, NULL);`)
          // Generate refreshTable() — stores handle globally, callable from TS
          push(`_g_table = ${handle};`)
          this.ctx.lambdas.push(
            `static UIHandle _g_table = NULL;\n` +
            `void refreshTable(double rows) {\n` +
            `    if (_g_table) ui_data_table_set_data(_g_table, (int)rows, ${wrapName}, NULL);\n` +
            `}`
          )
        }
        if (tw) for (const c of tw.calls) push(c)
        return handle
      }

      case 'Progress':
        create(`ui_progress(${this.propNum(props, 'value', -1)})`)
        return handle

      case 'Divider':
        create(`ui_divider()`)
        return handle

      default: {
        const component = this.emitComponentCall(tag, props, children)
        if (component) return component
        push(`/* Unknown JSX: <${tag}> */`)
        return '((UIHandle)0)'
      }
    }
    // Should be unreachable — all cases return above
  }

  // ─── Children ──────────────────────────────────────────────────

  private emitChildren(children: readonly ts.JsxChild[], parentHandle: string): void {
    this.parentStack.push(parentHandle)

    for (const child of children) {
      if (ts.isJsxText(child) && child.text.trim().length === 0) continue
      if (ts.isJsxText(child)) continue  // text handled by parent

      if (ts.isJsxElement(child)) {
        const h = this.emitElement(child.openingElement, child.children)
        if (h) this.ctx.pushJsxStmt(this.ctx.pad() + `ui_add_child(${parentHandle}, ${h});`)
        continue
      }

      if (ts.isJsxSelfClosingElement(child)) {
        const h = this.emitElement(child, [])
        if (h) this.ctx.pushJsxStmt(this.ctx.pad() + `ui_add_child(${parentHandle}, ${h});`)
        continue
      }

      if (ts.isJsxExpression(child) && child.expression) {
        if (ts.isCallExpression(child.expression) &&
            ts.isPropertyAccessExpression(child.expression.expression) &&
            child.expression.expression.name.text === 'map') {
          this.emitJsxMap(child.expression, parentHandle)
          continue
        }
        const expr = this.ctx.emitExpr(child.expression)
        this.ctx.pushJsxStmt(this.ctx.pad() + `ui_add_child(${parentHandle}, ${expr});`)
      }
    }
    this.parentStack.pop()
  }

  /** Emit ui_set_id() for inspector element lookup */
  private emitSetId(handle: string): void {
    this.ctx.pushJsxStmt(this.ctx.pad() + `ui_set_id(${handle}, "${handle}");`)
  }

  emitFragment(children: readonly ts.JsxChild[]): string {
    const handle = `_j${this.jsxCounter++}`
    this.ctx.pushJsxStmt(this.ctx.pad() + `UIHandle ${handle} = ui_vstack(); /* fragment */`)
    this.emitSetId(handle)
    this.emitChildren(children, handle)
    return handle
  }

  // ─── .map() in JSX ────────────────────────────────────────────

  private emitJsxMap(call: ts.CallExpression, parentHandle: string): void {
    const arr = this.ctx.emitExpr((call.expression as ts.PropertyAccessExpression).expression)
    const fn = call.arguments[0]
    if (!ts.isArrowFunction(fn)) return

    const param = fn.parameters[0].name.getText()
    const arrType = this.ctx.exprType((call.expression as ts.PropertyAccessExpression).expression)
    const elemCType = this.ctx.arrayCElemType(arrType)

    const idx = `_mi${this.jsxCounter++}`
    this.ctx.pushJsxStmt(this.ctx.pad() + `for (int ${idx} = 0; ${idx} < ${arr}.len; ${idx}++) {`)
    this.ctx.indent++
    this.ctx.pushJsxStmt(this.ctx.pad() + `${elemCType} ${param} = ${arr}.data[${idx}];`)

    const prevType = this.ctx.varTypes.get(param)
    this.ctx.varTypes.set(param, arrType.replace('[]', ''))

    const body = fn.body
    const inner = ts.isParenthesizedExpression(body) ? body.expression : body

    if (ts.isJsxElement(inner)) {
      const h = this.emitElement(inner.openingElement, inner.children)
      if (h) this.ctx.pushJsxStmt(this.ctx.pad() + `ui_add_child(${parentHandle}, ${h});`)
    } else if (ts.isJsxSelfClosingElement(inner)) {
      const h = this.emitElement(inner, [])
      if (h) this.ctx.pushJsxStmt(this.ctx.pad() + `ui_add_child(${parentHandle}, ${h});`)
    }

    if (prevType) this.ctx.varTypes.set(param, prevType)
    else this.ctx.varTypes.delete(param)

    this.ctx.indent--
    this.ctx.pushJsxStmt(this.ctx.pad() + `}`)
  }

  // ─── Callback Wrappers ─────────────────────────────────────────
  //
  // TypeScript functions use TS types (number→double, string→Str).
  // UI callbacks use C types (int, const char*).
  // We generate thin wrappers that bridge the gap.

  private wrappedFns = new Set<string>()  // track which wrappers we've already generated

  /** Wrap a TypeScript function for use as UIClickFn: void(*)(int) */
  private wrapForClick(fnName: string): string {
    const wrapName = `_wrap_click_${fnName}`
    if (!this.wrappedFns.has(wrapName)) {
      this.wrappedFns.add(wrapName)
      const sig = this.ctx.funcSigs.get(fnName)
      if (sig && sig.params.length >= 1) {
        // TS fn is void fnName(double tag) → wrap to void(int tag)
        this.ctx.lambdas.push(
          `static void ${wrapName}(int _tag) {\n` +
          `    ${fnName}((double)_tag);\n` +
          `}`
        )
      } else {
        // No params — just call it
        this.ctx.lambdas.push(
          `static void ${wrapName}(int _tag) {\n` +
          `    ${fnName}();\n` +
          `}`
        )
      }
    }
    return wrapName
  }

  /** Wrap a TypeScript function for use as UITextChangedFn: void(*)(const char*) */
  private wrapForTextChanged(fnName: string): string {
    const wrapName = `_wrap_text_${fnName}`
    if (!this.wrappedFns.has(wrapName)) {
      this.wrappedFns.add(wrapName)
      // TS fn is void fnName(Str text) → wrap to void(const char* text)
      this.ctx.lambdas.push(
        `static void ${wrapName}(const char *_text) {\n` +
        `    ${fnName}(str_from(_text, (int)strlen(_text)));\n` +
        `}`
      )
    }
    return wrapName
  }

  /** Wrap a TypeScript function for use as UITableCellFn: const char*(*)(int, int, void*) */
  private wrapForCellFn(fnName: string): string {
    const wrapName = `_wrap_cell_${fnName}`
    if (!this.wrappedFns.has(wrapName)) {
      this.wrappedFns.add(wrapName)
      // TS fn is Str fnName(double row, double col) → wrap to const char*(int, int, void*)
      // We use a static buffer to return the C string
      this.ctx.lambdas.push(
        `static char _cell_buf[4096];\n` +
        `static const char *${wrapName}(int _row, int _col, void *_ctx) {\n` +
        `    Str _r = ${fnName}((double)_row, (double)_col);\n` +
        `    if (_r.len > 4095) _r.len = 4095;\n` +
        `    memcpy(_cell_buf, _r.data, _r.len);\n` +
        `    _cell_buf[_r.len] = 0;\n` +
        `    return _cell_buf;\n` +
        `}`
      )
    }
    return wrapName
  }

  private liftCallback(expr: ts.Node, fnType: string): string {
    // Direct function reference: onClick={onDeptClick}
    if (ts.isIdentifier(expr)) {
      const fnName = expr.text
      if (fnType === 'UIClickFn') return this.wrapForClick(fnName)
      if (fnType === 'UITextChangedFn') return this.wrapForTextChanged(fnName)
      if (fnType === 'UITableCellFn') return this.wrapForCellFn(fnName)
      return fnName
    }

    // Arrow function: onClick={() => doSomething()}
    if (ts.isArrowFunction(expr)) {
      const name = `_jsx_cb_${this.jsxOnClickCounter++}`
      const paramName = expr.parameters.length > 0 ? expr.parameters[0].name.getText() : ''
      const prevType = paramName ? this.ctx.varTypes.get(paramName) : undefined

      let prologue = ''
      if (fnType === 'UIClickFn' && paramName) {
        this.ctx.varTypes.set(paramName, 'number')
        prologue = `    double ${paramName} = (double)_tag;\n`
      }
      if (fnType === 'UITextChangedFn' && paramName) {
        this.ctx.varTypes.set(paramName, 'string')
        prologue = `    Str ${paramName} = str_from(_text, (int)strlen(_text));\n`
      }

      let body: string
      if (ts.isBlock(expr.body)) {
        const stmts: string[] = []
        for (const s of expr.body.statements) {
          if (ts.isExpressionStatement(s)) stmts.push(`    ${this.ctx.emitExpr(s.expression)};`)
        }
        body = stmts.join('\n')
      } else {
        body = `    ${this.ctx.emitExpr(expr.body)};`
      }

      if (prevType) this.ctx.varTypes.set(paramName, prevType)
      else if (paramName) this.ctx.varTypes.delete(paramName)

      if (fnType === 'UIClickFn') {
        this.ctx.lambdas.push(`static void ${name}(int _tag) {\n${prologue}${body}\n}`)
        return name
      }
      if (fnType === 'UITextChangedFn') {
        this.ctx.lambdas.push(`static void ${name}(const char *_text) {\n${prologue}${body}\n}`)
        return name
      }
    }
    return 'NULL'
  }

  // ─── Table Columns ─────────────────────────────────────────────

  private emitTableColumns(handle: string, expr: ts.Node): void {
    if (ts.isArrayLiteralExpression(expr)) {
      for (const elem of expr.elements) {
        if (!ts.isObjectLiteralExpression(elem)) continue
        let id = '', title = '', width = 100
        for (const prop of elem.properties) {
          if (!ts.isPropertyAssignment(prop)) continue
          const name = prop.name!.getText()
          if (name === 'id' && ts.isStringLiteral(prop.initializer)) id = prop.initializer.text
          if (name === 'title' && ts.isStringLiteral(prop.initializer)) title = prop.initializer.text
          if (name === 'width' && ts.isNumericLiteral(prop.initializer)) width = parseInt(prop.initializer.text)
        }
        this.ctx.pushJsxStmt(this.ctx.pad() + `ui_data_table_add_column(${handle}, ${JSON.stringify(id)}, ${JSON.stringify(title)}, ${width});`)
      }
    } else if (ts.isIdentifier(expr)) {
      this.ctx.pushJsxStmt(this.ctx.pad() + `/* Table columns from: ${expr.text} */`)
    }
  }
}
