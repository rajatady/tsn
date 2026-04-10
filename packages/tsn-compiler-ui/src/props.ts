import * as ts from 'typescript'
import type { TSNPropValue } from '@tsn/core'
import type { CodeGenContext } from './types.js'

export class JsxProps {
  constructor(private readonly ctx: CodeGenContext) {}

  getProps(element: ts.JsxOpeningElement | ts.JsxSelfClosingElement): Map<string, ts.Node | null> {
    const props = new Map<string, ts.Node | null>()
    for (const attr of element.attributes.properties) {
      if (ts.isJsxAttribute(attr)) {
        props.set(attr.name.getText(), attr.initializer ?? null)
      }
    }
    return props
  }

  propStr(props: Map<string, ts.Node | null>, key: string): string {
    const val = props.get(key)
    if (!val) return ''
    const resolved = this.staticStringValue(val)
    if (resolved !== undefined) return resolved
    return ''
  }

  isStaticallyResolvableString(props: Map<string, ts.Node | null>, key: string): boolean {
    const val = props.get(key)
    if (!val) return false
    return this.staticStringValue(val) !== undefined
  }

  propNum(props: Map<string, ts.Node | null>, key: string, fallback: number): number {
    const val = props.get(key)
    if (!val) return fallback
    if (ts.isJsxExpression(val) && val.expression && ts.isNumericLiteral(val.expression))
      return parseFloat(val.expression.text)
    return fallback
  }

  propBool(props: Map<string, ts.Node | null>, key: string): boolean {
    if (!props.has(key)) return false
    const val = props.get(key)
    if (val === null) return true
    if (val && ts.isJsxExpression(val) && val.expression) {
      if (val.expression.kind === ts.SyntaxKind.FalseKeyword) return false
    }
    return true
  }

  propBoolExpr(props: Map<string, ts.Node | null>, key: string): string | null {
    const val = props.get(key)
    if (!val) return null
    if (val === null) return 'true'
    if (ts.isJsxExpression(val) && val.expression) {
      const expr = val.expression
      if (expr.kind === ts.SyntaxKind.TrueKeyword) return 'true'
      if (expr.kind === ts.SyntaxKind.FalseKeyword) return 'false'
      return this.ctx.emitExpr(expr)
    }
    return null
  }

  propCStr(props: Map<string, ts.Node | null>, key: string): string | null {
    const val = props.get(key)
    if (!val) return null
    if (ts.isStringLiteral(val)) return JSON.stringify(val.text)
    if (ts.isJsxExpression(val) && val.expression) return this.exprToCStr(val.expression)
    return null
  }

  propStrArray(props: Map<string, ts.Node | null>, key: string): string[] | null {
    const val = props.get(key)
    if (!val) return null
    if (ts.isJsxExpression(val) && val.expression) return this.staticStringArrayFromExpression(val.expression)
    return null
  }

  extractStaticProps(props: Map<string, ts.Node | null>): Record<string, TSNPropValue> {
    const result: Record<string, TSNPropValue> = {}
    for (const [key, val] of props.entries()) {
      const staticValue = this.staticPropValue(val)
      if (staticValue !== undefined) {
        result[key] = staticValue
      }
    }
    return result
  }

  textArg(children: readonly ts.JsxChild[]): string {
    const text = this.textContent(children)
    if (text.length > 0) return JSON.stringify(text)

    const exprChildren = children.filter((child): child is ts.JsxExpression =>
      ts.isJsxExpression(child) && !!child.expression
    )
    if (exprChildren.length === 1) return this.exprToCStr(exprChildren[0].expression!)
    return '""'
  }

  parseGradientColor(spec: string): { r: number, g: number, b: number, a: number } {
    if (spec === 'transparent') return { r: 0, g: 0, b: 0, a: 0 }
    // Parse "black/60" → rgba(0,0,0,0.6)
    const parts = spec.split('/')
    const colorName = parts[0]
    const alpha = parts.length > 1 ? parseInt(parts[1]) / 100 : 1.0
    const colors: Record<string, [number, number, number]> = {
      'black': [0, 0, 0],
      'white': [1, 1, 1],
    }
    const rgb = colors[colorName] ?? [0, 0, 0]
    return { r: rgb[0], g: rgb[1], b: rgb[2], a: alpha }
  }

  colorIndex(name: string): number {
    const map: Record<string, number> = {
      'label': 0, 'secondary': 1, 'tertiary': 2,
      'blue': 3, 'green': 4, 'red': 5, 'orange': 6,
      'yellow': 7, 'purple': 8, 'pink': 9, 'teal': 10,
      'indigo': 11, 'cyan': 12,
    }
    return map[name] ?? 3
  }

