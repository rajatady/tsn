import * as ts from 'typescript'

export interface FuncSig {
  name: string
  params: Array<{ name: string; tsType: string; cType: string }>
  returnType: string
  returnCType: string
}

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
