/**
 * StrictTS JSX Emitter — TSX → C ui_*() calls
 *
 * Handles JSX elements, props, children, Tailwind className parsing,
 * and component mapping. Extracted from codegen.ts.
 */

import * as ts from 'typescript'
import { parseTailwind } from '../../tsn-tailwind/src/index.js'
import { CallbackBridge } from './callbacks.js'
import {
  emitBarChartTitleCall,
  emitButtonStyleCall,
  emitHandleCreate,
  emitRuntimeCalls,
  emitSidebarSectionCall,
  emitTableConfigCalls,
  emitTableDataBindingCalls,
  emitTextInputBindings,
  emitTextStyleCalls,
} from './host_adapter.js'
import { buildHostPlanEmission, emitHostPlan } from './host_plan.js'
import { buildPrimitivePlan } from './planner.js'
import {
  barChartCreateCall,
  badgeCreateCall,
  buttonCreateCall,
  imageCreateCall,
  sidebarItemCreateCall,
  statCreateCall,
  tableCreateCall,
} from './primitive_cases.js'
import { JsxProps } from './props.js'
import type { CodeGenContext } from './types.js'

export class JsxEmitter {
  private ctx: CodeGenContext
  private jsxCounter = 0
  private jsxOnClickCounter = 0
  private parentStack: string[] = []
  private propsUtil: JsxProps
  private callbackBridge: CallbackBridge