  buttonStyle(name: string): number {
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

  private exprToCStr(expr: ts.Expression): string {
    const type = this.ctx.exprType(expr)
    const emitted = this.ctx.emitExpr(expr)
    if (type === 'string') return `ts_str_cstr(${emitted})`
    if (type === 'number') return `ts_str_cstr(num_to_str(${emitted}))`
    if (type === 'boolean') return `(${emitted} ? "true" : "false")`
    return '""'
  }

  private staticPropValue(value: ts.Node | null): TSNPropValue | undefined {
    if (value === null) return true
    const staticString = this.staticStringValue(value)
    if (staticString !== undefined) return staticString
    if (ts.isJsxExpression(value) && value.expression) {
      const expr = value.expression
      if (ts.isNumericLiteral(expr)) return parseFloat(expr.text)
      if (expr.kind === ts.SyntaxKind.TrueKeyword) return true
      if (expr.kind === ts.SyntaxKind.FalseKeyword) return false
    }
    return undefined
  }

  private staticStringValue(value: ts.Node | null, seen: Set<ts.Node> = new Set()): string | undefined {
    if (!value || seen.has(value)) return undefined
    seen.add(value)

    if (ts.isStringLiteral(value) || ts.isNoSubstitutionTemplateLiteral(value)) return value.text

    if (ts.isJsxExpression(value)) {
      return value.expression ? this.staticStringFromExpression(value.expression, seen) : undefined
    }

    if (ts.isExpression(value)) {
      return this.staticStringFromExpression(value, seen)
    }

    return undefined
  }

  private staticStringFromExpression(expr: ts.Expression, seen: Set<ts.Node>): string | undefined {
    if (seen.has(expr)) return undefined
    seen.add(expr)

    if (ts.isStringLiteral(expr) || ts.isNoSubstitutionTemplateLiteral(expr)) return expr.text

    if (ts.isParenthesizedExpression(expr)) {
      return this.staticStringFromExpression(expr.expression, seen)
    }

    if (ts.isBinaryExpression(expr) && expr.operatorToken.kind === ts.SyntaxKind.PlusToken) {
      const left = this.staticStringFromExpression(expr.left, seen)
      const right = this.staticStringFromExpression(expr.right, seen)
      if (left !== undefined && right !== undefined) return left + right
      return undefined
    }

    if (ts.isTemplateExpression(expr)) {
      let text = expr.head.text
      for (const span of expr.templateSpans) {
        const part = this.staticStringFromExpression(span.expression, seen)
        if (part === undefined) return undefined
        text += part + span.literal.text
      }
      return text
    }

    if (ts.isConditionalExpression(expr)) {
      const condition = this.staticBooleanFromExpression(expr.condition)
      if (condition === undefined) return undefined
      return condition
        ? this.staticStringFromExpression(expr.whenTrue, seen)
        : this.staticStringFromExpression(expr.whenFalse, seen)
    }

    if (ts.isIdentifier(expr)) {
      const init = this.findConstInitializer(expr)
      return init ? this.staticStringFromExpression(init, seen) : undefined
    }

    return undefined
  }

  private staticStringArrayFromExpression(expr: ts.Expression, seen: Set<ts.Node> = new Set()): string[] | null {
    if (seen.has(expr)) return null
    seen.add(expr)

    if (ts.isParenthesizedExpression(expr)) {
      return this.staticStringArrayFromExpression(expr.expression, seen)
    }

    if (ts.isArrayLiteralExpression(expr)) {
      const values: string[] = []
      for (const element of expr.elements) {
        if (!ts.isExpression(element)) return null
        const text = this.staticStringFromExpression(element, seen)
        if (text === undefined) return null
        values.push(text)
      }
      return values
    }

    if (ts.isIdentifier(expr)) {
      const init = this.findConstInitializer(expr)
      if (!init) return null
      return this.staticStringArrayFromExpression(init, seen)
    }

    return null
  }

  private staticBooleanFromExpression(expr: ts.Expression): boolean | undefined {
    if (expr.kind === ts.SyntaxKind.TrueKeyword) return true
    if (expr.kind === ts.SyntaxKind.FalseKeyword) return false
    if (ts.isParenthesizedExpression(expr)) return this.staticBooleanFromExpression(expr.expression)
    if (ts.isIdentifier(expr)) {
      const init = this.findConstInitializer(expr)
      if (!init) return undefined
      return this.staticBooleanFromExpression(init)
    }
    return undefined
  }

  private findConstInitializer(id: ts.Identifier): ts.Expression | undefined {
    let current: ts.Node | undefined = id
    while (current) {
      if (ts.isBlock(current) || ts.isSourceFile(current)) {
        const container = current
        const boundary = this.enclosingStatement(id)
        let latest: ts.Expression | undefined
        for (const stmt of container.statements) {
          if (boundary && stmt.pos >= boundary.pos) break
          if (!ts.isVariableStatement(stmt)) continue
          const isConst = (stmt.declarationList.flags & ts.NodeFlags.Const) !== 0
          if (!isConst) continue
          for (const decl of stmt.declarationList.declarations) {
            if (ts.isIdentifier(decl.name) && decl.name.text === id.text && decl.initializer) {
              latest = decl.initializer
            }
          }
        }
        if (latest) return latest
      }
      current = current.parent
    }
    return undefined
  }

  private enclosingStatement(node: ts.Node): ts.Statement | undefined {
    let current: ts.Node | undefined = node
    while (current) {
      if (ts.isStatement(current)) return current
      current = current.parent
    }
    return undefined
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
}
