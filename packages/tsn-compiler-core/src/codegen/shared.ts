import * as ts from 'typescript'

export interface BuiltinEmitterContext {
  emitExpr(node: ts.Node): string
  exprType(node: ts.Node): string | undefined
  arrayCElemType(tsType: string): string
  arrayTypeName(innerTsType: string): string
  emitPredicateCallback(fn: ts.Expression, paramType: string): { paramName: string; body: string } | null
  nextTempId(): number
}

export type StdlibEmitterContext = BuiltinEmitterContext

export interface HostedBuiltinEmitterContext {
  emitExpr(node: ts.Node): string
  registerPromiseType(valueCType: string): string
}
