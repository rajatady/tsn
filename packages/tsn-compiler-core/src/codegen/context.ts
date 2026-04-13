import * as ts from 'typescript'

import type { StructField, StructDef } from './types.js'

export interface PredicateEmitterDeps {
  emitExpr(node: ts.Node): string
  varTypes: Map<string, string>
}

export function getStructFields(structs: StructDef[], name: string): StructField[] | undefined {
  return structs.find(s => s.name === name)?.fields
}

export function withStmtSink<T>(
  holder: { activeStmtSink: string[] | null },
  sink: string[],
  fn: () => T,
): T {
  const prev = holder.activeStmtSink
  holder.activeStmtSink = sink
  try {
    return fn()
  } finally {
    holder.activeStmtSink = prev
  }
}

export function nextTempId(holder: { lambdaCounter: number }): number {
  const id = holder.lambdaCounter
  holder.lambdaCounter = holder.lambdaCounter + 1
  return id
}

export function emitPredicateCallback(
  fnExpr: ts.Expression,
  paramType: string,
  deps: PredicateEmitterDeps,
): { paramName: string; body: string } | null {
  if (!ts.isArrowFunction(fnExpr) || fnExpr.parameters.length === 0) return null
  const paramName = fnExpr.parameters[0].name.getText()
  const prev = deps.varTypes.get(paramName)
  deps.varTypes.set(paramName, paramType)
  let body: string
  if (ts.isBlock(fnExpr.body)) {
    const ret = fnExpr.body.statements.find(s => ts.isReturnStatement(s)) as ts.ReturnStatement | undefined
    body = ret?.expression ? deps.emitExpr(ret.expression) : 'true'
  } else {
    body = deps.emitExpr(fnExpr.body)
  }
  if (prev) deps.varTypes.set(paramName, prev)
  else deps.varTypes.delete(paramName)
  return { paramName, body }
}