  constructor(ctx: CodeGenContext) {
    this.ctx = ctx
    this.propsUtil = new JsxProps(ctx)
    this.callbackBridge = new CallbackBridge(ctx)
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

  private clickTag(props: Map<string, ts.Node | null>, fallback: number): string {
    const tag = props.get('tag')
    if (!tag) return `${fallback}`
    if (ts.isJsxExpression(tag) && tag.expression) return this.ctx.emitExpr(tag.expression)
    return `${fallback}`
  }

  private emitOnClick(handle: string, props: Map<string, ts.Node | null>, push: (line: string) => void): void {
    const onClick = props.get('onClick')
    if (!onClick || !ts.isJsxExpression(onClick) || !onClick.expression) return
    const fnRef = this.callbackBridge.liftCallback(onClick.expression, 'UIClickFn')
    const tagNum = this.jsxOnClickCounter++
    const tagExpr = this.clickTag(props, tagNum)
    push(`ui_on_click(${handle}, ${fnRef}, ${tagExpr});`)
  }

  private liftOptionalCallback(prop: ts.Node | null | undefined, fnType: 'UIClickFn' | 'UITextChangedFn' | 'UITableCellFn'): string | null {
    if (!prop || !ts.isJsxExpression(prop) || !prop.expression) return null
    return this.callbackBridge.liftCallback(prop.expression, fnType)
  }

  // ─── Main Element Emitter ──────────────────────────────────────

  emitElement(
    element: ts.JsxOpeningElement | ts.JsxSelfClosingElement,
    children: readonly ts.JsxChild[]
  ): string {
    this.ctx.hasJsx = true
    const tag = element.tagName.getText()
    const props = this.propsUtil.getProps(element)
    const handle = `_j${this.jsxCounter++}`
    const className = this.propsUtil.propStr(props, 'className')
    const staticProps = this.propsUtil.extractStaticProps(props)
    const tw = className ? parseTailwind(className, handle) : null
    const plan = buildPrimitivePlan(tag, handle, className, staticProps, tw)
    const pad = () => this.ctx.pad()
    const push = (line: string) => this.ctx.pushJsxStmt(pad() + line)
    /** Emit UIHandle creation + ui_set_id registration */
    const create = (call: string) => {
      const testId = this.propsUtil.propCStr(props, 'testId')
      emitHandleCreate(push, handle, call, testId)
    }
    const createFromPlan = (
      propOverrides: Record<string, string | number | boolean | null> = {},
      rawCStringProps: Record<string, string> = {},
    ) => {
      const testId = this.propsUtil.propCStr(props, 'testId')
      const emission = buildHostPlanEmission(plan.node, {
        props: propOverrides,
        rawCStringProps,
      })
      emitHostPlan(push, emission, testId)
    }

    switch (tag) {
      case 'Window': {
        createFromPlan({
          title: this.propsUtil.propStr(props, 'title') ?? '',
          width: this.propsUtil.propNum(props, 'width', 1200),
          height: this.propsUtil.propNum(props, 'height', 780),
          dark: this.propsUtil.propBool(props, 'dark'),
        })
        const sub = this.propsUtil.propCStr(props, 'subtitle')
        if (sub) push(`ui_window_subtitle(${handle}, ${sub});`)
        const titlebarTransparent = this.propsUtil.propBool(props, 'titlebarTransparent')
        const fullsizeContent = this.propsUtil.propBool(props, 'fullsizeContent')
        const immersive = this.propsUtil.propBool(props, 'immersive')
        if (titlebarTransparent || immersive) push(`ui_window_titlebar_transparent(${handle});`)
        if (fullsizeContent || immersive) push(`ui_window_fullsize_content(${handle});`)
        this.emitChildren(children, handle)
        return handle
      }

      case 'ZStack': {
        createFromPlan()
        this.emitChildren(children, handle)
        return handle
      }

      case 'Gradient': {
        // Gradient overlay — from/to/direction props
        const from = this.propsUtil.propStr(props, 'from') ?? 'black/60'
        const to = this.propsUtil.propStr(props, 'to') ?? 'transparent'
        const dir = this.propsUtil.propStr(props, 'direction') ?? 'to-top'
        const dirMap: Record<string, number> = { 'to-top': 0, 'to-bottom': 1, 'to-left': 2, 'to-right': 3 }
        const dirNum = dirMap[dir] ?? 0
        const c1 = this.propsUtil.parseGradientColor(from)
        const c2 = this.propsUtil.parseGradientColor(to)
        create(`ui_vstack()`)
        push(`ui_set_gradient(${handle}, ${c1.r}, ${c1.g}, ${c1.b}, ${c1.a}, ${c2.r}, ${c2.g}, ${c2.b}, ${c2.a}, ${dirNum});`)
        return handle
      }

      case 'VStack':
      case 'HStack': {
        createFromPlan()
        this.emitOnClick(handle, props, push)
        this.emitChildren(children, handle)
        return handle
      }

      case 'Text': {
        const text = this.propsUtil.textArg(children)
        if (text.startsWith('"')) {
          createFromPlan({
            value: JSON.parse(text) as string,
          })
        } else {
          createFromPlan({}, { value: text })
        }
        return handle
      }

      case 'Symbol': {
        const name = this.propsUtil.propCStr(props, 'name') ?? '""'
        const size = this.propsUtil.propNum(props, 'size', 14)
        create(`ui_symbol(${name}, ${size})`)
        const color = this.propsUtil.propStr(props, 'color')
        if (color) push(`ui_symbol_set_color(${handle}, ${this.propsUtil.colorIndex(color)});`)
        emitRuntimeCalls(push, plan.runtimeCalls)
        return handle
      }

      case 'Spacer':
        create(`ui_spacer()`)
        return handle

      case 'Search': {
        createFromPlan({
          placeholder: this.propsUtil.propStr(props, 'placeholder') ?? '',
        })
        const value = this.propsUtil.propCStr(props, 'value')
        const onChangeWrap = this.liftOptionalCallback(props.get('onChange'), 'UITextChangedFn')
        emitTextInputBindings(push, handle, value, onChangeWrap)
        return handle
      }

      case 'Input': {
        createFromPlan({
          placeholder: this.propsUtil.propStr(props, 'placeholder') ?? '',
        })
        const value = this.propsUtil.propCStr(props, 'value')
        const onChangeWrap = this.liftOptionalCallback(props.get('onChange'), 'UITextChangedFn')
        emitTextInputBindings(push, handle, value, onChangeWrap)
        return handle
      }

      case 'Image': {
        const src = this.propsUtil.propCStr(props, 'src') ?? '""'
        create(imageCreateCall(src))
        emitRuntimeCalls(push, plan.runtimeCalls)
        this.emitOnClick(handle, props, push)
        return handle
      }

      case 'Sidebar': {
        createFromPlan()
        this.emitChildren(children, handle)
        return handle
      }

      case 'Scroll': {
        createFromPlan()
        this.emitChildren(children, handle)
        return handle
      }

      case 'Card': {
        createFromPlan()
        this.emitOnClick(handle, props, push)
        this.emitChildren(children, handle)
        return handle
      }

      case 'SidebarSection': {
        const title = this.propsUtil.propCStr(props, 'title') ?? '""'
        const parent = this.currentParent()
        if (!parent) return ''
        emitSidebarSectionCall(push, parent, title)
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
        const icon = this.propsUtil.propCStr(props, 'icon') ?? '""'
        const text = this.propsUtil.textArg(children)
        const fnRef = this.liftOptionalCallback(props.get('onClick'), 'UIClickFn') ?? 'NULL'
        const tagNum = fnRef !== 'NULL' ? this.jsxOnClickCounter++ : 0
        create(sidebarItemCreateCall(parent, text, icon, this.clickTag(props, tagNum), fnRef))
        return handle
      }

      case 'Stat': {
        const value = this.propsUtil.propCStr(props, 'value') ?? '""'
        const label = this.propsUtil.propCStr(props, 'label') ?? '""'
        const color = this.propsUtil.colorIndex(this.propsUtil.propStr(props, 'color'))
        create(statCreateCall(value, label, color))
        return handle
      }

      case 'Badge': {
        const text = this.propsUtil.propCStr(props, 'text') ?? this.propsUtil.textArg(children)
        const color = this.propsUtil.colorIndex(this.propsUtil.propStr(props, 'color'))
        create(badgeCreateCall(text, color))
        return handle
      }

      case 'Button': {
        const label = this.propsUtil.propCStr(props, 'text') ?? this.propsUtil.textArg(children)
        const icon = this.propsUtil.propCStr(props, 'icon')
        const variant = this.propsUtil.buttonStyle(this.propsUtil.propStr(props, 'variant'))
        const fnRef = this.liftOptionalCallback(props.get('onClick'), 'UIClickFn') ?? 'NULL'
        const tagNum = fnRef !== 'NULL' ? this.jsxOnClickCounter++ : 0
        create(buttonCreateCall(icon, label, fnRef, this.clickTag(props, tagNum)))
        emitButtonStyleCall(push, handle, variant)
        emitRuntimeCalls(push, plan.runtimeCalls)
        return handle
      }

      case 'BarChart': {
        const title = this.propsUtil.propCStr(props, 'title')
        const h = plan.pointHeight ?? 180
        create(barChartCreateCall(h))
        emitBarChartTitleCall(push, handle, title)
        emitRuntimeCalls(push, plan.runtimeCalls)
        return handle
      }

      case 'Table': {
        create(tableCreateCall())
        const colsProp = props.get('columns')
        if (colsProp && ts.isJsxExpression(colsProp) && colsProp.expression)
          this.emitTableColumns(handle, colsProp.expression)
        const rowHeight = this.propsUtil.propNum(props, 'rowHeight', 26)
        emitTableConfigCalls(push, handle, rowHeight, this.propsUtil.propBool(props, 'alternating'))
        // cellFn prop — wrap TypeScript function for C callback
        const cellFnProp = props.get('cellFn')
        if (cellFnProp && ts.isJsxExpression(cellFnProp) && cellFnProp.expression) {
          const wrapName = this.callbackBridge.liftCallback(cellFnProp.expression, 'UITableCellFn')
          const rows = this.propsUtil.propNum(props, 'rows', 500)
          emitTableDataBindingCalls(push, handle, rows, wrapName)
          this.ctx.lambdas.push(
            `static UIHandle _g_table = NULL;\n` +
            `void refreshTable(double rows) {\n` +
            `    if (_g_table) ui_data_table_set_data(_g_table, (int)rows, ${wrapName}, NULL);\n` +
            `}`
          )
        }
        emitRuntimeCalls(push, plan.runtimeCalls)
        return handle
      }

      case 'Progress':
        createFromPlan({
          value: this.propsUtil.propNum(props, 'value', -1),
        })
        return handle

      case 'Divider':
        createFromPlan()
        return handle

      default: {
        if (plan.primitive) {
          push(`/* Registered primitive <${tag}> (${plan.primitive.kind}) has no dedicated emitter yet */`)
          return '((UIHandle)0)'
        }
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
