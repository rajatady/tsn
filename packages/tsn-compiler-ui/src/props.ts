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
    if (ts.isStringLiteral(val)) return val.text
    if (ts.isJsxExpression(val) && val.expression && ts.isStringLiteral(val.expression))
      return val.expression.text
    return ''
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

  propCStr(props: Map<string, ts.Node | null>, key: string): string | null {
    const val = props.get(key)
    if (!val) return null
    if (ts.isStringLiteral(val)) return JSON.stringify(val.text)
    if (ts.isJsxExpression(val) && val.expression) return this.exprToCStr(val.expression)
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
    if (ts.isStringLiteral(value)) return value.text
    if (ts.isJsxExpression(value) && value.expression) {
      const expr = value.expression
      if (ts.isStringLiteral(expr)) return expr.text
      if (ts.isNumericLiteral(expr)) return parseFloat(expr.text)
      if (expr.kind === ts.SyntaxKind.TrueKeyword) return true
      if (expr.kind === ts.SyntaxKind.FalseKeyword) return false
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
