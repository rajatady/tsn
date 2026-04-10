import * as ts from 'typescript'

export interface CatchTarget {
  frameVar: string
}

export interface ExceptionLoweringContext {
  exprType(node: ts.Node): string | undefined
  emitExpr(node: ts.Node): string
}

export function emitThrownValue(
  ctx: ExceptionLoweringContext,
  node: ts.Expression,
): string {
  const thrownType = ctx.exprType(node)
  const expr = ctx.emitExpr(node)

  if (thrownType === 'string') return expr
  if (thrownType === 'number') return `num_to_str(${expr})`
  if (thrownType === 'boolean') return `(${expr} ? str_lit("true") : str_lit("false"))`

  return `str_lit("thrown value")`
}
