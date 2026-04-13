import * as ts from 'typescript'

import type { FuncSig } from './func_sig.js'

export interface TimerBuiltinEmitterContext {
  emitExpr(node: ts.Node): string
  nextTempId(): number
  lambdas: string[]
  varTypes: Map<string, string>
  funcSigs: Map<string, FuncSig>
}

function collectTimerArrowCaptures(
  body: ts.ConciseBody,
  varTypes: Map<string, string>,
): string[] {
  const localNames = new Set<string>()
  const captures = new Set<string>()

  const declareLocal = (name: ts.BindingName): void => {
    if (ts.isIdentifier(name)) localNames.add(name.text)
  }

  const visit = (node: ts.Node): void => {
    if (ts.isParameter(node) || ts.isVariableDeclaration(node) || ts.isFunctionDeclaration(node)) {
      declareLocal(node.name)
    }

    if (ts.isIdentifier(node)) {
      if (localNames.has(node.text)) return
      if (ts.isPropertyAccessExpression(node.parent) && node.parent.name === node) return
      if (ts.isPropertyAssignment(node.parent) && node.parent.name === node) return
      if (ts.isShorthandPropertyAssignment(node.parent) && node.parent.name === node) return
      if (ts.isVariableDeclaration(node.parent) && node.parent.name === node) return
      if (ts.isParameter(node.parent) && node.parent.name === node) return
      if (ts.isFunctionDeclaration(node.parent) && node.parent.name === node) return
      if (varTypes.has(node.text)) captures.add(node.text)
    }

    ts.forEachChild(node, visit)
  }

  visit(body)
  return [...captures]
}

function liftTimerCallback(
  ctx: TimerBuiltinEmitterContext,
  expr: ts.Expression,
): string {
  if (ts.isIdentifier(expr)) {
    const sig = ctx.funcSigs.get(expr.text)
    if (sig && sig.params.length > 0) {
      throw new Error(`Timer callback "${expr.text}" must not require parameters`)
    }
    return expr.text
  }

  if (ts.isArrowFunction(expr)) {
    if (expr.parameters.length > 0) {
      throw new Error('Timer arrow callbacks must not declare parameters')
    }

    const captures = collectTimerArrowCaptures(expr.body, ctx.varTypes)
    if (captures.length > 0) {
      throw new Error(`Timer arrow callbacks cannot capture variables yet: ${captures.join(', ')}`)
    }

    const id = ctx.nextTempId()
    const fnName = `_timer_cb_${id}`
    let body = ''

    if (ts.isBlock(expr.body)) {
      const lines: string[] = []
      for (const stmt of expr.body.statements) {
        if (ts.isExpressionStatement(stmt)) {
          lines.push(`    ${ctx.emitExpr(stmt.expression)};`)
          continue
        }
        if (ts.isReturnStatement(stmt) && stmt.expression) {
          lines.push(`    ${ctx.emitExpr(stmt.expression)};`)
          continue
        }
        throw new Error('Timer arrow callbacks currently support expression statements only')
      }
      body = lines.join('\n')
    } else {
      body = `    ${ctx.emitExpr(expr.body)};`
    }

    ctx.lambdas.push(`static void ${fnName}(void) {\n${body}\n}`)
    return fnName
  }

  throw new Error('Timer callbacks must be function identifiers or zero-argument arrow functions')
}

export function emitTimerBuiltinCall(
  ctx: TimerBuiltinEmitterContext,
  node: ts.CallExpression,
): string | null {
  if (!ts.isIdentifier(node.expression)) return null

  switch (node.expression.text) {
    case 'setTimeout': {
      const callback = liftTimerCallback(ctx, node.arguments[0])
      return `ts_setTimeout(${callback}, ${ctx.emitExpr(node.arguments[1])})`
    }
    case 'setInterval': {
      const callback = liftTimerCallback(ctx, node.arguments[0])
      return `ts_setInterval(${callback}, ${ctx.emitExpr(node.arguments[1])})`
    }
    case 'clearTimeout':
      return `ts_clearTimeout(${ctx.emitExpr(node.arguments[0])})`
    case 'clearInterval':
      return `ts_clearInterval(${ctx.emitExpr(node.arguments[0])})`
    default:
      return null
  }
}
