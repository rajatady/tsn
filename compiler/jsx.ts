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
  emitExpr(node: ts.Node): string
  exprType(node: ts.Node): string
  arrayCElemType(tsType: string): string
  varTypes: Map<string, string>
}

export class JsxEmitter {
  private ctx: CodeGenContext
  private jsxCounter = 0
  private jsxOnClickCounter = 0
  private jsxParentDeclared = false

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
    if (ts.isJsxExpression(val) && val.expression) {
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

  private colorIndex(name: string): number {
    const map: Record<string, number> = {
      'label': 0, 'secondary': 1, 'tertiary': 2,
      'blue': 3, 'green': 4, 'red': 5, 'orange': 6,
      'yellow': 7, 'purple': 8, 'pink': 9, 'teal': 10,
      'indigo': 11, 'cyan': 12,
    }
    return map[name] ?? 3
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
    const S = this.ctx.jsxStmts
    const pad = () => this.ctx.pad()

    switch (tag) {
      case 'Window': {
        const title = this.propStr(props, 'title')
        const w = this.propNum(props, 'width', 1200)
        const h = this.propNum(props, 'height', 780)
        const dark = this.propBool(props, 'dark')
        S.push(pad() + `UIHandle ${handle} = ui_window(${JSON.stringify(title)}, ${w}, ${h}, ${dark});`)
        const sub = this.propStr(props, 'subtitle')
        if (sub) S.push(pad() + `ui_window_subtitle(${handle}, ${JSON.stringify(sub)});`)
        this.emitChildren(children, handle)
        S.push(pad() + `ui_run(${handle});`)
        return handle
      }

      case 'VStack':
      case 'HStack': {
        const fn = tag === 'VStack' ? 'ui_vstack' : 'ui_hstack'
        S.push(pad() + `UIHandle ${handle} = ${fn}();`)
        if (tw) for (const c of tw.calls) S.push(pad() + c)
        this.emitChildren(children, handle)
        return handle
      }

      case 'Text': {
        const text = this.textContent(children)
        const size = tw?.textSize || 14
        const bold = tw?.textBold || false
        S.push(pad() + `UIHandle ${handle} = ui_text(${JSON.stringify(text)}, ${size}, ${bold});`)
        if (tw) for (const c of tw.calls) S.push(pad() + c)
        return handle
      }

      case 'Spacer':
        S.push(pad() + `UIHandle ${handle} = ui_spacer();`)
        return handle

      case 'Search': {
        const placeholder = this.propStr(props, 'placeholder')
        S.push(pad() + `UIHandle ${handle} = ui_search_field(${JSON.stringify(placeholder)});`)
        const onChange = props.get('onChange')
        if (onChange && ts.isJsxExpression(onChange) && onChange.expression) {
          const wrapName = this.liftCallback(onChange.expression, 'UITextChangedFn')
          S.push(pad() + `ui_on_text_changed(${handle}, ${wrapName});`)
        }
        if (tw) for (const c of tw.calls) S.push(pad() + c)
        return handle
      }

      case 'Sidebar': {
        const width = tw && tw.width > 0 ? tw.width : 200
        S.push(pad() + `UIHandle ${handle} = ui_sidebar(${width});`)
        this.emitChildren(children, handle)
        return handle
      }

      case 'SidebarSection': {
        const title = this.propStr(props, 'title')
        S.push(pad() + `ui_sidebar_section(_jsx_parent, ${JSON.stringify(title)});`)
        for (const child of children) {
          if (ts.isJsxText(child) && child.text.trim().length === 0) continue
          if (ts.isJsxElement(child))
            this.emitElement(child.openingElement, child.children)
          if (ts.isJsxSelfClosingElement(child))
            this.emitElement(child, [])
          if (ts.isJsxExpression(child) && child.expression &&
              ts.isCallExpression(child.expression) &&
              ts.isPropertyAccessExpression(child.expression.expression) &&
              child.expression.expression.name.text === 'map')
            this.emitJsxMap(child.expression, '_jsx_parent')
        }
        return ''  // section doesn't produce a view
      }

      case 'SidebarItem': {
        const icon = this.propStr(props, 'icon')
        const text = this.textContent(children)
        const onClick = props.get('onClick')
        let fnRef = 'NULL'
        let tagNum = 0
        if (onClick && ts.isJsxExpression(onClick) && onClick.expression) {
          fnRef = this.liftCallback(onClick.expression, 'UIClickFn')
          tagNum = this.jsxOnClickCounter++
        }
        S.push(pad() + `UIHandle ${handle} = ui_sidebar_item(_jsx_parent, ${JSON.stringify(text)}, ${JSON.stringify(icon)}, ${tagNum}, ${fnRef});`)
        return handle
      }

      case 'Stat': {
        const valueStr = this.propStr(props, 'value')
        const value = valueStr ? JSON.stringify(valueStr) : this.propExpr(props, 'value')
        const label = this.propStr(props, 'label')
        const color = this.colorIndex(this.propStr(props, 'color'))
        S.push(pad() + `UIHandle ${handle} = ui_stat(${value}, ${JSON.stringify(label)}, ${color});`)
        return handle
      }

      case 'Badge': {
        const text = this.propStr(props, 'text') || this.textContent(children)
        const color = this.colorIndex(this.propStr(props, 'color'))
        S.push(pad() + `UIHandle ${handle} = ui_badge(${JSON.stringify(text)}, ${color});`)
        return handle
      }

      case 'BarChart': {
        const title = this.propStr(props, 'title')
        const h = tw && tw.height > 0 ? tw.height : 180
        S.push(pad() + `UIHandle ${handle} = ui_bar_chart(${h});`)
        if (title) S.push(pad() + `ui_bar_chart_set_title(${handle}, ${JSON.stringify(title)});`)
        if (tw) for (const c of tw.calls) S.push(pad() + c)
        return handle
      }

      case 'Table': {
        S.push(pad() + `UIHandle ${handle} = ui_data_table();`)
        const colsProp = props.get('columns')
        if (colsProp && ts.isJsxExpression(colsProp) && colsProp.expression)
          this.emitTableColumns(handle, colsProp.expression)
        const rowHeight = this.propNum(props, 'rowHeight', 26)
        S.push(pad() + `ui_data_table_set_row_height(${handle}, ${rowHeight});`)
        if (this.propBool(props, 'alternating'))
          S.push(pad() + `ui_data_table_set_alternating(${handle}, true);`)
        // cellFn prop — wrap TypeScript function for C callback
        const cellFnProp = props.get('cellFn')
        if (cellFnProp && ts.isJsxExpression(cellFnProp) && cellFnProp.expression) {
          const wrapName = this.liftCallback(cellFnProp.expression, 'UITableCellFn')
          const rows = this.propNum(props, 'rows', 500)
          S.push(pad() + `ui_data_table_set_data(${handle}, ${rows}, ${wrapName}, NULL);`)
          // Generate refreshTable() — stores handle globally, callable from TS
          S.push(pad() + `_g_table = ${handle};`)
          this.ctx.lambdas.push(
            `static UIHandle _g_table = NULL;\n` +
            `void refreshTable(double rows) {\n` +
            `    if (_g_table) ui_data_table_set_data(_g_table, (int)rows, ${wrapName}, NULL);\n` +
            `}`
          )
        }
        if (tw) for (const c of tw.calls) S.push(pad() + c)
        return handle
      }

      case 'Progress':
        S.push(pad() + `UIHandle ${handle} = ui_progress(${this.propNum(props, 'value', -1)});`)
        return handle

      case 'Divider':
        S.push(pad() + `UIHandle ${handle} = ui_divider();`)
        return handle

      default:
        S.push(pad() + `/* Unknown JSX: <${tag}> */`)
        return '((UIHandle)0)'
    }
  }

  // ─── Children ──────────────────────────────────────────────────

  private emitChildren(children: readonly ts.JsxChild[], parentHandle: string): void {
    if (!this.jsxParentDeclared) {
      this.ctx.jsxStmts.push(this.ctx.pad() + `UIHandle _jsx_parent = ${parentHandle};`)
      this.jsxParentDeclared = true
    } else {
      this.ctx.jsxStmts.push(this.ctx.pad() + `_jsx_parent = ${parentHandle};`)
    }

    for (const child of children) {
      if (ts.isJsxText(child) && child.text.trim().length === 0) continue
      if (ts.isJsxText(child)) continue  // text handled by parent

      if (ts.isJsxElement(child)) {
        const h = this.emitElement(child.openingElement, child.children)
        if (h) this.ctx.jsxStmts.push(this.ctx.pad() + `ui_add_child(${parentHandle}, ${h});`)
        continue
      }

      if (ts.isJsxSelfClosingElement(child)) {
        const h = this.emitElement(child, [])
        if (h) this.ctx.jsxStmts.push(this.ctx.pad() + `ui_add_child(${parentHandle}, ${h});`)
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
        this.ctx.jsxStmts.push(this.ctx.pad() + `ui_add_child(${parentHandle}, ${expr});`)
      }
    }
  }

  emitFragment(children: readonly ts.JsxChild[]): string {
    const handle = `_j${this.jsxCounter++}`
    this.ctx.jsxStmts.push(this.ctx.pad() + `UIHandle ${handle} = ui_vstack(); /* fragment */`)
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
    this.ctx.jsxStmts.push(this.ctx.pad() + `for (int ${idx} = 0; ${idx} < ${arr}.len; ${idx}++) {`)
    this.ctx.indent++
    this.ctx.jsxStmts.push(this.ctx.pad() + `${elemCType} ${param} = ${arr}.data[${idx}];`)

    const prevType = this.ctx.varTypes.get(param)
    this.ctx.varTypes.set(param, arrType.replace('[]', ''))

    const body = fn.body
    const inner = ts.isParenthesizedExpression(body) ? body.expression : body

    if (ts.isJsxElement(inner)) {
      const h = this.emitElement(inner.openingElement, inner.children)
      if (h) this.ctx.jsxStmts.push(this.ctx.pad() + `ui_add_child(${parentHandle}, ${h});`)
    } else if (ts.isJsxSelfClosingElement(inner)) {
      const h = this.emitElement(inner, [])
      if (h) this.ctx.jsxStmts.push(this.ctx.pad() + `ui_add_child(${parentHandle}, ${h});`)
    }

    if (prevType) this.ctx.varTypes.set(param, prevType)
    else this.ctx.varTypes.delete(param)

    this.ctx.indent--
    this.ctx.jsxStmts.push(this.ctx.pad() + `}`)
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
      if (fnType === 'UIClickFn') {
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
        this.ctx.lambdas.push(`static void ${name}(int _tag) {\n${body}\n}`)
      }
      return name
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
        this.ctx.jsxStmts.push(this.ctx.pad() + `ui_data_table_add_column(${handle}, ${JSON.stringify(id)}, ${JSON.stringify(title)}, ${width});`)
      }
    } else if (ts.isIdentifier(expr)) {
      this.ctx.jsxStmts.push(this.ctx.pad() + `/* Table columns from: ${expr.text} */`)
    }
  }
}
