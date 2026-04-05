import * as ts from 'typescript'

export interface StdlibEmitterContext {
  emitExpr(node: ts.Node): string
  exprType(node: ts.Node): string | undefined
  arrayCElemType(tsType: string): string
  arrayTypeName(innerTsType: string): string
  nextTempId(): number
}

